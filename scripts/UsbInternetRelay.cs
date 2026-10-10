using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Runtime.InteropServices;
using System.IO;
using System.IO.Ports;
using System.Diagnostics;
using System.Globalization;

// Outbound user sockets only: no network driver, firewall change, elevation or listener.
// One instance belongs to one verified card CDC connection.
public sealed class UsbInternetRelay : IDisposable {
    public const string RelayVersion = "1.1.1";
    readonly string diagnosticsPath = Environment.GetEnvironmentVariable("KABLOSUZ_USB_DIAGNOSTICS");
    void Diagnostic(string message) {
        if (String.IsNullOrEmpty(diagnosticsPath)) return;
        try { File.AppendAllText(diagnosticsPath, DateTime.UtcNow.ToString("o") + " " + message + Environment.NewLine); } catch { }
    }
    public const int MaxBinaryRequest = 4167;
    public const int MaxBinaryReply = 16442;
    public const int MaxBinaryUpload = 4096;
    public const int MaxBinaryRead = 16384;
    const int PendingUploadLimit = 16384;
    // Internet payloads have explicit byte lengths. They must never go through
    // UTF-8 decoding or line splitting: TLS traffic can contain every byte.
    public sealed class WireFrame {
        public string Text;
        public uint Sequence;
        public byte[] Payload;
        public bool IsBinary { get { return Payload != null; } }
    }
    public sealed class WireDecoder {
        readonly MemoryStream line = new MemoryStream();
        bool discardLine;
        byte[] payload;
        int payloadOffset;
        uint sequence;
        long lastByte = Stopwatch.GetTimestamp();
        long binaryStarted;
        public bool AbandonStaleBinary(int inactivityMilliseconds) {
            if (payload == null) return false;
            long now = Stopwatch.GetTimestamp();
            // New hello attempts must not keep an incomplete binary envelope
            // alive forever by refreshing its last-byte timestamp.
            if ((now - lastByte) * 1000.0 / Stopwatch.Frequency < inactivityMilliseconds &&
                (now - binaryStarted) * 1000.0 / Stopwatch.Frequency < 5000) return false;
            payload = null; payloadOffset = 0; line.SetLength(0); discardLine = false;
            return true;
        }
        // Advances offset only through the returned frame. The caller keeps
        // any coalesced next frame in its existing read buffer.
        public bool Consume(byte[] bytes, ref int offset, int count, out WireFrame frame) {
            if (bytes == null || offset < 0 || count < offset || count > bytes.Length) throw new ArgumentOutOfRangeException();
            frame = null;
            while (offset < count) {
                lastByte = Stopwatch.GetTimestamp();
                if (payload != null) {
                    int copy = Math.Min(payload.Length - payloadOffset, count - offset);
                    if (copy > 0) { Buffer.BlockCopy(bytes, offset, payload, payloadOffset, copy); offset += copy; payloadOffset += copy; }
                    if (payloadOffset < payload.Length || offset == count) continue;
                    byte terminator = bytes[offset++];
                    byte[] completed = payload; payload = null; payloadOffset = 0;
                    if (terminator != 10) { discardLine = true; continue; }
                    frame = new WireFrame { Sequence = sequence, Payload = completed };
                    return true;
                }
                byte value = bytes[offset++];
                if (value == 10) {
                    string text = "";
                    if (!discardLine) {
                        try { text = new UTF8Encoding(false, true).GetString(line.GetBuffer(), 0, (int)line.Length).TrimEnd('\r'); }
                        catch (DecoderFallbackException) { }
                    }
                    line.SetLength(0); discardLine = false;
                    if (text.StartsWith("NBI3:", StringComparison.Ordinal)) {
                        Match header = Regex.Match(text, @"^NBI3:([0-9]{1,10}):([0-9]{1,5})$");
                        int length;
                        if (header.Success && UInt32.TryParse(header.Groups[1].Value, out sequence) &&
                            Int32.TryParse(header.Groups[2].Value, out length) && length >= 7 && length <= MaxBinaryRequest) {
                            payload = new byte[length]; payloadOffset = 0;
                            binaryStarted = Stopwatch.GetTimestamp(); continue;
                        }
                        // Malformed binary headers are not clipboard text.
                        text = "";
                    }
                    frame = new WireFrame { Text = text };
                    return true;
                }
                if (!discardLine) {
                    if (line.Length < 1400064) line.WriteByte(value);
                    else { line.SetLength(0); discardLine = true; }
                }
            }
            return false;
        }
    }
    readonly byte[] serialBuffer = new byte[8192];
    readonly WireDecoder serialDecoder = new WireDecoder();
    int serialOffset, serialCount;
    long lastSerialInput = Stopwatch.GetTimestamp();
    void CheckSerialHeartbeat() {
        // Active USB sharing sends a hello at least every 15 seconds even
        // with no browser traffic. Reopen a stale CDC handle after sleep or
        // a lost line state; the supervisor refreshes DTR on the new handle.
        if (!String.IsNullOrEmpty(session) &&
            (Stopwatch.GetTimestamp() - lastSerialInput) * 1000.0 / Stopwatch.Frequency >= 30000)
            throw new IOException("USB card heartbeat expired; reopening CDC");
    }
    // ReadLine performs small character reads on CDC. Consume queued USB bytes
    // in batches while retaining split UTF-8 and consecutive frames exactly.
    public string ReadFrame(SerialPort port) {
        Stopwatch timer = Stopwatch.StartNew();
        while (true) {
            WireFrame frame;
            while (serialDecoder.Consume(serialBuffer, ref serialOffset, serialCount, out frame)) {
                if (!frame.IsBinary) {
                    // Binary envelopes and short-packet padding add blank
                    // lines. Keep those in this compiled loop instead of
                    // crossing back into PowerShell for every USB batch.
                    if (String.IsNullOrEmpty(frame.Text)) continue;
                    return frame.Text;
                }
                byte[] response = HandleBinaryWireFrame(frame.Sequence, frame.Payload);
                port.Write(response, 0, response.Length);
                timer.Restart();
            }
            if (port.ReadTimeout > 0 && timer.ElapsedMilliseconds >= port.ReadTimeout) {
                serialDecoder.AbandonStaleBinary(5000);
                CheckSerialHeartbeat();
                throw new TimeoutException();
            }
            int queued = port.BytesToRead;
            // Windows can round Sleep(1) to a 15.6 ms scheduler interval.
            // Wait in the driver for the first byte, then drain queued bytes
            // in batches instead of adding that delay to every request.
            try { serialCount = port.Read(serialBuffer, 0, queued > 0 ? Math.Min(serialBuffer.Length, queued) : 1); }
            catch (TimeoutException) { serialDecoder.AbandonStaleBinary(5000); CheckSerialHeartbeat(); throw; }
            if (serialCount > 0) lastSerialInput = Stopwatch.GetTimestamp();
            serialOffset = 0;
        }
    }
    // Keep per-frame decoding and encoding in compiled code; no payload logs.
    public string HandleWireFrame(string line) {
        Match frame = Regex.Match(line ?? "", @"^NBI1:([0-9]{1,10}):([A-Za-z0-9+/=]{1,3200})$");
        if (!frame.Success) return null;
        string request = new UTF8Encoding(false, true).GetString(Convert.FromBase64String(frame.Groups[2].Value));
        string response = Handle(request);
        string wire = "NBI2:" + frame.Groups[1].Value + ":" + Convert.ToBase64String(Encoding.UTF8.GetBytes(response));
        // WriteLine adds the final LF. A blank line makes a 64-byte multiple
        // end in a short USB packet, completing the card's batched RX transfer.
        return (wire.Length + 1) % 64 == 0 ? wire + "\n" : wire;
    }
    [StructLayout(LayoutKind.Sequential)]
    struct DeviceInfo { public int Size; public Guid ClassGuid; public uint DevInst; public IntPtr Reserved; }
    [DllImport("setupapi.dll", CharSet=CharSet.Unicode)]
    static extern IntPtr SetupDiGetClassDevs(ref Guid classGuid, string enumerator, IntPtr parent, uint flags);
    [DllImport("setupapi.dll")]
    static extern bool SetupDiEnumDeviceInfo(IntPtr set, uint index, ref DeviceInfo info);
    [DllImport("setupapi.dll", CharSet=CharSet.Unicode)]
    static extern bool SetupDiGetDeviceInstanceId(IntPtr set, ref DeviceInfo info, StringBuilder id, uint size, out uint required);
    [DllImport("setupapi.dll", CharSet=CharSet.Unicode)]
    static extern bool SetupDiGetDeviceRegistryProperty(IntPtr set, ref DeviceInfo info, uint property, out uint type, byte[] value, uint size, out uint required);
    [DllImport("setupapi.dll")]
    static extern bool SetupDiDestroyDeviceInfoList(IntPtr set);
    // Win32_SerialPort shares a WMI provider with disk enumeration. Mounting a
    // large USB SD can block that provider, even though the CDC port is ready.
    // SetupAPI lists present Ports devices directly, without elevation or WMI.
    public static string[] CardPorts() {
        var found = new List<string>();
        Guid ports = new Guid("4d36e978-e325-11ce-bfc1-08002be10318");
        IntPtr set = SetupDiGetClassDevs(ref ports, null, IntPtr.Zero, 2);
        if (set == new IntPtr(-1)) return found.ToArray();
        try {
            for (uint index=0; ; index++) {
                DeviceInfo info = new DeviceInfo(); info.Size = Marshal.SizeOf(typeof(DeviceInfo));
                if (!SetupDiEnumDeviceInfo(set,index,ref info)) break;
                var id = new StringBuilder(512); uint required, type;
                if (!SetupDiGetDeviceInstanceId(set,ref info,id,512,out required) ||
                    !id.ToString().StartsWith("USB\\VID_1209&PID_0001&",StringComparison.OrdinalIgnoreCase)) continue;
                byte[] text = new byte[1024];
                if (!SetupDiGetDeviceRegistryProperty(set,ref info,12,out type,text,(uint)text.Length,out required)) continue;
                Match match = Regex.Match(Encoding.Unicode.GetString(text,0,(int)Math.Min(required,(uint)text.Length)),@"\((COM[0-9]+)\)",RegexOptions.IgnoreCase);
                if (match.Success && !found.Contains(match.Groups[1].Value)) found.Add(match.Groups[1].Value);
            }
        } finally { SetupDiDestroyDeviceInfoList(set); }
        return found.ToArray();
    }
    sealed class Peer {
        public TcpClient Client;
        public Task<TcpClient> Connecting;
        public string Host;
        public long Uploaded, Downloaded;
        public DateTime Last = DateTime.UtcNow;
        public byte[] PendingUpload;
        public int PendingOffset, PendingCount;
    }
    readonly Dictionary<int, Peer> peers = new Dictionary<int, Peer>();
    // A 4096-byte read becomes 5464 Base64 characters plus JSON.
    // Keep replies within the card's 6144 decoded / 8192 wire buffers.
    readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 8192, RecursionLimit = 5 };
    string session = "";
    DateTime lastProbe = DateTime.MinValue;
    bool internet;
    volatile bool probing;
    bool ProbeInternet(int timeoutMs) {
        foreach (string probeIp in new[] { "1.1.1.1", "8.8.8.8" }) {
            try { using (TcpClient test = Connect(IPAddress.Parse(probeIp), 443, timeoutMs)) { return true; } }
            catch { }
        }
        return false;
    }
    static string Text(Dictionary<string, object> obj, string name) { object value; return obj.TryGetValue(name, out value) ? Convert.ToString(value) : ""; }
    string Reply(bool ok, string error) { if (!ok) Diagnostic("error=" + error); return json.Serialize(new { ok = ok, error = error }); }
    public static bool PublicAddress(IPAddress ip) {
        if (ip.AddressFamily != AddressFamily.InterNetwork) return false;
        byte[] b = ip.GetAddressBytes();
        return !(b[0] == 0 || b[0] == 10 || b[0] == 127 || b[0] >= 224 ||
                 (b[0] == 169 && b[1] == 254) || (b[0] == 172 && b[1] >= 16 && b[1] <= 31) ||
                 (b[0] == 192 && b[1] == 168) || (b[0] == 100 && b[1] >= 64 && b[1] <= 127));
    }
    static TcpClient Connect(IPAddress ip, int port, int timeout) {
        TcpClient client = new TcpClient(AddressFamily.InterNetwork);
        try {
            IAsyncResult pending = client.BeginConnect(ip, port, null, null);
            using (pending.AsyncWaitHandle) {
                if (!pending.AsyncWaitHandle.WaitOne(timeout)) throw new TimeoutException();
                client.EndConnect(pending);
            }
            client.NoDelay = true; client.SendTimeout = 1500; client.ReceiveTimeout = 1500;
            return client;
        } catch { client.Close(); throw; }
    }
    static TcpClient ConnectHost(string host, int port) {
        IPAddress literal;
        IPAddress[] candidates;
        if (IPAddress.TryParse(host, out literal)) candidates = new IPAddress[] { literal };
        else {
            Task<IPAddress[]> lookup = Task.Factory.StartNew(delegate { return Dns.GetHostAddresses(host); });
            if (!lookup.Wait(2000)) throw new TimeoutException("DNS lookup timed out");
            candidates = lookup.Result;
        }
        Stopwatch timer = Stopwatch.StartNew();
        Exception last = null;
        foreach (IPAddress candidate in candidates) {
            if (!PublicAddress(candidate)) continue;
            int remaining = 3500 - (int)timer.ElapsedMilliseconds;
            if (remaining <= 0) break;
            try { return Connect(candidate, port, Math.Min(2000, remaining)); }
            catch (Exception error) { last = error; }
        }
        throw last ?? new IOException("No reachable public web address");
    }
    void Close(int id) {
        Peer peer;
        if (peers.TryGetValue(id, out peer)) {
            Diagnostic("close id=" + id + " host=" + peer.Host + " up=" + peer.Uploaded + " down=" + peer.Downloaded);
            if (peer.Client != null) peer.Client.Close();
            else if (peer.Connecting != null) peer.Connecting.ContinueWith(delegate(Task<TcpClient> task) {
                if (task.Status == TaskStatus.RanToCompletion) task.Result.Close();
                else if (task.IsFaulted) { var observed = task.Exception; }
            });
            peers.Remove(id);
        }
    }
    void ExpirePeers() {
        List<int> expired = new List<int>();
        foreach (var item in peers) if ((DateTime.UtcNow - item.Value.Last).TotalSeconds > 65) expired.Add(item.Key);
        foreach (int key in expired) Close(key);
    }
    sealed class BatchRecord {
        public int Id, UploadOffset, UploadLength, ReadLimit, Available, Allocation, Received;
        public byte Flags;
        public byte[] Download;
        public Peer Peer;
        public bool Blocking, ChangedBlocking;
    }
    static uint ReadUInt32(byte[] bytes, int offset) {
        return (uint)bytes[offset] | ((uint)bytes[offset+1] << 8) | ((uint)bytes[offset+2] << 16) | ((uint)bytes[offset+3] << 24);
    }
    static int ReadUInt16(byte[] bytes, int offset) { return bytes[offset] | (bytes[offset+1] << 8); }
    static void WriteUInt32(Stream stream, uint value) {
        for (int i=0; i<4; i++) { stream.WriteByte((byte)value); value >>= 8; }
    }
    static void WriteUInt16(Stream stream, int value) { stream.WriteByte((byte)value); stream.WriteByte((byte)(value >> 8)); }
    static bool WouldBlock(SocketException error) {
        return error.SocketErrorCode == SocketError.WouldBlock || error.SocketErrorCode == SocketError.IOPending || error.SocketErrorCode == SocketError.NoBufferSpaceAvailable;
    }
    // All binary socket work is nonblocking. A slow destination cannot stall
    // the USB batch for the other clients. Accepted bytes remain ordered in a
    // bounded queue until the TCP send buffer can take them.
    static void FlushPendingUpload(Peer peer) {
        while (peer.PendingCount > 0) {
            int sent;
            try { sent = peer.Client.Client.Send(peer.PendingUpload, peer.PendingOffset, peer.PendingCount, SocketFlags.None); }
            catch (SocketException error) { if (WouldBlock(error)) return; throw; }
            if (sent <= 0) return;
            peer.PendingOffset += sent; peer.PendingCount -= sent;
        }
        peer.PendingOffset = 0;
    }
    static bool QueueUpload(Peer peer, byte[] bytes, int offset, int count) {
        if (count > PendingUploadLimit - peer.PendingCount) return false;
        if (count == 0) return true;
        if (peer.PendingUpload == null) peer.PendingUpload = new byte[PendingUploadLimit];
        if (peer.PendingOffset + peer.PendingCount + count > peer.PendingUpload.Length) {
            Buffer.BlockCopy(peer.PendingUpload, peer.PendingOffset, peer.PendingUpload, 0, peer.PendingCount);
            peer.PendingOffset = 0;
        }
        Buffer.BlockCopy(bytes, offset, peer.PendingUpload, peer.PendingOffset + peer.PendingCount, count);
        peer.PendingCount += count;
        return true;
    }
    public byte[] HandleBinaryFrame(byte[] payload) {
        // Rejection is deliberately not a partial acknowledgement: the card
        // treats a count mismatch as corruption and closes the selected flows.
        byte[] rejected = new byte[] { 1, 0 };
        if (payload == null || payload.Length < 7 || payload.Length > MaxBinaryRequest || payload[0] != 1 || payload[1] != 1 || payload[6] < 1 || payload[6] > 8) return rejected;
        uint established;
        if (!UInt32.TryParse(session, NumberStyles.HexNumber, CultureInfo.InvariantCulture, out established) || established != ReadUInt32(payload, 2)) return rejected;
        var records = new List<BatchRecord>(); var ids = new HashSet<int>();
        int position = 7, uploadTotal = 0;
        for (int index=0; index<payload[6]; index++) {
            if (position + 8 > payload.Length) return rejected;
            uint id = ReadUInt32(payload, position);
            int upload = ReadUInt16(payload, position+4), read = ReadUInt16(payload, position+6);
            position += 8;
            if (id == 0 || id > Int32.MaxValue || !ids.Add((int)id) || upload > MaxBinaryUpload || read > MaxBinaryRead ||
                position + upload > payload.Length || (uploadTotal += upload) > MaxBinaryUpload) return rejected;
            records.Add(new BatchRecord { Id = (int)id, UploadOffset = position, UploadLength = upload, ReadLimit = read });
            position += upload;
        }
        if (position != payload.Length) return rejected;
        ExpirePeers();
        // Determine readiness before assigning download credit. Empty peers
        // take no share of the 16 KiB reply. All socket work stays nonblocking.
        foreach (BatchRecord record in records) {
            Peer peer;
            if (!peers.TryGetValue(record.Id, out peer)) continue;
            record.Peer = peer;
            try {
                if (peer.Client == null) {
                    if (!peer.Connecting.IsCompleted) { record.Flags = 5; continue; }
                    peer.Client = peer.Connecting.GetAwaiter().GetResult(); peer.Connecting = null;
                    Diagnostic("connected id=" + record.Id + " host=" + peer.Host);
                }
                Socket socket = peer.Client.Client;
                record.Blocking = socket.Blocking; socket.Blocking = false; record.ChangedBlocking = true;
                FlushPendingUpload(peer);
                bool accepted = QueueUpload(peer, payload, record.UploadOffset, record.UploadLength);
                if (accepted) peer.Uploaded += record.UploadLength;
                FlushPendingUpload(peer);
                record.Flags = (byte)(accepted ? 1 : 5);
                if (accepted && record.UploadLength > 0) peer.Last = DateTime.UtcNow;
                record.Available = Math.Min(socket.Available, record.ReadLimit);
            } catch (Exception error) {
                Diagnostic("connect/io id=" + record.Id + " host=" + peer.Host + " error=" + error.GetBaseException().Message);
                record.Flags = 0; record.Available = 0; Close(record.Id);
            }
        }
        int budget = MaxBinaryRead;
        // Reassign the share left by small responses to larger ready streams.
        // At most one bounded pass per peer; simultaneous downloads stay fair.
        for (int pass=0; pass<records.Count && budget>0; pass++) {
            int ready = 0;
            foreach (BatchRecord record in records) if (record.Available > record.Allocation) ready++;
            if (ready == 0) break;
            int share = Math.Max(1, budget / ready);
            foreach (BatchRecord record in records) {
                int take = Math.Min(budget, Math.Min(share, record.Available - record.Allocation));
                if (take > 0) { record.Allocation += take; budget -= take; }
            }
        }
        using (var result = new MemoryStream(MaxBinaryReply)) {
            result.WriteByte(1); result.WriteByte((byte)records.Count);
            foreach (BatchRecord record in records) {
                Peer peer = record.Peer;
                if (record.Flags != 0 && peers.ContainsKey(record.Id) && peer.Client != null) {
                    Socket socket = peer.Client.Client;
                    try {
                        if (record.Allocation > 0) {
                            record.Download = new byte[record.Allocation];
                            try { record.Received = socket.Receive(record.Download, 0, record.Download.Length, SocketFlags.None); }
                            catch (SocketException error) { if (!WouldBlock(error)) throw; }
                        }
                        // Never wait per client and never consume a speculative
                        // byte to distinguish an empty stream from an EOF.
                        if (socket.Available == 0 && socket.Poll(0, SelectMode.SelectRead)) {
                            byte[] probe = new byte[1];
                            try { if (socket.Receive(probe, 0, 1, SocketFlags.Peek) == 0) record.Flags |= 2; }
                            catch (SocketException error) { if (!WouldBlock(error)) throw; }
                        }
                        if (record.Received > 0) { peer.Last = DateTime.UtcNow; peer.Downloaded += record.Received; }
                    } catch { record.Flags = 0; record.Received = 0; Close(record.Id); }
                    finally { if (record.ChangedBlocking && peers.ContainsKey(record.Id)) { try { socket.Blocking = record.Blocking; } catch { Close(record.Id); record.Flags = 0; record.Received = 0; } } }
                    if ((record.Flags & 2) != 0) Close(record.Id);
                }
                WriteUInt32(result, (uint)record.Id); result.WriteByte(record.Flags); WriteUInt16(result, record.Received);
                if (record.Received > 0) result.Write(record.Download, 0, record.Received);
            }
            return result.ToArray();
        }
    }
    public byte[] HandleBinaryWireFrame(uint sequence, byte[] payload) {
        byte[] response = HandleBinaryFrame(payload);
        byte[] header = Encoding.ASCII.GetBytes("\nNBI4:" + sequence.ToString(CultureInfo.InvariantCulture) + ":" + response.Length.ToString(CultureInfo.InvariantCulture) + "\n");
        int frameLength = header.Length + response.Length + 1;
        // Keep the declared payload length exact; optional padding is a blank
        // line outside the frame. Every reply ends in a short USB packet even
        // when the card batches 512-byte RX transfers instead of one packet.
        byte[] wire = new byte[frameLength + (frameLength % 64 == 0 ? 1 : 0)];
        Buffer.BlockCopy(header, 0, wire, 0, header.Length); Buffer.BlockCopy(response, 0, wire, header.Length, response.Length);
        wire[frameLength-1] = 10;
        if (wire.Length > frameLength) wire[frameLength] = 10;
        return wire;
    }
    public string Handle(string text) {
        if (text == null || text.Length > 2400) return Reply(false, "invalid-frame");
        try {
            var obj = json.Deserialize<Dictionary<string, object>>(text);
            string nextSession = Text(obj, "session"), action = Text(obj, "action");
            if (!Regex.IsMatch(nextSession, "^[a-fA-F0-9]{8}$")) return Reply(false, "invalid-session");
            if (session != nextSession) { Dispose(); session = nextSession; }
            ExpirePeers();
            if (action == "hello") {
                if ((DateTime.UtcNow - lastProbe).TotalSeconds > 15) {
                    bool firstProbe = lastProbe == DateTime.MinValue;
                    lastProbe = DateTime.UtcNow;
                    // The first answer is awaited briefly (2 s max, below the card
                    // timeout). Later checks run in the background so a slow probe
                    // can never stall a USB reply and make the card drop the link.
                    if (firstProbe) { internet = ProbeInternet(1000); }
                    else if (!probing) {
                        probing = true;
                        Task.Run(() => { try { internet = ProbeInternet(2500); } finally { probing = false; } });
                    }
                }
                // Protocol 3 also guarantees a short final USB packet. Cards
                // with 512-byte RX batching must not select unpadded protocol 2.
                return json.Serialize(new { ok = true, protocol = 5, relayVersion = RelayVersion, sharedReadBudget = true, asyncOpen = true, internet = internet, maxUpload = MaxBinaryUpload, maxRead = MaxBinaryRead, maxBatch = 8 });
            }
            int id;
            if (!Int32.TryParse(Text(obj, "id"), out id) || id <= 0) return Reply(false, "invalid-id");
            if (action == "close") { Close(id); return Reply(true, ""); }
            if (action == "open" || action == "open-async") {
                string host = Text(obj, "host"); int port;
                if (host.Length > 253 || !Regex.IsMatch(host, "^[a-zA-Z0-9.-]+$") ||
                    !Int32.TryParse(Text(obj, "port"), out port) || (port != 80 && port != 443)) return Reply(false, "invalid-target");
                Close(id);
                if (peers.Count >= 12) return Reply(false, "busy");
                if (action == "open-async") {
                    IPAddress literalTarget;
                    if (IPAddress.TryParse(host, out literalTarget) && !PublicAddress(literalTarget)) return Reply(false, "public-web-only");
                    peers[id] = new Peer { Host = host, Connecting = Task.Factory.StartNew(delegate { return ConnectHost(host, port); }, System.Threading.CancellationToken.None, TaskCreationOptions.LongRunning, TaskScheduler.Default) };
                    Diagnostic("connecting id=" + id + " host=" + host + " port=" + port);
                    return json.Serialize(new { ok = true, pending = true });
                }
                IPAddress address;
                if (!IPAddress.TryParse(host, out address)) {
                    Task<IPAddress[]> lookup = Task.Factory.StartNew(delegate { return Dns.GetHostAddresses(host); });
                    if (!lookup.Wait(1000)) return Reply(false, "dns-timeout");
                    address = null;
                    foreach (IPAddress candidate in lookup.Result) if (PublicAddress(candidate)) { address = candidate; break; }
                }
                if (address == null || !PublicAddress(address)) return Reply(false, "public-web-only");
                peers[id] = new Peer { Client = Connect(address, port, 1000), Host = host };
                Diagnostic("open id=" + id + " host=" + host + " address=" + address + " port=" + port);
                return Reply(true, "");
            }
            if (action != "io") return Reply(false, "invalid-action");
            Peer current;
            if (!peers.TryGetValue(id, out current)) return Reply(false, "closed");
            byte[] send = Convert.FromBase64String(Text(obj, "data"));
            if (send.Length > 768) return Reply(false, "data-limit");
            // A card may fall back to the legacy protocol in the same session;
            // retain any previously accepted binary upload before that data.
            if (current.PendingCount > 0) {
                current.Client.GetStream().Write(current.PendingUpload, current.PendingOffset, current.PendingCount);
                current.PendingCount = 0; current.PendingOffset = 0;
            }
            if (send.Length > 0) current.Client.GetStream().Write(send, 0, send.Length);
            // Older cards keep their 1536-byte response; newer cards opt in.
            int readLimit = 1536;
            if (obj.ContainsKey("maxRead") && (!Int32.TryParse(Text(obj, "maxRead"), out readLimit) || readLimit < 256 || readLimit > 4096))
                return Reply(false, "read-limit");
            byte[] receive = new byte[readLimit]; int count = 0;
            Socket socket = current.Client.Client;
            if (socket.Available == 0) socket.Poll(2000, SelectMode.SelectRead);
            if (socket.Available > 0) count = socket.Receive(receive, 0, Math.Min(receive.Length, socket.Available), SocketFlags.None);
            // Poll first: data can arrive between an Available check and Poll.
            // Confirm EOF with a non-consuming read; never discard a new packet.
            bool eof = false;
            if (socket.Poll(0, SelectMode.SelectRead) && socket.Available == 0) {
                byte[] probe = new byte[1];
                eof = socket.Receive(probe, 0, 1, SocketFlags.Peek) == 0;
            }
            if (send.Length > 0 || count > 0) current.Last = DateTime.UtcNow;
            if (eof) Close(id);
            return json.Serialize(new { ok = true, data = Convert.ToBase64String(receive, 0, count), eof = eof });
        } catch (Exception error) { Diagnostic(error.GetType().Name + ": " + error.Message); return Reply(false, "connection-failed"); }
    }
    public void Dispose() { foreach (int id in new List<int>(peers.Keys)) Close(id); }
}

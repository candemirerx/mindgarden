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

// Outbound user sockets only: no network driver, firewall change, elevation or listener.
// One instance belongs to one verified card CDC connection.
public sealed class UsbInternetRelay : IDisposable {
    readonly byte[] serialBuffer = new byte[8192];
    readonly MemoryStream serialLine = new MemoryStream();
    int serialOffset, serialCount;
    bool discardSerialLine;
    // ReadLine performs small character reads on CDC. Consume queued USB bytes
    // in batches while retaining split UTF-8 and consecutive frames exactly.
    public string ReadFrame(SerialPort port) {
        Stopwatch timer = Stopwatch.StartNew();
        while (true) {
            while (serialOffset < serialCount) {
                byte value = serialBuffer[serialOffset++];
                if (value == 10) {
                    string result = discardSerialLine ? "" : new UTF8Encoding(false, true).GetString(serialLine.GetBuffer(), 0, (int)serialLine.Length).TrimEnd('\r');
                    serialLine.SetLength(0); discardSerialLine = false;
                    return result;
                }
                if (!discardSerialLine) {
                    if (serialLine.Length < 1400064) serialLine.WriteByte(value);
                    else { serialLine.SetLength(0); discardSerialLine = true; }
                }
            }
            if (port.ReadTimeout > 0 && timer.ElapsedMilliseconds >= port.ReadTimeout) throw new TimeoutException();
            int queued = port.BytesToRead;
            if (queued == 0) { System.Threading.Thread.Sleep(1); continue; }
            serialCount = port.Read(serialBuffer, 0, Math.Min(serialBuffer.Length, queued));
            serialOffset = 0;
        }
    }
    // Keep per-frame decoding and encoding in compiled code; no payload logs.
    public string HandleWireFrame(string line) {
        Match frame = Regex.Match(line ?? "", @"^NBI1:([0-9]{1,10}):([A-Za-z0-9+/=]{1,3200})$");
        if (!frame.Success) return null;
        string request = new UTF8Encoding(false, true).GetString(Convert.FromBase64String(frame.Groups[2].Value));
        string response = Handle(request);
        return "NBI2:" + frame.Groups[1].Value + ":" + Convert.ToBase64String(Encoding.UTF8.GetBytes(response));
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
    sealed class Peer { public TcpClient Client; public DateTime Last = DateTime.UtcNow; }
    readonly Dictionary<int, Peer> peers = new Dictionary<int, Peer>();
    // A 4096-byte read becomes 5464 Base64 characters plus JSON.
    // Keep replies within the card's 6144 decoded / 8192 wire buffers.
    readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 8192, RecursionLimit = 5 };
    string session = "";
    DateTime lastProbe = DateTime.MinValue;
    bool internet;
    static string Text(Dictionary<string, object> obj, string name) { object value; return obj.TryGetValue(name, out value) ? Convert.ToString(value) : ""; }
    string Reply(bool ok, string error) { return json.Serialize(new { ok = ok, error = error }); }
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
    void Close(int id) {
        Peer peer;
        if (peers.TryGetValue(id, out peer)) { peer.Client.Close(); peers.Remove(id); }
    }
    public string Handle(string text) {
        if (text == null || text.Length > 2400) return Reply(false, "invalid-frame");
        try {
            var obj = json.Deserialize<Dictionary<string, object>>(text);
            string nextSession = Text(obj, "session"), action = Text(obj, "action");
            if (!Regex.IsMatch(nextSession, "^[a-fA-F0-9]{8}$")) return Reply(false, "invalid-session");
            if (session != nextSession) { Dispose(); session = nextSession; }
            List<int> expired = new List<int>();
            foreach (var item in peers) if ((DateTime.UtcNow - item.Value.Last).TotalSeconds > 65) expired.Add(item.Key);
            foreach (int key in expired) Close(key);
            if (action == "hello") {
                if ((DateTime.UtcNow - lastProbe).TotalSeconds > 15) {
                    lastProbe = DateTime.UtcNow;
                    try { using (TcpClient test = Connect(IPAddress.Parse("1.1.1.1"), 443, 1000)) { internet = true; } }
                    catch { internet = false; }
                }
                return json.Serialize(new { ok = true, protocol = 1, internet = internet });
            }
            int id;
            if (!Int32.TryParse(Text(obj, "id"), out id) || id <= 0) return Reply(false, "invalid-id");
            if (action == "close") { Close(id); return Reply(true, ""); }
            if (action == "open") {
                string host = Text(obj, "host"); int port;
                if (host.Length > 253 || !Regex.IsMatch(host, "^[a-zA-Z0-9.-]+$") ||
                    !Int32.TryParse(Text(obj, "port"), out port) || (port != 80 && port != 443)) return Reply(false, "invalid-target");
                Close(id);
                if (peers.Count >= 12) return Reply(false, "busy");
                IPAddress address;
                if (!IPAddress.TryParse(host, out address)) {
                    Task<IPAddress[]> lookup = Task.Factory.StartNew(delegate { return Dns.GetHostAddresses(host); });
                    if (!lookup.Wait(1000)) return Reply(false, "dns-timeout");
                    address = null;
                    foreach (IPAddress candidate in lookup.Result) if (PublicAddress(candidate)) { address = candidate; break; }
                }
                if (address == null || !PublicAddress(address)) return Reply(false, "public-web-only");
                peers[id] = new Peer { Client = Connect(address, port, 1000) };
                return Reply(true, "");
            }
            if (action != "io") return Reply(false, "invalid-action");
            Peer current;
            if (!peers.TryGetValue(id, out current)) return Reply(false, "closed");
            byte[] send = Convert.FromBase64String(Text(obj, "data"));
            if (send.Length > 768) return Reply(false, "data-limit");
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
        } catch { return Reply(false, "connection-failed"); }
    }
    public void Dispose() { foreach (Peer peer in peers.Values) peer.Client.Close(); peers.Clear(); }
}

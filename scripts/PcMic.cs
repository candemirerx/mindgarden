using System;
using System.Collections.Generic;
using System.IO;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

// Telefon mikrofonunu bilgisayara mikrofon olarak verir.
//
// Windows'ta "sanal mikrofon" yazilimdan uretilemez: ses, bir sanal ses
// kablosunun CIKIS (render) ucuna yazilir, surucu de onu bir GIRIS (capture)
// aygiti olarak gosterir. Ornegin VB-CABLE kurulduysa buraya "CABLE Input"
// yazilir, PC uygulamalari da mikrofon olarak "CABLE Output" secer.
// Bu sinif yalnizca render ucuna yazar; hicbir surucu kurmaz.
public static class PcMic
{
    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] private class MMDeviceEnumeratorCom { }

    [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IMMDeviceEnumerator {
        [PreserveSig] int EnumAudioEndpoints(int dataFlow, int stateMask, out IMMDeviceCollection devices);
        [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice device);
    }

    [ComImport, Guid("0BD7A1BE-7A1A-44DB-8397-CC5392387B5E"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IMMDeviceCollection {
        [PreserveSig] int GetCount(out uint count);
        [PreserveSig] int Item(uint index, out IMMDevice device);
    }

    [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IMMDevice {
        [PreserveSig] int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object instance);
        [PreserveSig] int OpenPropertyStore(int access, out IPropertyStore store);
        [PreserveSig] int GetId([MarshalAs(UnmanagedType.LPWStr)] out string id);
        [PreserveSig] int GetState(out int state);
    }

    [ComImport, Guid("886D8EEB-8CF2-4446-8D02-CDBA1DBDCF99"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IPropertyStore {
        [PreserveSig] int GetCount(out uint count);
        [PreserveSig] int GetAt(uint index, out PropertyKey key);
        [PreserveSig] int GetValue(ref PropertyKey key, out PropVariant value);
        [PreserveSig] int SetValue(ref PropertyKey key, ref PropVariant value);
        [PreserveSig] int Commit();
    }

    [StructLayout(LayoutKind.Sequential)] private struct PropertyKey { public Guid formatId; public int propertyId; }

    [StructLayout(LayoutKind.Explicit)] private struct PropVariant {
        [FieldOffset(0)] public short type;
        [FieldOffset(8)] public IntPtr pointerValue;
    }

    [ComImport, Guid("1CB9AD4C-DBFA-4c32-B178-C2F568A703B2"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IAudioClient {
        [PreserveSig] int Initialize(int shareMode, int streamFlags, long bufferDuration, long periodicity, IntPtr format, IntPtr sessionGuid);
        [PreserveSig] int GetBufferSize(out uint frames);
        [PreserveSig] int GetStreamLatency(out long latency);
        [PreserveSig] int GetCurrentPadding(out uint frames);
        [PreserveSig] int IsFormatSupported(int shareMode, IntPtr format, out IntPtr closest);
        [PreserveSig] int GetMixFormat(out IntPtr format);
        [PreserveSig] int GetDevicePeriod(out long defaultPeriod, out long minimumPeriod);
        [PreserveSig] int Start();
        [PreserveSig] int Stop();
        [PreserveSig] int Reset();
        [PreserveSig] int SetEventHandle(IntPtr handle);
        [PreserveSig] int GetService(ref Guid iid, [MarshalAs(UnmanagedType.IUnknown)] out object service);
    }

    [ComImport, Guid("F294ACFC-3146-4483-A7BF-ADDCA7C260E2"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IAudioRenderClient {
        [PreserveSig] int GetBuffer(uint frames, out IntPtr data);
        [PreserveSig] int ReleaseBuffer(uint frames, uint flags);
    }

    [ComImport, Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IAudioEndpointVolume {
        [PreserveSig] int RegisterControlChangeNotify(IntPtr notify);
        [PreserveSig] int UnregisterControlChangeNotify(IntPtr notify);
        [PreserveSig] int GetChannelCount(out uint channels);
        [PreserveSig] int SetMasterVolumeLevel(float levelDb, ref Guid context);
        [PreserveSig] int SetMasterVolumeLevelScalar(float level, ref Guid context);
        [PreserveSig] int GetMasterVolumeLevel(out float levelDb);
        [PreserveSig] int GetMasterVolumeLevelScalar(out float level);
        [PreserveSig] int SetChannelVolumeLevel(uint channel, float levelDb, ref Guid context);
        [PreserveSig] int SetChannelVolumeLevelScalar(uint channel, float level, ref Guid context);
        [PreserveSig] int GetChannelVolumeLevel(uint channel, out float levelDb);
        [PreserveSig] int GetChannelVolumeLevelScalar(uint channel, out float level);
        [PreserveSig] int SetMute([MarshalAs(UnmanagedType.Bool)] bool mute, ref Guid context);
        [PreserveSig] int GetMute([MarshalAs(UnmanagedType.Bool)] out bool mute);
        [PreserveSig] int GetVolumeStepInfo(out uint step, out uint stepCount);
        [PreserveSig] int VolumeStepUp(ref Guid context);
        [PreserveSig] int VolumeStepDown(ref Guid context);
        [PreserveSig] int QueryHardwareSupport(out uint mask);
        [PreserveSig] int GetVolumeRange(out float minDb, out float maxDb, out float incrementDb);
    }

    private static readonly PropertyKey FriendlyName = MakeKey("a45c254e-df1c-4efd-8020-67d146a850e0", 14);

    private static PropertyKey MakeKey(string guid, int id)
    {
        PropertyKey key = new PropertyKey();
        key.formatId = new Guid(guid);
        key.propertyId = id;
        return key;
    }

    private static readonly object gate = new object();
    [ComImport, Guid("870AF99C-171D-4F9E-AF0D-E63DF40C2BC9")]
    private class PolicyConfigCom { }

    [ComImport, Guid("F8679F50-850A-41CF-9C72-430F290290C8"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IPolicyConfig {
        [PreserveSig] int GetMixFormat([MarshalAs(UnmanagedType.LPWStr)] string id, out IntPtr format);
        [PreserveSig] int GetDeviceFormat([MarshalAs(UnmanagedType.LPWStr)] string id, int defaultFormat, out IntPtr format);
        [PreserveSig] int ResetDeviceFormat([MarshalAs(UnmanagedType.LPWStr)] string id);
        [PreserveSig] int SetDeviceFormat([MarshalAs(UnmanagedType.LPWStr)] string id, IntPtr deviceFormat, IntPtr mixFormat);
    }

    private static byte[] FormatBytes(IntPtr format)
    {
        int length = 18 + (Marshal.ReadInt16(format, 16) & 65535);
        byte[] bytes = new byte[length];
        Marshal.Copy(format, bytes, 0, length);
        return bytes;
    }

    /** Repair Steam's raw virtual cable when its two Windows formats differ.
     * Only this explicitly selected virtual microphone is changed; defaults
     * and physical microphones are untouched. Return its original format so
     * callers can keep a reversible backup before applying the repair. */
    public static byte[] SteamCaptureFormat(string render)
    {
        string capture = CaptureFor(render, Inputs());
        if (render.IndexOf("Steam Streaming Microphone", StringComparison.OrdinalIgnoreCase) < 0 || capture.Length == 0)
            return new byte[0];
        IMMDevice endpoint = FindEndpoint(capture, 1);
        string id; Check(endpoint.GetId(out id), "Mikrofon kimligi okunamadi");
        IPolicyConfig policy = (IPolicyConfig)new PolicyConfigCom();
        IntPtr format = IntPtr.Zero;
        try {
            Check(policy.GetDeviceFormat(id, 0, out format), "Mikrofon bicimi okunamadi");
            return FormatBytes(format);
        } finally {
            if (format != IntPtr.Zero) Marshal.FreeCoTaskMem(format);
            Marshal.ReleaseComObject(policy);
        }
    }

    public static void RestoreSteamCaptureFormat(string render, byte[] saved)
    {
        string capture = CaptureFor(render, Inputs());
        if (render.IndexOf("Steam Streaming Microphone", StringComparison.OrdinalIgnoreCase) < 0 || capture.Length == 0 || saved.Length < 18)
            throw new InvalidOperationException("Steam mikrofon bicimi bulunamadi");
        string id; Check(FindEndpoint(capture, 1).GetId(out id), "Mikrofon kimligi okunamadi");
        IPolicyConfig policy = (IPolicyConfig)new PolicyConfigCom();
        IntPtr format = Marshal.AllocCoTaskMem(saved.Length);
        try {
            Marshal.Copy(saved, 0, format, saved.Length);
            Check(policy.SetDeviceFormat(id, format, IntPtr.Zero), "Mikrofon bicimi ayarlanamadi");
        } finally { Marshal.FreeCoTaskMem(format); Marshal.ReleaseComObject(policy); }
    }

    public static bool AlignSteamMicrophone(string render)
    {
        if (render.IndexOf("Steam Streaming Microphone", StringComparison.OrdinalIgnoreCase) < 0) return false;
        string capture = CaptureFor(render, Inputs());
        if (capture.Length == 0) return false;
        string renderId, captureId;
        Check(FindEndpoint(render, 0).GetId(out renderId), "Cikis kimligi okunamadi");
        Check(FindEndpoint(capture, 1).GetId(out captureId), "Mikrofon kimligi okunamadi");
        IPolicyConfig policy = (IPolicyConfig)new PolicyConfigCom();
        IntPtr desired = IntPtr.Zero, currentFormat = IntPtr.Zero;
        try {
            Check(policy.GetDeviceFormat(renderId, 0, out desired), "Sanal kablo bicimi okunamadi");
            Check(policy.GetDeviceFormat(captureId, 0, out currentFormat), "Mikrofon bicimi okunamadi");
            byte[] a = FormatBytes(desired), b = FormatBytes(currentFormat);
            bool equal = a.Length == b.Length;
            for (int i = 0; equal && i < a.Length; i++) equal = a[i] == b[i];
            if (equal) return false;
            string backupDirectory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "CepKopru", "audio-format-backups");
            Directory.CreateDirectory(backupDirectory);
            string backupName = captureId;
            foreach (char invalid in Path.GetInvalidFileNameChars()) backupName = backupName.Replace(invalid, '_');
            string backupPath = Path.Combine(backupDirectory, backupName + ".bin");
            if (!File.Exists(backupPath)) File.WriteAllBytes(backupPath, b);
            Check(policy.SetDeviceFormat(captureId, desired, IntPtr.Zero), "Steam mikrofonunun ornek hizi ve kanallari eslestirilemedi");
            return true;
        } finally {
            if (desired != IntPtr.Zero) Marshal.FreeCoTaskMem(desired);
            if (currentFormat != IntPtr.Zero) Marshal.FreeCoTaskMem(currentFormat);
            Marshal.ReleaseComObject(policy);
        }
    }
    // Telefon mikrofonu (ozellikle konusma kaynagi) dusuk seviyede gelir; sanal
    // mikrofonun Windows giris duzeyi 0 dB'de kalinca PC uygulamalarinda ses cok
    // kisik duyuluyordu (olculdu: Steam mikrofonu %54 = 0 dB). Akis baslarken
    // yalniz eslesen sanal mikrofonun duzeyi bu degerin ALTINDAYSA yukseltilir;
    // kullanicinin daha yuksek ayari ve sessiz (mute) secimi korunur.
    public const float CaptureBoostDb = 12f;

    public static float RaiseCaptureLevel(string render)
    {
        string capture = CaptureFor(render, Inputs());
        if (capture.Length == 0 || !LooksVirtual(render)) return float.NaN;
        Guid iid = typeof(IAudioEndpointVolume).GUID;
        object instance;
        Check(FindEndpoint(capture, 1).Activate(ref iid, 23, IntPtr.Zero, out instance), "Mikrofon duzeyi acilamadi");
        IAudioEndpointVolume volume = (IAudioEndpointVolume)instance;
        try {
            float minDb, maxDb, stepDb, currentDb;
            Check(volume.GetVolumeRange(out minDb, out maxDb, out stepDb), "Mikrofon duzey araligi okunamadi");
            Check(volume.GetMasterVolumeLevel(out currentDb), "Mikrofon duzeyi okunamadi");
            float target = Math.Min(CaptureBoostDb, maxDb);
            if (currentDb >= target) return currentDb;
            Guid context = Guid.Empty;
            Check(volume.SetMasterVolumeLevel(target, ref context), "Mikrofon duzeyi ayarlanamadi");
            return target;
        } finally { Marshal.ReleaseComObject(volume); }
    }

    private static TcpClient current;
    private static int generation;
    private static string wantedDevice = "";
    private static volatile bool streaming;

    public static string LastError = "";
    public static bool Streaming { get { return streaming; } }
    public static string Device { get { lock (gate) return wantedDevice; } }

    /** Render (cikis) aygitlarinin okunur adlari; telefon bu listeden secer. */
    public static string[] Outputs() { return Endpoints(0); }

    /** Capture (giris / mikrofon) aygitlarinin okunur adlari. */
    public static string[] Inputs() { return Endpoints(1); }

    private static string[] Endpoints(int dataFlow)
    {
        List<string> names = new List<string>();
        IMMDeviceEnumerator enumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorCom();
        IMMDeviceCollection devices;
        // dataFlow 0 = render, 1 = capture; stateMask 1 = yalniz etkin aygitlar.
        Check(enumerator.EnumAudioEndpoints(dataFlow, 1, out devices), "Ses aygitlari listelenemedi");
        uint count;
        Check(devices.GetCount(out count), "Ses aygiti sayisi okunamadi");
        for (uint i = 0; i < count; i++) {
            IMMDevice device;
            if (devices.Item(i, out device) < 0) continue;
            string name = NameOf(device);
            if (name.Length > 0) names.Add(name);
        }
        return names.ToArray();
    }

    // Bilinen sanal kablolarin cikis (render) uclari; oncelik sirasiyla.
    private static readonly string[] VirtualHints = new string[] { "CABLE Input", "VoiceMeeter Input", "VoiceMeeter Aux Input",
        "Steam Streaming Microphone", "Virtual Audio Cable", "Line 1", "Virtual Mic", "Virtual Speakers" };

    public static bool LooksVirtual(string name)
    {
        foreach (string hint in VirtualHints)
            if (name.IndexOf(hint, StringComparison.OrdinalIgnoreCase) >= 0) return true;
        return false;
    }

    private static string Suffix(string name)
    {
        int open = name.LastIndexOf('(');
        return open < 0 ? "" : name.Substring(open);
    }

    /**
     * Bir cikisin bilgisayarda hangi mikrofon olarak gorundugu. Windows uc adlari
     * "Tur (Aygit)" bicimindedir; ayni sanal kablonun iki ucu parantez icini
     * paylasir: "CABLE Input (VB-Audio Virtual Cable)" -> "CABLE Output (VB-Audio
     * Virtual Cable)", "Hoparlor (Steam Streaming Microphone)" -> "Mikrofon (Steam
     * Streaming Microphone)". Eslesme yoksa bos doner.
     */
    public static string CaptureFor(string render, string[] inputs)
    {
        if (string.IsNullOrEmpty(render)) return "";
        string suffix = Suffix(render);
        if (render.IndexOf("CABLE Input", StringComparison.OrdinalIgnoreCase) >= 0) {
            foreach (string input in inputs)
                if (input.IndexOf("CABLE Output", StringComparison.OrdinalIgnoreCase) >= 0 && Suffix(input) == suffix) return input;
            foreach (string input in inputs)
                if (input.IndexOf("CABLE Output", StringComparison.OrdinalIgnoreCase) >= 0) return input;
        }
        if (suffix.Length > 2)
            foreach (string input in inputs)
                if (Suffix(input).Equals(suffix, StringComparison.OrdinalIgnoreCase)) return input;
        return "";
    }

    /** Her sanal cikis icin karsilik gelen mikrofon adi; telefon "su mikrofonu secin" der. */
    public static Dictionary<string, string> MicPairs()
    {
        string[] inputs = Inputs();
        Dictionary<string, string> pairs = new Dictionary<string, string>();
        foreach (string output in Outputs()) {
            if (!LooksVirtual(output)) continue;
            string capture = CaptureFor(output, inputs);
            if (capture.Length > 0) pairs[output] = capture;
        }
        return pairs;
    }

    /**
     * Sanal ses kablosunun giris ucunu tahmin eder. Kullanici bir aygit
     * secmediyse bu ad kullanilir; bulunamazsa bos doner (gercek hoparlore
     * asla kendiliginden yazilmaz, yoksa kendi sesinizi duyarsiniz).
     * Karsiligi bilgisayarda bir mikrofon olarak gorunen cikislar once secilir.
     */
    public static string GuessVirtualOutput()
    {
        string[] all = Outputs();
        string[] inputs = Inputs();
        foreach (string hint in VirtualHints)
            foreach (string name in all)
                if (name.IndexOf(hint, StringComparison.OrdinalIgnoreCase) >= 0 && CaptureFor(name, inputs).Length > 0) return name;
        foreach (string hint in VirtualHints)
            foreach (string name in all)
                if (name.IndexOf(hint, StringComparison.OrdinalIgnoreCase) >= 0) return name;
        return "";
    }

    private static string NameOf(IMMDevice device)
    {
        IPropertyStore store = null;
        try {
            if (device.OpenPropertyStore(0, out store) < 0 || store == null) return "";
            PropertyKey key = FriendlyName;
            PropVariant value;
            if (store.GetValue(ref key, out value) < 0) return "";
            if (value.pointerValue == IntPtr.Zero) return "";
            string name = Marshal.PtrToStringUni(value.pointerValue);
            return name == null ? "" : name;
        } catch { return ""; }
        finally { if (store != null) Marshal.ReleaseComObject(store); }
    }

    private static IMMDevice FindRender(string wanted)
    {
        return FindEndpoint(wanted, 0);
    }

    private static IMMDevice FindEndpoint(string wanted, int flow)
    {
        IMMDeviceEnumerator enumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorCom();
        if (string.IsNullOrEmpty(wanted))
            throw new InvalidOperationException("Sanal mikrofon aygiti secilmedi.");
        IMMDeviceCollection devices;
        Check(enumerator.EnumAudioEndpoints(flow, 1, out devices), "Ses aygitlari listelenemedi");
        uint count;
        Check(devices.GetCount(out count), "Ses cikisi sayisi okunamadi");
        for (uint i = 0; i < count; i++) {
            IMMDevice device;
            if (devices.Item(i, out device) < 0) continue;
            if (string.Equals(NameOf(device), wanted, StringComparison.OrdinalIgnoreCase)) return device;
        }
        throw new InvalidOperationException("Ses cikisi bulunamadi: " + wanted);
    }

    public static void Configure(string device)
    {
        lock (gate) wantedDevice = device == null ? "" : device.Trim();
    }

    /** Telefon baglantisini devralir; ayni anda tek mikrofon akisi olur. */
    public static void Serve(TcpClient client, string device)
    {
        Serve(client, device, false);
    }

    public static void Serve(TcpClient client, string device, bool chunked)
    {
        int mine;
        lock (gate) {
            if (!string.IsNullOrEmpty(device)) wantedDevice = device.Trim();
            if (current != null) { try { current.Close(); } catch { } }
            current = client;
            mine = ++generation;
        }
        Thread worker = new Thread(delegate() { Run(client, mine, chunked); });
        worker.IsBackground = true;
        worker.Name = "Cep Kopru telefon mikrofonu";
        worker.SetApartmentState(ApartmentState.MTA);
        worker.Start();
    }

    public static void StopAll()
    {
        lock (gate) {
            generation++;
            if (current != null) { try { current.Close(); } catch { } current = null; }
        }
    }

    private static bool Alive(int mine) { lock (gate) { return mine == generation; } }

    private static void Check(int hr, string what)
    {
        if (hr < 0) throw new InvalidOperationException(what + " (0x" + hr.ToString("X8") + ")");
    }

    private static int ReadExact(Stream stream, byte[] buffer, int count)
    {
        int total = 0;
        while (total < count) {
            int n = stream.Read(buffer, total, count - total);
            if (n <= 0) return total;
            total += n;
        }
        return total;
    }

    // HttpURLConnection sends an unbounded request as HTTP chunks. Decode the
    // transport framing before interpreting CKM1 and PCM samples.
    internal sealed class ChunkedBody : Stream
    {
        private readonly Stream source;
        private int remaining;
        private bool separator;
        private bool ended;
        internal ChunkedBody(Stream source) { this.source = source; }
        private string Line()
        {
            StringBuilder text = new StringBuilder();
            while (text.Length < 1024) {
                int b = source.ReadByte();
                if (b < 0) throw new EndOfStreamException();
                if (b == 13) {
                    if (source.ReadByte() != 10) throw new IOException("Invalid chunk line");
                    return text.ToString();
                }
                text.Append((char)b);
            }
            throw new IOException("Chunk line too long");
        }
        public override int Read(byte[] buffer, int offset, int count)
        {
            if (count == 0 || ended) return 0;
            if (remaining == 0) {
                if (separator && Line().Length != 0) throw new IOException("Invalid chunk separator");
                string size = Line().Split(';')[0];
                if (!int.TryParse(size, System.Globalization.NumberStyles.HexNumber,
                    System.Globalization.CultureInfo.InvariantCulture, out remaining) || remaining < 0)
                    throw new IOException("Invalid chunk size");
                if (remaining == 0) { ended = true; return 0; }
                separator = true;
            }
            int read = source.Read(buffer, offset, Math.Min(count, remaining));
            if (read <= 0) throw new EndOfStreamException();
            remaining -= read;
            return read;
        }
        public override bool CanRead { get { return true; } }
        public override bool CanSeek { get { return false; } }
        public override bool CanWrite { get { return false; } }
        public override long Length { get { throw new NotSupportedException(); } }
        public override long Position { get { throw new NotSupportedException(); } set { throw new NotSupportedException(); } }
        public override void Flush() { }
        public override long Seek(long offset, SeekOrigin origin) { throw new NotSupportedException(); }
        public override void SetLength(long value) { throw new NotSupportedException(); }
        public override void Write(byte[] buffer, int offset, int count) { throw new NotSupportedException(); }
    }

    private static void Run(TcpClient client, int mine, bool chunked)
    {
        IAudioClient audio = null;
        IntPtr mix = IntPtr.Zero;
        Stream stream = null;
        string target;
        lock (gate) target = wantedDevice;
        LastError = "";
        try {
            client.NoDelay = true;
            client.ReceiveTimeout = 8000;
            stream = client.GetStream();
            if (chunked) stream = new ChunkedBody(stream);

            AlignSteamMicrophone(target);
            try { RaiseCaptureLevel(target); } catch { }
            IMMDevice device = FindRender(target);
            Guid audioId = typeof(IAudioClient).GUID;
            object instance;
            Check(device.Activate(ref audioId, 23, IntPtr.Zero, out instance), "Ses cikisi acilamadi");
            audio = (IAudioClient)instance;
            Check(audio.GetMixFormat(out mix), "Ses bicimi okunamadi");

            int tag = Marshal.ReadInt16(mix, 0) & 0xFFFF;
            int channels = Marshal.ReadInt16(mix, 2);
            int rate = Marshal.ReadInt32(mix, 4);
            int blockAlign = Marshal.ReadInt16(mix, 12);
            int bits = Marshal.ReadInt16(mix, 14);
            bool isFloat = tag == 3;
            if (tag == 0xFFFE) {
                byte[] sub = new byte[16];
                Marshal.Copy(new IntPtr(mix.ToInt64() + 24), sub, 0, 16);
                isFloat = new Guid(sub) == new Guid("00000003-0000-0010-8000-00aa00389b71");
            }
            if (channels < 1 || rate < 8000 || rate > 192000) throw new InvalidOperationException("Desteklenmeyen ses bicimi");
            if (isFloat && bits != 32) throw new InvalidOperationException("Desteklenmeyen kayan noktali bicim");
            if (!isFloat && bits != 16 && bits != 32) throw new InvalidOperationException("Desteklenmeyen ornek boyutu");

            // 100 ms arabellek: telefon Wi-Fi'de dalgalansa da ses kesilmesin.
            Check(audio.Initialize(0, 0, 1000000, 0, mix, IntPtr.Zero), "Ses cikisi baslatilamadi");
            uint bufferFrames;
            Check(audio.GetBufferSize(out bufferFrames), "Arabellek boyutu okunamadi");
            Guid renderId = typeof(IAudioRenderClient).GUID;
            object renderObject;
            Check(audio.GetService(ref renderId, out renderObject), "Ses yazici alinamadi");
            IAudioRenderClient render = (IAudioRenderClient)renderObject;

            // Telefon basligi: "CKM1" + rate(4) + channels(2) + bits(2)
            byte[] head = new byte[12];
            if (ReadExact(stream, head, 12) != 12) throw new InvalidOperationException("Mikrofon basligi eksik");
            if (Encoding.ASCII.GetString(head, 0, 4) != "CKM1") throw new InvalidOperationException("Mikrofon basligi gecersiz");
            int srcRate = BitConverter.ToInt32(head, 4);
            int srcChannels = BitConverter.ToInt16(head, 8);
            int srcBits = BitConverter.ToInt16(head, 10);
            if (srcRate < 8000 || srcRate > 48000 || srcChannels < 1 || srcChannels > 2 || srcBits != 16)
                throw new InvalidOperationException("Telefon ses bicimi desteklenmiyor");

            Check(audio.Start(), "Ses cikisi calistirilamadi");
            streaming = true;

            byte[] chunk = new byte[srcRate * srcChannels * 2 / 10]; // ~100 ms
            int frameBytes = srcChannels * 2;
            int carry = 0; // TCP tek bayt da teslim edebilir: yarim ornek bir sonraki okumaya kalir
            // Telefon orneklerinden aygit hizina dogrusal aradegerli yeniden ornekleme
            // (16 kHz -> 48 kHz'de en yakin ornegi almak cizirti yapar).
            double step = (double)srcRate / rate;
            double cursor = 0;
            short[] pending = new short[0];
            int pendingFrames = 0;
            // Telefon ve PC saatleri arasindaki kucuk fark gecikme biriktirmesin.
            int backlogLimit = srcRate * 3 / 10;  // 300 ms
            int backlogKeep = srcRate / 20;       // 50 ms
            int bytesPerSample = bits / 8;
            byte[] outBytes = new byte[0];

            while (Alive(mine)) {
                int read = stream.Read(chunk, carry, chunk.Length - carry);
                if (read <= 0) break;
                read += carry;
                int frames = read / frameBytes;
                carry = read - frames * frameBytes;
                if (frames <= 0) continue;
                if (pending.Length < (pendingFrames + frames) * srcChannels)
                    Array.Resize(ref pending, (pendingFrames + frames) * srcChannels * 2);
                for (int i = 0; i < frames * srcChannels; i++)
                    pending[pendingFrames * srcChannels + i] = BitConverter.ToInt16(chunk, i * 2);
                pendingFrames += frames;
                if (carry > 0) Array.Copy(chunk, frames * frameBytes, chunk, 0, carry);

                if (pendingFrames > backlogLimit) {
                    int drop = pendingFrames - backlogKeep;
                    Array.Copy(pending, drop * srcChannels, pending, 0, backlogKeep * srcChannels);
                    pendingFrames = backlogKeep;
                    cursor = 0;
                }

                // Cikisa ne kadar sigacagini bul.
                uint padding;
                Check(audio.GetCurrentPadding(out padding), "Arabellek durumu okunamadi");
                uint free = bufferFrames - padding;
                if (free == 0) { Thread.Sleep(5); continue; }

                if (pendingFrames < 2 || pendingFrames - 1 < cursor) continue;
                int available = (int)Math.Floor((pendingFrames - 1 - cursor) / step) + 1;
                int write = Math.Min(available, (int)free);
                if (write <= 0) continue;

                int needed = write * blockAlign;
                if (outBytes.Length < needed) outBytes = new byte[needed];
                else Array.Clear(outBytes, 0, needed);
                for (int frame = 0; frame < write; frame++) {
                    double pos = cursor + frame * step;
                    int i0 = (int)pos;
                    if (i0 >= pendingFrames) i0 = pendingFrames - 1;
                    int i1 = i0 + 1 < pendingFrames ? i0 + 1 : i0;
                    double frac = pos - i0;
                    for (int ch = 0; ch < channels; ch++) {
                        int srcChannel = ch < srcChannels ? ch : srcChannels - 1;
                        double a = pending[i0 * srcChannels + srcChannel];
                        double b = pending[i1 * srcChannels + srcChannel];
                        int sample = (int)Math.Round(a + (b - a) * frac);
                        if (sample > 32767) sample = 32767; else if (sample < -32768) sample = -32768;
                        int at = frame * blockAlign + ch * bytesPerSample;
                        if (isFloat) {
                            byte[] f = BitConverter.GetBytes(sample / 32768f);
                            outBytes[at] = f[0]; outBytes[at + 1] = f[1]; outBytes[at + 2] = f[2]; outBytes[at + 3] = f[3];
                        } else if (bits == 16) {
                            outBytes[at] = (byte)sample; outBytes[at + 1] = (byte)(sample >> 8);
                        } else {
                            int wide = sample << 16;
                            outBytes[at] = (byte)wide; outBytes[at + 1] = (byte)(wide >> 8);
                            outBytes[at + 2] = (byte)(wide >> 16); outBytes[at + 3] = (byte)(wide >> 24);
                        }
                    }
                }
                IntPtr buffer;
                Check(render.GetBuffer((uint)write, out buffer), "Ses arabellegi alinamadi");
                Marshal.Copy(outBytes, 0, buffer, needed);
                Check(render.ReleaseBuffer((uint)write, 0), "Ses arabellegi yazilamadi");

                cursor += write * step;
                int consumed = (int)Math.Floor(cursor);
                if (consumed > pendingFrames) consumed = pendingFrames;
                if (consumed > 0) {
                    int keep = pendingFrames - consumed;
                    Array.Copy(pending, consumed * srcChannels, pending, 0, keep * srcChannels);
                    pendingFrames = keep;
                    cursor -= consumed;
                }
            }
        } catch (Exception error) {
            LastError = error.Message;
        } finally {
            streaming = false;
            if (audio != null) { try { audio.Stop(); } catch { } }
            if (mix != IntPtr.Zero) Marshal.FreeCoTaskMem(mix);
            if (stream != null) { try { stream.Close(); } catch { } }
            try { client.Close(); } catch { }
            lock (gate) { if (current == client) current = null; }
        }
    }
}

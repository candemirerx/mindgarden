using System;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

// Bilgisayarda çalan sesi (WASAPI loopback) yakalar ve tek bir telefona
// 16 bit stereo PCM olarak akıtır. Ek sürücü veya kütüphane gerekmez.
public static class PcAudio
{
    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")] private class MMDeviceEnumeratorCom { }

    [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IMMDeviceEnumerator {
        [PreserveSig] int EnumAudioEndpoints(int dataFlow, int stateMask, out IntPtr devices);
        [PreserveSig] int GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice device);
    }

    [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IMMDevice {
        [PreserveSig] int Activate(ref Guid iid, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object instance);
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

    [ComImport, Guid("C8ADBD64-E71E-48a0-A4DE-185C395CD317"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IAudioCaptureClient {
        [PreserveSig] int GetBuffer(out IntPtr data, out uint frames, out uint flags, out ulong devicePosition, out ulong qpcPosition);
        [PreserveSig] int ReleaseBuffer(uint frames);
        [PreserveSig] int GetNextPacketSize(out uint frames);
    }

    private const int StreamLoopback = 0x00020000;
    private const uint BufferSilent = 0x2;
    private static readonly object gate = new object();
    private static TcpClient current;
    private static int generation;

    public static string LastError = "";

    // Yeni telefon bağlanınca önceki akış kapanır; aynı anda tek dinleyici olur.
    public static void Serve(TcpClient client)
    {
        int mine;
        lock (gate) {
            if (current != null) { try { current.Close(); } catch { } }
            current = client;
            mine = ++generation;
        }
        Thread worker = new Thread(delegate() { Run(client, mine); });
        worker.IsBackground = true;
        worker.Name = "Cep Kopru PC sesi";
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

    private static void Run(TcpClient client, int mine)
    {
        IAudioClient audio = null;
        IntPtr mix = IntPtr.Zero;
        NetworkStream stream = null;
        bool headerSent = false;
        try {
            client.NoDelay = true;
            client.SendTimeout = 5000;
            stream = client.GetStream();

            IMMDeviceEnumerator enumerator = (IMMDeviceEnumerator)new MMDeviceEnumeratorCom();
            IMMDevice device;
            Check(enumerator.GetDefaultAudioEndpoint(0, 0, out device), "Varsayılan hoparlör bulunamadı");
            Guid audioId = typeof(IAudioClient).GUID;
            object instance;
            Check(device.Activate(ref audioId, 23, IntPtr.Zero, out instance), "Ses aygıtı açılamadı");
            audio = (IAudioClient)instance;
            Check(audio.GetMixFormat(out mix), "Ses biçimi okunamadı");

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
            if (channels < 1 || rate < 8000 || rate > 192000) throw new InvalidOperationException("Desteklenmeyen ses biçimi");
            if (isFloat && bits != 32) throw new InvalidOperationException("Desteklenmeyen kayan noktalı biçim");
            if (!isFloat && bits != 16 && bits != 24 && bits != 32) throw new InvalidOperationException("Desteklenmeyen örnek boyutu");

            // 50 ms paylaşılan arabellek: düşük gecikme, çoğu sürücüyle uyumlu.
            Check(audio.Initialize(0, StreamLoopback, 500000, 0, mix, IntPtr.Zero), "Ses yakalama başlatılamadı");
            Guid captureId = typeof(IAudioCaptureClient).GUID;
            object captureObject;
            Check(audio.GetService(ref captureId, out captureObject), "Ses yakalayıcı alınamadı");
            IAudioCaptureClient capture = (IAudioCaptureClient)captureObject;

            byte[] header = new byte[12];
            Encoding.ASCII.GetBytes("CKA1").CopyTo(header, 0);
            BitConverter.GetBytes(rate).CopyTo(header, 4);
            BitConverter.GetBytes((short)2).CopyTo(header, 8);
            BitConverter.GetBytes((short)16).CopyTo(header, 10);
            byte[] http = Encoding.ASCII.GetBytes("HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nCache-Control: no-store\r\nConnection: close\r\n\r\n");
            stream.Write(http, 0, http.Length);
            stream.Write(header, 0, header.Length);
            headerSent = true;

            Check(audio.Start(), "Ses yakalama başlamadı");
            byte[] raw = new byte[0];
            byte[] pcm = new byte[0];
            byte[] keepAlive = new byte[(rate / 100) * 4];
            DateTime lastSend = DateTime.UtcNow;
            LastError = "";
            while (Alive(mine)) {
                uint packet;
                Check(capture.GetNextPacketSize(out packet), "Ses paketi okunamadı");
                if (packet == 0) {
                    // Windows sessizken paket üretmez; bağlantı düşmesin diye kısa sessizlik gönderilir.
                    if ((DateTime.UtcNow - lastSend).TotalMilliseconds > 500) { stream.Write(keepAlive, 0, keepAlive.Length); lastSend = DateTime.UtcNow; }
                    Thread.Sleep(4);
                    continue;
                }
                while (packet > 0 && Alive(mine)) {
                    IntPtr data; uint frames; uint flags; ulong position; ulong qpc;
                    Check(capture.GetBuffer(out data, out frames, out flags, out position, out qpc), "Ses arabelleği alınamadı");
                    int outBytes = (int)frames * 4;
                    if (pcm.Length < outBytes) pcm = new byte[outBytes];
                    if ((flags & BufferSilent) != 0 || data == IntPtr.Zero) {
                        Array.Clear(pcm, 0, outBytes);
                    } else {
                        int inBytes = (int)frames * blockAlign;
                        if (raw.Length < inBytes) raw = new byte[inBytes];
                        Marshal.Copy(data, raw, 0, inBytes);
                        ToStereo16(raw, (int)frames, channels, blockAlign, bits, isFloat, pcm);
                    }
                    Check(capture.ReleaseBuffer(frames), "Ses arabelleği bırakılamadı");
                    stream.Write(pcm, 0, outBytes);
                    lastSend = DateTime.UtcNow;
                    Check(capture.GetNextPacketSize(out packet), "Ses paketi okunamadı");
                }
            }
        } catch (Exception e) {
            if (Alive(mine)) LastError = e.Message;
            if (!headerSent && stream != null) {
                try {
                    byte[] body = Encoding.UTF8.GetBytes("{\"ok\":false,\"error\":\"" + e.Message.Replace("\\", "/").Replace("\"", "'") + "\"}");
                    byte[] head = Encoding.ASCII.GetBytes("HTTP/1.1 503 Error\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: " + body.Length + "\r\nConnection: close\r\n\r\n");
                    stream.Write(head, 0, head.Length); stream.Write(body, 0, body.Length);
                } catch { }
            }
        } finally {
            if (audio != null) { try { audio.Stop(); } catch { } }
            if (mix != IntPtr.Zero) Marshal.FreeCoTaskMem(mix);
            try { client.Close(); } catch { }
            lock (gate) { if (current == client) current = null; }
        }
    }

    private static short Sample(byte[] raw, int offset, int bits, bool isFloat)
    {
        if (isFloat) {
            float f = BitConverter.ToSingle(raw, offset);
            if (f > 1f) f = 1f; else if (f < -1f) f = -1f;
            return (short)(f * 32767f);
        }
        if (bits == 16) return BitConverter.ToInt16(raw, offset);
        if (bits == 24) return (short)(raw[offset + 1] | (raw[offset + 2] << 8));
        return (short)(BitConverter.ToInt32(raw, offset) >> 16);
    }

    private static void ToStereo16(byte[] raw, int frames, int channels, int blockAlign, int bits, bool isFloat, byte[] pcm)
    {
        int bytesPerSample = bits / 8;
        for (int i = 0; i < frames; i++) {
            int frame = i * blockAlign;
            short left = Sample(raw, frame, bits, isFloat);
            short right = channels > 1 ? Sample(raw, frame + bytesPerSample, bits, isFloat) : left;
            int o = i * 4;
            pcm[o] = (byte)left; pcm[o + 1] = (byte)(left >> 8);
            pcm[o + 2] = (byte)right; pcm[o + 3] = (byte)(right >> 8);
        }
    }
}

using System;
using System.Collections.Generic;
using System.Net.Sockets;
using System.Text;
using System.Threading;

// Stage only complete requests before the single PowerShell command executor.
// A slow/dead client must not occupy that executor's 1500 ms read timeout.
// Execution remains serialized: clipboard, typing and button order are unchanged.
public sealed class HttpIngress : IDisposable
{
    [System.Runtime.InteropServices.DllImport("winmm.dll")]
    static extern uint timeBeginPeriod(uint period);
    [System.Runtime.InteropServices.DllImport("winmm.dll")]
    static extern uint timeEndPeriod(uint period);
    sealed class Pending
    {
        public TcpClient Client;
        public long Since;
        public int Expected = -1;
    }
    readonly TcpListener[] listeners;
    readonly List<Pending> pending = new List<Pending>();
    readonly byte[] peek = new byte[16384];
    const int MaxPending = 32;
    const int HeaderLimit = 16384;
    const int BodyLimit = 1048576;
    static long Clock { get { return System.Diagnostics.Stopwatch.GetTimestamp(); } }
    static double Elapsed(long since) { return (Clock - since) * 1000.0 / System.Diagnostics.Stopwatch.Frequency; }

    bool timer;
    public HttpIngress(TcpListener listener) : this(new[] { listener }) { }
    public HttpIngress(TcpListener[] listeners) {
        this.listeners = listeners;
        // Windows' default Sleep(1) may sleep 15.6 ms. This request belongs
        // only to the helper process and is released when ingress is disposed.
        timer = timeBeginPeriod(1) == 0;
    }

    public TcpClient Next()
    {
        for (;;)
        {
            foreach (var listener in listeners)
            while (listener.Pending())
            {
                var c = listener.AcceptTcpClient();
                c.NoDelay = true;
                if (pending.Count >= MaxPending) { c.Close(); break; }
                pending.Add(new Pending { Client = c, Since = Clock });
            }
            for (int i = 0; i < pending.Count; )
            {
                var p = pending[i];
                bool discard = Elapsed(p.Since) >= 1500;
                try
                {
                    var s = p.Client.Client;
                    int available = s.Available;
                    if (!discard && available == 0 && s.Poll(0, SelectMode.SelectRead)) discard = true;
                    if (!discard && p.Expected < 0 && available > 0)
                    {
                        int n = s.Receive(peek, 0, Math.Min(available, peek.Length), SocketFlags.Peek);
                        int end = -1;
                        for (int j = 3; j < n; j++)
                            if (peek[j-3] == 13 && peek[j-2] == 10 && peek[j-1] == 13 && peek[j] == 10) { end = j+1; break; }
                        if (end < 0) discard = available >= HeaderLimit;
                        else
                        {
                            string header = Encoding.ASCII.GetString(peek, 0, end);
                            string requestLine = header.Substring(0, header.IndexOf("\r\n"));
                            bool micUpload = requestLine == "POST /mic HTTP/1.1" ||
                                (requestLine.StartsWith("POST /mic?device=", StringComparison.Ordinal) && requestLine.EndsWith(" HTTP/1.1", StringComparison.Ordinal));
                            bool chunked = false;
                            int length = 0;
                            bool seen = false;
                            foreach (string line in header.Split(new[] { "\r\n" }, StringSplitOptions.None))
                            {
                                if (line.StartsWith("Transfer-Encoding:", StringComparison.OrdinalIgnoreCase)) {
                                    if (!micUpload || chunked || !line.Substring(18).Trim().Equals("chunked", StringComparison.OrdinalIgnoreCase)) { discard = true; break; }
                                    chunked = true;
                                    continue;
                                }
                                if (!line.StartsWith("Content-Length:", StringComparison.OrdinalIgnoreCase)) continue;
                                int value;
                                if (seen || !int.TryParse(line.Substring(15).Trim(), out value) || value < 0 || value > BodyLimit) { discard = true; break; }
                                seen = true; length = value;
                            }
                            if (chunked && seen) discard = true;
                            p.Expected = end + length;
                        }
                    }
                    if (!discard && p.Expected >= 0 && available >= p.Expected)
                    {
                        pending.RemoveAt(i);
                        return p.Client;
                    }
                }
                catch (SocketException) { discard = true; }
                catch (ObjectDisposedException) { discard = true; }
                if (discard) { p.Client.Close(); pending.RemoveAt(i); }
                else i++;
            }
            Thread.Sleep(1);
        }
    }

    public void Dispose()
    {
        foreach (var p in pending) p.Client.Close();
        pending.Clear();
        if (timer) { timeEndPeriod(1); timer = false; }
    }
}

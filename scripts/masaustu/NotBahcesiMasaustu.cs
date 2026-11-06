// Not Bahçesi — taşınabilir Windows başlatıcısı.
//
// Yönetici izni istemez, kurulum yapmaz. Yanındaki "uygulama" klasöründeki
// statik derlemeyi yalnızca bu bilgisayardan erişilebilen yerel bir sunucudan
// yayınlar ve Edge (yoksa Chrome) uygulama penceresinde açar. Tarayıcı profili
// ve tüm notlar "veri" klasöründe durur; klasör taşınınca veriler de taşınır.
// Pencere kapanınca sunucu da kapanır.
//
// .NET Framework 4 derleyicisiyle (C# 5) derlenir: scripts/masaustu/paketle.ps1

using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Windows.Forms;

[assembly: System.Reflection.AssemblyTitle("Not Bahçesi")]
[assembly: System.Reflection.AssemblyProduct("Not Bahçesi")]
[assembly: System.Reflection.AssemblyVersion("1.0.8.0")]

static class Program
{
    // Sabit kapı: tarayıcı verileri (localStorage) adres kökenine bağlıdır,
    // kapı değişirse notlar görünmez olur.
    const int KAPI = 47321;
    const string API_SUNUCUSU = "https://mindgarden-neon.vercel.app";

    static string kokKlasor, uygulamaKlasoru, veriKlasoru, profilKlasoru;
    static string Adres { get { return "http://localhost:" + KAPI + "/"; } }

    [STAThread]
    static void Main()
    {
        kokKlasor = AppDomain.CurrentDomain.BaseDirectory;
        uygulamaKlasoru = Path.GetFullPath(Path.Combine(kokKlasor, "uygulama"));
        veriKlasoru = Path.Combine(kokKlasor, "veri");
        profilKlasoru = Path.Combine(veriKlasoru, "tarayici");

        if (!File.Exists(Path.Combine(uygulamaKlasoru, "index.html")))
        {
            Hata("Uygulama dosyaları bulunamadı:\n" + uygulamaKlasoru);
            return;
        }
        Directory.CreateDirectory(profilKlasoru);

        bool ilkKopya;
        string mutexAdi = "NotBahcesiMasaustu_" + kokKlasor.ToLowerInvariant().GetHashCode().ToString("X");
        using (var mutex = new Mutex(true, mutexAdi, out ilkKopya))
        {
            if (!ilkKopya)
            {
                // Sunucu zaten açık: yalnızca yeni bir pencere aç.
                PencereAc();
                return;
            }

            var dinleyiciler = new List<TcpListener>();
            try
            {
                dinleyiciler.Add(Dinle(IPAddress.Loopback));
            }
            catch (SocketException)
            {
                Hata("Yerel kapı " + KAPI + " başka bir program tarafından kullanılıyor.\n" +
                     "O programı kapatıp Not Bahçesi'ni yeniden açın.");
                return;
            }
            try { dinleyiciler.Add(Dinle(IPAddress.IPv6Loopback)); } catch { /* IPv6 yoksa sorun değil */ }

            Process tarayici = PencereAc();

            // Pencere(ler) açık olduğu sürece bekle. Tarayıcı profilini kilitlediği
            // için kilit dosyası açılamıyorsa en az bir pencere açıktır.
            Thread.Sleep(8000);
            int bosTur = 0;
            while (bosTur < 2)
            {
                bool calisiyor = (tarayici != null && !tarayici.HasExited) || ProfilKullaniliyor();
                bosTur = calisiyor ? 0 : bosTur + 1;
                Thread.Sleep(2500);
            }
            foreach (var d in dinleyiciler) { try { d.Stop(); } catch { } }
        }
    }

    static void Hata(string mesaj)
    {
        MessageBox.Show(mesaj, "Not Bahçesi", MessageBoxButtons.OK, MessageBoxIcon.Warning);
    }

    static bool ProfilKullaniliyor()
    {
        string kilit = Path.Combine(profilKlasoru, "lockfile");
        if (!File.Exists(kilit)) return false;
        try
        {
            using (new FileStream(kilit, FileMode.Open, FileAccess.ReadWrite, FileShare.None)) { }
            return false;
        }
        catch (IOException) { return true; }
        catch (UnauthorizedAccessException) { return true; }
    }

    /* ------------------------------------------------------------ */
    /* Tarayıcı penceresi                                            */
    /* ------------------------------------------------------------ */

    static string TarayiciBul()
    {
        string pf86 = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86);
        string pf = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);
        string yerel = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string[] adaylar = {
            Path.Combine(pf86, @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(pf, @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(yerel, @"Microsoft\Edge\Application\msedge.exe"),
            Path.Combine(pf, @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(pf86, @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(yerel, @"Google\Chrome\Application\chrome.exe"),
        };
        foreach (var a in adaylar) if (File.Exists(a)) return a;
        return null;
    }

    static Process PencereAc()
    {
        string tarayici = TarayiciBul();
        if (tarayici == null)
        {
            // Son çare: varsayılan tarayıcıda sekme olarak aç.
            Process.Start(Adres);
            return null;
        }
        string argumanlar =
            "--app=" + Adres +
            " --user-data-dir=\"" + profilKlasoru + "\"" +
            " --no-first-run --no-default-browser-check --disable-sync" +
            " --window-size=1280,860";
        return Process.Start(new ProcessStartInfo(tarayici, argumanlar) { UseShellExecute = false });
    }

    /* ------------------------------------------------------------ */
    /* Yerel HTTP sunucusu                                           */
    /* ------------------------------------------------------------ */

    static TcpListener Dinle(IPAddress ip)
    {
        var dinleyici = new TcpListener(ip, KAPI);
        dinleyici.Start(64);
        var t = new Thread(() =>
        {
            while (true)
            {
                TcpClient istemci;
                try { istemci = dinleyici.AcceptTcpClient(); }
                catch { return; }
                ThreadPool.QueueUserWorkItem(_ => Isle(istemci));
            }
        });
        t.IsBackground = true;
        t.Start();
        return dinleyici;
    }

    static string SatirOku(Stream s)
    {
        var bayt = new List<byte>();
        int b;
        while ((b = s.ReadByte()) != -1)
        {
            if (b == '\n') break;
            if (b != '\r') bayt.Add((byte)b);
            if (bayt.Count > 16384) throw new IOException("Satır çok uzun");
        }
        if (b == -1 && bayt.Count == 0) return null;
        return Encoding.UTF8.GetString(bayt.ToArray());
    }

    static void Isle(TcpClient istemci)
    {
        using (istemci)
        {
            try
            {
                istemci.ReceiveTimeout = 30000;
                var akis = istemci.GetStream();
                string ilk = SatirOku(akis);
                if (string.IsNullOrEmpty(ilk)) return;
                string[] parca = ilk.Split(' ');
                if (parca.Length < 2) return;
                string yontem = parca[0].ToUpperInvariant();
                string hedef = parca[1];

                var basliklar = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                string satir;
                while (!string.IsNullOrEmpty(satir = SatirOku(akis)))
                {
                    int i = satir.IndexOf(':');
                    if (i > 0) basliklar[satir.Substring(0, i).Trim()] = satir.Substring(i + 1).Trim();
                }

                // DNS yeniden bağlama saldırılarına karşı yalnızca yerel adlar kabul edilir.
                string host;
                basliklar.TryGetValue("Host", out host);
                if (host != "localhost:" + KAPI && host != "127.0.0.1:" + KAPI && host != "[::1]:" + KAPI)
                {
                    Yanit(akis, 403, "text/plain; charset=utf-8", Encoding.UTF8.GetBytes("Yasak"), null, yontem == "HEAD");
                    return;
                }

                byte[] govde = new byte[0];
                string uzunluk;
                if (basliklar.TryGetValue("Content-Length", out uzunluk))
                {
                    int n = int.Parse(uzunluk);
                    if (n < 0 || n > 4 * 1024 * 1024) { Yanit(akis, 413, "text/plain", new byte[0], null, false); return; }
                    govde = new byte[n];
                    int okunan = 0;
                    while (okunan < n)
                    {
                        int r = akis.Read(govde, okunan, n - okunan);
                        if (r <= 0) break;
                        okunan += r;
                    }
                }

                string yol = hedef;
                int soru = yol.IndexOfAny(new[] { '?', '#' });
                if (soru >= 0) yol = yol.Substring(0, soru);
                yol = Uri.UnescapeDataString(yol);

                if (yol.StartsWith("/api/", StringComparison.OrdinalIgnoreCase))
                {
                    if (yontem == "OPTIONS") { Yanit(akis, 204, null, new byte[0], null, false); return; }
                    ApiAktar(akis, yontem, hedef, basliklar, govde);
                    return;
                }
                if (yontem != "GET" && yontem != "HEAD")
                {
                    Yanit(akis, 405, "text/plain", new byte[0], null, false);
                    return;
                }
                DosyaGonder(akis, yol, yontem == "HEAD");
            }
            catch { /* bağlantı koptu */ }
        }
    }

    static void DosyaGonder(Stream akis, string yol, bool yalnizBaslik)
    {
        string goreli = yol.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
        string kok = uygulamaKlasoru.TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
        string tam = null;
        int durum = 200;

        try { tam = Path.GetFullPath(Path.Combine(uygulamaKlasoru, goreli)); } catch { tam = null; }
        if (tam != null && !(tam + Path.DirectorySeparatorChar).StartsWith(kok, StringComparison.OrdinalIgnoreCase))
            tam = null;

        if (tam != null)
        {
            if (Directory.Exists(tam)) tam = Path.Combine(tam, "index.html");
            else if (!File.Exists(tam) && File.Exists(tam + ".html")) tam = tam + ".html";
        }

        if (tam == null || !File.Exists(tam))
        {
            durum = 404;
            tam = Path.Combine(uygulamaKlasoru, "404.html");
        }

        byte[] icerik = File.Exists(tam) ? File.ReadAllBytes(tam) : Encoding.UTF8.GetBytes("Bulunamadı");
        string onbellek = yol.StartsWith("/_next/static/") ? "public, max-age=31536000, immutable" : "no-cache";
        Yanit(akis, durum, Tur(tam), icerik, new Dictionary<string, string> { { "Cache-Control", onbellek } }, yalnizBaslik);
    }

    static void ApiAktar(Stream akis, string yontem, string hedef, Dictionary<string, string> basliklar, byte[] govde)
    {
        try
        {
            ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072; // TLS 1.2
            var istek = (HttpWebRequest)WebRequest.Create(API_SUNUCUSU + hedef);
            istek.Method = yontem;
            istek.Timeout = 120000;
            istek.ReadWriteTimeout = 120000;
            string deger;
            if (basliklar.TryGetValue("Content-Type", out deger)) istek.ContentType = deger;
            if (basliklar.TryGetValue("Authorization", out deger)) istek.Headers["Authorization"] = deger;
            if (basliklar.TryGetValue("Accept", out deger)) istek.Accept = deger;
            if (govde.Length > 0 && yontem != "GET" && yontem != "HEAD")
            {
                istek.ContentLength = govde.Length;
                using (var g = istek.GetRequestStream()) g.Write(govde, 0, govde.Length);
            }

            HttpWebResponse cevap;
            try { cevap = (HttpWebResponse)istek.GetResponse(); }
            catch (WebException we)
            {
                cevap = we.Response as HttpWebResponse;
                if (cevap == null) throw;
            }
            using (cevap)
            using (var ms = new MemoryStream())
            {
                using (var c = cevap.GetResponseStream()) c.CopyTo(ms);
                Yanit(akis, (int)cevap.StatusCode, cevap.ContentType, ms.ToArray(),
                      new Dictionary<string, string> { { "Cache-Control", "no-store" } }, false);
            }
        }
        catch (Exception)
        {
            byte[] h = Encoding.UTF8.GetBytes("{\"error\":\"Yapay zekâ sunucusuna ulaşılamadı. İnternet bağlantısını kontrol edin.\"}");
            Yanit(akis, 502, "application/json; charset=utf-8", h, null, false);
        }
    }

    static void Yanit(Stream akis, int durum, string tur, byte[] icerik, Dictionary<string, string> ek, bool yalnizBaslik)
    {
        var sb = new StringBuilder();
        sb.Append("HTTP/1.1 ").Append(durum).Append(' ').Append(DurumMetni(durum)).Append("\r\n");
        if (!string.IsNullOrEmpty(tur)) sb.Append("Content-Type: ").Append(tur).Append("\r\n");
        sb.Append("Content-Length: ").Append(icerik.Length).Append("\r\n");
        sb.Append("X-Content-Type-Options: nosniff\r\n");
        sb.Append("Connection: close\r\n");
        if (ek != null) foreach (var kv in ek) sb.Append(kv.Key).Append(": ").Append(kv.Value).Append("\r\n");
        sb.Append("\r\n");
        byte[] bas = Encoding.ASCII.GetBytes(sb.ToString());
        akis.Write(bas, 0, bas.Length);
        if (!yalnizBaslik && icerik.Length > 0) akis.Write(icerik, 0, icerik.Length);
        akis.Flush();
    }

    static string DurumMetni(int d)
    {
        switch (d)
        {
            case 200: return "OK";
            case 204: return "No Content";
            case 400: return "Bad Request";
            case 401: return "Unauthorized";
            case 403: return "Forbidden";
            case 404: return "Not Found";
            case 405: return "Method Not Allowed";
            case 413: return "Payload Too Large";
            case 429: return "Too Many Requests";
            case 502: return "Bad Gateway";
            default: return "Status";
        }
    }

    static string Tur(string dosya)
    {
        switch (Path.GetExtension(dosya).ToLowerInvariant())
        {
            case ".html": return "text/html; charset=utf-8";
            case ".js": case ".mjs": return "text/javascript; charset=utf-8";
            case ".css": return "text/css; charset=utf-8";
            case ".json": return "application/json; charset=utf-8";
            case ".txt": return "text/plain; charset=utf-8";
            case ".svg": return "image/svg+xml";
            case ".png": return "image/png";
            case ".jpg": case ".jpeg": return "image/jpeg";
            case ".webp": return "image/webp";
            case ".gif": return "image/gif";
            case ".ico": return "image/x-icon";
            case ".woff": return "font/woff";
            case ".woff2": return "font/woff2";
            case ".ttf": return "font/ttf";
            case ".wasm": return "application/wasm";
            case ".zip": return "application/zip";
            case ".webmanifest": return "application/manifest+json";
            default: return "application/octet-stream";
        }
    }
}

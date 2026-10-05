// Windows built-in WebDAV redirector maps this loopback-only proxy. Phone
// files remain on the phone; no sync/cache directory is substituted for a drive.
using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Collections.Generic;
using System.Web.Script.Serialization;
using System.Runtime.InteropServices;
using System.ServiceProcess;
using InTheHand.Net;
using InTheHand.Net.Sockets;

public static class PhoneDrive {
    public const string Marker = "kablosuzbellek-phone-storage";
    public static readonly Guid ServiceId = new Guid("93c7b30b-d973-4873-bf10-148491968b2d");
    private static readonly object Gate = new object(), DriveGate = new object();
    private static TcpListener proxy;
    private static BluetoothListener radio;
    private static Remote remote;
    private static volatile bool running;
    private static int port;
    private static string drive = "", mountError = "", bluetoothError = "";
    private static JavaScriptSerializer Json() { return new JavaScriptSerializer { MaxJsonLength = 65536, RecursionLimit = 12 }; }
    private static string S(IDictionary<string,object> obj,string key) { object value;return obj.TryGetValue(key,out value) ? Convert.ToString(value) : ""; }
    private static long N(IDictionary<string,object> obj,string key) { object value;return obj.TryGetValue(key,out value) ? Convert.ToInt64(value) : 0; }
    public static string Unc { get { Remote current;lock(Gate) current=remote;return @"\\127.0.0.1@" + port + @"\DavWWWRoot\"+(current==null ? "" : current.Client); } }
    public static void Start(int proxyPort,bool bluetooth) {
        lock(Gate) {
            if(running) return;
            port=proxyPort;proxy=new TcpListener(IPAddress.Loopback,port);proxy.Start();running=true;
        }
        new Thread(ProxyLoop) { IsBackground=true,Name="Phone drive proxy" }.Start();
        if(bluetooth) new Thread(BluetoothLoop) { IsBackground=true,Name="Phone drive Bluetooth" }.Start();
    }
    public static void Stop() {
        Remote old;
        lock(Gate) { running=false;old=remote;remote=null; }
        if(old!=null) old.Close();
        try { if(proxy!=null) proxy.Stop(); } catch {}
        try { if(radio!=null) radio.Stop(); } catch {}
        Unmount();
    }
    public static string Register(string url,string token,string client,string name) {
        if(String.IsNullOrEmpty(token)||token.Length<24||!System.Text.RegularExpressions.Regex.IsMatch(client,@"^[a-zA-Z0-9-]{1,100}$")) throw new IOException("Telefon dosya bağlantısı geçersiz.");
        Uri uri;
        if(!Uri.TryCreate(url,UriKind.Absolute,out uri)||uri.Scheme!="http"||uri.Port<1024||uri.UserInfo!=""||uri.Query!=""||uri.AbsolutePath!="/")
            throw new IOException("Telefon adresi geçersiz.");
        var next=new WifiRemote(url.TrimEnd('/'),token,client,name);
        var check=(HttpWebRequest)WebRequest.Create(next.Url+"/_phone/info");
        check.Headers["Authorization"]="Bearer "+token;check.Timeout=5000;check.ReadWriteTimeout=5000;
        using(var response=check.GetResponse())
        using(var reader=new StreamReader(response.GetResponseStream(),Encoding.UTF8)) {
            var info=Json().Deserialize<Dictionary<string,object>>(reader.ReadToEnd());
            if(S(info,"app")!=Marker||N(info,"protocol")!=1) throw new IOException("Bu cihaz telefon dosya paylaşımı sunmuyor.");
        }
        SetRemote(next);ThreadPool.QueueUserWorkItem(delegate { Mount(next); });
        return Info(next);
    }
    public static string Disconnect(string client) {
        Remote old=null;
        lock(Gate) { if(remote!=null&&remote.Client==client) { old=remote;remote=null; } }
        if(old!=null) { old.Close();Unmount(); }
        return "{\"ok\":true}";
    }
    public static string Status() { Remote current;lock(Gate) current=remote;return Info(current); }
    private static string Info(Remote expected) {
        Remote current;lock(Gate) current=remote;
        bool connected=expected!=null&&Object.ReferenceEquals(current,expected);
        return Json().Serialize(new Dictionary<string,object> {
            {"ok",true},{"connected",connected},{"name",connected ? expected.Name : ""},
            {"mapped",connected&&drive!=""},{"drive",connected ? drive : ""},
            {"path",connected ? (drive!="" ? drive+@"\" : Unc) : ""},
            {"browser","http://127.0.0.1:"+port+"/"},{"mountError",connected ? mountError : ""},
            {"transport",connected ? expected.Transport : ""},{"client",connected ? expected.Client : ""},{"bluetoothError",bluetoothError},
            {"phoneUrl",connected&&expected is WifiRemote ? ((WifiRemote)expected).Url : ""}
        });
    }
    private static void SetRemote(Remote next) {
        Unmount();
        Remote old;lock(Gate) { old=remote;remote=next; }
        if(old!=null) old.Close();
    }
    private static void Mount(Remote expected) {
        lock(DriveGate) {
            lock(Gate) { if(!Object.ReferenceEquals(remote,expected)) return; }
            if(drive!="") { mountError="";return; }
            try {
                using(var service=new ServiceController("WebClient")) {
                    if(service.Status!=ServiceControllerStatus.Running) { service.Start();service.WaitForStatus(ServiceControllerStatus.Running,TimeSpan.FromSeconds(8)); }
                }
            } catch { /* WNet also asks the Windows network provider to start. */ }
            uint used=GetLogicalDrives();
            int last=0;
            foreach(char letter in "PQRSTUVWXYZONMLKJIHGFED") {
                if((used & (1u << (letter-'A')))!=0) continue;
                string local=letter+":";
                var resource=new NETRESOURCE { dwType=1,lpLocalName=local,lpRemoteName=Unc };
                last=WNetAddConnection2(ref resource,null,null,0);
                if(last==0) { drive=local;mountError="";return; }
                if(last!=85 && last!=1202) break;
            }
            mountError="Windows ağ sürücüsü açılamadı ("+last+"). Dosyalara bilgisayarda http://127.0.0.1:"+port+"/ adresinden erişebilirsiniz.";
        }
    }
    private static void Unmount() {
        lock(DriveGate) {
            if(drive!="") { int result=WNetCancelConnection2(drive,0,false);if(result==0||result==2250) drive=""; }
        }
    }
    private static void ProxyLoop() {
        while(running) {
            try { var client=proxy.AcceptTcpClient();ThreadPool.QueueUserWorkItem(delegate { ProxyClient(client); }); }
            catch { if(!running) return;Thread.Sleep(100); }
        }
    }
    private static void ProxyClient(TcpClient client) {
        using(client) {
            client.ReceiveTimeout=120000;client.SendTimeout=120000;
            var stream=client.GetStream();bool begun=false;
            try {
                Request request=ReadHttp(stream);
                string host;
                if(!request.Headers.TryGetValue("host",out host) ||
                    !(host.Equals("127.0.0.1:"+port,StringComparison.OrdinalIgnoreCase)||host.Equals("localhost:"+port,StringComparison.OrdinalIgnoreCase))) {
                    Error(stream,403,"Dosya paylaşımı yalnız bilgisayarın yerel adresinden açılır.");return;
                }
                string origin;
                if(request.Headers.TryGetValue("origin",out origin)) {
                    Uri source;
                    if(!Uri.TryCreate(origin,UriKind.Absolute,out source)||!source.IsLoopback||source.Port!=port||source.Scheme!="http") { Error(stream,403,"Bu paylaşım yalnız bu bilgisayardan açılır.");return; }
                }
                if(request.Headers.ContainsKey("transfer-encoding")) { Error(stream,411,"Dosya boyutu gerekli.");return; }
                Remote current;lock(Gate) current=remote;
                if(current==null) { Error(stream,503,"Telefon paylaşımı kapalı. Telefonda Telefon belleği → Bilgisayarda paylaş seçin.");return; }
                string prefix="/"+current.Client;
                if(request.Path=="/" && request.Method=="GET") {
                    Headers(stream,302,new Dictionary<string,object>{{"Location",prefix+"/"}},0);stream.Flush();return;
                }
                if(request.Path=="/"&&request.Method=="OPTIONS") {
                    Headers(stream,200,new Dictionary<string,object>{{"DAV","1,2"},{"Allow","OPTIONS, PROPFIND, GET, HEAD, PUT, DELETE, MKCOL, MOVE, COPY, LOCK, UNLOCK"}},0);stream.Flush();return;
                }
                if(!request.Path.StartsWith(prefix+"/") && request.Path!=prefix) { Error(stream,404,"Bu telefon paylaşımı artık açık değil.");return; }
                request.Path=request.Path.Substring(prefix.Length);
                if(request.Path=="") request.Path="/";
                request.Headers["x-phone-prefix"]=prefix;
                string destination;
                if(request.Headers.TryGetValue("destination",out destination)) {
                    Uri target;
                    string raw=destination.StartsWith("/") ? destination : (Uri.TryCreate(destination,UriKind.Absolute,out target) ? target.AbsolutePath : "");
                    if(!raw.StartsWith(prefix+"/")) { Error(stream,403,"Hedef bu telefon paylaşımında olmalı.");return; }
                    request.Headers["destination"]=raw.Substring(prefix.Length);
                }
                string expect;
                if(request.Headers.TryGetValue("expect",out expect)&&expect.Equals("100-continue",StringComparison.OrdinalIgnoreCase)) {
                    byte[] interim=Encoding.ASCII.GetBytes("HTTP/1.1 100 Continue\r\n\r\n");stream.Write(interim,0,interim.Length);stream.Flush();
                }
                begun=true;current.Serve(request,stream,stream);
            } catch {
                if(!begun) try { Error(stream,502,"Telefona erişilemiyor. Paylaşımı yeniden başlatın."); } catch {}
            }
        }
    }
    private static Request ReadHttp(Stream stream) {
        var header=new MemoryStream();uint tail=0;
        while(header.Length<16384) {
            int b=stream.ReadByte();if(b<0) throw new EndOfStreamException();
            header.WriteByte((byte)b);tail=(tail<<8)|(uint)b;if(tail==0x0d0a0d0a) break;
        }
        if(tail!=0x0d0a0d0a) throw new IOException("HTTP header too large");
        var lines=Encoding.ASCII.GetString(header.ToArray()).Split(new string[]{"\r\n"},StringSplitOptions.None);
        var first=lines[0].Split(' ');if(first.Length!=3) throw new IOException("Bad request");
        var headers=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
        for(int i=1;i<lines.Length;i++) { int colon=lines[i].IndexOf(':');if(colon>0) headers[lines[i].Substring(0,colon).ToLowerInvariant()]=lines[i].Substring(colon+1).Trim(); }
        long length=0;string value;
        if(headers.TryGetValue("content-length",out value)&&(!Int64.TryParse(value,out length)||length<0||length>512L*1024*1024*1024)) throw new IOException("Bad length");
        string path=first[1];
        if(path.StartsWith("/DavWWWRoot",StringComparison.OrdinalIgnoreCase)) path=path.Substring(11);
        if(path=="") path="/";
        if(!path.StartsWith("/")) throw new IOException("Bad path");
        return new Request { Method=first[0].ToUpperInvariant(),Path=path,Headers=headers,Length=length };
    }
    private static string Reason(int code) {
        switch(code) { case 200:return "OK";case 201:return "Created";case 204:return "No Content";case 206:return "Partial Content";case 207:return "Multi-Status";case 401:return "Unauthorized";case 403:return "Forbidden";case 404:return "Not Found";case 405:return "Method Not Allowed";case 409:return "Conflict";case 412:return "Precondition Failed";case 423:return "Locked";case 503:return "Service Unavailable";default:return "Response"; }
    }
    private static void Headers(Stream output,int status,IDictionary<string,object> headers,long length) {
        var text=new StringBuilder("HTTP/1.1 "+status+" "+Reason(status)+"\r\n");
        foreach(var h in headers) {
            if(h.Key.Equals("content-length",StringComparison.OrdinalIgnoreCase)||h.Key.Equals("connection",StringComparison.OrdinalIgnoreCase)||h.Key.Equals("transfer-encoding",StringComparison.OrdinalIgnoreCase)) continue;
            string value=Convert.ToString(h.Value);
            if(h.Key.Contains("\r")||h.Key.Contains("\n")||value.Contains("\r")||value.Contains("\n")) throw new IOException("Bad response header");
            text.Append(h.Key).Append(": ").Append(value).Append("\r\n");
        }
        text.Append("Content-Length: ").Append(length).Append("\r\nConnection: close\r\nCache-Control: no-store\r\n\r\n");
        byte[] bytes=Encoding.UTF8.GetBytes(text.ToString());output.Write(bytes,0,bytes.Length);
    }
    private static void Error(Stream output,int status,string text) {
        var bytes=Encoding.UTF8.GetBytes(text);
        Headers(output,status,new Dictionary<string,object>{{"Content-Type","text/plain; charset=utf-8"}},bytes.Length);
        output.Write(bytes,0,bytes.Length);output.Flush();
    }
    private static void Copy(Stream input,Stream output,long length) {
        var buffer=new byte[65536];
        while(length>0) {
            int n=input.Read(buffer,0,(int)Math.Min(buffer.Length,length));if(n<=0) throw new EndOfStreamException();
            output.Write(buffer,0,n);length-=n;
        }
    }
    private class Request {
        public string Method,Path;public Dictionary<string,string> Headers;public long Length;
        public Dictionary<string,object> Frame() { return new Dictionary<string,object>{{"method",Method},{"path",Path},{"headers",Headers},{"length",Length}}; }
    }
    private abstract class Remote {
        public string Client,Name,Transport;
        public abstract void Serve(Request request,Stream body,Stream output);
        public virtual void Close() {}
    }
    private class WifiRemote:Remote {
        public string Url,Token;
        public WifiRemote(string url,string token,string client,string name) { Url=url;Token=token;Client=client;Name=name;Transport="wifi"; }
        public override void Serve(Request req,Stream input,Stream output) {
            var request=(HttpWebRequest)WebRequest.Create(Url+req.Path);
            request.Method=req.Method;request.Timeout=20000;request.ReadWriteTimeout=120000;request.KeepAlive=false;
            request.AllowAutoRedirect=false;request.ServicePoint.Expect100Continue=false;
            request.Headers["Authorization"]="Bearer "+Token;
            foreach(var h in req.Headers) {
                string key=h.Key.ToLowerInvariant();
                if(key=="content-type") request.ContentType=h.Value;
                else if(key=="depth"||key=="destination"||key=="overwrite"||key=="if"||key=="if-match"||key=="if-none-match"||key=="lock-token"||key=="timeout"||key=="x-phone-prefix") request.Headers[key]=h.Value;
                else if(key=="range") {
                    var m=System.Text.RegularExpressions.Regex.Match(h.Value,@"^bytes=(\d*)-(\d*)$");
                    if(!m.Success) { Error(output,416,"Dosya aralığı geçersiz.");return; }
                    if(m.Groups[1].Value=="") request.AddRange(-Int64.Parse(m.Groups[2].Value));
                    else if(m.Groups[2].Value=="") request.AddRange(Int64.Parse(m.Groups[1].Value));
                    else request.AddRange(Int64.Parse(m.Groups[1].Value),Int64.Parse(m.Groups[2].Value));
                }
            }
            if(req.Length>0 || req.Method=="PUT" || req.Method=="PROPFIND" || req.Method=="LOCK" || req.Method=="MKCOL") {
                request.ContentLength=req.Length;
                using(var send=request.GetRequestStream()) Copy(input,send,req.Length);
            }
            HttpWebResponse response;
            try { response=(HttpWebResponse)request.GetResponse(); }
            catch(WebException ex) { response=ex.Response as HttpWebResponse;if(response==null) { Error(output,502,"Telefon dosya bağlantısı kesildi.");return; } }
            using(response) {
                var headers=new Dictionary<string,object>();
                foreach(string key in response.Headers.AllKeys) headers[key]=response.Headers[key];
                Headers(output,(int)response.StatusCode,headers,response.ContentLength);
                if(req.Method!="HEAD" && response.ContentLength>0) using(var body=response.GetResponseStream()) Copy(body,output,response.ContentLength);
                output.Flush();
            }
        }
    }
    private static void WriteFrame(Stream stream,Dictionary<string,object> obj) {
        byte[] bytes=Encoding.UTF8.GetBytes(Json().Serialize(obj));
        if(bytes.Length>65536) throw new IOException("Frame too large");
        byte[] size=BitConverter.GetBytes(IPAddress.HostToNetworkOrder(bytes.Length));
        stream.Write(size,0,4);stream.Write(bytes,0,bytes.Length);stream.Flush();
    }
    private static Dictionary<string,object> ReadFrame(Stream stream) {
        var size=new byte[4];ReadExact(stream,size);int count=IPAddress.NetworkToHostOrder(BitConverter.ToInt32(size,0));
        if(count<2||count>65536) throw new IOException("Bad frame");
        var bytes=new byte[count];ReadExact(stream,bytes);
        return Json().Deserialize<Dictionary<string,object>>(Encoding.UTF8.GetString(bytes));
    }
    private static void ReadExact(Stream stream,byte[] bytes) {
        int position=0;
        while(position<bytes.Length) { int n=stream.Read(bytes,position,bytes.Length-position);if(n<=0) throw new EndOfStreamException();position+=n; }
    }
    private class BluetoothRemote:Remote {
        private readonly object channel=new object();
        private readonly BluetoothClient client;
        private readonly Stream stream;
        public BluetoothRemote(BluetoothClient socket,Stream transport,string id,string name) { client=socket;stream=transport;Client=id;Name=name;Transport="bluetooth"; }
        public override void Close() { try { client.Close(); } catch {} }
        public override void Serve(Request request,Stream body,Stream output) {
            lock(channel) {
                try {
                    WriteFrame(stream,request.Frame());Copy(body,stream,request.Length);stream.Flush();
                    var response=ReadFrame(stream);
                    var headers=response["headers"] as Dictionary<string,object>;
                    long length=N(response,"length");if(length<0) throw new IOException("Bad response length");
                    Headers(output,(int)N(response,"status"),headers ?? new Dictionary<string,object>(),length);
                    if(request.Method!="HEAD") Copy(stream,output,length);
                    output.Flush();
                } catch { Lost(this);throw; }
            }
        }
        public void StatusFrame() {
            lock(channel) {
                WriteFrame(stream,new Dictionary<string,object>{{"method","STATUS"},{"path","/"},{"headers",new Dictionary<string,string>()},{"length",0},{"info",Json().DeserializeObject(Info(this))}});
                var answer=ReadFrame(stream);if(N(answer,"status")!=200||N(answer,"length")!=0) throw new IOException("Bad status reply");
            }
        }
    }
    private static void Lost(Remote source) {
        bool current;lock(Gate) { current=Object.ReferenceEquals(remote,source);if(current) remote=null; }
        source.Close();
        if(current) ThreadPool.QueueUserWorkItem(delegate { Unmount(); });
    }
    private static void BluetoothLoop() {
        while(running) {
            try {
                radio=new BluetoothListener(ServiceId);radio.ServiceName="Telefon Belleği";radio.Authenticate=true;radio.Start();
                bluetoothError="";
                while(running) {
                    var client=radio.AcceptBluetoothClient();
                    ThreadPool.QueueUserWorkItem(delegate {
                        BluetoothRemote next=null;
                        try {
                            var stream=client.GetStream();stream.ReadTimeout=120000;stream.WriteTimeout=120000;
                            var hello=ReadFrame(stream);
                            if(S(hello,"app")!=Marker||N(hello,"protocol")!=1||!System.Text.RegularExpressions.Regex.IsMatch(S(hello,"client"),@"^[a-zA-Z0-9-]{1,100}$")) throw new IOException("Unsupported peer");
                            next=new BluetoothRemote(client,stream,S(hello,"client"),S(hello,"name"));SetRemote(next);
                            // Complete greeting before mapping: Windows immediately
                            // sends PROPFIND during WNetAddConnection2.
                            WriteFrame(stream,Json().Deserialize<Dictionary<string,object>>(Info(next)));
                            Mount(next);next.StatusFrame();
                            while(running) {
                                Thread.Sleep(10000);lock(Gate) { if(!Object.ReferenceEquals(remote,next)) break; }
                                next.Serve(new Request{Method="OPTIONS",Path="/",Headers=new Dictionary<string,string>(),Length=0},Stream.Null,Stream.Null);
                            }
                        } catch { if(next!=null) Lost(next); }
                        finally { if(next==null) client.Close(); }
                    });
                }
            } catch(Exception e) { bluetoothError=e.Message;Thread.Sleep(2000); }
            finally { try { if(radio!=null) radio.Stop(); } catch {} }
        }
    }
    [StructLayout(LayoutKind.Sequential,CharSet=CharSet.Unicode)]
    private struct NETRESOURCE { public int dwScope,dwType,dwDisplayType,dwUsage;public string lpLocalName,lpRemoteName,lpComment,lpProvider; }
    [DllImport("mpr.dll",CharSet=CharSet.Unicode)] private static extern int WNetAddConnection2(ref NETRESOURCE resource,string password,string username,int flags);
    [DllImport("mpr.dll",CharSet=CharSet.Unicode)] private static extern int WNetCancelConnection2(string name,int flags,bool force);
    [DllImport("kernel32.dll")] private static extern uint GetLogicalDrives();
}

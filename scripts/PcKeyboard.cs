using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using System.Web.Script.Serialization;

// Opt-in, configured keys only. Never stores text. Single keys keep their native function;
// a combination binding (Ctrl/Shift/Alt/Win + key, helper 2.6.0+) swallows that key so the
// PC shortcut (e.g. Ctrl+W) does not also run.
public static class PcKeyboard {
    sealed class Binding { public int Key, Mods; public bool Long, Instant; public long Down, LastSeen; public bool Fired, Swallow; }
    const int CTRL = 1, SHIFT = 2, ALT = 4, WIN = 8;
    static readonly object Gate = new object();
    // Code = virtual key | modifiers << 8.
    static readonly Dictionary<int, Binding> Keys = new Dictionary<int, Binding>();
    // Virtual key -> binding that is currently held (repeats and key-up resolve through it).
    static readonly Dictionary<int, Binding> Active = new Dictionary<int, Binding>();
    static readonly HashSet<int> SwallowUp = new HashSet<int>();
    static readonly List<object> Events = new List<object>();
    static readonly Stopwatch Clock = Stopwatch.StartNew();
    static string owner = "";
    static long lease, sequence, captureUntil;
    static int threshold, captureModifier;
    static bool capturing;
    static Thread thread;
    static IntPtr hook;
    static HookProc callback = Hook;
    static System.Threading.Timer timer;
    delegate IntPtr HookProc(int code, IntPtr message, IntPtr data);
    [StructLayout(LayoutKind.Sequential)] struct KeyData { public uint vk, scan, flags, time; public UIntPtr extra; }
    [DllImport("user32.dll", SetLastError=true)] static extern IntPtr SetWindowsHookEx(int id, HookProc proc, IntPtr module, uint tid);
    [DllImport("user32.dll")] static extern bool UnhookWindowsHookEx(IntPtr value);
    [DllImport("user32.dll")] static extern IntPtr CallNextHookEx(IntPtr value, int code, IntPtr message, IntPtr data);
    [DllImport("user32.dll")] static extern short GetAsyncKeyState(int key);
    [DllImport("user32.dll")] static extern void keybd_event(byte vk, byte scan, uint flags, UIntPtr extra);
    [DllImport("kernel32.dll", CharSet=CharSet.Auto)] static extern IntPtr GetModuleHandle(string name);

    public static void Configure(string session, int[] keys, bool[] longs, bool[] instant, int ms) {
        Configure(session, keys, new int[keys.Length], longs, instant, ms, false);
    }
    public static void Configure(string session, int[] keys, int[] mods, bool[] longs, bool[] instant, int ms, bool capture) {
        if (String.IsNullOrEmpty(session) || session.Length > 64 || keys.Length > 248 || keys.Length != mods.Length ||
            keys.Length != longs.Length || keys.Length != instant.Length || ms < 250 || ms > 2000)
            throw new ArgumentException("Keyboard configuration invalid");
        EnsureHook();
        lock(Gate) {
            Keys.Clear(); Active.Clear(); SwallowUp.Clear(); Events.Clear(); sequence = 0; owner = session; threshold = ms;
            for(int i=0;i<keys.Length;i++) {
                if(keys[i]<8 || keys[i]>254 || mods[i]<0 || mods[i]>15 || (mods[i]!=0 && IsModifier(keys[i]))) throw new ArgumentException("Invalid key");
                // A key already held during enable must be released before it can trigger.
                Keys[keys[i] | mods[i]<<8]=new Binding {Key=keys[i],Mods=mods[i],Long=longs[i],Instant=instant[i],
                    Down=Pressed(keys[i]) ? -1 : 0};
            }
            capturing = capture; captureModifier = 0; captureUntil = Clock.ElapsedMilliseconds + 15000;
            lease = Clock.ElapsedMilliseconds + 3000;
        }
    }
    static bool Pressed(int vk) { return (GetAsyncKeyState(vk) & 0x8000) != 0; }
    static bool IsModifier(int vk) { return vk==16 || vk==17 || vk==18 || (vk>=160 && vk<=165) || vk==91 || vk==92; }
    static int CurrentMods() {
        int m=0;
        if(Pressed(0x11)) m|=CTRL;
        if(Pressed(0x10)) m|=SHIFT;
        if(Pressed(0x12)) m|=ALT;
        if(Pressed(0x5B) || Pressed(0x5C)) m|=WIN;
        return m;
    }
    // Releasing Alt or Win after a swallowed key would open the menu bar / Start menu: a masking
    // key in between makes Windows treat it as a shortcut (same trick as AutoHotkey's menu mask key).
    static void MaskMenu(int mods) {
        if((mods & (ALT|WIN))==0) return;
        keybd_event(0xE8,0,0,UIntPtr.Zero); keybd_event(0xE8,0,2,UIntPtr.Zero);
    }
    static void EnsureHook() {
        lock(Gate) {
            if(thread!=null && hook!=IntPtr.Zero) return;
            if(thread!=null) throw new InvalidOperationException("Keyboard hook unavailable; restart helper");
            var ready=new ManualResetEvent(false);
            thread=new Thread(delegate() {
                hook=SetWindowsHookEx(13,callback,GetModuleHandle(null),0);
                ready.Set();
                if(hook==IntPtr.Zero) return;
                try { Application.Run(); }
                finally { UnhookWindowsHookEx(hook); hook=IntPtr.Zero; }
            });
            thread.IsBackground=true; thread.SetApartmentState(ApartmentState.STA); thread.Start();
            if(!ready.WaitOne(3000) || hook==IntPtr.Zero) throw new InvalidOperationException("Keyboard hook unavailable ("+Marshal.GetLastWin32Error()+")");
            timer=new System.Threading.Timer(Tick,null,20,20);
        }
    }
    static void Reset() { Keys.Clear(); Active.Clear(); SwallowUp.Clear(); Events.Clear(); owner=""; lease=0; capturing=false; }
    static void Emit(Binding b,string phase) {
        if(Events.Count>=256) { Reset(); return; }
        Events.Add(new {seq=++sequence,key=b.Key,mods=b.Mods,phase=phase});
    }
    static void EmitCapture(int vk,int mods) {
        capturing=false; captureModifier=0;
        if(Events.Count>=256) { Reset(); return; }
        Events.Add(new {seq=++sequence,key=vk,mods=mods,phase="capture"});
    }
    static void Release(int vk,Binding b,bool recovered) {
        Active.Remove(vk);
        if(b.Down>0) {
            // Timer delivery can lag behind key-up: elapsed time is authoritative.
            if(!recovered && b.Long && !b.Fired && Clock.ElapsedMilliseconds-b.Down>=threshold) { b.Fired=true; Emit(b,"long"); }
            // Never synthesize a short action from the recovery path.
            if(!recovered && !b.Instant && !b.Fired) Emit(b,"short");
            if(!recovered || b.Instant || b.Fired) Emit(b,"up");
        }
        b.Down=0; b.Fired=false; b.Swallow=false;
    }
    static void Tick(object unused) {
        lock(Gate) {
            long now=Clock.ElapsedMilliseconds;
            if(now>lease) { Reset(); return; }
            if(capturing && now>captureUntil) capturing=false;
            foreach(var pair in new List<KeyValuePair<int,Binding>>(Active)) {
                var b=pair.Value;
                // Recover a missed key-up (Windows can drop a slow low-level hook). A swallowed key never
                // reaches the async key state, so it is judged by its auto-repeat instead.
                bool gone=b.Swallow ? now-b.LastSeen>=1500 : now-b.Down>=40 && !Pressed(b.Key);
                if(gone) { Release(pair.Key,b,true); continue; }
                if(b.Long && !b.Fired && now-b.Down>=threshold) { b.Fired=true; Emit(b,"long"); }
            }
        }
    }
    static IntPtr Hook(int code,IntPtr message,IntPtr data) {
        bool swallow=false;
        try {
            if(code>=0) {
                var k=(KeyData)Marshal.PtrToStructure(data,typeof(KeyData));
                if((k.flags & 0x12)==0) lock(Gate) {
                    long now=Clock.ElapsedMilliseconds;
                    if(now<=lease) {
                        int m=message.ToInt32(), vk=(int)k.vk;
                        bool down=m==0x100 || m==0x104, up=m==0x101 || m==0x105;
                        Binding b;
                        if(up && SwallowUp.Remove(vk)) swallow=true;
                        else if(capturing && now<=captureUntil) {
                            // "Record from the PC": the next key or combination is reported, not acted on.
                            if(down && IsModifier(vk)) { if(captureModifier==0) captureModifier=vk; }
                            else if(down) { int mods=CurrentMods(); EmitCapture(vk,mods); SwallowUp.Add(vk); MaskMenu(mods); swallow=true; }
                            else if(up && IsModifier(vk) && captureModifier!=0) EmitCapture(captureModifier,0);
                        }
                        else if(down) {
                            if(Active.TryGetValue(vk,out b)) { b.LastSeen=now; swallow=b.Swallow; }
                            else {
                                b=null;
                                if(!IsModifier(vk)) { int mods=CurrentMods(); if(mods!=0) Keys.TryGetValue(vk | mods<<8,out b); }
                                if(b==null) Keys.TryGetValue(vk,out b);
                                if(b!=null && b.Down==0) {
                                    b.Down=Math.Max(1,now); b.LastSeen=now; b.Fired=false; b.Swallow=b.Mods!=0;
                                    Active[vk]=b;
                                    if(b.Instant) Emit(b,"press");
                                    if(b.Swallow) { MaskMenu(b.Mods); swallow=true; }
                                }
                            }
                        } else if(up) {
                            if(Active.TryGetValue(vk,out b)) { swallow=b.Swallow; Release(vk,b,false); }
                            else foreach(var held in Keys.Values) if(held.Key==vk && held.Down<0) held.Down=0;
                        }
                    }
                }
            }
        } catch { lock(Gate) { Reset(); } }
        if(swallow) return (IntPtr)1;
        return CallNextHookEx(hook,code,message,data);
    }
    public static string Poll(string session,long after) {
        lock(Gate) {
            if(owner!=session || Clock.ElapsedMilliseconds>lease) { Reset(); throw new InvalidOperationException("Keyboard lease expired"); }
            if(after<0 || after>sequence) throw new ArgumentException("Invalid cursor");
            lease=Clock.ElapsedMilliseconds+3000;
            Events.RemoveAll(delegate(object e) { return (long)e.GetType().GetProperty("seq").GetValue(e,null)<=after; });
            // chords/capture tell the phone this helper understands combinations (2.6.0+).
            return new JavaScriptSerializer().Serialize(new {ok=true,events=Events.ToArray(),chords=true,capture=capturing});
        }
    }
    public static void Stop(string session) { lock(Gate) { if(owner==session) Reset(); } }
}

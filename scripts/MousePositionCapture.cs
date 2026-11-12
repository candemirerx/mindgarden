using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows.Forms;
using System.Web.Script.Serialization;

// Explicit, short-lived capture only. No input is logged outside the active lease.
public static class MousePositionCapture {
    static readonly object Gate = new object();
    static readonly Stopwatch Clock = Stopwatch.StartNew();
    static string owner = "";
    static long lease;
    static bool done, swallowRight;
    static int x, y;
    static Thread thread;
    static IntPtr hook;
    static HookProc callback = Hook;
    delegate IntPtr HookProc(int code, IntPtr message, IntPtr data);
    [StructLayout(LayoutKind.Sequential)] struct Point { public int x, y; }
    [StructLayout(LayoutKind.Sequential)] struct MouseData { public Point point; public uint mouseData, flags, time; public UIntPtr extra; }
    [DllImport("user32.dll", SetLastError=true)] static extern IntPtr SetWindowsHookEx(int id, HookProc proc, IntPtr module, uint tid);
    [DllImport("user32.dll")] static extern bool UnhookWindowsHookEx(IntPtr h);
    [DllImport("user32.dll")] static extern IntPtr CallNextHookEx(IntPtr h, int code, IntPtr message, IntPtr data);
    [DllImport("kernel32.dll")] static extern IntPtr GetModuleHandle(string name);
    [DllImport("user32.dll")] static extern int GetSystemMetrics(int index);
    [DllImport("user32.dll")] static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr value);
    static void EnsureHook() {
        lock(Gate) {
            if(hook!=IntPtr.Zero) return;
            if(thread!=null) throw new InvalidOperationException("Mouse hook unavailable; restart helper.");
            var ready=new ManualResetEvent(false);
            thread=new Thread(delegate() {
                try { SetThreadDpiAwarenessContext(new IntPtr(-4)); } catch(EntryPointNotFoundException) { }
                hook=SetWindowsHookEx(14,callback,GetModuleHandle(null),0);
                ready.Set();
                if(hook==IntPtr.Zero) return;
                try { Application.Run(); }
                finally { UnhookWindowsHookEx(hook); hook=IntPtr.Zero; }
            });
            thread.IsBackground=true; thread.SetApartmentState(ApartmentState.STA); thread.Start();
            if(!ready.WaitOne(3000) || hook==IntPtr.Zero) throw new InvalidOperationException("Mouse hook unavailable.");
        }
    }
    public static void Start(string session) {
        Guid parsed;
        if(!Guid.TryParse(session,out parsed)) throw new ArgumentException("Invalid capture session.");
        EnsureHook();
        lock(Gate) {
            if(owner!="" && owner!=session && Clock.ElapsedMilliseconds<=lease)
                throw new InvalidOperationException("Another position capture is active.");
            owner=session; done=false; lease=Clock.ElapsedMilliseconds+4000;
        }
        IntPtr previous=IntPtr.Zero;
        try {
            try { previous=SetThreadDpiAwarenessContext(new IntPtr(-4)); } catch(EntryPointNotFoundException) { }
            if(!SetCursorPos(GetSystemMetrics(76)+GetSystemMetrics(78)/2, GetSystemMetrics(77)+GetSystemMetrics(79)/2)) {
                Stop(session); throw new InvalidOperationException("Cursor could not be centered.");
            }
        } finally { if(previous!=IntPtr.Zero) SetThreadDpiAwarenessContext(previous); }
    }
    static IntPtr Hook(int code, IntPtr message, IntPtr data) {
        if(code>=0) {
            int msg=message.ToInt32();
            lock(Gate) {
                // Swallow the release of the saved right click even after Stop/Poll.
                if(swallowRight && (msg==0x204 || msg==0x205)) {
                    if(msg==0x205) swallowRight=false;
                    return new IntPtr(1);
                }
                if(owner!="" && Clock.ElapsedMilliseconds<=lease && !done) {
                    if(msg==0x204) {
                        var p=((MouseData)Marshal.PtrToStructure(data,typeof(MouseData))).point;
                        int w=Math.Max(1,GetSystemMetrics(78)-1), h=Math.Max(1,GetSystemMetrics(79)-1);
                        x=Math.Max(0,Math.Min(32767,(int)Math.Round((p.x-GetSystemMetrics(76))*32767.0/w)));
                        y=Math.Max(0,Math.Min(32767,(int)Math.Round((p.y-GetSystemMetrics(77))*32767.0/h)));
                        done=true; swallowRight=true;
                        return new IntPtr(1);
                    }
                    // Middle/side button assignments must not execute during selection.
                    if(msg==0x207 || msg==0x208 || msg==0x20B || msg==0x20C) return new IntPtr(1);
                }
            }
        }
        return CallNextHookEx(hook,code,message,data);
    }
    public static string Poll(string session) {
        lock(Gate) {
            if(owner!=session || Clock.ElapsedMilliseconds>lease) throw new InvalidOperationException("Position capture expired.");
            lease=Clock.ElapsedMilliseconds+4000;
            return new JavaScriptSerializer().Serialize(new {ok=true,done=done,x=x,y=y});
        }
    }
    public static void Stop(string session) { lock(Gate) { if(owner==session) { owner=""; lease=0; done=false; } } }
}

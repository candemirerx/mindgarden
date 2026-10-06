using System;
using System.ComponentModel;
using System.Runtime.InteropServices;

public static class RemoteInput
{
    [StructLayout(LayoutKind.Sequential)] private struct INPUT { public uint type; public UNION data; }
    [StructLayout(LayoutKind.Explicit)] private struct UNION {
        [FieldOffset(0)] public MOUSEINPUT mouse;
        [FieldOffset(0)] public KEYBDINPUT key;
    }
    [StructLayout(LayoutKind.Sequential)] private struct MOUSEINPUT {
        public int dx, dy;
        public uint mouseData, flags, time;
        public IntPtr extra;
    }
    [StructLayout(LayoutKind.Sequential)] private struct KEYBDINPUT {
        public ushort vk, scan;
        public uint flags, time;
        public IntPtr extra;
    }
    [DllImport("user32.dll", SetLastError = true)] private static extern uint SendInput(uint count, ref INPUT input, int size);
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] private static extern bool ShowWindowAsync(IntPtr hwnd, int cmd);
    [DllImport("user32.dll", SetLastError = true)] private static extern bool PostMessage(IntPtr hwnd, uint message, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll")] private static extern int GetSystemMetrics(int index);
    [DllImport("user32.dll")] private static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
    private static int PhysicalScreenMetric(int index) {
        IntPtr previous=IntPtr.Zero;
        try {
            try { previous=SetThreadDpiAwarenessContext(new IntPtr(-4)); }
            catch(EntryPointNotFoundException) { }
            return GetSystemMetrics(index);
        } finally {
            if(previous!=IntPtr.Zero) SetThreadDpiAwarenessContext(previous);
        }
    }
    public static int DesktopWidth { get { return PhysicalScreenMetric(78); } }
    public static int DesktopHeight { get { return PhysicalScreenMetric(79); } }
    public static void WindowAction(string action) { WindowAction(action,0); }
    public static void WindowAction(string action,long expected) {
        IntPtr hwnd=GetForegroundWindow();
        if(hwnd==IntPtr.Zero) throw new InvalidOperationException("No active window.");
        if(expected!=0 && hwnd.ToInt64()!=expected) throw new InvalidOperationException("Active window changed.");
        ApplyWindowAction(hwnd,action);
    }
    private static void ApplyWindowAction(IntPtr hwnd,string action) {
        switch(action) {
            case "minimize": ShowWindowAsync(hwnd,6); break;
            case "maximize": ShowWindowAsync(hwnd,3); break;
            case "restore": ShowWindowAsync(hwnd,9); break;
            case "close": if(!PostMessage(hwnd,0x0112,new IntPtr(0xF060),IntPtr.Zero)) throw new Win32Exception(Marshal.GetLastWin32Error()); break;
            default: throw new ArgumentException("Invalid window operation.");
        }
    }
    private static void Send(INPUT input) {
        if (SendInput(1, ref input, Marshal.SizeOf(typeof(INPUT))) != 1)
            throw new Win32Exception(Marshal.GetLastWin32Error());
    }
    private static void Mouse(uint flags, int dx = 0, int dy = 0, uint data = 0) {
        Send(new INPUT { type = 0, data = new UNION { mouse = new MOUSEINPUT { dx = dx, dy = dy, mouseData = data, flags = flags } } });
    }
    private static void Key(ushort vk, ushort scan, uint flags) {
        Send(new INPUT { type = 1, data = new UNION { key = new KEYBDINPUT { vk = vk, scan = scan, flags = flags } } });
    }
    public static void Move(int dx, int dy) { Mouse(0x0001, Math.Max(-127, Math.Min(127, dx)), Math.Max(-127, Math.Min(127, dy))); }
    public static void Absolute(int x, int y, bool click) {
        if (x < 0 || x > 32767 || y < 0 || y > 32767) throw new ArgumentOutOfRangeException("position");
        Mouse(0x8000 | 0x4000 | 0x0001, (int)Math.Round(x * 65535.0 / 32767), (int)Math.Round(y * 65535.0 / 32767));
        if (click) Click(1);
    }
    public static void Click(int button) {
        uint down = button == 1 ? 0x0002u : button == 2 ? 0x0008u : 0;
        uint up = button == 1 ? 0x0004u : button == 2 ? 0x0010u : 0;
        if (down == 0) throw new ArgumentException("Only left and right click are supported.");
        Mouse(down); Mouse(up);
    }
    public static void Scroll(int steps) { Mouse(0x0800, 0, 0, unchecked((uint)(steps * 120))); }
    public static void TypeText(string text) {
        if (text == null || text.Length > 32000) throw new ArgumentException("Invalid text length.");
        foreach (char ch in text) {
            if (ch == '\r') continue;
            if (ch == '\n') { Key(0x0D, 0, 0); Key(0x0D, 0, 0x0002); }
            else { Key(0, ch, 0x0004); Key(0, ch, 0x0004 | 0x0002); }
            // VK_PACKET karakterleri hedef pencere islemeden ust uste gelirse Windows
            // onlari son gelen karakterle cevirir ("abc 123" -> "abc 333"). Kisa ara sart.
            System.Threading.Thread.Sleep(3);
        }
    }
    private static ushort Code(string name) {
        name = name.Trim().ToUpperInvariant();
        if (name.Length == 1 && ((name[0] >= 'A' && name[0] <= 'Z') || (name[0] >= '0' && name[0] <= '9'))) return name[0];
        int n;
        if (name.StartsWith("F") && int.TryParse(name.Substring(1), out n) && n >= 1 && n <= 12) return (ushort)(0x70 + n - 1);
        switch (name) {
            case "ENTER": return 0x0D; case "TAB": return 0x09; case "ESC": case "ESCAPE": return 0x1B;
            case "SPACE": return 0x20; case "BACKSPACE": return 0x08; case "DELETE": return 0x2E;
            case "WIN": case "WINDOWS": case "GUI": case "META": return 0x5B;
            case "CTRL": case "CONTROL": return 0x11; case "SHIFT": return 0x10; case "ALT": return 0x12;
            case "UP": return 0x26; case "DOWN": return 0x28; case "LEFT": return 0x25; case "RIGHT": return 0x27;
            case "HOME": return 0x24; case "END": return 0x23;
            default: throw new ArgumentException("Unsupported shortcut key.");
        }
    }
    public static void Shortcut(string chord) {
        if (string.IsNullOrWhiteSpace(chord) || chord.Length > 60) throw new ArgumentException("Invalid shortcut.");
        string[] parts = chord.Split('+');
        ushort[] modifiers = new ushort[parts.Length - 1];
        for (int i = 0; i < parts.Length - 1; i++) {
            switch (parts[i].Trim().ToUpperInvariant()) {
                case "CTRL": case "CONTROL": modifiers[i] = 0x11; break;
                case "ALT": modifiers[i] = 0x12; break;
                case "SHIFT": modifiers[i] = 0x10; break;
                case "WIN": case "WINDOWS": case "GUI": case "META": modifiers[i] = 0x5B; break;
                default: throw new ArgumentException("Unsupported modifier.");
            }
        }
        ushort key = Code(parts[parts.Length - 1]);
        int held = 0;
        try {
            for (; held < modifiers.Length; held++) Key(modifiers[held], 0, 0);
            Key(key, 0, 0); Key(key, 0, 0x0002);
        } finally {
            for (int i = held - 1; i >= 0; i--) Key(modifiers[i], 0, 0x0002);
        }
    }
}

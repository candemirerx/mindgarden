using System;
using System.Drawing;
using System.Security.Cryptography;
using System.Threading;
using System.Runtime.InteropServices;
using System.Windows.Forms;

// HTTP listener never waits for the dialog. Only the holder of the random,
// short-lived request ID can collect the result; a result is consumed once.
public static class PairApproval
{
    private static readonly object Gate = new object();
    private static string requestId = "", state = "expired";
    private static DateTime expires, nextRequest;
    private static string uiState = "idle", uiError = "";
    public static string UiState { get { lock (Gate) return uiState; } }
    public static string UiError { get { lock (Gate) return uiError; } }
    [DllImport("user32.dll")] private static extern bool ShowWindow(IntPtr window, int command);
    [DllImport("user32.dll")] private static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr window, IntPtr process);
    [DllImport("kernel32.dll")] private static extern uint GetCurrentThreadId();
    [DllImport("user32.dll")] private static extern bool AttachThreadInput(uint from, uint to, bool attach);
    [DllImport("user32.dll")] private static extern bool SetForegroundWindow(IntPtr window);

    // A background helper may not take the foreground, so the prompt opened
    // behind other always-on-top windows and expired unseen. Sharing the
    // foreground thread's input state for one call lets it come forward.
    private static void BringForward(IntPtr window)
    {
        uint own = GetCurrentThreadId();
        uint front = GetWindowThreadProcessId(GetForegroundWindow(), IntPtr.Zero);
        bool attached = front != 0 && front != own && AttachThreadInput(own, front, true);
        try { SetForegroundWindow(window); }
        finally { if (attached) AttachThreadInput(own, front, false); }
    }

    public static string Begin(string device, string peer)
    {
        string id;
        lock (Gate)
        {
            if ((state == "pending" && DateTime.UtcNow < expires) || DateTime.UtcNow < nextRequest)
                return "";
            byte[] bytes = new byte[32];
            using (var rng = RandomNumberGenerator.Create()) rng.GetBytes(bytes);
            id = BitConverter.ToString(bytes).Replace("-", "").ToLowerInvariant();
            requestId = id;
            state = "pending";
            expires = DateTime.UtcNow.AddSeconds(60);
            nextRequest = DateTime.UtcNow.AddSeconds(15);
            uiState = "queued"; uiError = "";
        }
        var thread = new Thread(() => ShowRequest(id, Clean(device), Clean(peer)));
        thread.IsBackground = true;
        thread.SetApartmentState(ApartmentState.STA);
        thread.Start();
        return id;
    }

    private static string Clean(string value)
    {
        var result = "";
        foreach (char c in value ?? "")
            if (!char.IsControl(c) && Char.GetUnicodeCategory(c) != System.Globalization.UnicodeCategory.Format && result.Length < 80)
                result += c;
        return result.Length == 0 ? "Bilinmeyen cihaz" : result;
    }

    private static void Complete(string id, bool approved)
    {
        lock (Gate)
        {
            if (id == requestId && state == "pending")
                state = DateTime.UtcNow < expires ? (approved ? "approved" : "denied") : "expired";
        }
    }

    public static string Poll(string id)
    {
        lock (Gate)
        {
            if (String.IsNullOrEmpty(id) || id != requestId) return "expired";
            if (DateTime.UtcNow >= expires) state = "expired";
            string result = state;
            if (state == "approved" || state == "denied") { state = "expired"; requestId = ""; }
            return result;
        }
    }

    private static void ShowRequest(string id, string device, string peer)
    {
        try
        {
            lock (Gate) uiState = "creating";
            using (var form = new Form())
            using (var timer = new System.Windows.Forms.Timer())
            {
                form.Text = "Cep Köprü · Telefon bağlantı isteği";
                form.ClientSize = new Size(480, 245);
                form.StartPosition = FormStartPosition.CenterScreen;
                form.FormBorderStyle = FormBorderStyle.FixedDialog;
                form.MaximizeBox = false;
                form.MinimizeBox = false;
                form.TopMost = true;
                form.ShowInTaskbar = true;
                var label = new Label { Left = 20, Top = 16, Width = 440, Height = 165,
                    Text = "Bu telefona izin ver?\n\nCihazın bildirdiği ad: " + device + "\nBağlantı adresi: " + peer +
                        "\n\nYalnızca telefondan az önce siz istek gönderdiyseniz izin verin. Onay; pano, klavye/fare, ses ve dosya bağlantısı yetkisi verir.\nİstek 60 saniye içinde sona erer." };
                var deny = new Button { Text = "İzin verme", Left = 225, Top = 195, Width = 110, DialogResult = DialogResult.Cancel };
                var allow = new Button { Text = "İzin ver", Left = 345, Top = 195, Width = 110, DialogResult = DialogResult.Yes };
                form.Controls.AddRange(new Control[] { label, deny, allow });
                // Enter must not accidentally approve a background request.
                form.AcceptButton = deny;
                form.CancelButton = deny;
                // A hidden PowerShell host must not become this prompt's modal owner.
                // Use a dedicated STA message loop and explicit button completion.
                allow.Click += (s, e) => { Complete(id, true); form.Close(); };
                deny.Click += (s, e) => { Complete(id, false); form.Close(); };
                form.FormClosed += (s, e) => { Complete(id, false); lock (Gate) uiState = "closed"; };
                bool presented = false;
                timer.Interval = 500;
                timer.Tick += (s, e) => {
                    bool active;
                    lock (Gate) {
                        active = id == requestId && state == "pending" && DateTime.UtcNow < expires;
                    }
                    if (!active) { form.Close(); return; }
                    if (!presented) {
                        // Override inherited SW_HIDE only for the permission form, never the console.
                        ShowWindow(form.Handle, 5);
                        form.TopMost = true;
                        form.BringToFront();
                        BringForward(form.Handle);
                        form.Activate();
                        presented = true;
                        lock (Gate) uiState = form.Visible ? "visible" : "hidden";
                    }
                };
                timer.Start();
                Application.Run(form);
            }
        }
        catch (Exception error) {
            lock (Gate) { uiState = "failed"; uiError = error.GetType().FullName; }
            Complete(id, false);
        }
    }
}

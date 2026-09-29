"""Not Bahçesi PC pano köprüsü. Python 3 / Windows, üçüncü taraf paket gerektirmez.

İlk çalıştırmada rastgele erişim anahtarı üretir. Yalnız güvenilen yerel ağda
çalıştırın; Windows Güvenlik Duvarı'nda sadece Özel ağ izni verin.
"""
import ctypes
import hmac
import json
import os
import secrets
import sys
from ctypes import wintypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

if os.name != "nt":
    raise SystemExit("Pano yardımcısı Windows bilgisayar için tasarlandı.")

CONFIG = Path(__file__).with_name(".pc_clipboard_token")
if not CONFIG.exists():
    CONFIG.write_text(secrets.token_urlsafe(32), encoding="ascii")
    os.chmod(CONFIG, 0o600)
TOKEN = CONFIG.read_text(encoding="ascii").strip()

kernel = ctypes.windll.kernel32
user = ctypes.windll.user32
kernel.GlobalAlloc.argtypes = [wintypes.UINT, ctypes.c_size_t]
kernel.GlobalAlloc.restype = wintypes.HGLOBAL
kernel.GlobalLock.argtypes = [wintypes.HGLOBAL]
kernel.GlobalLock.restype = ctypes.c_void_p
kernel.GlobalUnlock.argtypes = [wintypes.HGLOBAL]
kernel.GlobalFree.argtypes = [wintypes.HGLOBAL]
user.SetClipboardData.argtypes = [wintypes.UINT, wintypes.HGLOBAL]
user.SetClipboardData.restype = wintypes.HANDLE


def set_clipboard(text):
    data = (text + "\0").encode("utf-16-le")
    handle = kernel.GlobalAlloc(0x0002, len(data))  # GMEM_MOVEABLE
    if not handle:
        raise OSError("Pano belleği ayrılamadı")
    pointer = kernel.GlobalLock(handle)
    if not pointer:
        kernel.GlobalFree(handle)
        raise OSError("Pano belleği kilitlenemedi")
    ctypes.memmove(pointer, data, len(data))
    kernel.GlobalUnlock(handle)
    if not user.OpenClipboard(None):
        kernel.GlobalFree(handle)
        raise OSError("Pano şu anda başka uygulamada açık")
    try:
        if not user.EmptyClipboard() or not user.SetClipboardData(13, handle):  # CF_UNICODETEXT
            raise OSError("Pano yazılamadı")
        handle = None  # sahiplik artık Windows'ta
    finally:
        user.CloseClipboard()
        if handle:
            kernel.GlobalFree(handle)


class Handler(BaseHTTPRequestHandler):
    def respond(self, status, data):
        encoded = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(encoded)

    def authorized(self):
        supplied = self.headers.get("Authorization", "")
        if not hmac.compare_digest(supplied, "Bearer " + TOKEN):
            self.respond(401, {"ok": False, "error": "Anahtar yanlış"})
            return False
        return True

    def do_GET(self):
        if self.path != "/health":
            return self.respond(404, {"ok": False})
        if self.authorized():
            self.respond(200, {"ok": True, "app": "not-bahcesi-clipboard"})

    def do_POST(self):
        if self.path != "/clipboard":
            return self.respond(404, {"ok": False})
        if not self.authorized():
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if not 0 < length <= 1024 * 1024:
                return self.respond(413, {"ok": False, "error": "Metin 1 MB sınırını aşıyor"})
            text = self.rfile.read(length).decode("utf-8", errors="strict")
            set_clipboard(text)
            self.respond(200, {"ok": True})
        except (ValueError, UnicodeError, OSError) as error:
            self.respond(400, {"ok": False, "error": str(error)})


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    print(f"Not Bahçesi pano yardımcısı: http://BU-BILGISAYARIN-IP-ADRESI:{port}")
    print(f"Erişim anahtarı: {TOKEN}")
    print("Yalnız güvenilen Özel ağda çalıştırın; kapatmak için Ctrl+C.")
    ThreadingHTTPServer(("0.0.0.0", port), Handler).serve_forever()

import importlib.util
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

spec = importlib.util.spec_from_file_location("clipboard_helper", Path(__file__).with_name("pc_clipboard_helper.py"))
helper = importlib.util.module_from_spec(spec)
spec.loader.exec_module(helper)


class ClipboardHelperTest(unittest.TestCase):
    def setUp(self):
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), helper.Handler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.url = f"http://127.0.0.1:{self.server.server_port}"
        self.original_clipboard = helper.set_clipboard
        self.captured = []
        helper.set_clipboard = self.captured.append

    def tearDown(self):
        helper.set_clipboard = self.original_clipboard
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()

    def test_authorization_and_unicode_clipboard(self):
        with self.assertRaises(urllib.error.HTTPError) as failure:
            urllib.request.urlopen(self.url + "/health")
        self.assertEqual(failure.exception.code, 401)
        headers = {"Authorization": "Bearer " + helper.TOKEN}
        response = urllib.request.urlopen(urllib.request.Request(self.url + "/health", headers=headers))
        self.assertIn(b'not-bahcesi-clipboard', response.read())
        text = "Merhaba çığöşü 🌿"
        request = urllib.request.Request(self.url + "/clipboard", data=text.encode("utf-8"), headers=headers)
        self.assertIn(b'"ok": true', urllib.request.urlopen(request).read())
        self.assertEqual(self.captured, [text])


if __name__ == "__main__":
    unittest.main()

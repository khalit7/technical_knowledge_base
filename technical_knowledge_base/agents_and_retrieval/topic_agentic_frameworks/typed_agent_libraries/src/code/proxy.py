"""ftyped logging proxy: OpenAI-compatible pass-through to 127.0.0.1:8090 that holds the shared
scratchpad/agents/mlx_request.lock around every upstream request (via mlx_call.locked) and logs each
request/response pair as one JSON line. POST /__log {"file": path} switches the log file;
POST /__temp {"t": 0.7 or null} forces temperature on every chat request.
Usage: python3 proxy.py LISTEN_PORT LOGFILE"""
import json, os, sys, time, threading, http.server, urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from mlx_call import locked

LISTEN, LOG = int(sys.argv[1]), sys.argv[2]
st = {"log": LOG, "temp": None}
wl = threading.Lock()


class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _fwd(self, method):
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n) if n else None
        if self.path in ("/__log", "/__temp"):
            j = json.loads(body)
            if self.path == "/__log":
                st["log"] = j["file"]
            else:
                st["temp"] = j["t"]
            self.send_response(200); self.end_headers(); self.wfile.write(b"ok"); return
        sent = body
        if st["temp"] is not None and body and self.path.endswith("/chat/completions"):
            j = json.loads(body); j["temperature"] = st["temp"]; sent = json.dumps(j).encode()
        req = urllib.request.Request("http://127.0.0.1:8090" + self.path, data=sent, method=method,
                                     headers={"Content-Type": "application/json"})
        with locked():
            t0 = time.time()
            try:
                r = urllib.request.urlopen(req, timeout=900)
                status, data, ct = r.status, r.read(), r.headers.get("Content-Type", "application/json")
            except urllib.error.HTTPError as e:
                status, data, ct = e.code, e.read(), "application/json"
            except Exception as e:
                status, data, ct = 502, json.dumps({"error": repr(e)}).encode(), "application/json"
            t1 = time.time()
        self.send_response(status)
        self.send_header("Content-Type", ct)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

        def jj(b):
            try:
                return json.loads(b)
            except Exception:
                return b.decode("utf-8", "replace") if b else None
        with wl, open(st["log"], "a") as f:
            f.write(json.dumps({"t0": t0, "t1": t1, "path": self.path, "status": status,
                                "request": jj(sent), "response": jj(data)}) + "\n")

    def do_POST(self):
        self._fwd("POST")

    def do_GET(self):
        self._fwd("GET")


http.server.ThreadingHTTPServer(("127.0.0.1", LISTEN), H).serve_forever()

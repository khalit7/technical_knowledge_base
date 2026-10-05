"""Logging proxy for an OpenAI-compatible server (mlx_lm.server).

Usage: python proxy.py LISTEN_PORT UPSTREAM_PORT LOGFILE
Each request/response pair is appended to LOGFILE as one JSON line:
{"t0": ..., "t1": ..., "path": ..., "request": {...}, "response": {...}}
Streaming responses are passed through and stored as raw text.
Set the log file at runtime with POST /__log {"file": "..."}.
"""
import json, sys, time, http.server, urllib.request, threading

LISTEN, UP, LOG = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
TEMP = float(sys.argv[4]) if len(sys.argv) > 4 else None  # optional: set temperature on every request
lock = threading.Lock()
state = {"log": LOG}


class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _fwd(self, method):
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n) if n else None
        if self.path == "/__log":
            state["log"] = json.loads(body)["file"]
            self.send_response(200); self.end_headers(); self.wfile.write(b"ok"); return
        t0 = time.time()
        if TEMP is not None and body and self.path.endswith("/chat/completions"):
            j = json.loads(body); j["temperature"] = TEMP; body = json.dumps(j).encode()
        req = urllib.request.Request(f"http://127.0.0.1:{UP}{self.path}", data=body, method=method)
        req.add_header("Content-Type", "application/json")
        try:
            r = urllib.request.urlopen(req, timeout=900)
            status, data, ct = r.status, r.read(), r.headers.get("Content-Type", "application/json")
        except urllib.error.HTTPError as e:
            status, data, ct = e.code, e.read(), "application/json"
        t1 = time.time()
        self.send_response(status)
        self.send_header("Content-Type", ct)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)
        try:
            rq = json.loads(body) if body else None
        except Exception:
            rq = body.decode("utf-8", "replace") if body else None
        try:
            rs = json.loads(data)
        except Exception:
            rs = data.decode("utf-8", "replace")
        with lock, open(state["log"], "a") as f:
            f.write(json.dumps({"t0": t0, "t1": t1, "path": self.path, "status": status, "request": rq, "response": rs}) + "\n")

    def do_POST(self):
        self._fwd("POST")

    def do_GET(self):
        self._fwd("GET")


http.server.ThreadingHTTPServer(("127.0.0.1", LISTEN), H).serve_forever()

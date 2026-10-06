"""Replay server: answers POST /v1/chat/completions with the recorded responses, in order, so every
instrumentation variant sees byte-identical model answers. Logs every incoming request body.
Usage: python replay.py PORT RECORDED.jsonl REQUEST_LOG.jsonl   (POST /reset restarts the sequence)"""
import http.server, json, sys, threading, time

PORT, REC, LOG = int(sys.argv[1]), sys.argv[2], sys.argv[3]
rows = [json.loads(l) for l in open(REC) if l.strip()]
rows = [r for r in rows if r["path"].endswith("/chat/completions")]
state = {"i": 0}
lock = threading.Lock()


class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, obj):
        data = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        self._send(200, {"object": "list", "data": [{"id": rows[0]["request"]["model"], "object": "model"}]})

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n) if n else b""
        if self.path == "/reset":
            with lock:
                state["i"] = 0
            return self._send(200, {"ok": True})
        with lock:
            i = state["i"]
            state["i"] += 1
        try:
            req = json.loads(body)
        except Exception:
            req = None
        with open(LOG, "a") as f:
            f.write(json.dumps({"i": i, "t": time.time(), "path": self.path, "request": req}) + "\n")
        if i >= len(rows):
            return self._send(500, {"error": {"message": f"replay exhausted at request {i}"}})
        time.sleep(min(0.4, rows[i]["t1"] - rows[i]["t0"]))  # a little latency so spans have width
        self._send(rows[i]["status"], rows[i]["response"])


http.server.ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()

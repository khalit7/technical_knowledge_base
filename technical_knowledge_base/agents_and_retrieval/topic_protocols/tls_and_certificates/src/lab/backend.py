"""Stand-in inference backend behind nginx for the 0-RTT lab: every POST is one "generation" (counted and logged).
If the request carries Early-Data: 1 (RFC 8470, set by nginx from $ssl_early_data) and REJECT_EARLY=1, it answers
425 Too Early instead, so the client retries after the handshake. Usage: python backend.py <port> <log.jsonl>"""
import json, sys, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
PORT, LOG = int(sys.argv[1]), sys.argv[2]
n = 0


class H(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def do_POST(self):
        global n
        body = self.rfile.read(int(self.headers.get("content-length", 0)))
        early = self.headers.get("early-data")
        via = self.headers.get("x-front", "")
        if early == "1" and self.headers.get("x-reject-early") == "1":
            code, out = 425, b'{"error":"too early, retry after the handshake"}'
        else:
            n += 1; code, out = 200, json.dumps({"generation": n, "billed": True}).encode()
        with open(LOG, "a") as f:
            f.write(json.dumps({"t": round(time.time(), 3), "front": via, "early_data_header": early, "status": code,
                                "generation": n if code == 200 else None, "body_bytes": len(body)}) + "\n")
        self.send_response(code); self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(out))); self.send_header("connection", "close"); self.end_headers()
        self.wfile.write(out)

    def log_message(self, *a):
        pass


ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()

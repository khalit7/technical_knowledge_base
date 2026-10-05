"""A deliberately unreliable OpenAI-compatible provider, for the gateway experiments.

Usage: python fake_upstream.py LISTEN_PORT REAL_PORT LOGFILE
Every POST to /v1/chat/completions takes the next behaviour from a script:
  "ok"        a canned answer (fixed text, usage 40 in / 8 out); the real model is only reached through the backup route
  "429:N"     HTTP 429 rate limited, with a Retry-After: N header (omit :N for no header)
  "500"/"503" HTTP error with an OpenAI-style error body
  "hang:S"    wait S seconds before answering (a stuck provider), then answer ok
When the script is used up, "default" applies.
POST /__script {"seq": [...], "default": "ok", "tag": "scenario name"} replaces the script.
Each request is logged as one JSON line: wall time, tag, behaviour, status, duration.
"""
import json, sys, time, threading, http.server, urllib.request

LISTEN, REAL, LOG = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3]
lock = threading.Lock()
S = {"seq": [], "default": "ok", "tag": "none", "n": 0}


def err_body(code, msg, typ):
    return json.dumps({"error": {"message": msg, "type": typ, "code": str(code)}}).encode()


class H(http.server.BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def log_message(self, *a):
        pass

    def send(self, status, data, headers=None):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        self.send(200, json.dumps({"object": "list", "data": [{"id": "flaky-model", "object": "model"}]}).encode())

    def do_POST(self):
        n = int(self.headers.get("Content-Length") or 0)
        body = self.rfile.read(n) if n else b""
        if self.path == "/__script":
            d = json.loads(body)
            with lock:
                S.update(seq=list(d.get("seq", [])), default=d.get("default", "ok"), tag=d.get("tag", "none"), n=0)
            return self.send(200, b'{"ok":true}')
        with lock:
            beh = S["seq"].pop(0) if S["seq"] else S["default"]
            S["n"] += 1
            idx, tag = S["n"], S["tag"]
        t0 = time.time()
        status = 200
        kind, _, arg = beh.partition(":")
        try:
            if kind == "429":
                status = 429
                self.send(429, err_body(429, "Rate limit reached for requests (fake upstream)", "rate_limit_error"),
                          {"Retry-After": arg} if arg else None)
            elif kind in ("500", "502", "503"):
                status = int(kind)
                self.send(status, err_body(status, "The server had an error while processing your request (fake upstream)", "server_error"))
            else:
                if kind == "hang":
                    time.sleep(float(arg or 30))
                # canned answer: the fake provider never touches the real model (keeps GPU load off the shared machine)
                d = {"id": f"fake-{idx}", "object": "chat.completion", "model": "flaky-model", "created": int(time.time()),
                     "choices": [{"index": 0, "finish_reason": "stop",
                                  "message": {"role": "assistant", "content": "[canned reply from the fake provider]"}}],
                     "usage": {"prompt_tokens": 40, "completion_tokens": 8, "total_tokens": 48}}
                self.send(200, json.dumps(d).encode())
        except (BrokenPipeError, ConnectionResetError):
            status = "client_gone"
        t1 = time.time()
        with lock, open(LOG, "a") as f:
            f.write(json.dumps({"i": idx, "tag": tag, "t0": t0, "t1": t1, "behaviour": beh, "status": status}) + "\n")


http.server.ThreadingHTTPServer(("127.0.0.1", LISTEN), H).serve_forever()

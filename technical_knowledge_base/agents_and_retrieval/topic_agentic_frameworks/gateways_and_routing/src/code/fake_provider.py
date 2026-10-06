"""A scriptable fake OpenAI-compatible provider for the gateway experiments (fgw).

Extends the frameworks root's fake_upstream.py (Production stack tab) with a base latency,
a context-window error and a name, so several copies can stand in for several deployments.

Usage: python fake_provider.py NAME LISTEN_PORT BASE_DELAY_S LOGFILE
Each POST to /v1/chat/completions takes the next behaviour from its script:
  "ok"         answer after BASE_DELAY_S (usage 40 in / 8 out)
  "sleep:S"    answer after S seconds instead
  "429:N"      HTTP 429 with Retry-After: N (omit :N for no header)
  "500"/"503"  HTTP error with an OpenAI-style body
  "hang:S"     wait S seconds, then answer ok (a stuck provider)
  "ctx"        HTTP 400 context_length_exceeded (as OpenAI words it)
When the script is used up, "default" applies.
POST /__script {"seq": [...], "default": "ok", "tag": "..."} replaces the script.
Every request is logged as one JSON line: name, index, tag, behaviour, status, start, end.
"""
import json, sys, time, threading, http.server

NAME, LISTEN, BASE, LOG = sys.argv[1], int(sys.argv[2]), float(sys.argv[3]), sys.argv[4]
lock = threading.Lock()
S = {"seq": [], "default": "ok", "tag": "none", "n": 0}


def err(code, msg, typ, c=None):
    return json.dumps({"error": {"message": msg, "type": typ, "param": None, "code": c or str(code)}}).encode()


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
        self.send(200, json.dumps({"object": "list", "data": [{"id": "fake-" + NAME, "object": "model"}]}).encode())

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
        try:
            msg = str(json.loads(body)["messages"][-1]["content"])[:40]
        except Exception:
            msg = ""
        t0 = time.time()
        status = 200
        kind, _, arg = beh.partition(":")
        try:
            if kind == "429":
                status = 429
                self.send(429, err(429, "Rate limit reached for requests (fake provider)", "rate_limit_error"),
                          {"Retry-After": arg} if arg else None)
            elif kind in ("500", "502", "503"):
                status = int(kind)
                self.send(status, err(status, "The server had an error while processing your request (fake provider)", "server_error"))
            elif kind == "ctx":
                status = 400
                self.send(400, err(400, "This model's maximum context length is 8192 tokens. However, your messages resulted in 9000 tokens. Please reduce the length of the messages.",
                                   "invalid_request_error", "context_length_exceeded"))
            else:
                time.sleep(float(arg) if kind in ("hang", "sleep") else BASE)
                d = {"id": f"{NAME}-{idx}", "object": "chat.completion", "model": "fake-" + NAME, "created": int(time.time()),
                     "choices": [{"index": 0, "finish_reason": "stop",
                                  "message": {"role": "assistant", "content": f"[canned reply from fake provider {NAME}]"}}],
                     "usage": {"prompt_tokens": 40, "completion_tokens": 8, "total_tokens": 48}}
                self.send(200, json.dumps(d).encode())
        except (BrokenPipeError, ConnectionResetError):
            status = "client_gone"
        t1 = time.time()
        with lock, open(LOG, "a") as f:
            f.write(json.dumps({"name": NAME, "i": idx, "tag": tag, "t0": t0, "t1": t1, "behaviour": beh, "status": status, "msg": msg}) + "\n")


http.server.ThreadingHTTPServer(("127.0.0.1", LISTEN), H).serve_forever()

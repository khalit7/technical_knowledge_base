"""An OpenAI-compatible /v1/chat/completions endpoint backed by `claude -p` (the Claude Code CLI in
headless mode, on the Claude subscription). For TEXT-PROTOCOL harnesses only (Aider, mini-SWE-agent):
it has no native tool calling. The message list is flattened into one prompt (claude -p takes no
message list), the first system message becomes --system-prompt, all Claude Code tools are off.

Usage: python3 claude_shim.py PORT MODEL_ALIAS LOGFILE [BOUNDARY]
BOUNDARY: "none" (default) returns the model's whole reply.
          "mswea" cuts the reply right after the first complete ```mswea_bash_command block, i.e. it
          enforces the action boundary on the client side, because claude -p has no stop sequences.
The OpenAI "stop" parameter, if a client sends it, is honoured the same way (cut at the first match).
Every call is appended to LOGFILE: request messages, the raw stream-json records, full and returned text.
"""
import json, re, subprocess, sys, time, threading, http.server, os

PORT, MODEL, LOG = int(sys.argv[1]), sys.argv[2], sys.argv[3]
BOUNDARY = sys.argv[4] if len(sys.argv) > 4 else "none"
HERE = os.path.dirname(os.path.abspath(__file__))
EMPTY = os.path.join(HERE, "empty")
os.makedirs(EMPTY, exist_ok=True)
NO_EMDASH = "Never use the em-dash character."
FRAME = ("The conversation so far is below, oldest first. You are the assistant. "
         "Write only your next assistant message, then stop: the user's reply will come in the next turn.\n\n")
lock = threading.Lock()
MSWEA = re.compile(r"```mswea_bash_command\s*\n.*?\n```", re.S)


def text_of(c):
    if isinstance(c, str):
        return c
    return "".join(p.get("text", "") for p in c if isinstance(p, dict))


def cut(full, stops):
    out, why = full, None
    if BOUNDARY == "mswea":
        m = MSWEA.search(full)
        if m and m.end() < len(full.rstrip()):
            out, why = full[:m.end()], "boundary"
    for s in stops or []:
        i = out.find(s)
        if i >= 0:
            out, why = out[:i], "stop"
    return out, why


class H(http.server.BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def _send(self, code, obj, sse=False):
        if sse:
            chunk = {"id": obj["id"], "object": "chat.completion.chunk", "created": obj["created"], "model": obj["model"],
                     "choices": [{"index": 0, "delta": {"role": "assistant", "content": obj["choices"][0]["message"]["content"]},
                                  "finish_reason": "stop"}], "usage": obj["usage"]}
            data = ("data: " + json.dumps(chunk) + "\n\ndata: [DONE]\n\n").encode()
            ct = "text/event-stream"
        else:
            data, ct = json.dumps(obj).encode(), "application/json"
        self.send_response(code)
        self.send_header("Content-Type", ct)
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        self._send(200, {"object": "list", "data": [{"id": MODEL, "object": "model"}]})

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get("Content-Length") or 0)) or b"{}")
        msgs = body.get("messages", [])
        system = "\n".join(text_of(m["content"]) for m in msgs if m["role"] == "system")
        rest = [m for m in msgs if m["role"] != "system"]
        convo = "".join(f"<{m['role']}>\n{text_of(m['content'])}\n</{m['role']}>\n\n" for m in rest)
        stops = body.get("stop")
        if isinstance(stops, str):
            stops = [stops]
        with lock:  # one claude -p at a time
            t = time.time()
            p = subprocess.run(
                ["claude", "-p", "--output-format", "stream-json", "--verbose", "--no-session-persistence",
                 "--setting-sources", "project", "--strict-mcp-config", "--model", MODEL, "--tools", "",
                 "--system-prompt", (system + "\n" + NO_EMDASH).strip()],
                input=FRAME + convo, capture_output=True, text=True, cwd=EMPTY, timeout=600)
            wall = time.time() - t
        recs = [json.loads(l) for l in p.stdout.splitlines() if l.strip().startswith("{")]
        res = ([r for r in recs if r.get("type") == "result"] or [{}])[-1]
        full = res.get("result") or ""
        out, why = cut(full, stops)
        u = res.get("usage", {})
        pin = u.get("input_tokens", 0) + u.get("cache_creation_input_tokens", 0) + u.get("cache_read_input_tokens", 0)
        with open(LOG, "a") as f:
            f.write(json.dumps({"t0": t, "wall_s": round(wall, 2), "boundary": BOUNDARY, "stops": stops,
                                "request_messages": msgs, "full_text": full, "returned_text": out, "cut": why,
                                "records": recs, "stderr": p.stderr[-2000:]}) + "\n")
        if not res or res.get("is_error"):
            self._send(500, {"error": {"message": "claude -p failed: " + str(res.get("result"))[:300] + p.stderr[-300:]}})
            return
        obj = {"id": "shim-%d" % int(t * 1000), "object": "chat.completion", "created": int(t), "model": MODEL,
               "choices": [{"index": 0, "finish_reason": "stop", "message": {"role": "assistant", "content": out}}],
               "usage": {"prompt_tokens": pin, "completion_tokens": u.get("output_tokens", 0),
                         "total_tokens": pin + u.get("output_tokens", 0)}}
        self._send(200, obj, sse=bool(body.get("stream")))


http.server.ThreadingHTTPServer(("127.0.0.1", PORT), H).serve_forever()

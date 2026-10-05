"""What the official Anthropic and OpenAI Python SDKs actually do on failures, measured against the local lab server.

No real API is called: base_url points at lab_server.py (plain HTTP on 127.0.0.1) or at a socket that reads the request
and closes the connection. The server logs every attempt it receives (time, attempt number, x-stainless-* headers,
any idempotency header); this script records what the caller saw. Writes raw/sdk_retries.json.
Usage: python sdk_retries.py <plain port> <drop port> <server log> <out.json>
"""
import json, socket, sys, threading, time
import anthropic, openai

PLAIN, DROP, SLOG, OUT = int(sys.argv[1]), int(sys.argv[2]), sys.argv[3], sys.argv[4]
KEY = "sk-wirelab-not-a-real-key"
drops = []


def drop_server():
    """Accept, read the whole request head, then close without answering (as a crashed or restarted backend does)."""
    srv = socket.socket(); srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    srv.bind(("127.0.0.1", DROP)); srv.listen(16)
    t0 = time.monotonic()
    while True:
        c, _ = srv.accept()
        data = b""
        c.settimeout(2)
        try:
            while b"\r\n\r\n" not in data:
                d = c.recv(65536)
                if not d: break
                data += d
        except OSError:
            pass
        head = data.split(b"\r\n\r\n")[0].decode("latin-1").split("\r\n")
        drops.append({"t": round(time.monotonic() - t0, 3), "line": head[0],
                      "headers": {l.split(":", 1)[0].lower(): l.split(":", 1)[1].strip() for l in head[1:] if ":" in l
                                  and l.lower().startswith(("x-stainless-retry", "idempotency", "x-stainless-timeout"))}})
        c.close()


threading.Thread(target=drop_server, daemon=True).start()
time.sleep(0.3)


def server_attempts(run):
    out = []
    for line in open(SLOG):
        r = json.loads(line)
        if r["run"] == run:
            out.append(r)
    t0 = out[0]["t"] if out else 0
    for r in out:
        r["t"] = round(r["t"] - t0, 3)
    return out


def case(sdk, name, fail=None, retry_after=None, think=None, timeout=None, base=None):
    run = f"{sdk}-{name}"
    h = {"x-lab-run": run}
    if fail: h["x-lab-fail"] = fail
    if retry_after is not None: h["x-lab-retry-after"] = str(retry_after)
    if think is not None: h["x-lab-think"] = str(think)
    url = base or f"http://127.0.0.1:{PLAIN}"
    kw = {"timeout": timeout} if timeout else {}
    t0 = time.monotonic(); err = None
    try:
        if sdk == "anthropic":
            c = anthropic.Anthropic(api_key=KEY, base_url=url, default_headers=h, **kw)
            r = c.messages.create(model="wire-lab-1", max_tokens=16, messages=[{"role": "user", "content": "What colour is the sky?"}])
            result = r.content[0].text
        else:
            c = openai.OpenAI(api_key=KEY, base_url=url + "/v1", default_headers=h, **kw)
            r = c.chat.completions.create(model="wire-lab-1", messages=[{"role": "user", "content": "What colour is the sky?"}])
            result = r.choices[0].message.content
    except Exception as e:  # what the caller sees
        result, err = None, f"{type(e).__module__.split('.')[0]}.{type(e).__name__}: {str(e)[:120]}"
    took = round(time.monotonic() - t0, 3)
    return {"sdk": sdk, "case": name, "fail": fail, "retry_after": retry_after, "think": think, "timeout": timeout,
            "result": result, "error": err, "caller_seconds": took}


results = []
for sdk in ["anthropic", "openai"]:
    for args in [dict(name="ok"),
                 dict(name="529x2" if sdk == "anthropic" else "503x2", fail=("529x2" if sdk == "anthropic" else "503x2")),
                 dict(name="429_retry_after_1", fail="429x1", retry_after=1),
                 dict(name="500x5", fail="500x5"),
                 dict(name="400x1", fail="400x1"),
                 dict(name="read_timeout", think=2.5, timeout=1.0)]:
        r = case(sdk, **args)
        r["server_saw"] = server_attempts(r["sdk"] + "-" + r["case"])
        if len(r["server_saw"]) > 1:
            ts = [a["t"] for a in r["server_saw"]]
            r["gaps"] = [round(b - a, 3) for a, b in zip(ts, ts[1:])]
        results.append(r); print(json.dumps({k: r[k] for k in ("sdk", "case", "error", "caller_seconds")}), r.get("gaps"))
    n0 = len(drops)
    r = case(sdk, "connection_dropped", base=f"http://127.0.0.1:{DROP}")
    r["server_saw"] = drops[n0:]
    ts = [a["t"] for a in r["server_saw"]]
    r["gaps"] = [round(b - a, 3) for a, b in zip(ts, ts[1:])]
    results.append(r); print(json.dumps({k: r[k] for k in ("sdk", "case", "error", "caller_seconds")}), r["gaps"])

json.dump({"recorded": time.strftime("%Y-%m-%d"), "versions": {"anthropic": anthropic.__version__, "openai": openai.__version__},
           "note": "Local lab server only; no real API called. Timing gaps include the SDK's random jitter, so they vary run to run.",
           "cases": results}, open(OUT, "w"), indent=1)

"""Start the demo service (app.py) three times on loopback, send real requests over a raw socket,
and save every request and response byte for byte to ../inputs/exchanges.json. Also times requests.
Run from this folder (about 1 minute):
  uv run --no-project --python 3.12 --with fastapi --with uvicorn python capture.py
"""
import json, os, socket, subprocess, sys, time, threading, statistics, datetime, platform, http.client, importlib.metadata as md

HERE = os.path.dirname(os.path.abspath(__file__))
KEY = "sk_test_alice"

def start(port, **env):
    e = dict(os.environ, **{k: str(v) for k, v in env.items()})
    p = subprocess.Popen([sys.executable, "-m", "uvicorn", "app:app", "--port", str(port), "--log-level", "warning"],
                         cwd=HERE, env=e)
    for _ in range(100):
        try:
            socket.create_connection(("127.0.0.1", port), 0.2).close(); return p
        except OSError:
            time.sleep(0.1)
    raise SystemExit("server did not start")

def raw(port, method, path, body=None, headers=None, stream=False):
    """Send one HTTP/1.1 request exactly as written here and return the raw response bytes as text."""
    h = {"Host": f"127.0.0.1:{port}", "User-Agent": "capture/1", "Accept": "*/*"}
    h.update(headers or {})
    data = b""
    if body is not None:
        data = (body if isinstance(body, str) else json.dumps(body)).encode()
        h.setdefault("Content-Type", "application/json"); h["Content-Length"] = str(len(data))
    h["Connection"] = "close"
    req = f"{method} {path} HTTP/1.1\r\n" + "".join(f"{k}: {v}\r\n" for k, v in h.items()) + "\r\n"
    s = socket.create_connection(("127.0.0.1", port)); t0 = time.perf_counter()
    s.sendall(req.encode() + data)
    chunks, first = [], None
    while True:
        b = s.recv(65536)
        if not b: break
        if first is None: first = time.perf_counter() - t0
        chunks.append((round((time.perf_counter() - t0) * 1000, 1), b.decode()))
    s.close()
    resp = "".join(c for _, c in chunks)
    out = {"request": req + data.decode(), "response": resp, "ms": round((time.perf_counter() - t0) * 1000, 2)}
    if stream: out["arrivals_ms"] = [t for t, _ in chunks]
    return out

def status(x): return int(x["response"].split(" ", 2)[1])
def jbody(x): return json.loads(x["response"].split("\r\n\r\n", 1)[1])

ex = {}
A = {"Authorization": f"Bearer {KEY}"}
p1, p2, p3 = start(8765), start(8766, PROBLEM_JSON=0), start(8767, SLOW_S=1)
try:
    ex["health"] = raw(8765, "GET", "/v1/health")
    ex["create_noauth"] = raw(8765, "POST", "/v1/chats", {"title": "Trip plans"})
    ex["create"] = raw(8765, "POST", "/v1/chats", {"title": "Trip plans"}, A)
    chat = jbody(ex["create"])["id"]
    ex["create_invalid"] = raw(8765, "POST", "/v1/chats", {"title": "", "colour": "blue"}, A)
    ex["create_invalid_default"] = raw(8766, "POST", "/v1/chats", {"title": "", "colour": "blue"}, A)
    ex["create_badjson"] = raw(8765, "POST", "/v1/chats", '{"title": "Trip', A)
    ex["get_missing"] = raw(8765, "GET", "/v1/chats/chat_nope", headers=A)
    ex["get"] = raw(8765, "GET", f"/v1/chats/{chat}", headers=A)
    for t in ["Recipes", "Taxes", "Job hunt", "Reading list"]:
        raw(8765, "POST", "/v1/chats", {"title": t}, A); time.sleep(1.05)   # distinct created_at seconds
    ex["list_p1"] = raw(8765, "GET", "/v1/chats?limit=2", headers=A)
    c = jbody(ex["list_p1"])["next_cursor"]
    ex["list_p2"] = raw(8765, "GET", f"/v1/chats?limit=2&cursor={c}", headers=A)
    ex["list_badlimit"] = raw(8765, "GET", "/v1/chats?limit=500", headers=A)
    K = "7f9c2a1e-5b7d-4c8e-9a51-3d2f6b8e0c41"
    m = {"content": "Summarise this article", "model": "small"}
    ex["msg_nokey"] = raw(8765, "POST", f"/v1/chats/{chat}/messages", m, A)
    ex["msg_first"] = raw(8765, "POST", f"/v1/chats/{chat}/messages", m, {**A, "Idempotency-Key": K})
    ex["msg_retry"] = raw(8765, "POST", f"/v1/chats/{chat}/messages", m, {**A, "Idempotency-Key": K})
    ex["msg_mismatch"] = raw(8765, "POST", f"/v1/chats/{chat}/messages", {**m, "content": "Something else"}, {**A, "Idempotency-Key": K})
    time.sleep(6)                                                            # refill the token bucket
    # a retry that arrives while the first attempt is still running (slow server, 1 s per message)
    chat3 = jbody(raw(8767, "POST", "/v1/chats", {"title": "Slow"}, A))["id"]
    K2 = "0b1d7e44-2c8a-4f61-b3e9-58a7c1d90f22"; res = {}
    th = threading.Thread(target=lambda: res.__setitem__("first", raw(8767, "POST", f"/v1/chats/{chat3}/messages", m, {**A, "Idempotency-Key": K2})))
    th.start(); time.sleep(0.3)
    ex["msg_concurrent"] = raw(8767, "POST", f"/v1/chats/{chat3}/messages", m, {**A, "Idempotency-Key": K2})
    th.join(); ex["msg_concurrent_first"] = res["first"]
    ex["stream"] = raw(8765, "POST", f"/v1/chats/{chat}/messages", {**m, "stream": True}, {**A, "Idempotency-Key": "s-1"}, stream=True)
    time.sleep(6)
    burst = [raw(8765, "POST", f"/v1/chats/{chat}/messages", m, {**A, "Idempotency-Key": f"b-{i}"}) for i in range(7)]
    ex["burst_statuses"] = [status(b) for b in burst]
    ex["rate_limited"] = next(b for b in burst if status(b) == 429)
    ex["rate_ok"] = burst[0]
    conn = http.client.HTTPConnection("127.0.0.1", 8765); conn.request("GET", "/openapi.json"); spec = json.loads(conn.getresponse().read())
    ex["openapi_version"] = spec["openapi"]
    ex["openapi_messages_path"] = spec["paths"]["/v1/chats/{chat_id}/messages"]
    ex["openapi_MessageIn"] = spec["components"]["schemas"]["MessageIn"]
    # timing: one keep-alive connection, 2,000 requests each, after 200 warm-up requests
    def timeit(path, n=2000):
        c = http.client.HTTPConnection("127.0.0.1", 8765); ts = []
        for i in range(n + 200):
            t0 = time.perf_counter(); c.request("GET", path, headers=A); c.getresponse().read()
            if i >= 200: ts.append((time.perf_counter() - t0) * 1000)
        ts.sort(); return {"n": n, "p50_ms": round(ts[n // 2], 3), "p99_ms": round(ts[int(n * .99)], 3), "mean_ms": round(statistics.mean(ts), 3)}
    ex["timing"] = {"health": timeit("/v1/health"), "get_chat": timeit(f"/v1/chats/{chat}")}
    # webhook signature (Standard Webhooks scheme) with a fixed example secret
    sys.path.insert(0, HERE); import app as appmod
    payload = json.dumps({"type": "message.completed", "data": {"id": "msg_123", "chat_id": chat}}, separators=(",", ":"))
    ex["webhook"] = {"secret": "whsec_demo_secret", "id": "evt_2Lk9", "timestamp": 1790000000, "payload": payload,
                     "signature": appmod.sign_webhook(b"whsec_demo_secret", "evt_2Lk9", 1790000000, payload)}
finally:
    for p in (p1, p2, p3): p.terminate()
ex["meta"] = {"date": datetime.date.today().isoformat(), "python": platform.python_version(),
              "fastapi": md.version("fastapi"), "pydantic": md.version("pydantic"), "uvicorn": md.version("uvicorn"),
              "starlette": md.version("starlette"), "machine": platform.machine() + " " + platform.system() + " " + platform.mac_ver()[0]}
json.dump(ex, open(os.path.join(HERE, "..", "inputs", "exchanges.json"), "w"), indent=1)
print(json.dumps({k: (status(v) if isinstance(v, dict) and "response" in v else "") for k, v in ex.items()}, indent=0))
print(ex["meta"], ex["timing"], ex["burst_statuses"])

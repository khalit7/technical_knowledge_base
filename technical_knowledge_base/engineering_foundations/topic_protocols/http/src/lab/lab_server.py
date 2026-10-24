"""HTTP page lab server: the root's Wire Lab stand-in LLM API (same bytes for the running request), plus knobs.

POST /v1/messages answers exactly like topic_protocols/src/wire/llm_server.py (same SSE events, same tokens),
and these request headers change its behaviour (used by the timeout, retry and pipelining measurements):
  x-lab-think: seconds before the first token (default 0.12, the root's FIRST_TOKEN_DELAY)
  x-lab-gap: seconds between tokens (default 0.05)
  x-lab-tokens: number of tokens (default 5; the five tokens repeat)
  x-lab-ping: if set, send an SSE comment ": ping" every this many seconds while thinking
  x-lab-fail: "<status>x<n>": answer <status> to the first n requests carrying the same x-lab-run value
  x-lab-retry-after: value of Retry-After on those failures
A body without "stream": true returns one JSON response after all tokens (no SSE).
POST /v1/chat/completions: a minimal non-streaming OpenAI-shaped answer (for the OpenAI SDK retry runs).
GET /v1/models: a small JSON list with ETag and Cache-Control; If-None-Match with the ETag returns 304.
GET /big?n=<bytes>: n bytes of 'x' (for flow control). GET /health: 200 ok.
No model runs. Served by hypercorn with the local CA, like the root's server (see run_all.sh).
"""
import asyncio, json, os, time
from urllib.parse import parse_qs

TOKENS = ["The", " sky", " is", " blue", "."]
ATTEMPTS = {}
LOG = os.environ.get("LAB_LOG")  # one JSON line per request, for the retry measurements
T0 = time.monotonic()
MODELS = json.dumps({"data": [{"id": "wire-lab-1", "type": "model"}, {"id": "wire-lab-2", "type": "model"}]},
                    separators=(",", ":")).encode()
ETAG = b'"models-v1"'


def sse(event, data):
    return f"event: {event}\ndata: {json.dumps(data, separators=(',', ':'))}\n\n".encode()


async def read_body(receive):
    body = b""
    while True:
        m = await receive()
        body += m.get("body", b"")
        if not m.get("more_body"):
            return body


def log(rec):
    if LOG:
        with open(LOG, "a") as f:
            f.write(json.dumps(rec) + "\n")


async def simple(send, status, ctype, body, extra=()):
    await send({"type": "http.response.start", "status": status,
                "headers": [(b"content-type", ctype), *extra]})
    await send({"type": "http.response.body", "body": body})


async def app(scope, receive, send):
    if scope["type"] == "lifespan":
        while True:
            m = await receive()
            if m["type"] == "lifespan.startup":
                await send({"type": "lifespan.startup.complete"})
            elif m["type"] == "lifespan.shutdown":
                await send({"type": "lifespan.shutdown.complete"}); return
    if scope["type"] != "http":
        return
    path, method = scope["path"], scope["method"]
    hd = {k.decode().lower(): v.decode() for k, v in scope["headers"]}
    if path == "/health":
        await read_body(receive)
        return await simple(send, 200, b"text/plain", b"ok\n")
    if path == "/v1/models" and method == "GET":
        await read_body(receive)
        common = [(b"etag", ETAG), (b"cache-control", b"public, max-age=60")]
        if hd.get("if-none-match") == ETAG.decode():
            await send({"type": "http.response.start", "status": 304, "headers": common})
            await send({"type": "http.response.body", "body": b""}); return
        return await simple(send, 200, b"application/json", MODELS, common)
    if path == "/big" and method == "GET":
        await read_body(receive)
        n = int(parse_qs(scope["query_string"].decode()).get("n", ["100000"])[0])
        await send({"type": "http.response.start", "status": 200,
                    "headers": [(b"content-type", b"application/octet-stream"), (b"content-length", str(n).encode())]})
        await send({"type": "http.response.body", "body": b"x" * n}); return
    if method != "POST" or path not in ("/v1/messages", "/v1/chat/completions"):
        await read_body(receive)
        return await simple(send, 404, b"application/json", b'{"type":"error","error":{"type":"not_found_error"}}')
    raw = await read_body(receive)
    run = hd.get("x-lab-run", "")
    ATTEMPTS[run] = ATTEMPTS.get(run, 0) + 1
    log({"t": round(time.monotonic() - T0, 4), "run": run, "attempt": ATTEMPTS[run], "http_version": scope.get("http_version"),
         "headers": {k: v for k, v in hd.items() if k.startswith(("x-stainless", "idempotency", "x-lab", "user-agent", "anthropic", "openai"))}})
    fail = hd.get("x-lab-fail")
    if fail:
        st, n = fail.split("x")
        if ATTEMPTS[run] <= int(n):
            extra = [(b"retry-after", hd["x-lab-retry-after"].encode())] if "x-lab-retry-after" in hd else []
            kind = {"429": "rate_limit_error", "529": "overloaded_error", "500": "api_error", "503": "api_error"}.get(st, "api_error")
            return await simple(send, int(st), b"application/json",
                                json.dumps({"type": "error", "error": {"type": kind, "message": "lab"}}).encode(), extra)
    if path == "/v1/chat/completions":
        await asyncio.sleep(float(hd.get("x-lab-think", "0.12")))
        return await simple(send, 200, b"application/json", json.dumps({"id": "chatcmpl-lab", "object": "chat.completion",
            "created": 0, "model": "wire-lab-1", "choices": [{"index": 0, "finish_reason": "stop",
            "message": {"role": "assistant", "content": "The sky is blue."}}]}, separators=(",", ":")).encode())
    try:
        req = json.loads(raw)
    except ValueError:
        return await simple(send, 400, b"application/json", b'{"type":"error","error":{"type":"invalid_request_error"}}')
    model = req.get("model", "wire-lab-1")
    think = float(hd.get("x-lab-think", "0.12"))
    gap = float(hd.get("x-lab-gap", "0.05"))
    ntok = int(hd.get("x-lab-tokens", "5"))
    ping = float(hd["x-lab-ping"]) if "x-lab-ping" in hd else None
    toks = [TOKENS[i % 5] for i in range(ntok)]
    if not req.get("stream"):
        await asyncio.sleep(think + gap * max(0, ntok - 1))
        body = {"id": "msg_wirelab_0001", "type": "message", "role": "assistant", "model": model,
                "content": [{"type": "text", "text": "".join(toks)}]}
        return await simple(send, 200, b"application/json", json.dumps(body, separators=(",", ":")).encode(),
                            [(b"x-request-id", b"req_wirelab_0001")])
    await send({"type": "http.response.start", "status": 200, "headers": [
        (b"content-type", b"text/event-stream"), (b"cache-control", b"no-cache"), (b"x-request-id", b"req_wirelab_0001")]})
    out = lambda b: send({"type": "http.response.body", "body": b, "more_body": True})
    await out(sse("message_start", {"type": "message_start", "message": {"id": "msg_wirelab_0001", "model": model, "role": "assistant"}}))
    if ping:
        left = think
        while left > ping:
            await asyncio.sleep(ping); left -= ping
            await out(b": ping\n\n")
        await asyncio.sleep(left)
    else:
        await asyncio.sleep(think)
    for i, t in enumerate(toks):
        if i:
            await asyncio.sleep(gap)
        await out(sse("content_block_delta", {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": t}}))
    await out(sse("message_stop", {"type": "message_stop"}))
    await send({"type": "http.response.body", "body": b""})

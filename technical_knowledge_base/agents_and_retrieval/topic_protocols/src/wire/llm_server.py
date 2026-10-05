"""Wire Lab: a local stand-in for a streaming LLM API.

POST /v1/messages with a JSON body; the answer streams back as Server-Sent Events,
one token every TOKEN_GAP seconds, in the event shapes of Anthropic's Messages API
streaming format (docs.anthropic.com, "Streaming Messages"), trimmed. No model runs:
the tokens are fixed so every run sends the same bytes.

Served by hypercorn (an ASGI server) over TLS with a local CA:
  HTTP/1.1 and HTTP/2 on TCP 127.0.0.1:8443 (chosen by ALPN), HTTP/3 on UDP 127.0.0.1:8443,
  plain HTTP/1.1 (no TLS) on 127.0.0.1:8080 for nc and byte-level demos.
"""
import asyncio, json, os

TOKENS = ["The", " sky", " is", " blue", "."]
TOKEN_GAP = float(os.environ.get("TOKEN_GAP", "0.05"))
FIRST_TOKEN_DELAY = float(os.environ.get("FIRST_TOKEN_DELAY", "0.12"))  # stands in for prefill


def sse(event, data):
    return f"event: {event}\ndata: {json.dumps(data, separators=(',', ':'))}\n\n".encode()


async def read_body(receive):
    body = b""
    while True:
        m = await receive()
        body += m.get("body", b"")
        if not m.get("more_body"):
            return body


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
    if path == "/health":
        await read_body(receive)
        await send({"type": "http.response.start", "status": 200, "headers": [(b"content-type", b"text/plain")]})
        await send({"type": "http.response.body", "body": b"ok\n"}); return
    if path != "/v1/messages" or method != "POST":
        await read_body(receive)
        await send({"type": "http.response.start", "status": 404, "headers": [(b"content-type", b"application/json")]})
        await send({"type": "http.response.body", "body": b'{"type":"error","error":{"type":"not_found_error"}}'}); return
    raw = await read_body(receive)
    try:
        req = json.loads(raw)
    except ValueError:
        await send({"type": "http.response.start", "status": 400, "headers": [(b"content-type", b"application/json")]})
        await send({"type": "http.response.body", "body": b'{"type":"error","error":{"type":"invalid_request_error"}}'}); return
    model = req.get("model", "wire-lab-1")
    await send({"type": "http.response.start", "status": 200, "headers": [
        (b"content-type", b"text/event-stream"), (b"cache-control", b"no-cache"), (b"x-request-id", b"req_wirelab_0001")]})
    out = lambda b: send({"type": "http.response.body", "body": b, "more_body": True})
    await out(sse("message_start", {"type": "message_start", "message": {"id": "msg_wirelab_0001", "model": model, "role": "assistant"}}))
    await asyncio.sleep(FIRST_TOKEN_DELAY)
    for i, t in enumerate(TOKENS):
        if i:
            await asyncio.sleep(TOKEN_GAP)
        await out(sse("content_block_delta", {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": t}}))
    await out(sse("message_stop", {"type": "message_stop"}))
    await send({"type": "http.response.body", "body": b""})

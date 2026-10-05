"""A tiny L7 load balancer for the replica experiment: python lb_proxy.py PORT MODE BACKEND1 BACKEND2
MODE rr: every HTTP request goes to the next backend in turn (what an ordinary round-robin balancer does).
MODE sticky: requests carrying an Mcp-Session-Id go to the replica that minted it (session affinity).
Every exchange is recorded (method, MCP headers, body, backend, status, response body); GET /__log returns and clears it."""
import sys, json, itertools, httpx, uvicorn
from starlette.applications import Starlette
from starlette.responses import Response, StreamingResponse, JSONResponse
from starlette.routing import Route

PORT, MODE, BACKENDS = int(sys.argv[1]), sys.argv[2], sys.argv[3:]
rr = itertools.cycle(range(len(BACKENDS)))
affinity, LOG = {}, []
client = httpx.AsyncClient(timeout=30)
KEEP = ("content-type", "accept", "mcp-protocol-version", "mcp-method", "mcp-name", "mcp-session-id", "last-event-id", "origin")


async def log(request):
    out = list(LOG); LOG.clear(); return JSONResponse(out)


async def proxy(request):
    body = await request.body()
    sid = request.headers.get("mcp-session-id")
    i = affinity.get(sid) if (MODE == "sticky" and sid in affinity) else next(rr)
    hdrs = {k: v for k, v in request.headers.items() if k.lower() not in ("host", "content-length")}
    req = client.build_request(request.method, BACKENDS[i] + request.url.path, headers=hdrs, content=body)
    up = await client.send(req, stream=True)
    rec = {"replica": "AB"[i], "method": request.method,
           "req_headers": {k: v for k, v in request.headers.items() if k.lower() in KEEP},
           "req_body": body.decode(errors="replace"), "status": up.status_code,
           "resp_headers": {k: v for k, v in up.headers.items() if k.lower() in KEEP}, "resp_body": ""}
    LOG.append(rec)
    if up.headers.get("mcp-session-id"):
        affinity[up.headers["mcp-session-id"]] = i
    out_h = {k: v for k, v in up.headers.items() if k.lower() not in ("content-length", "transfer-encoding", "content-encoding")}

    async def gen():
        async for chunk in up.aiter_raw():
            rec["resp_body"] += chunk.decode(errors="replace")
            yield chunk
        await up.aclose()
    return StreamingResponse(gen(), status_code=up.status_code, headers=out_h)

app = Starlette(routes=[Route("/__log", log), Route("/{p:path}", proxy, methods=["GET", "POST", "DELETE"])])
uvicorn.run(app, host="127.0.0.1", port=PORT, log_level="warning")

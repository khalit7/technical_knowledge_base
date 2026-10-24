"""Streaming lab server: the root page's running request, delivered five ways.

One aiohttp app on 127.0.0.1:$PORT (default 30401), plain HTTP so every byte can be counted.
The "model" is the root's Wire Lab stand-in: message_start at once, then five tokens
("The", " sky", " is", " blue", ".") after THINK s (default 0.12) and GAP s apart (default 0.05),
then message_stop. Event JSON is byte-identical to topic_protocols/src/wire/llm_server.py.

Endpoints
  POST /v1/messages, GET /sse   SSE. Query: ids=1 (add id: lines), ping=<ms> (": ping" comments),
                                think=<s>, gap=<s>, n=<tokens> (more than 5 repeats a counter),
                                drop_after=<k> (cut the TCP connection after k events), retry=<ms>,
                                careful=1 (stop work as soon as the client goes away), tag=<label>
  GET /poll?s=<id>&cursor=<k>   short polling: every event after cursor, at once (JSON)
  GET /longpoll?s=&cursor=&wait= long polling: hold until an event after cursor exists (or wait s)
  GET /ws                       WebSocket: one text message per event (the JSON only)
  GET /edge/<name>              raw byte cases for the SSE parser comparison (edge_cases.py)
  GET /log, POST /log/clear     what the server saw (Last-Event-ID, work done after a disconnect)
"""
import asyncio, json, os, time
from aiohttp import web, WSMsgType

TOKENS = ["The", " sky", " is", " blue", "."]
LOG = []


def ev_json(name, i=None, text=None, model="wire-lab-1"):
    if name == "message_start":
        d = {"type": "message_start", "message": {"id": "msg_wirelab_0001", "model": model, "role": "assistant"}}
    elif name == "content_block_delta":
        d = {"type": "content_block_delta", "index": 0, "delta": {"type": "text_delta", "text": text}}
    else:
        d = {"type": "message_stop"}
    return json.dumps(d, separators=(",", ":"))


def schedule(think=0.12, gap=0.05, n=5):
    """(time offset s, event name, json) for one answer."""
    toks = TOKENS if n == 5 else [f" t{i}" for i in range(n)]
    out = [(0.0, "message_start", ev_json("message_start"))]
    for i, t in enumerate(toks):
        out.append((think + i * gap, "content_block_delta", ev_json("content_block_delta", text=t)))
    out.append((think + (len(toks) - 1) * gap, "message_stop", ev_json("message_stop")))
    return out


def sse_bytes(name, data, eid=None):
    s = f"event: {name}\n" + (f"id: {eid}\n" if eid is not None else "") + f"data: {data}\n\n"
    return s.encode()


def q(req, k, d, f=float):
    v = req.query.get(k)
    return f(v) if v not in (None, "") else d


async def sse(req):
    if req.method == "POST":
        await req.read()
    t0 = time.monotonic()
    tag = req.query.get("tag", "")
    LOG.append({"t": time.time(), "tag": tag, "path": req.path_qs, "last_event_id": req.headers.get("Last-Event-ID"),
                "accept": req.headers.get("Accept")})
    think, gap, n = q(req, "think", 0.12), q(req, "gap", 0.05), q(req, "n", 5, int)
    ids, ping = req.query.get("ids") == "1", q(req, "ping", 0.0) / 1000
    drop_after, careful = q(req, "drop_after", -1, int), req.query.get("careful") == "1"
    start = 0
    lei = req.headers.get("Last-Event-ID")
    if ids and lei and lei.isdigit():
        start = int(lei) + 1          # resume after the last event the client saw
    if ids and start >= len(schedule(think, gap, n)) and req.query.get("stop204") == "1":
        LOG.append({"t": time.time(), "tag": tag, "work": {"answered": 204}})
        return web.Response(status=204)          # nothing left: 204 tells EventSource to stop
    resp = web.StreamResponse(status=200, headers={"Content-Type": "text/event-stream", "Cache-Control": "no-cache",
                                                   "X-Accel-Buffering": "no"})
    await resp.prepare(req)
    if req.query.get("retry"):
        await resp.write(f"retry: {req.query['retry']}\n\n".encode())
    sched = schedule(think, gap, n)
    work = {"tag": tag, "events_written": 0, "stopped_by": None}
    sent = 0
    last_ping = t0
    try:
        for k, (off, name, data) in enumerate(sched):
            if k < start:
                continue
            # wait until this event's time, sending pings meanwhile, and (careful) watching the client
            target = off - (sched[start][0] if start else 0)
            while True:
                left = target - (time.monotonic() - t0)
                if left <= 0:
                    break
                step = left
                if ping:
                    step = min(step, ping - (time.monotonic() - last_ping))
                if careful:
                    step = min(step, 0.02)
                await asyncio.sleep(max(step, 0))
                if careful and (req.transport is None or req.transport.is_closing()):
                    work["stopped_by"] = "careful: noticed the client was gone"
                    raise ConnectionResetError
                if ping and time.monotonic() - last_ping >= ping - 1e-3:
                    await resp.write(b": ping\n\n")
                    last_ping = time.monotonic()
            await resp.write(sse_bytes(name, data, k if ids else None))
            work["events_written"] += 1
            sent += 1
            if drop_after >= 0 and sent >= drop_after:
                req.transport.close()          # cut mid-stream: no final chunk
                work["stopped_by"] = "drop_after"
                return resp
        await resp.write_eof()
    except (ConnectionResetError, ConnectionError, asyncio.CancelledError) as e:
        work["stopped_by"] = work["stopped_by"] or f"write failed: {type(e).__name__}"
    finally:
        work["work_seconds"] = round(time.monotonic() - t0, 3)
        LOG.append({"t": time.time(), "tag": tag, "work": work})
    return resp


SESS = {}


def sess(s):
    if s not in SESS:
        SESS[s] = time.monotonic()
    return SESS[s]


def ready(s, cursor):
    st = sess(s)
    el = time.monotonic() - st
    sch = schedule()
    return [{"i": k, "event": nm, "data": json.loads(d)} for k, (off, nm, d) in enumerate(sch) if k >= cursor and off <= el]


async def poll(req):
    s, cur = req.query["s"], int(req.query.get("cursor", 0))
    evs = ready(s, cur)
    return web.json_response({"events": evs, "cursor": cur + len(evs), "done": cur + len(evs) >= 7})


async def longpoll(req):
    s, cur, wait = req.query["s"], int(req.query.get("cursor", 0)), float(req.query.get("wait", 25))
    t0 = time.monotonic()
    while True:
        evs = ready(s, cur)
        if evs or time.monotonic() - t0 >= wait:
            return web.json_response({"events": evs, "cursor": cur + len(evs), "done": cur + len(evs) >= 7})
        await asyncio.sleep(0.002)


async def ws(req):
    w = web.WebSocketResponse(heartbeat=None, compress=req.query.get("deflate") == "1")
    await w.prepare(req)
    t0 = time.monotonic()
    for off, name, data in schedule(q(req, "think", 0.12), q(req, "gap", 0.05), q(req, "n", 5, int)):
        d = off - (time.monotonic() - t0)
        if d > 0:
            await asyncio.sleep(d)
        await w.send_str(data)
    if req.query.get("hold"):
        async for m in w:
            if m.type == WSMsgType.TEXT:
                await w.send_str(m.data)
    await w.close(code=1000, message=b"done")
    return w


async def edge(req):
    from edge_cases import CASES
    c = CASES[req.match_info["name"]]
    resp = web.StreamResponse(status=200, headers={"Content-Type": "text/event-stream", "Cache-Control": "no-cache"})
    await resp.prepare(req)
    for part in c["chunks"]:
        await resp.write(part)
        await asyncio.sleep(0.03)
    await resp.write_eof()
    return resp


async def log(req):
    return web.json_response(LOG)


async def log_clear(req):
    LOG.clear(); SESS.clear()
    return web.json_response({"ok": True})


def make_app():
    app = web.Application()
    app.add_routes([web.post("/v1/messages", sse), web.get("/sse", sse), web.get("/poll", poll),
                    web.get("/longpoll", longpoll), web.get("/ws", ws), web.get("/edge/{name}", edge),
                    web.get("/log", log), web.post("/log/clear", log_clear)])
    return app


if __name__ == "__main__":
    web.run_app(make_app(), host="127.0.0.1", port=int(os.environ.get("PORT", "30401")), access_log=None)

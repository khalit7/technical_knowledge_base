"""The running answer delivered four ways through a relay that adds a round trip.

Usage: python four_ways.py <relay base url, e.g. http://127.0.0.1:30402> <relay stats file> <one-way ms> <reps>
For short polling (every POLL_MS), long polling, SSE and WebSocket: when each of the 7 events
(message_start, 5 tokens, message_stop) reaches the client, how many HTTP requests and TCP connections
it took, and the bytes on the wire each way (counted by relay.py). Prints one JSON document.
"""
import asyncio, json, sys, time, uuid, statistics
import httpx, websockets

BASE, STATS, OW, REPS = sys.argv[1], sys.argv[2], float(sys.argv[3]) / 1000, int(sys.argv[4])
POLL_MS = 100
import os
BODY = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../src/wire/request.json"), "rb").read()  # the root's 117-byte request


def stats_since(n0):
    lines = open(STATS).read().splitlines()[n0:]
    rows = [json.loads(l) for l in lines]
    return {"connections": len(rows), "up": sum(r["up"] for r in rows), "down": sum(r["down"] for r in rows)}


def nstats():
    try:
        return len(open(STATS).read().splitlines())
    except FileNotFoundError:
        return 0


async def short_poll():
    s, cur, arr, nreq, reqs = uuid.uuid4().hex[:8], 0, [], 0, []
    async with httpx.AsyncClient() as c:
        t0 = time.monotonic()
        while True:
            nreq += 1
            ts = time.monotonic() - t0
            r = (await c.get(f"{BASE}/poll", params={"s": s, "cursor": cur})).json()
            now = time.monotonic() - t0
            reqs.append([round(ts, 4), round(now, 4), len(r["events"])])
            arr += [[e["event"], now] for e in r["events"]]
            cur = r["cursor"]
            if r["done"]:
                break
            await asyncio.sleep(POLL_MS / 1000)
    return arr, nreq, reqs


async def long_poll():
    s, cur, arr, nreq, reqs = uuid.uuid4().hex[:8], 0, [], 0, []
    async with httpx.AsyncClient(timeout=30) as c:
        t0 = time.monotonic()
        while True:
            nreq += 1
            ts = time.monotonic() - t0
            r = (await c.get(f"{BASE}/longpoll", params={"s": s, "cursor": cur, "wait": 25})).json()
            now = time.monotonic() - t0
            reqs.append([round(ts, 4), round(now, 4), len(r["events"])])
            arr += [[e["event"], now] for e in r["events"]]
            cur = r["cursor"]
            if r["done"]:
                break
    return arr, nreq, reqs


async def sse():
    arr = []
    async with httpx.AsyncClient() as c:
        t0 = time.monotonic()
        async with c.stream("POST", f"{BASE}/v1/messages", content=BODY,
                            headers={"content-type": "application/json"}) as r:
            reqs = [[0.0, round(time.monotonic() - t0, 4), 0]]
            buf = b""
            async for chunk in r.aiter_raw():
                buf += chunk
                while b"\n\n" in buf:
                    ev, buf = buf.split(b"\n\n", 1)
                    name = ev.split(b"\n")[0].split(b": ", 1)[1].decode()
                    arr.append([name, time.monotonic() - t0])
    return arr, 1, reqs


async def ws():
    arr = []
    t0 = time.monotonic()
    async with websockets.connect(BASE.replace("http", "ws") + "/ws", compression=None) as w:
        reqs = [[0.0, round(time.monotonic() - t0, 4), 0]]
        async for m in w:
            arr.append([json.loads(m)["type"], time.monotonic() - t0])
    return arr, 1, reqs


async def main():
    out = {"one_way_ms": OW * 1000, "poll_ms": POLL_MS, "reps": REPS, "methods": {}}
    for name, fn in [("short polling", short_poll), ("long polling", long_poll), ("SSE", sse), ("WebSocket", ws)]:
        runs = []
        for _ in range(REPS):
            n0 = nstats()
            arr, nreq, reqs = await fn()
            await asyncio.sleep(0.4)  # let the relay close and log the connection
            runs.append({"arrivals": arr, "requests": nreq, "request_times": reqs, **stats_since(n0)})
            await asyncio.sleep(0.2)
        times = [[r["arrivals"][k][1] for r in runs] for k in range(7)]
        out["methods"][name] = {"runs": runs, "events": [r for r, _ in runs[0]["arrivals"]],
                                "median_arrival_s": [round(statistics.median(t), 4) for t in times],
                                "median_requests": statistics.median(r["requests"] for r in runs),
                                "median_up": statistics.median(r["up"] for r in runs),
                                "median_down": statistics.median(r["down"] for r in runs),
                                "median_connections": statistics.median(r["connections"] for r in runs)}
    print(json.dumps(out, indent=1))

asyncio.run(main())

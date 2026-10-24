"""A TCP relay that adds a one-way delay in each direction and counts bytes.

Usage: python relay.py <listen port> <target port> <one-way delay ms> <stats file>
Every accepted connection is forwarded to 127.0.0.1:<target>; each read is delivered DELAY ms later,
in order. When a connection closes, one JSON line goes to the stats file: bytes up (client to server),
bytes down, open and close times. The delay is a userspace stand-in for a network path's round trip:
it does not model loss, bandwidth or TCP's own behaviour on a long path.
"""
import asyncio, json, sys, time

LP, TP, DELAY, STATS = int(sys.argv[1]), int(sys.argv[2]), float(sys.argv[3]) / 1000, sys.argv[4]
N = 0


async def pipe(r, w, counter, key):
    q = asyncio.Queue()

    async def sender():
        while True:
            due, data = await q.get()
            d = due - time.monotonic()
            if d > 0:
                await asyncio.sleep(d)
            if data is None:
                try:
                    w.write_eof()
                except Exception:
                    pass
                return
            w.write(data)
            await w.drain()
    t = asyncio.create_task(sender())
    try:
        while True:
            data = await r.read(65536)
            if not data:
                break
            counter[key] += len(data)
            q.put_nowait((time.monotonic() + DELAY, data))
    except Exception:
        pass
    q.put_nowait((time.monotonic() + DELAY, None))
    try:
        await t
    except Exception:
        pass


async def handle(cr, cw):
    global N
    N += 1
    c = {"conn": N, "up": 0, "down": 0, "open": time.time()}
    try:
        sr, sw = await asyncio.open_connection("127.0.0.1", TP)
    except Exception:
        cw.close(); return
    await asyncio.gather(pipe(cr, sw, c, "up"), pipe(sr, cw, c, "down"))
    for w in (sw, cw):
        try:
            w.close()
        except Exception:
            pass
    c["close"] = time.time()
    with open(STATS, "a") as f:
        f.write(json.dumps(c) + "\n")


async def main():
    srv = await asyncio.start_server(handle, "127.0.0.1", LP)
    async with srv:
        await srv.serve_forever()

asyncio.run(main())

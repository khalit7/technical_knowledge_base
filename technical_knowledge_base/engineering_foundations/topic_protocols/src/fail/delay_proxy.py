"""A userspace TCP proxy that adds a fixed one-way delay in each direction: python delay_proxy.py LISTEN TARGET DELAY_MS
Every chunk read on one side is written to the other DELAY_MS later, in order, without waiting for the previous
chunk: the proxy behaves like a long, fat cable (round trip = 2 x DELAY_MS, bandwidth unlimited). It cannot delay
the kernel's own TCP acknowledgements, so TCP's window is not what it limits; protocols that run their own window
on top (HTTP/2, QUIC, gRPC) feel the full round trip."""
import asyncio, sys, time

listen, target, delay = int(sys.argv[1]), int(sys.argv[2]), float(sys.argv[3]) / 1000


async def pipe(r, w):
    q = asyncio.Queue()

    async def reader():
        while True:
            d = await r.read(65536)
            await q.put((time.monotonic() + delay, d))
            if not d:
                return

    async def writer():
        while True:
            t, d = await q.get()
            dt = t - time.monotonic()
            if dt > 0:
                await asyncio.sleep(dt)
            if not d:
                w.close(); return
            w.write(d); await w.drain()

    await asyncio.gather(reader(), writer())


async def handle(cr, cw):
    ur, uw = await asyncio.open_connection("127.0.0.1", target)
    await asyncio.gather(pipe(cr, uw), pipe(ur, cw), return_exceptions=True)


async def main():
    s = await asyncio.start_server(handle, "127.0.0.1", listen)
    async with s:
        await s.serve_forever()

asyncio.run(main())

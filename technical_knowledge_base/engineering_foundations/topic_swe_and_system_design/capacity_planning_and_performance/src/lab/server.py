"""A tiny HTTP service for the capacity experiments (stdlib only, Python 3.9+).

Listens on a Unix domain socket (relative path, so run it from a short
directory) and answers any request with "ok". Every request needs one of SLOTS
worker slots; requests wait for a slot first come, first served. Holding a slot
takes a service time drawn from DIST with mean MEAN_MS. The work is a timed
wait (asyncio.sleep) standing in for a database or model call, so the service
time distribution is known exactly and the result can be checked against
queueing theory. The server logs the service time it actually gave each
request (sleep overshoot included), so utilisation is computed from measured
service times, not the nominal mean.

--stall-every S --stall-ms M: every S seconds the server freezes for M ms
(a task takes every slot), like a stop-the-world garbage-collection pause or a
slow disk flush. Requests already running finish; nothing new starts.
"""
import argparse, asyncio, json, math, os, random, signal, time

ap = argparse.ArgumentParser()
ap.add_argument("--sock", required=True)
ap.add_argument("--log", required=True)
ap.add_argument("--slots", type=int, default=1)
ap.add_argument("--mean-ms", type=float, default=10)
ap.add_argument("--dist", default="exp", choices=["exp", "const", "lognormal"])
ap.add_argument("--cv", type=float, default=2.0)          # lognormal coefficient of variation
ap.add_argument("--stall-every", type=float, default=0)   # seconds, 0 = never
ap.add_argument("--stall-ms", type=float, default=0)
ap.add_argument("--seed", type=int, default=7)
ap.add_argument("--duration", type=float, default=120)
A = ap.parse_args()

rng = random.Random(A.seed)
sem = None
T0 = None
served = []


def draw():
    m = A.mean_ms / 1000.0
    if A.dist == "const":
        return m
    if A.dist == "exp":
        return rng.expovariate(1.0 / m)
    s2 = math.log(1 + A.cv * A.cv)          # lognormal with mean m and the given cv
    return rng.lognormvariate(math.log(m) - s2 / 2, math.sqrt(s2))


async def handle(reader, writer):
    try:
        await reader.readuntil(b"\r\n\r\n")
    except Exception:
        writer.close()
        return
    await sem.acquire()
    try:
        s = draw()
        t = time.monotonic()
        await asyncio.sleep(s)
        served.append(time.monotonic() - t)
    finally:
        sem.release()
    try:
        writer.write(b"HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nok")
        await writer.drain()
        writer.close()
    except Exception:
        pass


async def staller():
    if A.stall_every <= 0:
        return
    while True:
        await asyncio.sleep(A.stall_every - (time.monotonic() - T0) % A.stall_every)
        got = 0
        for _ in range(A.slots):          # take every slot: nothing new starts
            await sem.acquire()
            got += 1
        await asyncio.sleep(A.stall_ms / 1000.0)
        for _ in range(got):
            sem.release()


async def main():
    global sem, T0
    sem = asyncio.Semaphore(A.slots)
    if os.path.exists(A.sock):
        os.unlink(A.sock)
    srv = await asyncio.start_unix_server(handle, path=A.sock, backlog=4096)
    T0 = time.monotonic()
    open(A.sock + ".ready", "w").write("1")
    st = asyncio.ensure_future(staller())
    stop = asyncio.Event()
    asyncio.get_running_loop().add_signal_handler(signal.SIGTERM, stop.set)
    try:
        await asyncio.wait_for(stop.wait(), A.duration)
    except asyncio.TimeoutError:
        pass
    st.cancel()
    srv.close()
    with open(A.log, "w") as f:
        json.dump({"config": vars(A), "n": len(served),
                   "mean_service_s": sum(served) / max(1, len(served)),
                   "service_s": [round(x, 6) for x in served]}, f)


asyncio.run(main())

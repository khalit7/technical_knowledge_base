"""A tiny HTTP service for the retry-storm experiment (stdlib only, Python 3.9+).

It listens on a Unix domain socket (no TCP ports, so thousands of short
connections leave no TIME_WAIT behind) and answers GET /work.
Every request needs one of SLOTS worker slots (think: a pool of 4 connections
to a dependency such as a model provider). Requests wait for a slot in a FIFO
queue; holding a slot takes the dependency's latency, which is NORMAL_MS except
during the slowdown window, when it is SLOW_MS.

The server does NOT notice when a client gives up (timeout) and keeps doing the
work anyway: that is how most real services behave by default, and it is the
waste that turns a retry storm into a metastable failure.

Options that are the server-side fixes:
  --drop-expired   read the client's X-Deadline header and skip work whose
                   deadline has already passed when its turn comes (deadline
                   propagation)
  --max-queue N    bounded queue: when N requests are already waiting, answer
                   503 at once (load shedding)

Every 100 ms it appends a line "t_ms queued busy" to the stats file.
"""
import argparse, asyncio, json, os, time

ap = argparse.ArgumentParser()
ap.add_argument("--sock", required=True)
ap.add_argument("--stats", required=True)
ap.add_argument("--slots", type=int, default=4)
ap.add_argument("--normal-ms", type=float, default=25)
ap.add_argument("--slow-ms", type=float, default=100)
ap.add_argument("--slow-from", type=float, default=10)   # seconds after start
ap.add_argument("--slow-to", type=float, default=15)
ap.add_argument("--drop-expired", action="store_true")
ap.add_argument("--max-queue", type=int, default=0)      # 0 = unbounded
ap.add_argument("--duration", type=float, default=45)
A = ap.parse_args()

T0 = None
sem = None
state = {"queued": 0, "busy": 0, "done": 0, "dropped": 0, "shed": 0}


def now_s():
    return time.monotonic() - T0


async def handle(reader, writer):
    try:
        head = await reader.readuntil(b"\r\n\r\n")
    except Exception:
        writer.close()
        return
    deadline = None
    for line in head.split(b"\r\n"):
        if line.lower().startswith(b"x-deadline:"):
            deadline = float(line.split(b":", 1)[1])  # epoch seconds
    code = b"200 OK"
    if A.max_queue and state["queued"] >= A.max_queue:
        state["shed"] += 1
        code = b"503 Service Unavailable"
    else:
        state["queued"] += 1
        await sem.acquire()
        state["queued"] -= 1
        try:
            if A.drop_expired and deadline is not None and time.time() > deadline:
                state["dropped"] += 1
                code = b"504 Gateway Timeout"
            else:
                state["busy"] += 1
                t = now_s()
                ms = A.slow_ms if A.slow_from <= t < A.slow_to else A.normal_ms
                await asyncio.sleep(ms / 1000.0)
                state["busy"] -= 1
                state["done"] += 1
        finally:
            sem.release()
    body = b"ok"
    try:
        writer.write(b"HTTP/1.1 " + code + b"\r\nContent-Length: 2\r\nConnection: close\r\n\r\n" + body)
        await writer.drain()
    except Exception:
        pass  # the client already gave up; the work was wasted
    try:
        writer.close()
    except Exception:
        pass


async def sampler(f):
    while True:
        f.write("%d %d %d %d %d %d\n" % (int(now_s() * 1000), state["queued"], state["busy"],
                                          state["done"], state["dropped"], state["shed"]))
        f.flush()
        await asyncio.sleep(0.1)


async def main():
    global T0, sem
    sem = asyncio.Semaphore(A.slots)
    if os.path.exists(A.sock):
        os.unlink(A.sock)
    srv = await asyncio.start_unix_server(handle, path=A.sock, backlog=4096)
    # the clock starts when the load generator connects for the first time;
    # the load generator waits for this file before it starts
    T0 = time.monotonic()
    with open(A.stats, "w") as f:
        f.write("# t_ms queued busy done dropped shed; config %s\n" % json.dumps(vars(A)))
        task = asyncio.ensure_future(sampler(f))
        open(A.sock + ".ready", "w").write("%.6f" % time.time())
        await asyncio.sleep(A.duration)
        task.cancel()
    srv.close()


asyncio.run(main())

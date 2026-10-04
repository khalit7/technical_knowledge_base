"""Load generator for the capacity experiments (stdlib only, Python 3.11+).

Two workload models, the distinction at the centre of load testing:

  open    requests arrive on a schedule whatever the service does (Poisson
          arrivals at RATE per second, or evenly spaced with --even). Each
          request is sent at its scheduled time on a fresh connection, even if
          earlier ones have not come back. This is how independent users hit a
          real product. Latency is measured from the scheduled time.

  closed  USERS virtual users; each sends a request, waits for the answer,
          then waits until its next scheduled send (RATE / USERS per second
          each; at once if it is already late). This is what most tools do by
          default (wrk, ab, Locust users, k6 constant-vus). When the service
          stalls, the users stall with it and simply do not send the requests
          that a real user population would have sent: coordinated omission.
          Latency is recorded both ways: from the actual send (what such a tool
          reports) and from the scheduled send (the correction wrk2 applies).

Several backends (--socks a,b,c) are balanced by --policy:
  random   pick one uniformly at random
  rr       round robin
  p2c      power of two choices: pick two at random, send to the one with
           fewer requests outstanding from this client (ties: the first drawn)
  lor      least outstanding requests: the backend with the fewest (ties: the
           lowest index); the full-information ideal for this client

Writes JSON: per request [scheduled_s, sent_s, done_s, backend].
"""
import argparse, asyncio, json, random, time

ap = argparse.ArgumentParser()
ap.add_argument("--socks", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--mode", default="open", choices=["open", "closed"])
ap.add_argument("--rate", type=float, default=50)
ap.add_argument("--even", action="store_true")
ap.add_argument("--users", type=int, default=4)
ap.add_argument("--duration", type=float, default=30)
ap.add_argument("--policy", default="random", choices=["random", "rr", "p2c", "lor"])
ap.add_argument("--seed", type=int, default=1)
A = ap.parse_args()

socks = A.socks.split(",")
rng = random.Random(A.seed)
pick_rng = random.Random(A.seed + 99)
outstanding = [0] * len(socks)
rr = [0]
rows = []


def choose():
    n = len(socks)
    if n == 1:
        return 0
    if A.policy == "random":
        return pick_rng.randrange(n)
    if A.policy == "rr":
        rr[0] = (rr[0] + 1) % n
        return rr[0]
    if A.policy == "p2c":
        a = pick_rng.randrange(n)
        b = pick_rng.randrange(n - 1)
        b = b + 1 if b >= a else b
        return a if outstanding[a] <= outstanding[b] else b
    m = min(outstanding)
    return outstanding.index(m)


async def one(sched, T0):
    k = choose()
    outstanding[k] += 1
    sent = time.monotonic() - T0
    try:
        r, w = await asyncio.open_unix_connection(socks[k])
        w.write(b"GET / HTTP/1.1\r\nHost: x\r\n\r\n")
        await w.drain()
        await r.read()
        w.close()
    finally:
        outstanding[k] -= 1
    rows.append([round(sched, 6), round(sent, 6), round(time.monotonic() - T0, 6), k])


async def open_loop(T0):
    tasks, t = [], 0.0
    while True:
        t += (1.0 / A.rate) if A.even else rng.expovariate(A.rate)
        if t >= A.duration:
            break
        d = t - (time.monotonic() - T0)
        if d > 0:
            await asyncio.sleep(d)
        tasks.append(asyncio.ensure_future(one(t, T0)))
    await asyncio.gather(*tasks)


async def user(i, T0):
    per = A.rate / A.users
    t = (i / A.users) / per            # stagger the users evenly
    while t < A.duration:
        d = t - (time.monotonic() - T0)
        if d > 0:
            await asyncio.sleep(d)
        await one(t, T0)               # wait for the answer before the next send
        t += 1.0 / per


async def main():
    T0 = time.monotonic()
    if A.mode == "open":
        await open_loop(T0)
    else:
        await asyncio.gather(*[user(i, T0) for i in range(A.users)])
    rows.sort()
    with open(A.out, "w") as f:
        json.dump({"config": vars(A), "rows": rows}, f)


asyncio.run(main())

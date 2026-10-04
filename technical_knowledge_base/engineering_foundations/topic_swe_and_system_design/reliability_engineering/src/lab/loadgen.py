"""Open-loop load generator for the retry-storm experiment (stdlib only).

New requests arrive as a Poisson process at RATE per second (open loop: users
keep arriving whatever the service does, as they do on a real product). Each
logical request makes up to ATTEMPTS attempts; each attempt is one HTTP request
on a fresh Unix-socket connection with a client timeout of TIMEOUT_MS. An
attempt fails on timeout or on a non-200 answer.

Retry policies (--policy):
  none      one attempt, no retry (timeouts only)
  naive     retry at once after a failure
  backoff   exponential backoff with full jitter: before retry k (k = 1, 2, ...)
            sleep uniform(0, min(CAP, BASE * 2**k)) (Brooker, AWS, 2015)
  budget    backoff as above, plus gRPC-style retry throttling: a token count
            starts at MAX_TOKENS; every failed attempt subtracts 1, every
            success adds TOKEN_RATIO; a retry is allowed only while the count
            is above MAX_TOKENS / 2 (gRFC A6, retryThrottling)

Writes one line per attempt: logical_id attempt t_send_ms t_end_ms outcome
(outcome: ok, timeout, err).
"""
import argparse, asyncio, json, random, time

ap = argparse.ArgumentParser()
ap.add_argument("--sock", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--policy", default="naive", choices=["none", "naive", "backoff", "budget"])
ap.add_argument("--rate", type=float, default=100)
ap.add_argument("--duration", type=float, default=40)
ap.add_argument("--timeout-ms", type=float, default=250)
ap.add_argument("--attempts", type=int, default=3)
ap.add_argument("--base-ms", type=float, default=100)
ap.add_argument("--cap-ms", type=float, default=2000)
ap.add_argument("--max-tokens", type=float, default=10)
ap.add_argument("--token-ratio", type=float, default=0.1)
ap.add_argument("--seed", type=int, default=1)
A = ap.parse_args()

rng = random.Random(A.seed)
jit = random.Random(A.seed + 1000)
tokens = [A.max_tokens]
lines = []
W0 = None  # server's wall-clock start (from the .ready file)


def t_ms():
    return (time.time() - W0) * 1000.0


async def attempt():
    deadline = time.time() + A.timeout_ms / 1000.0
    req = ("GET /work HTTP/1.1\r\nHost: lab\r\nX-Deadline: %.6f\r\nConnection: close\r\n\r\n" % deadline).encode()
    writer = None

    async def go():
        nonlocal writer
        reader, writer = await asyncio.open_unix_connection(A.sock)
        writer.write(req)
        await writer.drain()
        status = await reader.readline()
        await reader.read()
        return status

    try:
        status = await asyncio.wait_for(go(), A.timeout_ms / 1000.0)
        out = "ok" if b" 200 " in status else "err"
    except asyncio.TimeoutError:
        out = "timeout"
    except Exception:
        out = "err"
    if writer is not None:
        try:
            writer.close()
        except Exception:
            pass
    return out


async def logical(i):
    for k in range(A.attempts):
        t1 = t_ms()
        out = await attempt()
        t2 = t_ms()
        lines.append("%d %d %.1f %.1f %s" % (i, k, t1, t2, out))
        if A.policy == "budget":
            if out == "ok":
                tokens[0] = min(A.max_tokens, tokens[0] + A.token_ratio)
            else:
                tokens[0] = max(0.0, tokens[0] - 1)
        if out == "ok" or A.policy == "none" or k == A.attempts - 1:
            return
        if A.policy == "budget" and tokens[0] <= A.max_tokens / 2:
            lines.append("%d %d %.1f %.1f %s" % (i, k + 1, t_ms(), t_ms(), "throttled"))
            return
        if A.policy in ("backoff", "budget"):
            await asyncio.sleep(jit.uniform(0, min(A.cap_ms, A.base_ms * 2 ** (k + 1))) / 1000.0)


async def main():
    global W0
    import os
    while not os.path.exists(A.sock + ".ready"):
        await asyncio.sleep(0.01)
    W0 = float(open(A.sock + ".ready").read())
    tasks = []
    t = 0.0
    i = 0
    start = time.time()
    while True:
        t += rng.expovariate(A.rate)
        if t >= A.duration:
            break
        delay = start + t - time.time()
        if delay > 0:
            await asyncio.sleep(delay)
        tasks.append(asyncio.ensure_future(logical(i)))
        i += 1
    await asyncio.gather(*tasks)
    with open(A.out, "w") as f:
        f.write("# config %s start_offset_ms %.1f\n" % (json.dumps(vars(A)), (start - W0) * 1000))
        f.write("\n".join(lines) + "\n")


asyncio.run(main())

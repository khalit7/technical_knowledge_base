"""Collectives measured on one laptop: N CPU processes joined by torch.distributed (Gloo backend, TCP over loopback).

What it measures, for N in {2, 4, 8} ranks and buffers of 4 B to 16 MiB of float32:
  pingpong : one message there and back between ranks 0 and 1 (half the round trip = one hop), fits alpha and beta
  ring     : our own ring all-reduce (N-1 reduce-scatter steps, N-1 all-gather steps, chunks of S/N), send/recv only
  rd       : our own recursive-doubling all-reduce (log2 N steps, whole buffer exchanged with partner rank XOR 2^k)
  gloo     : Gloo's built-in dist.all_reduce, for reference (its algorithm is Gloo's choice, not ours)
Every all-reduce result is checked against the exact sum. Time per op = max over ranks of the median per-op time.
Usage (outside the repo, any Python with torch):  python coll_bench.py out.json
"""
import json, os, socket, statistics, sys, time

import torch
import torch.distributed as dist
import torch.multiprocessing as mp

SIZES = [4 * 4 ** k for k in range(0, 12)]  # bytes: 4 B .. 16 MiB
NS = [2, 4, 8]


def ring_allreduce(x, rank, n):
    chunks = list(x.chunk(n))
    right, left = (rank + 1) % n, (rank - 1) % n
    buf = [torch.empty_like(c) for c in chunks]
    for i in range(n - 1):  # reduce-scatter
        s, r = (rank - i) % n, (rank - i - 1) % n
        req = dist.isend(chunks[s], right)
        dist.recv(buf[r], left)
        req.wait()
        chunks[r] += buf[r]
    for i in range(n - 1):  # all-gather
        s, r = (rank + 1 - i) % n, (rank - i) % n
        req = dist.isend(chunks[s], right)
        dist.recv(chunks[r], left)
        req.wait()
    return x


def rd_allreduce(x, rank, n):
    tmp = torch.empty_like(x)
    k = 1
    while k < n:
        p = rank ^ k
        req = dist.isend(x, p)
        dist.recv(tmp, p)
        req.wait()
        x += tmp
        k <<= 1
    return x


def timed(fn, reps):
    ts = []
    for _ in range(reps):
        dist.barrier()
        t0 = time.perf_counter()
        fn()
        ts.append(time.perf_counter() - t0)
    return statistics.median(ts)


def reps_for(S):
    return 40 if S <= 65536 else (15 if S <= 1 << 20 else 6)


def worker(rank, n, port, q):
    os.environ["MASTER_ADDR"], os.environ["MASTER_PORT"] = "127.0.0.1", str(port)
    torch.set_num_threads(1)
    dist.init_process_group("gloo", rank=rank, world_size=n)
    res = []
    for S in SIZES:
        m = S // 4
        if m < n:  # ring needs at least one element per chunk
            pass
        reps = reps_for(S)
        row = {"bytes": S}
        if n == 2:  # ping-pong between ranks 0 and 1
            a = torch.zeros(m)
            def pp():
                if rank == 0:
                    dist.send(a, 1); dist.recv(a, 1)
                else:
                    dist.recv(a, 0); dist.send(a, 0)
            pp(); pp()
            row["pingpong_hop"] = timed(pp, reps) / 2
        for alg in ("ring", "rd", "gloo"):
            if alg == "ring" and m < n:
                continue
            base = torch.arange(m, dtype=torch.float32) % 97 + rank
            want = (torch.arange(m, dtype=torch.float32) % 97) * n + n * (n - 1) / 2
            def run():
                x = base.clone()
                if alg == "ring":
                    ring_allreduce(x, rank, n)
                elif alg == "rd":
                    rd_allreduce(x, rank, n)
                else:
                    dist.all_reduce(x)
                return x
            ok = torch.equal(run(), want)
            run()
            row[alg] = timed(run, reps)
            row[alg + "_ok"] = bool(ok)
        res.append(row)
    # max over ranks of every timing (the slowest rank defines the collective)
    keys = [k for k in res[0] if not k.endswith("_ok") and k != "bytes"]
    for row in res:
        for k in [k for k in row if not k.endswith("_ok") and k != "bytes"]:
            t = torch.tensor([row[k]], dtype=torch.float64)
            dist.all_reduce(t, op=dist.ReduceOp.MAX)
            row[k] = t.item()
        for k in [k for k in row if k.endswith("_ok")]:
            t = torch.tensor([0 if row[k] else 1])
            dist.all_reduce(t)
            row[k] = t.item() == 0
    if rank == 0:
        q.put(res)
    dist.destroy_process_group()


def free_port():
    s = socket.socket(); s.bind(("127.0.0.1", 0)); p = s.getsockname()[1]; s.close(); return p


if __name__ == "__main__":
    out = {"torch": torch.__version__, "backend": "gloo", "transport": "TCP over loopback, one machine",
           "sizes_bytes": SIZES, "runs": {}}
    ctx = mp.get_context("spawn")
    for n in NS:
        q = ctx.Queue()
        port = free_port()
        ps = [ctx.Process(target=worker, args=(r, n, port, q)) for r in range(n)]
        for p in ps: p.start()
        out["runs"][str(n)] = q.get(timeout=900)
        for p in ps: p.join()
        print("done n =", n, flush=True)
    out["loadavg_end"] = os.getloadavg()
    json.dump(out, open(sys.argv[1], "w"), indent=1)

"""Memory measurements on the Apple M1 Pro GPU through MLX (custom Metal kernels).

1. ws:      read bandwidth against working-set size (4 KB .. 1 GB): where the caches end.
2. chase:   one GPU thread chasing a random pointer cycle (one 128-byte line per hop): latency per level.
3. gather:  useful bytes/s when 512 MB is read in random blocks of 16 B .. 16 KB (DRAM bursts and rows).
4. kvdec:   one decode attention step (1 query, fp16, d=128, 32 query heads) against a KV cache of
            1K .. 128K tokens with 32 (MHA), 8 (GQA) and 1 (MQA) KV heads.

Every kernel is checked against NumPy before timing. Each case: 2 warm-ups, TRIALS trials, median/min/max.
Usage: python mem_gpu.py OUT.json
"""
import json, os, sys, time, platform
import numpy as np
import mlx.core as mx

TRIALS = 7
OUT = sys.argv[1] if len(sys.argv) > 1 else "mem_gpu.json"
res = {"meta": {"date": time.strftime("%Y-%m-%d"), "mlx": mx.__version__, "numpy": np.__version__,
                "python": platform.python_version(), "device": mx.device_info().get("device_name", "?"),
                "arch": mx.device_info().get("architecture", "?"), "trials": TRIALS}, "ws": [], "chase": [], "gather": [], "kvdec": []}


def timeit(fn, reps, trials=TRIALS):
    for _ in range(2):
        mx.eval(fn())
    mx.synchronize()
    ts = []
    for _ in range(trials):
        t0 = time.perf_counter()
        for _ in range(reps):
            mx.eval(fn())
        mx.synchronize()
        ts.append((time.perf_counter() - t0) / reps)
    ts.sort()
    return {"med": ts[len(ts) // 2], "min": ts[0], "max": ts[-1], "load": os.getloadavg()[0]}


def log(*a):
    print(*a, flush=True)


# ---------------- 1. bandwidth against working-set size ----------------
WS_SRC = """
    uint gid = thread_position_in_grid.x; uint n = threads_per_grid.x;
    uint mask = prm[0]; uint K = prm[1];
    const device float4* p = (const device float4*)inp;
    float4 s = 0;
    for (uint k = 0; k < K; k++) { s += p[(gid + k * (n + 1)) & mask]; }
    out[gid] = s.x + s.y + s.z + s.w;
"""
ws_k = mx.fast.metal_kernel(name="ws_read", input_names=["inp", "prm"], output_names=["out"], source=WS_SRC)


def ws():
    n = 65536
    big = mx.random.uniform(shape=(256 * 1024 * 1024,), dtype=mx.float32); mx.eval(big)  # 1 GB
    for lg in range(12, 31):  # 4 KB .. 1 GB
        S = 1 << lg
        m = S // 16
        a = big[: S // 4]
        K = 1024 if S >= 1 << 20 else 2048
        prm = mx.array([m - 1, K], dtype=mx.uint32)
        f = lambda: ws_k(inputs=[a, prm], grid=(n, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(n,)], output_dtypes=[mx.float32])[0]
        if lg in (12, 20, 28):
            got = np.asarray(f()).astype(np.float64)
            A = np.asarray(a, dtype=np.float64).reshape(-1, 4).sum(1)
            gid = np.arange(n, dtype=np.int64)
            ref = np.zeros(n)
            for k in range(K):
                ref += A[(gid + k * (n + 1)) & (m - 1)]
            assert np.allclose(got, ref, rtol=1e-3), ("ws", S)
        t = timeit(f, 5)
        b = n * K * 16
        r = {"bytes_ws": S, "bytes_read": b, **t, "gbs": b / t["med"] / 1e9, "gbs_best": b / t["min"] / 1e9, "gbs_worst": b / t["max"] / 1e9}
        res["ws"].append(r)
        log(f"ws {S:>11d} B  {r['gbs']:8.1f} GB/s  ({r['gbs_worst']:.1f}-{r['gbs_best']:.1f})  load {t['load']:.1f}")
    del big


# ---------------- 2. pointer chase latency ----------------
CHASE_SRC = """
    uint H = prm[0]; uint i = prm[1];
    for (uint h = 0; h < H; h++) { i = nxt[i]; }
    out[0] = i;
"""
chase_k = mx.fast.metal_kernel(name="chase", input_names=["nxt", "prm"], output_names=["out"], source=CHASE_SRC)


def chase():
    rng = np.random.default_rng(1)
    for lg in range(12, 30):  # 4 KB .. 512 MB
        S = 1 << lg
        L = S // 128  # lines of 128 B; one uint32 used per line
        perm = rng.permutation(L)
        nxt = np.zeros(S // 4, dtype=np.uint32)
        idx = perm * 32
        nxt[idx] = np.roll(idx, -1)  # cycle through all lines in random order
        a = mx.array(nxt); mx.eval(a)
        H1 = 20000 if S < 1 << 22 else 8000
        H2 = 2 * H1
        p1 = mx.array([H1, int(idx[0])], dtype=mx.uint32); p2 = mx.array([H2, int(idx[0])], dtype=mx.uint32)
        f1 = lambda: chase_k(inputs=[a, p1], grid=(1, 1, 1), threadgroup=(1, 1, 1), output_shapes=[(1,)], output_dtypes=[mx.uint32])[0]
        f2 = lambda: chase_k(inputs=[a, p2], grid=(1, 1, 1), threadgroup=(1, 1, 1), output_shapes=[(1,)], output_dtypes=[mx.uint32])[0]
        assert int(f1().item()) == int(idx[H1 % L]), ("chase", S)
        t1 = timeit(f1, 1); t2 = timeit(f2, 1)
        ns = (t2["med"] - t1["med"]) / (H2 - H1) * 1e9
        ns_raw = t2["med"] / H2 * 1e9
        r = {"bytes_ws": S, "lines": L, "H1": H1, "H2": H2, "t1": t1, "t2": t2, "ns": ns, "ns_raw": ns_raw, "load": t2["load"]}
        res["chase"].append(r)
        log(f"chase {S:>11d} B  {ns:7.1f} ns/hop (raw {ns_raw:.1f})  load {t2['load']:.1f}")
        del a


# ---------------- 3. random blocks: useful bandwidth against block size ----------------
GATHER_SRC = """
    uint gid = thread_position_in_grid.x; uint n = threads_per_grid.x;
    uint B = prm[0]; uint K = prm[1];
    uint lane = gid % B; uint b0 = gid / B; uint nb = n / B;
    const device float4* p = (const device float4*)inp;
    float4 s = 0;
    for (uint k = 0; k < K; k++) { uint st = starts[b0 + k * nb]; s += p[st * B + lane]; }
    out[gid] = s.x + s.y + s.z + s.w;
"""
gather_k = mx.fast.metal_kernel(name="gather_blk", input_names=["inp", "starts", "prm"], output_names=["out"], source=GATHER_SRC)


def gather():
    rng = np.random.default_rng(2)
    total = 128 * 1024 * 1024  # 512 MB of float32
    a = mx.random.uniform(shape=(total,), dtype=mx.float32); mx.eval(a)
    m4 = total // 4  # float4 count
    n = 65536
    useful = 256 * 1024 * 1024  # bytes of useful data read per call
    A = None
    for B in (1, 2, 4, 8, 16, 32, 64, 128, 256, 1024):  # block = B float4 = 16*B bytes
        K = useful // (16 * n)
        nblocks = m4 // B
        starts_np = rng.integers(0, nblocks, size=(n // B) * K, dtype=np.uint32)
        starts = mx.array(starts_np); mx.eval(starts)
        prm = mx.array([B, K], dtype=mx.uint32)
        f = lambda: gather_k(inputs=[a, starts, prm], grid=(n, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(n,)], output_dtypes=[mx.float32])[0]
        if B in (1, 64):
            if A is None:
                A = np.asarray(a, dtype=np.float64).reshape(-1, 4).sum(1)
            gid = np.arange(n); lane = gid % B; b0 = gid // B; nb = n // B
            ref = np.zeros(n)
            for k in range(K):
                ref += A[starts_np[b0 + k * nb].astype(np.int64) * B + lane]
            assert np.allclose(np.asarray(f()), ref, rtol=1e-3), ("gather", B)
        t = timeit(f, 3)
        idx_bytes = 4 * len(starts_np)
        r = {"block_bytes": 16 * B, "useful_bytes": useful, "index_bytes": idx_bytes, **t,
             "gbs": useful / t["med"] / 1e9, "gbs_best": useful / t["min"] / 1e9, "gbs_worst": useful / t["max"] / 1e9}
        res["gather"].append(r)
        log(f"gather block {16*B:>6d} B  {r['gbs']:8.1f} GB/s useful ({r['gbs_worst']:.1f}-{r['gbs_best']:.1f})  load {t['load']:.1f}")
        del starts
    del a


# ---------------- 4. decode attention against the KV cache ----------------
def kvdec():
    d, hq = 128, 32
    rng = np.random.default_rng(3)
    q = mx.array(rng.standard_normal((1, hq, 1, d)).astype(np.float16)); mx.eval(q)
    for hkv, label in ((32, "MHA"), (8, "GQA"), (1, "MQA")):
        for lg in range(10, 18):  # 1K .. 128K tokens
            L = 1 << lg
            kv_bytes = 2 * hkv * L * d * 2
            if kv_bytes > 1024 ** 3:
                continue
            k = mx.random.normal((1, hkv, L, d), dtype=mx.float16); v = mx.random.normal((1, hkv, L, d), dtype=mx.float16); mx.eval(k, v)
            f = lambda: mx.fast.scaled_dot_product_attention(q, k, v, scale=d ** -0.5)
            if L == 4096:
                K = np.asarray(k, dtype=np.float32); V = np.asarray(v, dtype=np.float32); Q = np.asarray(q, dtype=np.float32)
                g = hq // hkv
                ref = np.zeros((1, hq, 1, d))
                for h in range(hq):
                    s = Q[0, h] @ K[0, h // g].T * d ** -0.5
                    s = np.exp(s - s.max()); s /= s.sum()
                    ref[0, h] = s @ V[0, h // g]
                assert np.allclose(np.asarray(f(), dtype=np.float32), ref, atol=2e-2), ("kvdec", label)
            t = timeit(f, 10 if kv_bytes < 64 << 20 else 3)
            r = {"attn": label, "kv_heads": hkv, "tokens": L, "kv_bytes": kv_bytes, **t,
                 "gbs": kv_bytes / t["med"] / 1e9, "us": t["med"] * 1e6, "us_min": t["min"] * 1e6, "us_max": t["max"] * 1e6}
            res["kvdec"].append(r)
            log(f"kvdec {label} L={L:>6d} kv {kv_bytes/2**20:8.1f} MiB  {r['us']:9.1f} us  {r['gbs']:7.1f} GB/s  load {t['load']:.1f}")
            del k, v


if __name__ == "__main__":
    t0 = time.time()
    res["meta"]["load_start"] = os.getloadavg()[0]
    for fn in (ws, chase, gather, kvdec):
        fn(); mx.clear_cache()
    res["meta"]["load_end"] = os.getloadavg()[0]
    res["meta"]["wall_s"] = round(time.time() - t0, 1)
    json.dump(res, open(OUT, "w"), indent=1)
    log("done", res["meta"]["wall_s"], "s")

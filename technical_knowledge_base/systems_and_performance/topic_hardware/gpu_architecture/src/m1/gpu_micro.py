"""Microbenchmarks of the Apple M1 Pro GPU that teach how a GPU SM works (MLX custom Metal kernels).

Four experiments, each the M1 counterpart of a microbenchmark NVIDIA-dissecting papers run:
  chase:   one thread follows a random pointer chain through a buffer of S bytes (one hop per
           128-byte line); time per hop against S shows the latency of each cache level and DRAM.
  little:  T threads each follow their own place in one 256 MB chain; hops per second against T
           shows latency hiding (Little's law: throughput = requests in flight / latency) and where
           it saturates.
  stream:  a coalesced read of 256 MB with T threads: bandwidth against threads in flight. Variant
           "smem": 64-thread groups that each reserve X KB of threadgroup memory, so fewer groups fit
           on a core at once: occupancy limited by on-chip memory, seen as lost bandwidth.
  diverge: every thread runs one of K different FMA loops; the case is chosen either by lane
           within the 32-wide SIMD-group (divergent) or by SIMD-group (uniform). Same work per thread.

Timing: per case, warm up, then TRIALS timed calls with mx.eval + mx.synchronize; median, min, max.
chase and little use two step counts and take the difference, so launch overhead cancels.
Usage: python gpu_micro.py OUT.json
"""
import json, os, sys, time, platform
import numpy as np
import mlx.core as mx

TRIALS = 5
OUT = sys.argv[1] if len(sys.argv) > 1 else "gpu_micro.json"
LINE = 128            # bytes between consecutive hops (one cache line or more)
STRIDE = LINE // 4    # in uint32 elements
rng = np.random.default_rng(12345)
res = {"meta": {"mlx": mx.__version__, "numpy": np.__version__, "python": platform.python_version(),
                "device": {k: v for k, v in mx.device_info().items()},
                "started": time.strftime("%Y-%m-%d %H:%M:%S"), "line_bytes": LINE, "trials": TRIALS},
       "chase": [], "little": [], "stream": [], "smem": [], "diverge": []}


def run_times(fn, trials=TRIALS):
    mx.eval(fn()); mx.synchronize()
    ts = []
    for _ in range(trials):
        t0 = time.perf_counter(); mx.eval(fn()); mx.synchronize(); ts.append(time.perf_counter() - t0)
    ts.sort()
    return ts


def chain(nbytes):
    """Random cyclic permutation over the lines of an nbytes buffer. Returns (buf, order)."""
    n = nbytes // LINE
    order = rng.permutation(n).astype(np.int64)
    buf = np.zeros(nbytes // 4, dtype=np.uint32)
    nxt = np.roll(order, -1)
    buf[order * STRIDE] = (nxt * STRIDE).astype(np.uint32)
    return buf, order


CHASE_SRC = """
    uint gid = thread_position_in_grid.x;
    uint p = starts[gid];
    for (uint i = 0; i < STEPS; ++i) p = buf[p];
    out[gid] = p;
"""
chase_k = mx.fast.metal_kernel(name="chase", input_names=["buf", "starts"], output_names=["out"], source=CHASE_SRC)


def chase_call(buf, starts, steps, tg):
    T = starts.shape[0]
    return lambda: chase_k(inputs=[buf, starts], template=[("STEPS", steps)], grid=(T, 1, 1), threadgroup=(tg, 1, 1),
                           output_shapes=[(T,)], output_dtypes=[mx.uint32])[0]


def per_hop(buf, starts, s1, tg):
    """Seconds per round of hops (all threads hop once), from the difference of two step counts."""
    a = run_times(chase_call(buf, starts, s1, tg)); b = run_times(chase_call(buf, starts, 2 * s1, tg))
    med = (b[len(b) // 2] - a[len(a) // 2]) / s1
    lo = (b[0] - a[-1]) / s1; hi = (b[-1] - a[0]) / s1
    return med, lo, hi, a, b


def check_chase(buf_np, order, starts_np, steps, got):
    n = len(order)
    inv = np.empty(n, dtype=np.int64); inv[order] = np.arange(n)
    for t in range(min(4, len(starts_np))):
        i = inv[int(starts_np[t]) // STRIDE]
        assert int(got[t]) == int(order[(i + steps) % n] * STRIDE), "chase result mismatch"


def exp_chase():
    sizes = [2 ** k for k in range(12, 29)]  # 4 KB .. 256 MB
    for S in sizes:
        buf_np, order = chain(S)
        buf = mx.array(buf_np); starts_np = np.array([order[0] * STRIDE], dtype=np.uint32); starts = mx.array(starts_np)
        steps = 40000 if S <= (1 << 20) else 20000
        got = np.array(chase_call(buf, starts, steps, 1)())
        check_chase(buf_np, order, starts_np, steps, got)
        med, lo, hi, a, b = per_hop(buf, starts, steps, 1)
        r = {"bytes": S, "ns_per_hop": med * 1e9, "ns_lo": lo * 1e9, "ns_hi": hi * 1e9, "steps": steps,
             "t1_ms": [x * 1e3 for x in a], "t2_ms": [x * 1e3 for x in b], "load": os.getloadavg()[0]}
        res["chase"].append(r)
        print(f"chase {S/1024:10.0f} KB  {r['ns_per_hop']:8.1f} ns/hop  [{r['ns_lo']:.1f}, {r['ns_hi']:.1f}]  load {r['load']:.1f}", flush=True)
        del buf


def starts_for(order, T):
    n = len(order)
    idx = (np.arange(T, dtype=np.int64) * n) // T
    return (order[idx] * STRIDE).astype(np.uint32)


def exp_little(buf_np, order):
    buf = mx.array(buf_np)
    for T in [1, 8, 32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536]:
        starts_np = starts_for(order, T); starts = mx.array(starts_np)
        steps = int(max(200, min(20000, 3e7 / T)))
        tg = min(T, 32)
        got = np.array(chase_call(buf, starts, steps, tg)())
        check_chase(buf_np, order, starts_np, steps, got)
        med, lo, hi, a, b = per_hop(buf, starts, steps, tg)
        r = {"threads": T, "tg": tg, "steps": steps, "s_per_round": med, "hops_per_s": T / med,
             "hops_per_s_lo": T / hi if hi > 0 else None, "hops_per_s_hi": T / lo if lo > 0 else None,
             "ns_per_hop_per_thread": med * 1e9, "load": os.getloadavg()[0]}
        res["little"].append(r)
        print(f"little T={T:6d}  {r['hops_per_s']/1e6:9.1f} M hops/s  ({r['ns_per_hop_per_thread']:.0f} ns per hop per thread)  load {r['load']:.1f}", flush=True)
    del buf


STREAM_SRC = """
    threadgroup float sm[SM];
    uint gid = thread_position_in_grid.x; uint n = threads_per_grid.x; uint lid = thread_position_in_threadgroup.x;
    sm[lid] = float(gid & 7u);
    const device float4* p = (const device float4*)inp;
    uint m = inp_shape[0] / 4;
    float4 s = 0;
    for (uint i = gid; i < m; i += n) s += p[i];
    out[gid] = s.x + s.y + s.z + s.w + (sm[(lid * 977u) % SM] > 1e30f ? 1.0f : 0.0f);
"""
stream_k = mx.fast.metal_kernel(name="stream_smem", input_names=["inp"], output_names=["out"], source=STREAM_SRC)
NSTREAM = 64 * 1024 * 1024  # 256 MB of float32


def stream_call(a, T, tg, smf):
    return lambda: stream_k(inputs=[a], template=[("SM", smf)], grid=(T, 1, 1), threadgroup=(tg, 1, 1),
                            output_shapes=[(T,)], output_dtypes=[mx.float32])[0]


def exp_stream(a, ref):
    """Coalesced streaming read of 256 MB with T threads in flight (each thread loops over the buffer)."""
    for T in [32, 64, 128, 256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144]:
        tg = min(T, 256)
        f = stream_call(a, T, tg, 32)
        got = float(np.asarray(f(), dtype=np.float64).sum()); assert abs(got - ref) / ref < 1e-3, (got, ref)
        ts = run_times(f)
        r = {"threads": T, "tg": tg, "gbps": 4 * NSTREAM / ts[len(ts) // 2] / 1e9, "gbps_lo": 4 * NSTREAM / ts[-1] / 1e9,
             "gbps_hi": 4 * NSTREAM / ts[0] / 1e9, "ms": ts[len(ts) // 2] * 1e3, "load": os.getloadavg()[0]}
        res["stream"].append(r)
        print(f"stream T={T:7d}  {r['gbps']:7.1f} GB/s  load {r['load']:.1f}", flush=True)


def exp_smem(a, ref):
    """Same read, enough threads to fill the GPU, 64-thread groups that each reserve X KB of threadgroup memory."""
    T, tg = 65536, 64
    for kb in [0.25, 2, 4, 8, 12, 16, 20, 24, 28, 32]:
        smf = int(kb * 1024 / 4)
        f = stream_call(a, T, tg, smf)
        got = float(np.asarray(f(), dtype=np.float64).sum()); assert abs(got - ref) / ref < 1e-3, (got, ref)
        ts = run_times(f)
        r = {"smem_kb": kb, "threads": T, "tg": tg, "gbps": 4 * NSTREAM / ts[len(ts) // 2] / 1e9,
             "gbps_lo": 4 * NSTREAM / ts[-1] / 1e9, "gbps_hi": 4 * NSTREAM / ts[0] / 1e9, "load": os.getloadavg()[0]}
        res["smem"].append(r)
        print(f"smem {kb:6.2f} KB per 64-thread group  {r['gbps']:7.1f} GB/s  load {r['load']:.1f}", flush=True)


CONSTS = [(0.9990 - 0.0007 * j, 1e-4 * (j + 1)) for j in range(32)]


def diverge_src(K):
    cases = []
    for j in range(K):
        c, d = CONSTS[j]
        body = "; ".join(f"a{q} = fma(a{q}, {c:.6f}f, {d * (q + 1):.7f}f)" for q in range(4))
        cases.append(f"      case {j}: for (uint i = 0; i < ITERS; ++i) {{ {body}; {body}; }} break;")
    return """
    uint gid = thread_position_in_grid.x; uint lane = thread_index_in_simdgroup;
    uint key = (MODE == 0) ? (lane % %K%u) : ((gid / 32u) % %K%u);
    float a0 = xs[0] + float(gid & 3u), a1 = xs[1], a2 = xs[2], a3 = xs[3];
    switch (key) {
%CASES%
      default: break;
    }
    out[gid] = a0 + a1 + a2 + a3;
""".replace("%K%", str(K)).replace("%CASES%", "\n".join(cases))


def exp_diverge():
    T, ITERS = 65536, 8192
    xs = mx.array([1.0, 2.0, 3.0, 4.0], dtype=mx.float32)
    for K in [1, 2, 4, 8, 16, 32]:
        k = mx.fast.metal_kernel(name=f"diverge{K}", input_names=["xs"], output_names=["out"], source=diverge_src(K))
        row = {"K": K}
        for mode, nm in [(0, "lanes"), (1, "simdgroups")]:
            f = lambda: k(inputs=[xs], template=[("MODE", mode), ("ITERS", ITERS)], grid=(T, 1, 1), threadgroup=(256, 1, 1),
                          output_shapes=[(T,)], output_dtypes=[mx.float32])[0]
            o = np.array(f())
            # every lane with the same key gives the same value, different keys differ: the branches really ran
            key = (np.arange(T) % 32) % K if mode == 0 else (np.arange(T) // 32) % K
            ref = {}
            for g in range(min(T, 4096)):
                kk = (int(key[g]), g & 3)
                ref.setdefault(kk, o[g]); assert abs(ref[kk] - o[g]) <= 1e-3 * abs(o[g]) + 1e-6
            ts = run_times(f)
            row[nm] = {"ms": ts[len(ts) // 2] * 1e3, "ms_lo": ts[0] * 1e3, "ms_hi": ts[-1] * 1e3}
        row["flops"] = T * ITERS * 8 * 2
        row["load"] = os.getloadavg()[0]
        res["diverge"].append(row)
        print(f"diverge K={K:2d}  lanes {row['lanes']['ms']:8.2f} ms   simdgroups {row['simdgroups']['ms']:8.2f} ms  load {row['load']:.1f}", flush=True)


if __name__ == "__main__":
    exp_chase()
    big, order = chain(256 << 20)
    exp_little(big, order)
    del big
    a = mx.random.uniform(shape=(NSTREAM,), dtype=mx.float32); mx.eval(a)
    ref = float(np.asarray(a, dtype=np.float64).sum())
    exp_stream(a, ref)
    exp_smem(a, ref)
    del a
    exp_diverge()
    res["meta"]["finished"] = time.strftime("%Y-%m-%d %H:%M:%S")
    res["meta"]["load_end"] = os.getloadavg()
    json.dump(res, open(OUT, "w"), indent=1)
    print("wrote", OUT)

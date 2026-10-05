"""GPU simulator tab: real measurements of the same effects on the Apple M1 Pro GPU (16 cores) via MLX.

Each case is a custom Metal kernel (mx.fast.metal_kernel), checked against NumPy before timing.
Cases (one per simulator on the page):
  coalesce : read 4M float32 with thread i reading element i*S (stride S), and a misaligned and a random gather
  transpose: 4096x4096 float32, naive vs tiled in threadgroup memory vs tiled and padded, and a plain copy
  banks    : threadgroup memory read with lane stride S (Apple's banking is not documented; we only report what we see)
  diverge  : two heavy branches; branch chosen per lane, per SIMD-group (32 threads) or uniformly
  latency  : streaming read with a grid-stride loop and few to many threads in flight (Little's law)
  tiling   : fp32 matmul 2048, naive vs threadgroup tiles of 8, 16, 32
Timing: warm up, then TRIALS trials of REPS calls, mx.eval + mx.synchronize; median, min, max; load average.
Usage: python measure_m1.py OUT.json
"""
import json, os, sys, time, platform
import numpy as np
import mlx.core as mx

TRIALS = 7
OUT = sys.argv[1] if len(sys.argv) > 1 else "sim_m1.json"
res = {"meta": {"mlx": mx.__version__, "numpy": np.__version__, "python": platform.python_version(),
                "device": {k: (v if isinstance(v, (int, float, str)) else str(v)) for k, v in mx.device_info().items()},
                "date": time.strftime("%Y-%m-%d %H:%M")}, "cases": []}


_spun = set()


def timeit(fn, reps, trials=TRIALS):
    g = sys._getframe(1).f_code.co_name
    if g not in _spun:
        _spun.add(g)
        spin(fn)
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
    return {"median_s": ts[len(ts) // 2], "min_s": ts[0], "max_s": ts[-1], "trials": trials, "reps": reps}


def spin(fn, secs=0.6):
    """Keep the GPU busy for a moment before the first timed case of a group, so clocks have ramped up
    (without this the first case of a group read slow and noisy)."""
    t0 = time.perf_counter()
    while time.perf_counter() - t0 < secs:
        mx.eval(fn())
    mx.synchronize()


def add(group, name, t, **kw):
    c = {"group": group, "name": name, "load": os.getloadavg()[0], **t, **kw}
    res["cases"].append(c)
    print(f"{group:9s} {name:34s} {t['median_s']*1e3:9.3f} ms  ({t['min_s']*1e3:.3f}-{t['max_s']*1e3:.3f})  load {c['load']:.1f}  {kw}", flush=True)


def K(name, inputs, outputs, src, header=""):
    return mx.fast.metal_kernel(name=name, input_names=inputs, output_names=outputs, source=src, header=header)


# ---------------- coalescing: stride sweep ----------------
# The buffer (256 MB, far beyond the caches) is read exactly once in every case; only the order changes.
# Element e(g) = (g % P) * S + g / P with P = M / S: neighbouring threads read elements S apart.
# Each thread reads 4 elements (g, g + T, g + 2T, g + 3T for T = M / 4) and writes their sum (coalesced).
STRIDE_SRC = """
    uint gid = thread_position_in_grid.x; uint T = threads_per_grid.x;
    uint M = inp_shape[0] - 64; uint P = M / S;
    float s = 0.0f;
    for (uint j = 0; j < 4; ++j) { uint g = gid + j * T; s += inp[(g % P) * S + g / P + OFF]; }
    out[gid] = s;
"""
GATHER_SRC = """
    uint gid = thread_position_in_grid.x; uint T = threads_per_grid.x;
    float s = 0.0f;
    for (uint j = 0; j < 4; ++j) s += inp[idx[gid + j * T]];
    out[gid] = s;
"""
stride_k = K("sim_stride", ["inp"], ["out"], STRIDE_SRC)
gather_k = K("sim_gather", ["inp", "idx"], ["out"], GATHER_SRC)


def coalesce():
    m = 1 << 26  # 64M float32 = 256 MB read once
    big = mx.random.uniform(shape=(m + 64,), dtype=mx.float32); mx.eval(big)
    nb = np.asarray(big)
    T = m // 4
    for s, off in [(1, 0), (1, 1), (2, 0), (4, 0), (8, 0), (16, 0), (32, 0), (64, 0)]:
        f = lambda: stride_k(inputs=[big], template=[("S", s), ("OFF", off)], grid=(T, 1, 1), threadgroup=(256, 1, 1),
                             output_shapes=[(T,)], output_dtypes=[mx.float32])[0]
        got = np.asarray(f()); P = m // s
        for gid in (0, 1, 31, 12345, T - 1):
            g = np.array([gid + j * T for j in range(4)])
            ref = nb[(g % P) * s + g // P + off].astype(np.float32).sum(dtype=np.float32)
            assert abs(got[gid] - ref) < 1e-5, (s, gid, got[gid], ref)
        t = timeit(f, 5)
        add("coalesce", f"stride {s} offset {off}", t, stride=s, offset=off, useful_bytes=4 * m,
            gbps_useful=4 * m / t["median_s"] / 1e9)
    rng = np.random.default_rng(0)
    idx_np = rng.permutation(m).astype(np.uint32)
    idx = mx.array(idx_np); mx.eval(idx)
    g = lambda: gather_k(inputs=[big, idx], grid=(T, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(T,)], output_dtypes=[mx.float32])[0]
    got = np.asarray(g())
    for gid in (0, 5, T - 1):
        ref = nb[idx_np[[gid + j * T for j in range(4)]]].sum(dtype=np.float32)
        assert abs(got[gid] - ref) < 1e-5
    t = timeit(g, 3)
    add("coalesce", "random gather", t, stride=-1, offset=0, useful_bytes=4 * m, index_bytes=4 * m,
        gbps_useful=4 * m / t["median_s"] / 1e9)
    del big, idx


# ---------------- transpose ----------------
COPY2_SRC = """
    uint x = threadgroup_position_in_grid.x * 32 + thread_position_in_threadgroup.x;
    uint y0 = threadgroup_position_in_grid.y * 32 + thread_position_in_threadgroup.y;
    uint n = inp_shape[1];
    for (uint j = 0; j < 32; j += 8) out[(y0 + j) * n + x] = inp[(y0 + j) * n + x];
"""
TNAIVE_SRC = """
    uint x = threadgroup_position_in_grid.x * 32 + thread_position_in_threadgroup.x;
    uint y0 = threadgroup_position_in_grid.y * 32 + thread_position_in_threadgroup.y;
    uint n = inp_shape[1];
    for (uint j = 0; j < 32; j += 8) out[x * n + (y0 + j)] = inp[(y0 + j) * n + x];
"""
TTILE_SRC = """
    threadgroup float tile[32][32 + PAD];
    uint tx = thread_position_in_threadgroup.x, ty = thread_position_in_threadgroup.y;
    uint bx = threadgroup_position_in_grid.x * 32, by = threadgroup_position_in_grid.y * 32;
    uint n = inp_shape[1];
    for (uint j = 0; j < 32; j += 8) tile[ty + j][tx] = inp[(by + ty + j) * n + bx + tx];
    threadgroup_barrier(mem_flags::mem_threadgroup);
    for (uint j = 0; j < 32; j += 8) out[(bx + ty + j) * n + by + tx] = tile[tx][ty + j];
"""
copy2_k = K("sim_copy2", ["inp"], ["out"], COPY2_SRC)
tnaive_k = K("sim_tnaive", ["inp"], ["out"], TNAIVE_SRC)
ttile_k = K("sim_ttile", ["inp"], ["out"], TTILE_SRC)


def transpose():
    n = 4096
    a = mx.random.uniform(shape=(n, n), dtype=mx.float32); mx.eval(a)
    na = np.asarray(a)
    kw = dict(grid=(n, n // 4, 1), threadgroup=(32, 8, 1), output_shapes=[(n, n)], output_dtypes=[mx.float32])
    cases = [("copy (both sides coalesced)", lambda: copy2_k(inputs=[a], **kw)[0], na),
             ("naive transpose", lambda: tnaive_k(inputs=[a], **kw)[0], na.T),
             ("tiled, tile[32][32]", lambda: ttile_k(inputs=[a], template=[("PAD", 0)], **kw)[0], na.T),
             ("tiled, padded tile[32][33]", lambda: ttile_k(inputs=[a], template=[("PAD", 1)], **kw)[0], na.T)]
    for name, f, ref in cases:
        assert np.array_equal(np.asarray(f()), ref), name
        t = timeit(f, 10)
        add("transpose", name, t, bytes=8 * n * n, gbps=8 * n * n / t["median_s"] / 1e9)
    del a


# ---------------- threadgroup memory stride ----------------
BANK_SRC = """
    threadgroup float buf[4096];
    uint lid = thread_position_in_threadgroup.x;
    for (uint i = lid; i < 4096; i += 256) buf[i] = inp[i];
    threadgroup_barrier(mem_flags::mem_threadgroup);
    float v = 0.0f;
    uint base = lid * S;
    for (uint k = 0; k < ITERS; ++k) v += buf[(base + k) & 4095u];
    out[thread_position_in_grid.x] = v;
"""
bank_k = K("sim_bank", ["inp"], ["out"], BANK_SRC)


def banks():
    inp = mx.random.uniform(shape=(4096,), dtype=mx.float32); mx.eval(inp)
    ni = np.asarray(inp).astype(np.float64)
    th, iters = 256 * 1024, 1024
    for s in [1, 2, 4, 8, 16, 32, 33, 64]:
        f = lambda: bank_k(inputs=[inp], template=[("S", s), ("ITERS", iters)], grid=(th, 1, 1), threadgroup=(256, 1, 1),
                           output_shapes=[(th,)], output_dtypes=[mx.float32])[0]
        got = np.asarray(f())
        for gid in (0, 7, 255, 1000):
            lid = gid % 256
            ref = sum(ni[(lid * s + k) & 4095] for k in range(iters))
            assert abs(got[gid] - ref) < 1e-3 * max(1, abs(ref)), (s, gid, got[gid], ref)
        t = timeit(f, 5)
        add("banks", f"lane stride {s}", t, stride=s, reads=th * iters,
            greads_per_s=th * iters / t["median_s"] / 1e9)


# ---------------- divergence ----------------
DIV_SRC = """
    uint gid = thread_position_in_grid.x;
    float x = inp[gid & 1023u];
    bool c;
    if (MODE == 0) c = true;                         // every lane takes branch A
    else if (MODE == 1) c = ((gid >> 5) & 1u) == 0;  // whole SIMD-groups of 32 take A or B
    else if (MODE == 2) c = (gid & 1u) == 0;         // alternate lanes inside every SIMD-group
    else c = mask[gid & 1023u] != 0;                 // random lanes
    float a = x;
    if (c) { for (uint k = 0; k < ITERS; ++k) { a = fma(a, 0.999f, 0.001f); a = fma(a, 1.001f, -0.002f); } }
    else   { for (uint k = 0; k < ITERS; ++k) { a = fma(a, 1.002f, 0.003f); a = fma(a, 0.998f, -0.001f); } }
    out[gid] = a;
"""
div_k = K("sim_div", ["inp", "mask"], ["out"], DIV_SRC)


def diverge():
    th, iters = 1 << 20, 512
    inp = mx.random.uniform(shape=(1024,), dtype=mx.float32)
    rng = np.random.default_rng(1)
    mask = mx.array((rng.random(1024) < 0.5).astype(np.uint32)); mx.eval(inp, mask)
    ni, nm = np.asarray(inp), np.asarray(mask)

    def ref(gid, mode):
        x = np.float32(ni[gid & 1023])
        c = [True, ((gid >> 5) & 1) == 0, (gid & 1) == 0, nm[gid & 1023] != 0][mode]
        a = x
        for _ in range(iters):
            if c:
                a = np.float32(a * np.float32(0.999) + np.float32(0.001)); a = np.float32(a * np.float32(1.001) - np.float32(0.002))
            else:
                a = np.float32(a * np.float32(1.002) + np.float32(0.003)); a = np.float32(a * np.float32(0.998) - np.float32(0.001))
        return a
    for mode, name in [(0, "uniform: all lanes branch A"), (1, "per SIMD-group: 32 lanes agree"),
                       (2, "divergent: alternate lanes"), (3, "divergent: random lanes")]:
        f = lambda: div_k(inputs=[inp, mask], template=[("MODE", mode), ("ITERS", iters)], grid=(th, 1, 1), threadgroup=(256, 1, 1),
                          output_shapes=[(th,)], output_dtypes=[mx.float32])[0]
        got = np.asarray(f())
        for gid in (0, 1, 33, 999):
            assert abs(got[gid] - ref(gid, mode)) < 1e-3, (mode, gid, got[gid], ref(gid, mode))
        t = timeit(f, 5)
        add("diverge", name, t, mode=mode, flops=th * iters * 4)


# ---------------- latency hiding: threads in flight ----------------
READ_SRC = """
    uint gid = thread_position_in_grid.x; uint n = threads_per_grid.x;
    float4 s = 0; uint m = inp_shape[0] / 4;
    const device float4* p = (const device float4*)inp;
    for (uint i = gid; i < m; i += n) s += p[i];
    out[gid] = s.x + s.y + s.z + s.w;
"""
read_k = K("sim_read", ["inp"], ["out"], READ_SRC)


def latency():
    n = 64 * 1024 * 1024  # 256 MB
    a = mx.random.uniform(shape=(n,), dtype=mx.float32); mx.eval(a)
    tot = float(np.asarray(a, dtype=np.float64).sum())
    for th in [256, 512, 1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144]:
        tg = 256 if th >= 256 else th
        f = lambda: read_k(inputs=[a], grid=(th, 1, 1), threadgroup=(tg, 1, 1), output_shapes=[(th,)], output_dtypes=[mx.float32])[0]
        got = float(np.asarray(f(), dtype=np.float64).sum())
        assert abs(got - tot) / tot < 1e-4, (th, got, tot)
        t = timeit(f, 3 if th < 4096 else 5)
        add("latency", f"{th} threads", t, threads=th, bytes=4 * n, gbps=4 * n / t["median_s"] / 1e9)
    del a


# ---------------- tiling ----------------
NAIVE_SRC = """
    uint col = thread_position_in_grid.x, row = thread_position_in_grid.y; uint n = A_shape[0];
    float acc = 0.0f;
    for (uint k = 0; k < n; ++k) acc += A[row * n + k] * B[k * n + col];
    C[row * n + col] = acc;
"""
TILED_SRC = """
    threadgroup float As[TS][TS];
    threadgroup float Bs[TS][TS];
    uint tx = thread_position_in_threadgroup.x, ty = thread_position_in_threadgroup.y;
    uint col = threadgroup_position_in_grid.x * TS + tx, row = threadgroup_position_in_grid.y * TS + ty;
    uint n = A_shape[0];
    float acc = 0.0f;
    for (uint t = 0; t < n; t += TS) {
        As[ty][tx] = A[row * n + t + tx];
        Bs[ty][tx] = B[(t + ty) * n + col];
        threadgroup_barrier(mem_flags::mem_threadgroup);
        for (uint k = 0; k < TS; ++k) acc += As[ty][k] * Bs[k][tx];
        threadgroup_barrier(mem_flags::mem_threadgroup);
    }
    C[row * n + col] = acc;
"""
mmn_k = K("sim_mm_naive", ["A", "B"], ["C"], NAIVE_SRC)
mmt_k = K("sim_mm_tiled", ["A", "B"], ["C"], TILED_SRC)


def tiling():
    n = 2048
    A = mx.random.normal((n, n)); B = mx.random.normal((n, n)); mx.eval(A, B)
    ref = np.asarray(A).astype(np.float64) @ np.asarray(B).astype(np.float64)
    flops = 2 * n ** 3
    f = lambda: mmn_k(inputs=[A, B], grid=(n, n, 1), threadgroup=(16, 16, 1), output_shapes=[(n, n)], output_dtypes=[mx.float32])[0]
    assert np.abs(np.asarray(f()) - ref).max() < 1e-2
    t = timeit(f, 3)
    add("tiling", "naive (no tiles)", t, tile=1, flops=flops, gflops=flops / t["median_s"] / 1e9)
    for ts in [8, 16, 32]:
        f = lambda: mmt_k(inputs=[A, B], template=[("TS", ts)], grid=(n, n, 1), threadgroup=(ts, ts, 1),
                          output_shapes=[(n, n)], output_dtypes=[mx.float32])[0]
        try:
            assert np.abs(np.asarray(f()) - ref).max() < 1e-2
        except Exception as e:  # e.g. 1024 threads per threadgroup refused
            print("tile", ts, "failed:", repr(e)[:200], flush=True)
            res["cases"].append({"group": "tiling", "name": f"tile {ts}", "tile": ts, "error": repr(e)[:200]})
            continue
        t = timeit(f, 3)
        add("tiling", f"tile {ts}x{ts}", t, tile=ts, flops=flops, gflops=flops / t["median_s"] / 1e9)
    del A, B


def simd_width():
    k = K("sim_simdw", ["a"], ["o"], "o[thread_position_in_grid.x] = threads_per_simdgroup + 0 * a[0];")
    o = k(inputs=[mx.zeros((1,))], grid=(64, 1, 1), threadgroup=(64, 1, 1), output_shapes=[(64,)], output_dtypes=[mx.uint32])[0]
    res["meta"]["simd_width"] = int(o[0].item())


if __name__ == "__main__":
    simd_width()
    only = sys.argv[2:] or ["coalesce", "transpose", "banks", "diverge", "latency", "tiling"]
    for g in only:
        globals()[g]()
        time.sleep(2)
    with open(OUT, "w") as fh:
        json.dump(res, fh, indent=1)
    print("wrote", OUT)

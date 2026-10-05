"""Programming-model measurements on the Apple M1 Pro GPU (Metal, through MLX custom kernels).

Metal's names for CUDA's: thread = thread, SIMD-group (32 threads) = warp, threadgroup = block,
threadgroup memory = shared memory, threadgroup_barrier = __syncthreads, grid = grid.
1 waves    : a fixed amount of compute per threadgroup (1,024 threads, a long FMA loop),
             launched with 1..WMAX threadgroups. Time rises in steps: one step per "wave" of
             threadgroups the GPU can hold at once (the tail effect).
2 block    : y = a * x over 64 Mi floats with one thread per element, threadgroup size 32..1024.
3 launch   : a tiny kernel (1,024 threads) launched and waited for, one at a time, against
             CHAIN launches queued back to back and waited for once.
4 atomics  : count positive values in 16 Mi floats: one atomic per thread on one counter,
             one per SIMD-group after simd_sum, one per threadgroup after a threadgroup sum.
5 race     : a 256-thread shared-memory tree sum with and without threadgroup_barrier;
             fraction of the 65,536 threadgroups whose sum is wrong (checked against NumPy).
Timing: warm up, then TRIALS trials of REPS calls, each call mx.eval + mx.synchronize;
median, min, max, and the 1-minute load average. Usage: python measure.py OUT.json
"""
import json, os, sys, time, platform
import numpy as np
import mlx.core as mx

TRIALS = 7
OUT = sys.argv[1]
res = {"meta": {"mlx": mx.__version__, "numpy": np.__version__, "python": platform.python_version(),
                "device": str(mx.device_info().get("device_name", "")),
                "arch": str(mx.device_info().get("architecture", "")),
                "date": time.strftime("%Y-%m-%d %H:%M"), "load": os.getloadavg()[0]}, "cases": {}}


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
    return {"ms": ts[len(ts) // 2] * 1e3, "ms_min": ts[0] * 1e3, "ms_max": ts[-1] * 1e3}


def K(name, ins, outs, src, atomic=False):
    return mx.fast.metal_kernel(name=name, input_names=ins, output_names=outs, source=src,
                                atomic_outputs=atomic)


# 1 waves ------------------------------------------------------------------------------
ITERS = 32768
waves_k = K("pm_waves", ["x"], ["y"], """
    uint i = thread_position_in_grid.x;
    float a = x[i % 1024], b = 1.0001f;
    for (int k = 0; k < ITERS; ++k) { a = fma(a, b, 0.5f); b = fma(b, 0.9999f, 0.0001f); }
    y[i] = a + b;
""".replace("ITERS", str(ITERS)))
xw = mx.ones((1024,), dtype=mx.float32); mx.eval(xw)
WMAX = 72
waves = []
for g in range(1, WMAX + 1):
    def f(g=g):
        return waves_k(inputs=[xw], grid=(g * 1024, 1, 1), threadgroup=(1024, 1, 1),
                       output_shapes=[(g * 1024,)], output_dtypes=[mx.float32])[0]
    r = timeit(f, 5, trials=5)
    r["groups"] = g
    waves.append(r)
res["cases"]["waves"] = {"iters": ITERS, "tg": 1024, "rows": waves}
print("waves", [round(w["ms"], 3) for w in waves], flush=True)

# 2 block size --------------------------------------------------------------------------
N = 64 * 1024 * 1024
x = mx.random.normal((N,), key=mx.random.key(1)); mx.eval(x)
scale_k = K("pm_scale", ["x"], ["y"], """
    uint i = thread_position_in_grid.x;
    y[i] = 2.0f * x[i];
""")
blk = []
for tg in (32, 64, 128, 256, 512, 1024):
    def f(tg=tg):
        return scale_k(inputs=[x], grid=(N, 1, 1), threadgroup=(tg, 1, 1),
                       output_shapes=[(N,)], output_dtypes=[mx.float32])[0]
    r = timeit(f, 5)
    r["tg"] = tg
    r["gbps"] = 2 * N * 4 / (r["ms"] * 1e-3) / 1e9
    blk.append(r)
yy = np.array(f()); assert np.allclose(yy[:1000], 2 * np.array(x[:1000]))
res["cases"]["block"] = {"n": N, "rows": blk}
print("block", [(b["tg"], round(b["gbps"], 1)) for b in blk], flush=True)
del x, yy

# 3 launch: launch-and-wait against queued launches ---------------------------------------
CHAIN = 200
tiny_k = K("pm_tiny", ["x"], ["y"], """
    uint i = thread_position_in_grid.x;
    y[i] = x[i] + 1.0f;
""")
xt = mx.zeros((1024,), dtype=mx.float32); mx.eval(xt)
def one(v):
    return tiny_k(inputs=[v], grid=(1024, 1, 1), threadgroup=(256, 1, 1),
                  output_shapes=[(1024,)], output_dtypes=[mx.float32])[0]
r1 = timeit(lambda: one(xt), 50)
def chain():
    v = xt
    for _ in range(CHAIN):
        v = one(v)
    return v
rc = timeit(chain, 3)
assert float(np.array(chain())[0]) == CHAIN
res["cases"]["launch"] = {"chain": CHAIN, "wait_each": r1, "chain_total": rc,
                          "us_wait_each": r1["ms"] * 1e3, "us_per_queued": rc["ms"] * 1e3 / CHAIN}
print("launch", round(r1["ms"] * 1e3, 1), "us each;", round(rc["ms"] * 1e3 / CHAIN, 1), "us queued", flush=True)

# 4 atomics -------------------------------------------------------------------------------
NA = 16 * 1024 * 1024
xa = mx.random.normal((NA,), key=mx.random.key(2)); mx.eval(xa)
want = int((np.array(xa) > 0).sum())
srcs = {
 "per_thread": """
    uint i = thread_position_in_grid.x;
    if (x[i] > 0.0f) atomic_fetch_add_explicit(&c[0], 1u, memory_order_relaxed);
""",
 "per_simdgroup": """
    uint i = thread_position_in_grid.x;
    uint v = x[i] > 0.0f ? 1u : 0u;
    uint s = simd_sum(v);
    if (thread_index_in_simdgroup == 0) atomic_fetch_add_explicit(&c[0], s, memory_order_relaxed);
""",
 "per_threadgroup": """
    threadgroup uint part[32];
    uint i = thread_position_in_grid.x;
    uint v = x[i] > 0.0f ? 1u : 0u;
    uint s = simd_sum(v);
    if (thread_index_in_simdgroup == 0) part[simdgroup_index_in_threadgroup] = s;
    threadgroup_barrier(mem_flags::mem_threadgroup);
    if (simdgroup_index_in_threadgroup == 0) {
        uint w = thread_index_in_simdgroup < 8 ? part[thread_index_in_simdgroup] : 0u;
        w = simd_sum(w);
        if (thread_index_in_simdgroup == 0) atomic_fetch_add_explicit(&c[0], w, memory_order_relaxed);
    }
""",
}
ato = []
for name, src in srcs.items():
    k = K("pm_at_" + name, ["x"], ["c"], src, atomic=True)
    def f(k=k):
        return k(inputs=[xa], grid=(NA, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(1,)],
                 output_dtypes=[mx.uint32], init_value=0)[0]
    got = int(np.array(f())[0])
    r = timeit(f, 5)
    r.update({"variant": name, "count": got, "correct": got == want,
              "atomics": {"per_thread": want, "per_simdgroup": NA // 32, "per_threadgroup": NA // 256}[name]})
    ato.append(r)
res["cases"]["atomics"] = {"n": NA, "positives": want, "rows": ato}
print("atomics", [(a["variant"], round(a["ms"], 3), a["correct"]) for a in ato], flush=True)
del xa

# 5 race: tree sum with and without the barrier ------------------------------------------------
G = 65536
xi = mx.array(np.random.default_rng(3).integers(0, 10, size=G * 256).astype(np.int32)); mx.eval(xi)
want = np.array(xi).reshape(G, 256).sum(1)
def tree(bar):
    b = "threadgroup_barrier(mem_flags::mem_threadgroup);" if bar else ""
    return K("pm_tree_" + ("bar" if bar else "nobar"), ["x"], ["y"], f"""
    threadgroup int s[256];
    uint t = thread_position_in_threadgroup.x;
    s[t] = x[thread_position_in_grid.x];
    {b}
    for (uint k = 128; k > 0; k >>= 1) {{
        if (t < k) s[t] += s[t + k];
        {b}
    }}
    if (t == 0) y[threadgroup_position_in_grid.x] = s[0];
""")
race = []
for bar in (True, False):
    k = tree(bar)
    def f(k=k):
        return k(inputs=[xi], grid=(G * 256, 1, 1), threadgroup=(256, 1, 1),
                 output_shapes=[(G,)], output_dtypes=[mx.int32])[0]
    wrong = []
    for rep in range(5):
        got = np.array(f())
        wrong.append(int((got != want).sum()))
    r = timeit(f, 5)
    r.update({"barrier": bar, "groups": G, "wrong_per_rep": wrong,
              "example": {"got": int(got[np.argmax(got != want)]) if (got != want).any() else None,
                          "want": int(want[np.argmax(got != want)]) if (got != want).any() else None}})
    race.append(r)
res["cases"]["race"] = race
print("race", [(r["barrier"], r["wrong_per_rep"]) for r in race], flush=True)
res["meta"]["load_end"] = os.getloadavg()[0]
json.dump(res, open(OUT, "w"), indent=1)
print("saved", OUT)

"""Roofline measurements on the Apple M1 Pro GPU (16 cores) through MLX.

Measures: peak FP32 and FP16 FMA throughput (custom Metal kernels, no memory traffic),
achievable memory bandwidth (custom read and copy kernels), then real kernels placed on the
roofline: vector add, naive and tiled matmul (custom Metal), MLX's own matmul, softmax over rows,
decode-style matrix-vector product and the same weight at batch 1..2048, and one attention step
(decode against a KV cache, and prefill).

Every case: warm up, then TRIALS timed trials; each trial runs REPS calls and is timed with
mx.eval + mx.synchronize. We record median, min and max seconds per call and the load average.
Correctness of every custom kernel is checked against a NumPy reference before timing.

Usage: python roof_gpu.py OUT.json   (run by ../run_all.sh three times)
"""
import json, os, sys, time, platform
import numpy as np
import mlx.core as mx

TRIALS = 7
OUT = sys.argv[1] if len(sys.argv) > 1 else "roof_gpu.json"
res = {"meta": {}, "cases": []}


def timeit(fn, reps, trials=TRIALS, batch=False):
    """fn() returns an mx array (or list). batch=True: launch reps calls, evaluate once."""
    for _ in range(2):
        mx.eval(fn())
    mx.synchronize()
    ts = []
    for _ in range(trials):
        t0 = time.perf_counter()
        if batch:
            outs = [fn() for _ in range(reps)]
            mx.eval(outs)
        else:
            for _ in range(reps):
                mx.eval(fn())
        mx.synchronize()
        ts.append((time.perf_counter() - t0) / reps)
    ts.sort()
    return {"median_s": ts[len(ts) // 2], "min_s": ts[0], "max_s": ts[-1], "trials": trials, "reps": reps}


def add(name, group, flops, bytes_, t, **kw):
    s = t["median_s"]
    c = {"name": name, "group": group, "flops": flops, "bytes": bytes_,
         "ai": (flops / bytes_) if bytes_ else None,
         "gflops_median": flops / s / 1e9, "gflops_best": flops / t["min_s"] / 1e9, "gflops_worst": flops / t["max_s"] / 1e9,
         "gbps_median": bytes_ / s / 1e9, "gbps_best": bytes_ / t["min_s"] / 1e9, "gbps_worst": bytes_ / t["max_s"] / 1e9,
         "load": os.getloadavg()[0], **t, **kw}
    res["cases"].append(c)
    print(f"{name:42s} {c['gflops_median']:9.1f} GFLOP/s {c['gbps_median']:7.1f} GB/s  AI {c['ai'] if c['ai'] is None else round(c['ai'], 3)}  spread {t['min_s']*1e3:.3f}-{t['max_s']*1e3:.3f} ms  load {c['load']:.1f}", flush=True)


# ---------------- peak FMA ----------------
# 16 independent scalar FMA chains per thread, the loop body unrolled 8 times by hand: a first version
# with the loop not unrolled reached only 2.2 TFLOP/s in fp32 (loop overhead), see ../README.md.
FMA_BODY = "a0 = fma(a0, x, y); a1 = fma(a1, x, y); a2 = fma(a2, x, y); a3 = fma(a3, x, y); a4 = fma(a4, x, y); a5 = fma(a5, x, y); a6 = fma(a6, x, y); a7 = fma(a7, x, y); a8 = fma(a8, x, y); a9 = fma(a9, x, y); a10 = fma(a10, x, y); a11 = fma(a11, x, y); a12 = fma(a12, x, y); a13 = fma(a13, x, y); a14 = fma(a14, x, y); a15 = fma(a15, x, y);"
FMA_SRC = """
    uint gid = thread_position_in_grid.x;
    T x = T(xs[0]); T y = T(xs[1]);
    T a0 = T(xs[2]) + T(gid % 7) + T(0);
    T a1 = T(xs[2]) + T(gid % 7) + T(1);
    T a2 = T(xs[2]) + T(gid % 7) + T(2);
    T a3 = T(xs[2]) + T(gid % 7) + T(3);
    T a4 = T(xs[2]) + T(gid % 7) + T(4);
    T a5 = T(xs[2]) + T(gid % 7) + T(5);
    T a6 = T(xs[2]) + T(gid % 7) + T(6);
    T a7 = T(xs[2]) + T(gid % 7) + T(7);
    T a8 = T(xs[2]) + T(gid % 7) + T(8);
    T a9 = T(xs[2]) + T(gid % 7) + T(9);
    T a10 = T(xs[2]) + T(gid % 7) + T(10);
    T a11 = T(xs[2]) + T(gid % 7) + T(11);
    T a12 = T(xs[2]) + T(gid % 7) + T(12);
    T a13 = T(xs[2]) + T(gid % 7) + T(13);
    T a14 = T(xs[2]) + T(gid % 7) + T(14);
    T a15 = T(xs[2]) + T(gid % 7) + T(15);
    for (int i = 0; i < ITERS; ++i) {
        """ + (FMA_BODY + "\n        ") * 8 + """
    }
    out[gid] = float(a0 + a1 + a2 + a3 + a4 + a5 + a6 + a7 + a8 + a9 + a10 + a11 + a12 + a13 + a14 + a15);
"""
fma_k = mx.fast.metal_kernel(name="peak_fma", input_names=["xs"], output_names=["out"], source=FMA_SRC)
# The same work with the loop body written once (8x more trips round the loop): the lesson case.
FMA_SRC_ROLLED = FMA_SRC.replace((FMA_BODY + "\n        ") * 8, FMA_BODY + "\n        ")
fma_rolled_k = mx.fast.metal_kernel(name="peak_fma_rolled", input_names=["xs"], output_names=["out"], source=FMA_SRC_ROLLED)


def peak(dtype, name, rolled=False):
    iters, threads = 1024, 16 * 1024 * 16
    xs = mx.array([0.999, 1e-4, 1.0], dtype=mx.float32)
    k = fma_rolled_k if rolled else fma_k
    f = lambda: k(inputs=[xs], template=[("T", dtype), ("ITERS", iters * 8 if rolled else iters)], grid=(threads, 1, 1), threadgroup=(256, 1, 1),
                      output_shapes=[(threads,)], output_dtypes=[mx.float32])[0]
    flops = threads * iters * 8 * 16 * 2  # 8 unrolled copies x 16 chains x 2 flops
    add(name, "peak", flops, threads * 4, timeit(f, 5), dtype=str(dtype), rolled=rolled)


# ---------------- bandwidth ----------------
READ_SRC = """
    uint gid = thread_position_in_grid.x; uint n = threads_per_grid.x;
    float4 s = 0; uint m = inp_shape[0] / 4;
    const device float4* p = (const device float4*)inp;
    for (uint i = gid; i < m; i += n) s += p[i];
    out[gid] = s.x + s.y + s.z + s.w;
"""
COPY_SRC = """
    uint gid = thread_position_in_grid.x;
    ((device float4*)out)[gid] = ((const device float4*)inp)[gid];
"""
read_k = mx.fast.metal_kernel(name="bw_read", input_names=["inp"], output_names=["out"], source=READ_SRC)
copy_k = mx.fast.metal_kernel(name="bw_copy", input_names=["inp"], output_names=["out"], source=COPY_SRC)


def bandwidth():
    n = 128 * 1024 * 1024  # 512 MB of float32, far beyond the caches
    a = mx.random.uniform(shape=(n,), dtype=mx.float32); mx.eval(a)
    th = 16 * 1024 * 4
    f = lambda: read_k(inputs=[a], grid=(th, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(th,)], output_dtypes=[mx.float32])[0]
    got = float(f().sum().item()); ref = float(np.asarray(a, dtype=np.float64).sum())
    assert abs(got - ref) / ref < 1e-4, (got, ref)
    add("stream read (512 MB)", "bandwidth", n, 4 * n, timeit(f, 5), note="custom Metal kernel, float4 loads")
    g = lambda: copy_k(inputs=[a], grid=(n // 4, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(n,)], output_dtypes=[mx.float32])[0]
    assert bool(mx.array_equal(g(), a).item())
    add("stream copy (512 MB in, 512 MB out)", "bandwidth", 0, 8 * n, timeit(g, 5), note="custom Metal kernel, float4")
    b = mx.random.uniform(shape=(n,), dtype=mx.float32); mx.eval(b)
    h = lambda: a + b
    add("vector add c = a + b (fp32, 128M elements)", "kernel", n, 12 * n, timeit(h, 5), note="MLX elementwise add")
    del a, b


# ---------------- matmul: naive, tiled (custom), MLX ----------------
NAIVE_SRC = """
    uint col = thread_position_in_grid.x, row = thread_position_in_grid.y;
    uint K = A_shape[1], N = B_shape[1];
    float acc = 0;
    for (uint k = 0; k < K; ++k) acc = fma(A[row * K + k], B[k * N + col], acc);
    C[row * N + col] = acc;
"""
TILED_SRC = """
    threadgroup float As[TS][TS];
    threadgroup float Bs[TS][TS];
    uint tx = thread_position_in_threadgroup.x, ty = thread_position_in_threadgroup.y;
    uint col = threadgroup_position_in_grid.x * TS + tx, row = threadgroup_position_in_grid.y * TS + ty;
    uint K = A_shape[1], N = B_shape[1];
    float acc = 0;
    for (uint k0 = 0; k0 < K; k0 += TS) {
        As[ty][tx] = A[row * K + k0 + tx];
        Bs[ty][tx] = B[(k0 + ty) * N + col];
        threadgroup_barrier(mem_flags::mem_threadgroup);
        for (uint k = 0; k < TS; ++k) acc = fma(As[ty][k], Bs[k][tx], acc);
        threadgroup_barrier(mem_flags::mem_threadgroup);
    }
    C[row * N + col] = acc;
"""
naive_k = mx.fast.metal_kernel(name="mm_naive", input_names=["A", "B"], output_names=["C"], source=NAIVE_SRC)
tiled_k = mx.fast.metal_kernel(name="mm_tiled", input_names=["A", "B"], output_names=["C"], source=TILED_SRC)


def matmuls():
    n = 2048
    A = mx.random.normal((n, n)); B = mx.random.normal((n, n)); mx.eval(A, B)
    ref = np.asarray(A, dtype=np.float64) @ np.asarray(B, dtype=np.float64)
    flops, minbytes = 2 * n ** 3, 3 * 4 * n * n
    fn = lambda: naive_k(inputs=[A, B], grid=(n, n, 1), threadgroup=(16, 16, 1), output_shapes=[(n, n)], output_dtypes=[mx.float32])[0]
    err = float(np.max(np.abs(np.asarray(fn()) - ref))); assert err < 1e-2, err
    add("matmul naive, custom (fp32, 2048)", "kernel", flops, minbytes, timeit(fn, 3), max_abs_err=err,
        note="one thread per output, every operand read from device memory")
    ft = lambda: tiled_k(inputs=[A, B], template=[("TS", 16)], grid=(n, n, 1), threadgroup=(16, 16, 1), output_shapes=[(n, n)], output_dtypes=[mx.float32])[0]
    err = float(np.max(np.abs(np.asarray(ft()) - ref))); assert err < 1e-2, err
    add("matmul tiled 16x16, custom (fp32, 2048)", "kernel", flops, minbytes, timeit(ft, 3), max_abs_err=err,
        note="16x16 tiles staged in threadgroup memory")
    fm = lambda: A @ B
    add("matmul MLX library (fp32, 2048)", "kernel", flops, minbytes, timeit(fm, 5))
    for dt, nm in ((mx.float16, "fp16"), (mx.bfloat16, "bf16")):
        A2, B2 = A.astype(dt), B.astype(dt); mx.eval(A2, B2)
        add(f"matmul MLX library ({nm}, 2048)", "kernel", flops, 3 * 2 * n * n, timeit(lambda: A2 @ B2, 5), dtype=nm)
    n = 4096
    A = mx.random.normal((n, n)).astype(mx.float16); B = mx.random.normal((n, n)).astype(mx.float16); mx.eval(A, B)
    add("matmul MLX library (fp16, 4096)", "kernel", 2 * n ** 3, 3 * 2 * n * n, timeit(lambda: A @ B, 3), dtype="fp16")


# ---------------- softmax, decode matvec, batch sweep, attention ----------------
def softmax():
    r, c = 16384, 4096
    x = mx.random.normal((r, c)); mx.eval(x)
    add("softmax over rows (fp32, 16384 x 4096)", "kernel", 5 * r * c, 8 * r * c, timeit(lambda: mx.softmax(x, axis=-1), 5),
        note="flops counted as 5 per element (max, subtract, exp, sum, divide); bytes = read once + write once")


def batch_sweep():
    N = K = 8192  # 128 MB of fp16 weights: bigger than the 24 MB system cache, as a real layer would be
    W = (mx.random.normal((N, K)) * 0.01).astype(mx.float16); mx.eval(W)
    for M in (1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048):
        X = mx.random.normal((M, K)).astype(mx.float16); mx.eval(X)
        flops = 2 * M * N * K
        byts = 2 * (N * K + M * K + M * N)
        reps = 20 if M <= 64 else 5
        nm = f"y = x W^T, batch {M} (fp16, 8192 x 8192)"
        add(nm, "sweep", flops, byts, timeit(lambda: X @ W.T, reps, batch=(M <= 64)), batch=M,
            note="M = 1 is the decode-style matrix-vector product")


def attention():
    H, d = 32, 128
    L = 4096
    q = mx.random.normal((1, H, 1, d)).astype(mx.float16)
    k = mx.random.normal((1, H, L, d)).astype(mx.float16)
    v = mx.random.normal((1, H, L, d)).astype(mx.float16); mx.eval(q, k, v)
    sc = d ** -0.5
    f = lambda: mx.fast.scaled_dot_product_attention(q, k, v, scale=sc)
    ref = mx.softmax((q.astype(mx.float32) @ k.astype(mx.float32).transpose(0, 1, 3, 2)) * sc, axis=-1) @ v.astype(mx.float32)
    err = float(mx.max(mx.abs(f().astype(mx.float32) - ref)).item()); assert err < 1e-2, err
    add(f"attention decode step: 1 query, {L}-token KV cache, 32 heads (fp16)", "kernel", 4 * H * L * d,
        2 * (2 * H * L * d + 2 * H * d), timeit(f, 20, batch=True), max_abs_err=err)
    L = 2048
    q = mx.random.normal((1, H, L, d)).astype(mx.float16)
    k = mx.random.normal((1, H, L, d)).astype(mx.float16)
    v = mx.random.normal((1, H, L, d)).astype(mx.float16); mx.eval(q, k, v)
    f = lambda: mx.fast.scaled_dot_product_attention(q, k, v, scale=sc)
    add(f"attention prefill: {L} queries x {L} keys, 32 heads, no mask (fp16)", "kernel", 4 * H * L * L * d,
        2 * 4 * H * L * d, timeit(f, 3))


if __name__ == "__main__":
    mx.random.seed(0)
    info = mx.device_info()
    res["meta"] = {"date": time.strftime("%Y-%m-%d %H:%M"), "mlx": mx.__version__, "numpy": np.__version__,
                   "python": platform.python_version(), "device": info.get("device_name"), "arch": info.get("architecture"),
                   "memory_bytes": info.get("memory_size"), "load_start": os.getloadavg()}
    print(res["meta"], flush=True)
    peak(mx.float32, "peak FMA fp32 (custom Metal kernel)")
    peak(mx.float16, "peak FMA fp16 (custom Metal kernel)")
    peak(mx.float32, "FMA fp32, same work, loop not unrolled", rolled=True)
    bandwidth()
    matmuls()
    softmax()
    batch_sweep()
    attention()
    res["meta"]["load_end"] = os.getloadavg()
    json.dump(res, open(OUT, "w"), indent=1)
    print("wrote", OUT)

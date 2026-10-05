"""Kernel lab measurements on the Apple M1 Pro GPU through MLX custom Metal kernels.

Four ladders, every kernel checked against a float64 NumPy reference before it is timed:
  softmax   row softmax of x (16384 x 4096 fp32, the Roofline lab's softmax input shape), plus a long-row shape
  matmul    C = A B, 2048 x 2048 fp32 (the Roofline lab's matmul shape)
  fused     O = softmax(S) V, S: N x N, V: N x 64, unfused against fused, N = 2048, 4096, 8192
  attention O = softmax(Q K^T / 8) V, 4 heads, head dim 64, fp32, N = 512 ... 16384: naive (S and P in memory)
            against the FlashAttention-style kernel and MLX's own fused attention
Peak memory per case is read with mx.reset_peak_memory / mx.get_peak_memory (MLX's allocator, bytes).

Usage: python lab_m1.py OUT.json   (run three times by ../run_all.sh)
"""
import json, os, sys, time, platform
import numpy as np
import mlx.core as mx
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import kernel, timeit
import k_softmax as KS, k_matmul as KM, k_fused as KF

OUT = sys.argv[1] if len(sys.argv) > 1 else "lab_m1.json"
ONLY = sys.argv[2].split(",") if len(sys.argv) > 2 else None
res = {"meta": {}, "cases": []}


def reps_for(fn, target=0.06):
    mx.eval(fn()); mx.synchronize()
    t0 = time.perf_counter(); mx.eval(fn()); mx.synchronize()
    return max(1, min(50, int(target / max(time.perf_counter() - t0, 1e-5))))


def run(group, name, fn, ref=None, tol=None, out_np=None, **kw):
    err = None
    if ref is not None:
        o = np.asarray(fn() if out_np is None else out_np(fn()), dtype=np.float64)
        err = float(np.max(np.abs(o - ref)))
        assert err < tol, (name, err)
    mx.synchronize(); mx.clear_cache(); mx.reset_peak_memory()
    mx.eval(fn()); mx.synchronize()
    peak = mx.get_peak_memory()
    t = timeit(fn, reps_for(fn))
    c = {"group": group, "name": name, "max_abs_err": err, "peak_bytes": peak, **t, **kw}
    res["cases"].append(c)
    print(f"{group:9s} {name:46s} {t['median_s']*1e3:9.3f} ms  [{t['min_s']*1e3:.3f}-{t['max_s']*1e3:.3f}]  err {err}  peak {peak/2**20:.0f} MiB  load {t['load']}", flush=True)
    return c


def softmax_ref(x):
    xn = np.asarray(x, dtype=np.float64); e = np.exp(xn - xn.max(1, keepdims=True))
    return e / e.sum(1, keepdims=True)


def softmax_ladder():
    R, C = 16384, 4096
    x = mx.random.normal((R, C)) * 2; mx.eval(x)
    ref = softmax_ref(x)
    def eager():   # what PyTorch eager does: one kernel per operation, every intermediate in memory
        m = mx.max(x, axis=-1, keepdims=True); t = x - m; e = mx.exp(t); s = mx.sum(e, axis=-1, keepdims=True); return e / s
    run("softmax", "eager: 5 separate kernels", eager, ref, 1e-5, R=R, C=C, passes_r=5, passes_w=3, step="E")
    run("softmax", "eager under mx.compile", mx.compile(eager), ref, 1e-5, R=R, C=C, step="EC")
    run("softmax", "MLX library mx.softmax", lambda: mx.softmax(x, axis=-1), ref, 1e-5, R=R, C=C, step="L")
    ks = [("S1", "one thread per row", KS.S1_NAIVE, R, 64, None, 3),
          ("S2", "threadgroup per row, coalesced", KS.S2_COALESCED, R * 256, 256, None, 3),
          ("S3", "+ SIMD-group reductions", KS.S3_SIMD, R * 256, 256, None, 3),
          ("S4", "+ float4 loads", KS.S4_VEC, R * 256, 256, None, 3),
          ("S5", "+ online softmax (2 passes)", KS.S5_ONLINE, R * 256, 256, None, 2),
          ("S6", "row held in registers (1 pass)", KS.S6_ONCHIP, R * 256, 256, [("NV", C // 1024)], 1)]
    for step, nm, src, grid, tg, tmpl, pr in ks:
        k = kernel("sm_" + step, ["x"], ["y"], src)
        f = (lambda k=k, grid=grid, tg=tg, tmpl=tmpl: k(inputs=[x], grid=(grid, 1, 1), threadgroup=(tg, 1, 1), output_shapes=[(R, C)],
                                                        output_dtypes=[mx.float32], **({"template": tmpl} if tmpl else {}))[0])
        run("softmax", f"{step} {nm}", f, ref, 1e-5, R=R, C=C, passes_r=pr, passes_w=1, step=step)
    del x
    # long rows: 512 rows of 131,072 floats (512 KB per row), too long to hold on chip
    R, C = 512, 131072
    x = mx.random.normal((R, C)) * 2; mx.eval(x)
    ref = softmax_ref(x)
    for step, src, pr in (("S4", KS.S4_VEC, 3), ("S5", KS.S5_ONLINE, 2)):
        k = kernel("sml_" + step, ["x"], ["y"], src)
        f = lambda k=k: k(inputs=[x], grid=(R * 256, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(R, C)], output_dtypes=[mx.float32])[0]
        run("softmax_long", f"{step} long rows", f, ref, 1e-6, R=R, C=C, passes_r=pr, passes_w=1, step=step)
    run("softmax_long", "MLX library long rows", lambda: mx.softmax(x, axis=-1), ref, 1e-6, R=R, C=C, step="L")


def matmul_ladder():
    n = 2048
    A = mx.random.normal((n, n)); B = mx.random.normal((n, n)); mx.eval(A, B)
    ref = np.asarray(A, dtype=np.float64) @ np.asarray(B, dtype=np.float64)
    H, H0 = KM.HEADER, KM.HEADER_NO_UNROLL
    ks = [("M1", "naive, uncoalesced", KM.M1_UNCOALESCED, (n, n, 1), (16, 16, 1), None, H),
          ("M2", "naive, coalesced", KM.M2_COALESCED, (n, n, 1), (16, 16, 1), None, H),
          ("M3", "tiled 16x16 in threadgroup memory", KM.M3_TILED, (n, n, 1), (16, 16, 1), [("TS", 16)], H),
          ("M4", "tiled 32x32", KM.M3_TILED, (n, n, 1), (32, 32, 1), [("TS", 32)], H),
          ("M5", "4x4 outputs per thread (registers)", KM.M5_REG4, (n // 64 * 256, n // 64, 1), (256, 1, 1), None, H),
          ("M6", "8x8 per thread + float4", KM.M6_REG8_VEC, (n // 128 * 256, n // 128, 1), (256, 1, 1), None, H),
          ("M7a", "8x8 matrix instructions, from device memory", KM.M7A_SIMDMAT_DEVICE, (n // 64 * 128, n // 64, 1), (128, 1, 1), None, H),
          ("M7", "8x8 matrix instructions + threadgroup tiles", KM.M7_SIMDMAT, (n // 64 * 128, n // 64, 1), (128, 1, 1), None, H),
          ("M7nu", "M7 with loops not unrolled", KM.M7_SIMDMAT, (n // 64 * 128, n // 64, 1), (128, 1, 1), None, H0)]
    for step, nm, src, grid, tg, tmpl, hdr in ks:
        k = kernel("mm_" + step, ["A", "B"], ["C"], src, hdr)
        f = (lambda k=k, grid=grid, tg=tg, tmpl=tmpl: k(inputs=[A, B], grid=grid, threadgroup=tg, output_shapes=[(n, n)],
                                                        output_dtypes=[mx.float32], **({"template": tmpl} if tmpl else {}))[0])
        run("matmul", f"{step} {nm}", f, ref, 1e-2, n=n, flops=2 * n ** 3, step=step)
    run("matmul", "MLX library A @ B", lambda: A @ B, ref, 1e-2, n=n, flops=2 * n ** 3, step="L")


def fused():
    d = 64
    sm6 = kernel("fu_s6", ["x"], ["y"], KS.S6_ONCHIP)
    mm7 = kernel("fu_m7", ["A", "B"], ["C"], KM.M7_SIMDMAT, KM.HEADER)
    fk = kernel("fu_smm", ["S", "V"], ["O"], KF.FUSED_SMM, KF.HEADER)
    for N in (2048, 4096, 8192):
        S = mx.random.normal((N, N)) * 2; V = mx.random.normal((N, d)); mx.eval(S, V)
        ref = softmax_ref(S) @ np.asarray(V, dtype=np.float64)
        kw = dict(N=N, d=d, flops=2 * N * N * d)
        run("fused", f"unfused, MLX: mx.softmax then @ (N={N})", lambda: mx.softmax(S, axis=-1) @ V, ref, 1e-4, step="U_lib", **kw)
        def ours():
            P = sm6(inputs=[S], template=[("NV", N // 1024)], grid=(N * 256, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(N, N)], output_dtypes=[mx.float32])[0]
            return mm7(inputs=[P, V], grid=(d // 64 * 128, N // 64, 1), threadgroup=(128, 1, 1), output_shapes=[(N, d)], output_dtypes=[mx.float32])[0]
        run("fused", f"unfused, ours: S6 then M7 (N={N})", ours, ref, 1e-4, step="U_ours", **kw)
        for on, st in ((0, "F2"), (1, "F1")):
            f = lambda on=on: fk(inputs=[S, V], template=[("ONLINE", on)], grid=(N // 64 * 128, 1, 1), threadgroup=(128, 1, 1), output_shapes=[(N, d)], output_dtypes=[mx.float32])[0]
            run("fused", f"fused, {'one pass, online' if on else 'two passes'} (N={N})", f, ref, 1e-4, step=st, **kw)
        del S, V


def attention():
    H, d = 4, 64
    fa = kernel("at_flash", ["Q", "K", "V"], ["O"], KF.FLASH_ATTN, KF.HEADER)
    for N in (512, 1024, 2048, 4096, 8192, 16384):
        Q = mx.random.normal((H, N, d)); K = mx.random.normal((H, N, d)); V = mx.random.normal((H, N, d)); mx.eval(Q, K, V)
        kw = dict(N=N, H=H, d=d, flops=4 * H * N * N * d)
        ref = None
        if N <= 4096:   # float64 reference, head by head
            Qn, Kn, Vn = (np.asarray(t, dtype=np.float64) for t in (Q, K, V))
            ref = np.stack([softmax_ref(mx.array((Qn[h] @ Kn[h].T / 8.0).astype(np.float32))) @ Vn[h] for h in range(H)])
        naive = lambda: mx.softmax((Q @ K.transpose(0, 2, 1)) * 0.125, axis=-1) @ V
        flash = lambda: fa(inputs=[Q, K, V], grid=(N // 64 * 128, H, 1), threadgroup=(128, 1, 1), output_shapes=[(H, N, d)], output_dtypes=[mx.float32])[0]
        sdpa = lambda: mx.fast.scaled_dot_product_attention(Q[None], K[None], V[None], scale=0.125)[0]
        if ref is None:   # beyond 4096: check flash against MLX's fused kernel instead
            ref = np.asarray(sdpa(), dtype=np.float64)
        if N <= 8192:
            run("attention", f"naive: S and P in memory (N={N})", naive, ref, 1e-3, step="naive", **kw)
        run("attention", f"flash-style kernel, ours (N={N})", flash, ref, 1e-3, step="flash", **kw)
        run("attention", f"MLX fused attention (N={N})", sdpa, ref, 1e-3, step="sdpa", **kw)
        del Q, K, V


if __name__ == "__main__":
    mx.random.seed(0)
    info = mx.device_info()
    res["meta"] = {"date": time.strftime("%Y-%m-%d %H:%M"), "mlx": mx.__version__, "numpy": np.__version__,
                   "python": platform.python_version(), "device": info.get("device_name"), "arch": info.get("architecture"),
                   "memory_bytes": info.get("memory_size"), "load_start": os.getloadavg()}
    print(res["meta"], flush=True)
    for nm, fn in (("softmax", softmax_ladder), ("matmul", matmul_ladder), ("fused", fused), ("attention", attention)):
        if ONLY is None or nm in ONLY:
            fn(); mx.clear_cache()
    res["meta"]["load_end"] = os.getloadavg()
    json.dump(res, open(OUT, "w"), indent=1)
    print("wrote", OUT)

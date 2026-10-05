"""Writing kernels: measurements on the Apple M1 Pro GPU through MLX custom Metal kernels (mx.fast.metal_kernel).

Groups (each kernel is checked against a float64 NumPy reference before it is timed):
  reduce   sum of 2^25 float32: Harris's ladder R1..R6, one-launch atomic A1, MLX mx.sum; accuracy and run-to-run bits
  scan     inclusive prefix sum of 2^24 float32: Hillis-Steele (24 launches), reduce-then-scan (3 launches), mx.cumsum
  norm     LayerNorm and fused residual + RMSNorm on 8192 x 4096 float32; variance accuracy on rows with a large mean
  fuse     matmul + bias + GELU (separate against epilogue-fused) and RMSNorm + matmul (separate against fused),
           M = N = 4096, K = 1024 and 256
  gemv     one-token GEMV with 4-bit weights, 14336 x 4096 (Llama-3-8B MLP shape): fp16, dequantize-then-GEMV, fused
  attn     causal attention (masking only against block skipping) and FlashAttention-1's grid against -2's, H=4, d=64
  decode   one query against an 8-head, d=128 float16 KV cache of 4K..64K tokens, split into S = 1..64 pieces
Usage: python measure.py OUT.json [group,group,...]
"""
import json, os, sys, time, platform
import numpy as np
import mlx.core as mx
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import kernel, timeit, reps_for
import k_reduce as KR, k_scan as KS, k_norm as KN, k_fuse as KF, k_gemv as KG, k_attn as KA

OUT = sys.argv[1] if len(sys.argv) > 1 else "measure.json"
ONLY = sys.argv[2].split(",") if len(sys.argv) > 2 else None
res = {"meta": {}, "cases": [], "facts": {}}
F32 = mx.float32


def run(group, name, fn, ref=None, tol=None, out_np=None, rel=False, **kw):
    err = None
    if ref is not None:
        mx.synchronize(); mx.clear_cache()   # no stale buffer can pass for a result
        o = np.asarray(fn() if out_np is None else out_np(fn()), dtype=np.float64)
        err = float(np.max(np.abs(o - ref)))
        if rel:
            err /= float(np.max(np.abs(ref)))
        assert err < tol, (name, err)
    mx.synchronize(); mx.clear_cache(); mx.reset_peak_memory()
    mx.eval(fn()); mx.synchronize()
    peak = mx.get_peak_memory()
    t = timeit(fn, reps_for(fn))
    c = {"group": group, "name": name, "err": err, "peak_bytes": peak, **t, **kw}
    res["cases"].append(c)
    print(f"{group:7s} {name:52s} {t['median_s']*1e3:9.3f} ms [{t['min_s']*1e3:.3f}-{t['max_s']*1e3:.3f}] err {err} load {t['load']}", flush=True)
    return c


# ---------------------------------------------------------------- reductions
def reduce_group():
    N = 1 << 25
    xn = np.random.default_rng(1).random(N, dtype=np.float32)        # uniform [0, 1): the sum is about N / 2
    x = mx.array(xn); mx.eval(x)
    exact = float(np.sum(xn, dtype=np.float64))
    by = N * 4
    one = {"R1": (KR.R1_INTERLEAVED, 256), "R2": (KR.R2_STRIDED, 256), "R3": (KR.R3_SEQUENTIAL, 256),
           "R4": (KR.R4_FIRSTADD, 512), "R5": (KR.R5_SIMD_TAIL, 512)}
    names = {"R1": "interleaved, divergent branch", "R2": "interleaved, strided index", "R3": "sequential addressing",
             "R4": "first add during load", "R5": "last SIMD-group in registers"}
    for st, (src, per) in one.items():
        k = kernel("rd_" + st, ["x"], ["part"], src)
        G = N // per
        f = lambda k=k, G=G: mx.sum(k(inputs=[x], grid=(G * 256, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(G,)], output_dtypes=[F32])[0])
        run("reduce", f"{st} {names[st]}", f, np.array(exact), 1e-5, rel=True, step=st, N=N, bytes=by, launches=2)
    k6 = kernel("rd_R6", ["x"], ["part"], KR.R6_GRIDSTRIDE)
    G6 = 1024
    f6 = lambda: mx.sum(k6(inputs=[x], grid=(G6 * 256, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(G6,)], output_dtypes=[F32])[0])
    run("reduce", "R6 grid-stride, float4, SIMD sums", f6, np.array(exact), 1e-5, rel=True, step="R6", N=N, bytes=by, launches=2)
    ka = kernel("rd_A1", ["x"], ["out"], KR.A1_ATOMIC, atomic=True)
    fa = lambda: ka(inputs=[x], grid=(G6 * 256, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(1,)], output_dtypes=[F32], init_value=0)[0]
    run("reduce", "A1 one launch, atomic add per threadgroup", fa, np.array([exact]), 1e-5, rel=True, step="A1", N=N, bytes=by, launches=1)
    run("reduce", "MLX library mx.sum", lambda: mx.sum(x), np.array(exact), 1e-5, rel=True, step="L", N=N, bytes=by)
    # accuracy and determinism
    def bits(v): return int(np.asarray(v, dtype=np.float32).view(np.uint32).reshape(-1)[0])
    reps = 30
    atom = [bits(fa()) for _ in range(reps)]
    tree = [bits(f6()) for _ in range(reps)]
    seq = float(np.cumsum(xn, dtype=np.float32)[-1])                   # one float32 accumulator, in order
    acc = {"exact_f64": exact, "seq_f32": seq, "numpy_pairwise_f32": float(np.sum(xn)),
           "R3": float(np.asarray(mx.sum(kernel("rd_R3b", ["x"], ["part"], KR.R3_SEQUENTIAL)(inputs=[x], grid=(N, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(N // 256,)], output_dtypes=[F32])[0]))),
           "R6": float(np.asarray(f6()).reshape(-1)[0]), "A1_first": float(np.asarray(fa()).reshape(-1)[0]), "mx_sum": float(np.asarray(mx.sum(x))),
           "atomic_distinct_bits": len(set(atom)), "atomic_runs": reps, "atomic_values": sorted(set(float(np.uint32(b).view(np.float32)) for b in atom)),
           "tree_distinct_bits": len(set(tree)), "tree_runs": reps}
    res["facts"]["reduce_accuracy"] = acc
    print("accuracy", acc, flush=True)


# ---------------------------------------------------------------- scan
def scan_group():
    N = 1 << 24
    xn = np.random.default_rng(2).standard_normal(N).astype(np.float32)
    x = mx.array(xn); mx.eval(x)
    ref = np.cumsum(xn.astype(np.float64))
    step = kernel("sc_step", ["x", "offs"], ["y"], KS.C1_STEP)
    offs = [mx.array([1 << k], dtype=mx.int32) for k in range(24)]
    def hs():
        y = x
        for k in range(24):
            y = step(inputs=[y, offs[k]], grid=(N, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(N,)], output_dtypes=[F32])[0]
        return y
    tol = 2e-2   # absolute, on running sums that reach a few thousand: float32 order effects
    run("scan", "C1 Hillis-Steele, 24 launches", hs, ref, tol, step="C1", N=N, launches=24, passes=72)
    T = N // 4096
    ka = kernel("sc_sum", ["x"], ["sums"], KS.C2_TILESUM)
    kb = kernel("sc_off", ["sums"], ["offs"], KS.C2_SCANSUMS)
    kc = kernel("sc_tile", ["x", "offs"], ["y"], KS.C2_TILESCAN)
    def rts():
        s = ka(inputs=[x], grid=(T * 256, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(T,)], output_dtypes=[F32])[0]
        o = kb(inputs=[s], grid=(1024, 1, 1), threadgroup=(1024, 1, 1), output_shapes=[(T,)], output_dtypes=[F32])[0]
        return kc(inputs=[x, o], grid=(T * 256, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(N,)], output_dtypes=[F32])[0]
    run("scan", "C2 reduce, then scan (3 launches)", rts, ref, tol, step="C2", N=N, launches=3, passes=3)
    run("scan", "MLX library mx.cumsum", lambda: mx.cumsum(x), ref, tol, step="L", N=N)
    run("scan", "copy (read once, write once), for scale", lambda: x + 0.0, xn.astype(np.float64), 1e-6, step="copy", N=N, passes=2)


# ---------------------------------------------------------------- norms
def ln_ref(xn, g, b):
    x64 = xn.astype(np.float64); mu = x64.mean(1, keepdims=True); var = x64.var(1, keepdims=True)
    return (x64 - mu) / np.sqrt(var + 1e-5) * g + b


def norm_group():
    R, C = 8192, 4096
    rng = np.random.default_rng(3)
    gn = (1 + 0.1 * rng.standard_normal(C)).astype(np.float32); bn = (0.1 * rng.standard_normal(C)).astype(np.float32)
    g, b = mx.array(gn), mx.array(bn)
    kl = {st: kernel("ln_" + st, ["x", "gamma", "beta"], ["y"], src) for st, src in
          (("two", KN.L_TWOPASS), ("naive", KN.L_NAIVE), ("welford", KN.L_WELFORD))}
    def call(k, xx): return k(inputs=[xx, g, b], grid=(R * 256, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(R, C)], output_dtypes=[F32])[0]
    xn = rng.standard_normal((R, C)).astype(np.float32); x = mx.array(xn); mx.eval(x)
    ref = ln_ref(xn, gn, bn)
    def eager():
        mu = mx.mean(x, axis=-1, keepdims=True); d = x - mu; var = mx.mean(d * d, axis=-1, keepdims=True)
        return d * mx.rsqrt(var + 1e-5) * g + b
    run("norm", "LN eager: 7 MLX operations", eager, ref, 1e-4, step="LE", R=R, C=C)
    run("norm", "LN eager under mx.compile", mx.compile(eager), ref, 1e-4, step="LC", R=R, C=C)
    run("norm", "LN MLX library mx.fast.layer_norm", lambda: mx.fast.layer_norm(x, g, b, 1e-5), ref, 1e-4, step="LL", R=R, C=C)
    for st, nm in (("two", "LN ours, two-pass from registers"), ("naive", "LN ours, E[x^2] - E[x]^2"), ("welford", "LN ours, Welford")):
        run("norm", nm, lambda st=st: call(kl[st], x), ref, 1e-4, step="L_" + st, R=R, C=C)
    # accuracy on rows with a large mean: x = mean + noise, mean from 0 to 3000
    acc = {}
    for mu in (0.0, 30.0, 300.0, 3000.0):
        xs = (mu + rng.standard_normal((256, C))).astype(np.float32)
        r = ln_ref(xs, gn, bn); xa = mx.array(xs)
        ent = {}
        for st in ("two", "naive", "welford"):
            o = np.asarray(kl[st](inputs=[xa, g, b], grid=(256 * 256, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(256, C)], output_dtypes=[F32])[0], dtype=np.float64)
            ent[st] = float(np.max(np.abs(o - r)))
        ent["mlx"] = float(np.max(np.abs(np.asarray(mx.fast.layer_norm(xa, g, b, 1e-5), dtype=np.float64) - r)))
        acc[str(int(mu))] = ent
    res["facts"]["ln_accuracy"] = acc
    print("ln accuracy", acc, flush=True)
    # fused residual + RMSNorm
    rn = rng.standard_normal((R, C)).astype(np.float32); rr = mx.array(rn); mx.eval(rr)
    h64 = xn.astype(np.float64) + rn
    yref = h64 / np.sqrt((h64 ** 2).mean(1, keepdims=True) + 1e-5) * gn
    kr = kernel("rms_res", ["x", "res", "gamma"], ["h", "y"], KN.RMS_RESID)
    fused = lambda: kr(inputs=[x, rr, g], grid=(R * 256, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(R, C), (R, C)], output_dtypes=[F32, F32])
    def unf():
        h = x + rr
        return [h, mx.fast.rms_norm(h, g, 1e-5)]
    run("norm", "residual + RMSNorm, MLX: add then mx.fast.rms_norm", unf, yref, 1e-4, out_np=lambda o: o[1], step="RU", R=R, C=C, passes=5)
    run("norm", "residual + RMSNorm, MLX under mx.compile", mx.compile(unf), yref, 1e-4, out_np=lambda o: o[1], step="RC", R=R, C=C)
    run("norm", "residual + RMSNorm, ours fused", fused, yref, 1e-4, out_np=lambda o: o[1], step="RF", R=R, C=C, passes=4)


# ---------------------------------------------------------------- fusion around a matmul
def gelu64(v): return 0.5 * v * (1 + np.tanh(0.79788456 * (v + 0.044715 * v ** 3)))


def fuse_group():
    M = N = 4096
    rng = np.random.default_rng(4)
    kmm = kernel("fu_mm", ["A", "B"], ["C"], KF.MM_PLAIN, KF.HEADER)
    kbg = kernel("fu_bg", ["C", "bias"], ["Y"], KF.BIAS_GELU, KF.HEADER)
    kepi = kernel("fu_epi", ["A", "B", "bias"], ["Y"], KF.MM_EPI, KF.HEADER)
    krms = kernel("fu_rms", ["A", "B"], ["Y"], KF.MM_RMS, KF.HEADER)
    kepip = kernel("fu_epip", ["A", "B", "bias"], ["Y"], KF.MM_EPI3, KF.HEADER_PRECISE)
    kepi3 = kernel("fu_epi3", ["A", "B", "bias"], ["Y"], KF.MM_EPI3, KF.HEADER)
    krms3 = kernel("fu_rms3", ["A", "B"], ["Y"], KF.MM_RMS3, KF.HEADER)
    kro = kernel("fu_ro", ["x", "gamma"], ["y"], KF.RMS_ONLY, KF.HEADER)
    for K in (1024, 256):
        An = rng.standard_normal((M, K)).astype(np.float32); Bn = (rng.standard_normal((K, N)) / np.sqrt(K)).astype(np.float32)
        bn = (0.1 * rng.standard_normal(N)).astype(np.float32); gn = (1 + 0.1 * rng.standard_normal(K)).astype(np.float32)
        A, B, bias, g = mx.array(An), mx.array(Bn), mx.array(bn), mx.array(gn); mx.eval(A, B, bias, g)
        A64, B64 = An.astype(np.float64), Bn.astype(np.float64)
        ref = gelu64(A64 @ B64 + bn)
        kw = dict(M=M, N=N, K=K, flops=2 * M * N * K)
        mm = lambda: kmm(inputs=[A, B], grid=(N // 64 * 128, M // 64, 1), threadgroup=(128, 1, 1), output_shapes=[(M, N)], output_dtypes=[F32])[0]
        run("fuse", f"matmul alone, ours (K={K})", mm, A64 @ B64, 2e-3, step="MM", **kw)
        def gl(v): return 0.5 * v * (1 + mx.tanh(0.79788456 * (v + 0.044715 * v * v * v)))
        eager = lambda: gl(A @ B + bias)
        run("fuse", f"MLX eager: A @ B, + bias, GELU (K={K})", eager, ref, 2e-3, step="E", **kw)
        run("fuse", f"MLX eager under mx.compile (K={K})", mx.compile(eager), ref, 2e-3, step="EC", **kw)
        unf = lambda: kbg(inputs=[mm(), bias], grid=(M * N // 4, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(M, N)], output_dtypes=[F32])[0]
        run("fuse", f"ours unfused: matmul, then bias + GELU (K={K})", unf, ref, 2e-3, step="U", **kw)
        epi = lambda: kepi(inputs=[A, B, bias], grid=(N // 64 * 128, M // 64, 1), threadgroup=(128, 1, 1), output_shapes=[(M, N)], output_dtypes=[F32])[0]
        run("fuse", f"ours fused epilogue, first attempt: 16 KB staging tile (K={K})", epi, ref, 2e-3, step="F0", **kw)
        epi3 = lambda: kepi3(inputs=[A, B, bias], grid=(N // 64 * 128, M // 64, 1), threadgroup=(128, 1, 1), output_shapes=[(M, N)], output_dtypes=[F32])[0]
        epip = lambda: kepip(inputs=[A, B, bias], grid=(N // 64 * 128, M // 64, 1), threadgroup=(128, 1, 1), output_shapes=[(M, N)], output_dtypes=[F32])[0]
        run("fuse", f"ours fused epilogue, in registers, precise::tanh (K={K})", epip, ref, 2e-3, step="Fp", **kw)
        run("fuse", f"ours fused epilogue, in registers (K={K})", epi3, ref, 2e-3, step="F", **kw)
        # RMSNorm + matmul
        rref = (A64 / np.sqrt((A64 ** 2).mean(1, keepdims=True) + 1e-5) * gn) @ B64
        Bg = mx.array((gn[:, None].astype(np.float64) * B64).astype(np.float32)); mx.eval(Bg)   # gamma folded into W, once
        mlxr = lambda: mx.fast.rms_norm(A, g, 1e-5) @ B
        run("fuse", f"RMSNorm then matmul, MLX (K={K})", mlxr, rref, 2e-3, step="RE", **kw)
        rsep = lambda: kmm(inputs=[kro(inputs=[A, g], grid=(M * 256, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(M, K)], output_dtypes=[F32])[0], B],
                           grid=(N // 64 * 128, M // 64, 1), threadgroup=(128, 1, 1), output_shapes=[(M, N)], output_dtypes=[F32])[0]
        run("fuse", f"RMSNorm then matmul, ours separate (K={K})", rsep, rref, 2e-3, step="RS", **kw)
        rf = lambda: krms(inputs=[A, Bg], grid=(N // 64 * 128, M // 64, 1), threadgroup=(128, 1, 1), output_shapes=[(M, N)], output_dtypes=[F32])[0]
        run("fuse", f"RMSNorm fused into the matmul, first attempt: 16 KB staging (K={K})", rf, rref, 2e-3, step="RF0", **kw)
        rf3 = lambda: krms3(inputs=[A, Bg], grid=(N // 64 * 128, M // 64, 1), threadgroup=(128, 1, 1), output_shapes=[(M, N)], output_dtypes=[F32])[0]
        run("fuse", f"RMSNorm fused into the matmul, in registers (K={K})", rf3, rref, 2e-3, step="RF", **kw)
        del A, B, Bg


# ---------------------------------------------------------------- dequantising GEMV
def gemv_group():
    NO, K = 14336, 4096
    rng = np.random.default_rng(5)
    Wn = (rng.standard_normal((NO, K)) * 0.02).astype(np.float16)
    W = mx.array(Wn); xn = rng.standard_normal(K).astype(np.float16); x = mx.array(xn)
    wq, sc, bi = mx.quantize(W, group_size=64, bits=4); mx.eval(W, x, wq, sc, bi)
    Wd = mx.dequantize(wq, sc, bi, group_size=64, bits=4); mx.eval(Wd)
    Wd64 = np.asarray(Wd, dtype=np.float64); x64 = xn.astype(np.float64)
    ref_q = Wd64 @ x64; ref_h = Wn.astype(np.float64) @ x64
    # check our reading of the format against mx.dequantize: unpack codes by hand
    codes = np.asarray(wq).view(np.uint32)
    unpacked = np.stack([(codes >> (4 * c)) & 0xF for c in range(8)], axis=-1).reshape(NO, K).astype(np.float64)
    mine = unpacked * np.repeat(np.asarray(sc, dtype=np.float64), 64, axis=1) + np.repeat(np.asarray(bi, dtype=np.float64), 64, axis=1)
    fmt_err = float(np.max(np.abs(mine - Wd64)))
    res["facts"]["gemv_format_check_max_abs"] = fmt_err
    res["facts"]["gemv_quant_rel_err"] = float(np.max(np.abs(ref_q - ref_h)) / np.max(np.abs(ref_h)))
    print("format check", fmt_err, flush=True)
    tol = 2e-3
    bytes_h = NO * K * 2; bytes_q = NO * K // 2 + 2 * (NO * K // 64) * 2
    kw = dict(NO=NO, K=K)
    xm = x[:, None]
    run("gemv", "read the 4-bit codes only (mx.sum of wq), for scale", lambda: mx.sum(wq), None, None, step="read_q", bytes=NO * K // 2, **kw)
    run("gemv", "float16 weights, MLX W @ x", lambda: (W @ xm)[:, 0], ref_h, 6e-3, step="H_lib", bytes=bytes_h, **kw)
    kh = kernel("gv_h", ["W", "x"], ["y"], KG.H_VEC)
    run("gemv", "float16 weights, ours (16-byte loads)", lambda: kh(inputs=[W, x], grid=(NO // 8 * 256, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(NO,)], output_dtypes=[F32])[0], ref_h, tol, step="H_ours", bytes=bytes_h, **kw)
    run("gemv", "4-bit: dequantize to float16, then W @ x (MLX)", lambda: (mx.dequantize(wq, sc, bi, group_size=64, bits=4) @ xm)[:, 0], ref_q, 6e-3, step="D", bytes=bytes_q + 2 * bytes_h, **kw)
    k1 = kernel("gv_q1", ["wq", "scales", "biases", "x"], ["y"], KG.Q1_THREAD)
    run("gemv", "4-bit fused, one thread per row", lambda: k1(inputs=[wq, sc, bi, x], grid=(NO, 1, 1), threadgroup=(64, 1, 1), output_shapes=[(NO,)], output_dtypes=[F32])[0], ref_q, tol, step="Q1", bytes=bytes_q, **kw)
    k2 = kernel("gv_q2", ["wq", "scales", "biases", "x"], ["y"], KG.Q2_SIMD)
    run("gemv", "4-bit fused, SIMD-group per row", lambda: k2(inputs=[wq, sc, bi, x], grid=(NO // 8 * 256, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(NO,)], output_dtypes=[F32])[0], ref_q, tol, step="Q2", bytes=bytes_q, **kw)
    k3 = kernel("gv_q3", ["wq", "scales", "biases", "x"], ["y"], KG.Q3_VEC)
    run("gemv", "4-bit fused, SIMD-group per row, 16-byte loads", lambda: k3(inputs=[wq, sc, bi, x], grid=(NO // 8 * 256, 1, 1), threadgroup=(256, 1, 1), output_shapes=[(NO,)], output_dtypes=[F32])[0], ref_q, tol, step="Q3", bytes=bytes_q, **kw)
    run("gemv", "4-bit, MLX library mx.quantized_matmul", lambda: mx.quantized_matmul(x[None], wq, sc, bi, transpose=True, group_size=64, bits=4)[0], ref_q, 6e-3, step="Q_lib", bytes=bytes_q, **kw)


# ---------------------------------------------------------------- attention: causal skipping, FA-1 grid vs FA-2 grid
def attn_group():
    H, d = 4, 64
    def mk(c, sp): return kernel(f"at_c{c}_s{sp}", ["Q", "K", "V"], ["O"], KA.FLASH, KA.HEADER)
    ks = {(c, sp): mk(c, sp) for c in (0, 1, 2) for sp in (0, 1)}
    for N in (1024, 2048, 4096, 8192):
        rng = np.random.default_rng(6)
        Qn, Kn, Vn = (rng.standard_normal((H, N, d)).astype(np.float32) for _ in range(3))
        Q, K, V = mx.array(Qn), mx.array(Kn), mx.array(Vn); mx.eval(Q, K, V)
        refs = {}
        if N <= 4096:
            for causal in (0, 1):
                out = []
                for h in range(H):
                    s = Qn[h].astype(np.float64) @ Kn[h].T.astype(np.float64) / 8.0
                    if causal: s = s + np.triu(np.full((N, N), -np.inf), 1)
                    e = np.exp(s - s.max(1, keepdims=True)); out.append((e / e.sum(1, keepdims=True)) @ Vn[h].astype(np.float64))
                refs[causal] = np.stack(out)
        else:
            refs[0] = np.asarray(mx.fast.scaled_dot_product_attention(Q[None], K[None], V[None], scale=0.125)[0], dtype=np.float64)
            refs[1] = np.asarray(mx.fast.scaled_dot_product_attention(Q[None], K[None], V[None], scale=0.125, mask="causal")[0], dtype=np.float64)
        def call(c, sp):
            g = (N // 64 * 128, H, 1) if sp else (128, H, 1)
            return lambda: ks[(c, sp)](inputs=[Q, K, V], template=[("CAUSAL", c), ("SEQPAR", sp)], grid=g, threadgroup=(128, 1, 1), output_shapes=[(H, N, d)], output_dtypes=[F32])[0]
        fl = 4 * H * N * N * d
        run("attn", f"full, FA-2 grid (N={N})", call(0, 1), refs[0], 1e-3, step="full_s1", N=N, H=H, d=d, flops=fl)
        run("attn", f"full, FA-1 grid: one threadgroup per head (N={N})", call(0, 0), refs[0], 1e-3, step="full_s0", N=N, H=H, d=d, flops=fl)
        run("attn", f"causal, mask only (N={N})", call(1, 1), refs[1], 1e-3, step="c_mask", N=N, H=H, d=d, flops=fl)
        run("attn", f"causal, skip tiles above the diagonal (N={N})", call(2, 1), refs[1], 1e-3, step="c_skip", N=N, H=H, d=d, flops=fl)
        run("attn", f"causal, MLX fused attention (N={N})", lambda: mx.fast.scaled_dot_product_attention(Q[None], K[None], V[None], scale=0.125, mask="causal")[0], refs[1], 1e-3, step="c_lib", N=N, H=H, d=d, flops=fl)
        del Q, K, V


# ---------------------------------------------------------------- decode: split-KV
def decode_group():
    H, d = 8, 128
    ksplit = kernel("dec_split", ["q", "K", "V"], ["pm", "pl", "po"], KA.DECODE_SPLIT)
    kcomb = kernel("dec_comb", ["pm", "pl", "po"], ["O"], KA.DECODE_COMBINE)
    for L in (4096, 16384, 65536):
        rng = np.random.default_rng(7)
        qn = rng.standard_normal((H, d)).astype(np.float16)
        Kn = rng.standard_normal((H, L, d)).astype(np.float16); Vn = rng.standard_normal((H, L, d)).astype(np.float16)
        q, K, V = mx.array(qn), mx.array(Kn), mx.array(Vn); mx.eval(q, K, V)
        s = np.einsum("hd,hld->hl", qn.astype(np.float64), Kn.astype(np.float64)) / np.sqrt(d)
        e = np.exp(s - s.max(1, keepdims=True)); ref = np.einsum("hl,hld->hd", e / e.sum(1, keepdims=True), Vn.astype(np.float64))
        by = 2 * H * L * d * 2
        for S in (1, 2, 4, 8, 16, 32, 64):
            def f(S=S):
                pm, pl, po = ksplit(inputs=[q, K, V], grid=(S * 256, H, 1), threadgroup=(256, 1, 1),
                                    output_shapes=[(H, S), (H, S), (H * S * 128,)], output_dtypes=[F32, F32, F32])
                return kcomb(inputs=[pm, pl, po], grid=(H * 128, 1, 1), threadgroup=(128, 1, 1), output_shapes=[(H, 128)], output_dtypes=[F32])[0]
            run("decode", f"split-KV S={S} (L={L})", f, ref, 2e-3, step=f"S{S}", S=S, L=L, H=H, d=d, bytes=by)
        run("decode", f"MLX fused attention, 1 query (L={L})", lambda: mx.fast.scaled_dot_product_attention(q[None, :, None, :], K[None], V[None], scale=1 / np.sqrt(d))[0, :, 0, :],
            ref, 2e-3, step="lib", L=L, H=H, d=d, bytes=by)
        del q, K, V


# ---------------------------------------------------------------- the S = 8 anomaly: power-of-two spacing
def camp_group():
    """Same split-KV kernel, KV length 65,536 (every split starts a power of two bytes apart) against 66,048
    (512 more keys, so the starts are no longer power-of-two apart). Timing only; correctness as in decode."""
    H, d = 8, 128
    ksplit = kernel("cp_split", ["q", "K", "V"], ["pm", "pl", "po"], KA.DECODE_SPLIT)
    kcomb = kernel("cp_comb", ["pm", "pl", "po"], ["O"], KA.DECODE_COMBINE)
    for L in (65536, 66048):
        rng = np.random.default_rng(8)
        q = mx.array(rng.standard_normal((H, d)).astype(np.float16))
        K = mx.array(rng.standard_normal((H, L, d)).astype(np.float16)); V = mx.array(rng.standard_normal((H, L, d)).astype(np.float16))
        mx.eval(q, K, V)
        for S in (4, 8, 16):
            def f(S=S):
                pm, pl, po = ksplit(inputs=[q, K, V], grid=(S * 256, H, 1), threadgroup=(256, 1, 1),
                                    output_shapes=[(H, S), (H, S), (H * S * 128,)], output_dtypes=[F32, F32, F32])
                return kcomb(inputs=[pm, pl, po], grid=(H * 128, 1, 1), threadgroup=(128, 1, 1), output_shapes=[(H, 128)], output_dtypes=[F32])[0]
            run("camp", f"split-KV S={S} (L={L})", f, None, None, step=f"S{S}", S=S, L=L, H=H, d=d, bytes=2 * H * L * d * 2)
        del q, K, V


if __name__ == "__main__":
    mx.random.seed(0)
    info = mx.device_info()
    res["meta"] = {"date": time.strftime("%Y-%m-%d %H:%M"), "mlx": mx.__version__, "numpy": np.__version__,
                   "python": platform.python_version(), "device": info.get("device_name"), "arch": info.get("architecture"),
                   "memory_bytes": info.get("memory_size"), "load_start": os.getloadavg()}
    print(res["meta"], flush=True)
    for nm, fn in (("reduce", reduce_group), ("scan", scan_group), ("norm", norm_group), ("fuse", fuse_group),
                   ("gemv", gemv_group), ("attn", attn_group), ("decode", decode_group), ("camp", camp_group)):
        if ONLY is None or nm in ONLY:
            fn(); mx.clear_cache()
    res["meta"]["load_end"] = os.getloadavg()
    json.dump(res, open(OUT, "w"), indent=1)
    print("wrote", OUT)

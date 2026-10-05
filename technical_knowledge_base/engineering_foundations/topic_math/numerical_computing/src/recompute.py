# Recompute every worked number on the Numerical computing page, independently of the page's JavaScript.
# Writes numbers.json (read by check_page.mjs, which compares the page's live numbers and its FP emulation with these)
# and recompute.out (a readable log).
# Run from this folder: uv run --no-project --with numpy --with ml_dtypes python recompute.py
import json, math, struct
import numpy as np, ml_dtypes as md

f64, f32, f16, bf16, e4, e5 = np.float64, np.float32, np.float16, md.bfloat16, md.float8_e4m3fn, md.float8_e5m2
N = {}; LOG = []
def put(k, v, note=""):
    N[k] = v; LOG.append("%-34s %s %s" % (k, v, note))
def bits(v, dt):
    nb = md.finfo(dt).bits; u = {64: np.uint64, 32: np.uint32, 16: np.uint16, 8: np.uint8}[nb]
    return format(int(np.array([v], dtype=dt).view(u)[0]), "0%db" % nb)

# ---- 1. integers ----
put("int_13_bin", format(13, "b"))
put("int8_m13", format((-13) & 0xFF, "08b"))
put("int8_127p1", int(np.array([127], dtype=np.int8) + np.int8(1)) if False else ((127 + 1 + 128) % 256) - 128, "(wraps)")

# ---- 2. IEEE fields of the root's loss (z = (2,1,0), target sat) ----
loss = math.log(math.exp(2) + math.exp(1) + 1.0)
put("loss_exact", loss)
for name, dt in [("fp32", f32), ("bf16", bf16), ("fp16", f16), ("e4m3", e4), ("e5m2", e5), ("fp64", f64)]:
    v = np.array([loss]).astype(dt)[0]
    put("loss_%s" % name, float(v)); put("loss_%s_bits" % name, bits(v, dt))
    put("loss_%s_relerr" % name, abs(float(v) - loss) / loss)
b = N["loss_fp32_bits"]; ef = int(b[1:9], 2); mf = int(b[9:], 2)
put("loss_fp32_ef", ef); put("loss_fp32_mf", mf); put("loss_fp32_sig", 1 + mf / 2 ** 23)
put("struct_loss_fp32", struct.pack(">f", loss).hex())
put("x01_fp64_dec", "%.55f" % 0.1); put("x01_fp32_dec", "%.30f" % float(f32(0.1)))
put("x01_fp32_bits", bits(f32(0.1), f32)); put("x01_fp64_hex", struct.pack(">d", 0.1).hex())
# -2.5 in fp32: sign 1, 2.5 = 1.25 x 2^1
put("m25_fp32_bits", bits(f32(-2.5), f32))

# ---- 3. constants ----
for name, dt in [("fp64", f64), ("fp32", f32), ("fp16", f16), ("bf16", bf16), ("e4m3", e4), ("e5m2", e5)]:
    fi = md.finfo(dt)
    put("%s_max" % name, float(fi.max)); put("%s_minnorm" % name, float(fi.smallest_normal))
    put("%s_minsub" % name, float(fi.smallest_subnormal)); put("%s_eps" % name, float(fi.eps))
    put("%s_lnmax" % name, math.log(float(fi.max)))
    put("%s_digits" % name, (fi.nmant + 1) * math.log10(2))
    put("%s_binades" % name, math.log2(float(fi.max)) - math.log2(float(fi.smallest_subnormal)))
# TF32: 8-bit exponent, 10-bit mantissa (NVIDIA): range of fp32, eps 2^-10
put("tf32_max", (2 - 2 ** -10) * 2.0 ** 127); put("tf32_eps", 2.0 ** -10)

# ---- 4. rounding one-liners ----
put("fp16_1p2m11", float(f16(1) + f16(2 ** -11))); put("fp16_1p3x2m11", float(f16(1) + f16(3 * 2 ** -11)))
put("bf16_1p2m8", float(bf16(1) + bf16(2 ** -8)))
put("sum_01_02", repr(0.1 + 0.2)); put("assoc_l", repr((0.1 + 0.2) + 0.3)); put("assoc_r", repr(0.1 + (0.2 + 0.3)))
put("big_l", (1e16 + 1.0) - 1e16); put("big_r", (1e16 - 1e16) + 1.0)
put("ulp_1e16", math.ulp(1e16))
put("bf16_999", float(bf16(999.0))); put("fp16_999", float(f16(999.0)))
put("e4m3_1000", "nan" if np.isnan(float(np.array([1000.0]).astype(e4)[0])) else float(np.array([1000.0]).astype(e4)[0]))
put("e5m2_1000", float(np.array([1000.0]).astype(e5)[0]))

# ---- 5. cancellation and conditioning ----
x = 1e-8
put("canc_fp32", float((f32(1) + f32(x)) - f32(1)))
put("canc_fp64", (1.0 + x) - 1.0); put("canc_fp64_relerr", abs((1.0 + x) - 1.0 - x) / x)
xx = 1e-10
put("log1p_naive", math.log(1 + xx)); put("log1p_good", math.log1p(xx))
put("log1p_naive_relerr", abs(math.log(1 + xx) - math.log1p(xx)) / math.log1p(xx))
put("expm1_naive", math.exp(xx) - 1); put("expm1_good", math.expm1(xx))
put("expm1_naive_relerr", abs(math.exp(xx) - 1 - math.expm1(xx)) / math.expm1(xx))
# variance of 3 values near 10,000 in fp32: one-pass E[x^2]-E[x]^2 vs two-pass vs Welford
data = [10000.1, 10000.2, 10000.3]
xs = [f32(v) for v in data]
exact_var = float(np.var(np.array([float(v) for v in xs], dtype=np.float64)))
n = f32(len(xs))
s = f32(0); s2 = f32(0)
for v in xs: s = f32(s + v); s2 = f32(s2 + f32(v * v))
mean1 = f32(s / n); var1 = f32(f32(s2 / n) - f32(mean1 * mean1))
mean2 = f32(s / n); acc = f32(0)
for v in xs: d = f32(v - mean2); acc = f32(acc + f32(d * d))
var2 = f32(acc / n)
m = f32(0); M2 = f32(0); k = 0; wtrace = []
for v in xs:
    k += 1; d = f32(v - m); m = f32(m + f32(d / f32(k))); M2 = f32(M2 + f32(d * f32(v - m))); wtrace.append([float(m), float(M2)])
var3 = f32(M2 / n)
put("var_exact", exact_var); put("var_onepass", float(var1)); put("var_twopass", float(var2)); put("var_welford", float(var3))
put("var_sumsq_fp32", float(s2)); put("var_xs_fp32", [float(v) for v in xs]); put("welford_trace", wtrace)
put("ulp_3e8_fp32", float(np.spacing(f32(3e8))))
# condition numbers: kappa(x) = |x f'(x) / f(x)|
put("kappa_sub", 1.0001 / (1.0001 - 1)); put("kappa_exp1000", 1000.0); put("kappa_log", 1 / abs(math.log(1.0001)))

# ---- 6. summation: stagnation, measured table is in inputs/out_a.json ----
for name, dt in [("fp16", f16), ("bf16", bf16), ("fp32", f32)]:
    s = dt(0)
    while dt(s + dt(1)) != s: s = dt(s + dt(1))
    put("stag_%s" % name, float(s))

# Kahan step-through used in the Reading animation: fp16, 2048 then ten times 0.4
seq = [2048.0] + [0.4] * 10
xs = [f16(v) for v in seq]
s = f16(0); tr_n = []
for v in xs: s = f16(s + v); tr_n.append(float(s))
s = f16(0); c = f16(0); tr_k = []
for v in xs:
    y = f16(v - c); t = f16(s + y); c = f16(f16(t - s) - y); s = t; tr_k.append([float(y), float(t), float(c)])
put("kahan_seq_fp16", [float(v) for v in xs]); put("kahan_exact", math.fsum(float(v) for v in xs))
put("kahan_naive_trace", tr_n); put("kahan_trace", tr_k)

# ---- 7. softmax on (1000, 999, 0), cat dog sat; target sat ----
for name, dt in [("fp32", f32), ("bf16", bf16), ("fp16", f16)]:
    z = [dt(1000.0), dt(999.0), dt(0.0)]
    with np.errstate(all="ignore"):
        ez = [dt(np.exp(np.float64(v))) for v in z]          # exp correctly rounded to the format
        S = dt(dt(ez[0] + ez[1]) + ez[2]); p = [dt(e / S) for e in ez]
        mz = max(z); d = [dt(v - mz) for v in z]; ed = [dt(np.exp(np.float64(v))) for v in d]
        S2 = dt(dt(ed[0] + ed[1]) + ed[2]); p2 = [dt(e / S2) for e in ed]
        lS2 = dt(np.log(np.float64(S2))); ls = [dt(v - lS2) for v in d]
    put("sm_%s_z" % name, [float(v) for v in z])
    put("sm_%s_naive_exp" % name, [float(v) for v in ez]); put("sm_%s_naive_sum" % name, float(S))
    put("sm_%s_naive_p" % name, [float(v) for v in p])
    put("sm_%s_shift" % name, [float(v) for v in d]); put("sm_%s_exp" % name, [float(v) for v in ed])
    put("sm_%s_sum" % name, float(S2)); put("sm_%s_p" % name, [float(v) for v in p2])
    put("sm_%s_logS" % name, float(lS2)); put("sm_%s_logp" % name, [float(v) for v in ls])
    put("sm_%s_bits_p0" % name, bits(p2[0], dt)); put("sm_%s_bits_naive_p0" % name, bits(p[0], dt))
lse = 1000 + math.log1p(math.exp(-1) + math.exp(-1000))
put("lse_exact", lse); put("p_exact", [math.exp(1000 - lse), math.exp(999 - lse), math.exp(-lse)])
pp = N["p_exact"]
put("kappa_lse", (1000 * pp[0] + 999 * pp[1]) / lse)
put("old_child_lse", 1001 + math.log(math.exp(-1) + 1))   # the old page's (1000, 1001) example
# root's tiny model softmax (z = 2, 1, 0) for the "one screen" section
zz = [2.0, 1.0, 0.0]; Z = sum(math.exp(v) for v in zz)
put("root_p", [math.exp(v) / Z for v in zz]); put("root_loss", math.log(Z))

# ---- 8. stable toolbox ----
def sig(x): return 1 / (1 + math.exp(-x))
with np.errstate(all="ignore"):
    put("logsig_m100_naive_fp32", float(np.log(f32(1) / (f32(1) + np.exp(f32(100))))))
    put("logsig_m200_naive_fp32", float(np.log(f32(1) / (f32(1) + np.exp(f32(200))))))
    put("sig30_fp32", float(f32(1) / (f32(1) + np.exp(f32(-30)))))
    put("bce30_naive_fp32", float(-np.log(f32(1) - f32(1) / (f32(1) + np.exp(f32(-30))))))
put("logsig_m200_stable", min(-200.0, 0) - math.log1p(math.exp(-200)))
put("bce30_stable", max(30.0, 0) - 30.0 * 0 + math.log1p(math.exp(-30)))
put("bce30_stable_fp32", float(f32(max(30.0, 0) + math.log1p(math.exp(-30)))))
put("softplus100_naive_fp32", float(np.log(f32(1) + np.exp(f32(100)))) if True else None)
put("softplus20_gap", math.log1p(math.exp(-20)))   # what PyTorch drops when beta*x > 20
put("ulp_20_fp32", float(np.spacing(f32(20))))
# BCE with logits for the root-style example x = 2 (logit), y = 1 and y = 0
for y in (1, 0):
    put("bce_x2_y%d" % y, max(2.0, 0) - 2.0 * y + math.log1p(math.exp(-2.0)))
# LayerNorm epsilon: constant row
put("ln_eps_scale", 1 / math.sqrt(1e-5)); put("eps_1e5_fp16", float(f16(1e-5)))
put("fp16_minnorm", float(md.finfo(f16).smallest_normal)); put("fp32_eps_rms", float(md.finfo(f32).eps))

# ---- 9. mixed precision: from inputs/out_b.json ----
B = json.load(open("inputs/out_b.json"))
put("smol_params", B["fp32"]["n_params"]); put("smol_loss", B["fp32"]["loss"])
put("smol_below24", B["fp32"]["frac_below_2m24"]); put("smol_below25", B["fp32"]["frac_below_2m25"])
put("smol_below14", B["fp32"]["frac_below_2m14"]); put("smol_maxabs", B["fp32"]["max_abs"])
put("smol_median", B["fp32"]["median_abs"])
for r in B["runs16"]:
    put("run_%s_%d_zero" % (r["fmt"], r["scale"]), r["zero_where_fp32_nonzero"]); put("run_%s_%d_nonfinite" % (r["fmt"], r["scale"]), r["nonfinite"])
for lr, row in B["lost_updates"].items():
    for k, v in row.items(): put("lost_%s_%s" % (lr, k), v)
# the histogram the page's loss-scale slider uses: fraction zero / subnormal / overflow in fp16 after scaling by 2^k
h = B["fp32"]["hist"]; lo = B["fp32"]["exp_min"]; tot = sum(h)
sl = {}
for k in range(0, 25):
    # bin e holds |g| in [2^e, 2^(e+1)); after scaling, [2^(e+k), 2^(e+k+1)). fp16: zero if below 2^-25 (approximately: the bin
    # straddling 2^-25 is counted by its lower edge), subnormal if below 2^-14, overflow if at least 2^16 (65504 < 2^16).
    z = sum(c for i, c in enumerate(h) if lo + i + k < -25) / tot
    sub = sum(c for i, c in enumerate(h) if -25 <= lo + i + k < -14) / tot
    ov = sum(c for i, c in enumerate(h) if lo + i + k >= 16) / tot
    sl[k] = [z, sub, ov]
put("ls_slider", sl)
put("hist_mode_exp", lo + max(range(len(h)), key=lambda i: h[i]))

# ---- 10. order dependence (inputs/out_a.json) ----
A = json.load(open("inputs/out_a.json"))
put("tm_loop", A["tm_snippet"]["unique_plain_loop"]); put("tm_sum", A["tm_snippet"]["unique_builtin_sum"])
put("order_unique", A["order_fp32"]["unique"]); put("order_spread", A["order_fp32"]["spread"])
put("order_exact", A["order_fp32"]["exact"])
put("mps_index_add", A["mps_index_add_unique_of_20"]); put("cpu_index_add", A["cpu_index_add_unique_of_20"])
put("mps_sum", A["mps_sum_unique_of_20"])

# ---- 11. Summation lab check: same mulberry32 data as the page, uniform [0,1), seed 1 ----
def mulberry32(seed):
    a = seed & 0xFFFFFFFF
    def nxt():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF; t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return nxt
def lab(fmt, n, seed=1):
    dt = {"fp16": f16, "bf16": bf16, "fp32": f32}[fmt]; r = mulberry32(seed)
    xs = [dt(r()) for _ in range(n)]
    ex = math.fsum(float(v) for v in xs)
    s = dt(0)
    with np.errstate(all="ignore"):
        for v in xs: s = dt(s + v)
        nv = float(s)
        L = list(xs)
        while len(L) > 1:
            nx = [dt(L[i] + L[i + 1]) for i in range(0, len(L) - 1, 2)]
            if len(L) % 2: nx.append(L[-1])
            L = nx
        pw = float(L[0])
        s = dt(0); c = dt(0)
        for v in xs:
            y = dt(v - c); t = dt(s + y); c = dt(dt(t - s) - y); s = t
        kh = float(s)
        s = f32(0)
        for v in xs: s = f32(s + f32(v))
        a32 = float(s)
    return {"exact": ex, "naive": nv, "pairwise": pw, "kahan": kh, "acc32": a32, "first": float(xs[0])}
put("lab", {"%s_%d" % (f, n): lab(f, n) for f in ["fp16", "bf16", "fp32"] for n in [100, 1000, 10000]})

def _clean(v):
    if isinstance(v, float) and v != v: return None
    if isinstance(v, float) and v in (math.inf, -math.inf): return "inf" if v > 0 else "-inf"
    if isinstance(v, dict): return {k: _clean(x) for k, x in v.items()}
    if isinstance(v, list): return [_clean(x) for x in v]
    return v
json.dump(_clean(N), open("numbers.json", "w"), indent=0, allow_nan=False)
open("recompute.out", "w").write("\n".join(LOG) + "\n")
print("\n".join(l[:160] for l in LOG))

# ---- 12. test vectors for the page's FP emulator (check_page.mjs compares FP.rnd and FP.enc with these) ----
rng = np.random.default_rng(7)
xv = np.concatenate([rng.standard_normal(500) * np.exp2(rng.integers(-30, 20, 500)), rng.standard_normal(60) * 1e-40,
                     [448, 464, 465, 480, 500, 57344, 61440, 61441, 65504, 65520, 65519, 2.0 ** -24, 2.0 ** -25, 2.0 ** -25 * 1.0001,
                      1e-8, 0.1, 1000, 999, 3e38, 3.5e38, 1e-45, 7e-46, 1 + 2.0 ** -8, 1 + 2.0 ** -11, 1 + 3 * 2.0 ** -11, 256, 257, 258]])
TV = {"x": [float(v) for v in xv]}
with np.errstate(all="ignore"):
    for name, dt in [("fp32", f32), ("fp16", f16), ("bf16", bf16), ("e4m3", e4), ("e5m2", e5)]:
        y = xv.astype(dt)
        TV[name] = [None if np.isnan(float(v)) else (("inf" if v > 0 else "-inf") if np.isinf(float(v)) else float(v)) for v in y.astype(np.float64)]
        TV[name + "_bits"] = [bits(v, dt) for v in y]
json.dump(TV, open("inputs/fp_vectors.json", "w"), separators=(",", ":"))
print("test vectors", len(xv))

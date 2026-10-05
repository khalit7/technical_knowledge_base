"""Every derived number the page states, recomputed from out/data.json (out/expected.json), and written into the
page's prose: each <span data-wk="key">...</span> in parts/*.html gets the value of `key` (run with --fill).
The page's JavaScript derives the same numbers from window.WKD; check/check_js.mjs compares them with this file.
Run from src/: python3 recompute.py [--fill]"""
import json, math, os, re, sys, glob
HERE = os.path.dirname(os.path.abspath(__file__))
D = json.load(open(os.path.join(HERE, "out/data.json")))
M, P, F = D["m1"], D["pub"], D["facts"]
E = {}


def f(v, nd=2):
    s = f"{v:,.{nd}f}"
    return s


def ms(g, k): return M[g][k]["ms"]


# ---- reductions
N = 1 << 25
for k in ("R1", "R2", "R3", "R4", "R5", "R6", "A1", "L"):
    E[f"red_{k}_ms"] = f(ms("reduce", k), 2)
    E[f"red_{k}_gbs"] = f(N * 4 / (ms("reduce", k) * 1e-3) / 1e9, 0)
E["red_ladder_x"] = f(ms("reduce", "R1") / ms("reduce", "R6"), 1)
h = P["harris"]["rows"]
E["harris_x"] = f(h[0][2] / h[-1][2], 1)
E["harris_k7_pct"] = f(100 * h[-1][3] / P["harris"]["peak_gbs"], 0)
acc = F["reduce_accuracy"]
E["acc_exact"] = f(acc["exact_f64"], 2)
E["acc_seq"] = f(acc["seq_f32"], 0)
E["acc_seq_err"] = f(acc["exact_f64"] - acc["seq_f32"], 0)
E["acc_tree"] = f(acc["R6"], 0)
E["acc_tree_err"] = f(abs(acc["R6"] - acc["exact_f64"]), 2)
E["acc_atomic_distinct"] = "{} of {}".format(max(acc["atomic_distinct_per_run"]), acc["atomic_runs"])
E["acc_atomic_runs"] = ", ".join(str(x) for x in acc["atomic_distinct_per_run"])
E["acc_atomic_lo"] = f(min(acc["atomic_values_all"]), 0)
E["acc_atomic_hi"] = f(max(acc["atomic_values_all"]), 0)
E["acc_2p24"] = f(2 ** 24, 0)

# ---- scan
NS = 1 << 24
for k in ("C1", "C2", "L", "copy"):
    E[f"scan_{k}_ms"] = f(ms("scan", k), 2)
E["scan_c1_c2"] = f(ms("scan", "C1") / ms("scan", "C2"), 1)
E["scan_lib_c2"] = f(ms("scan", "L") / ms("scan", "C2"), 1)
E["scan_c2_copy"] = f(ms("scan", "C2") / ms("scan", "copy"), 2)
E["hs_adds"] = f(sum(NS - 2 ** k for k in range(24)) / 1e6, 0)
E["bl_adds"] = f(2 * (NS - 1) / 1e6, 1)

# ---- norms
for k in ("LE", "LC", "LL", "L_two", "L_naive", "L_welford", "RU", "RC", "RF"):
    E[f"norm_{k}_ms"] = f(ms("norm", k), 2)
E["ln_gbs"] = f(2 * 8192 * 4096 * 4 / (ms("norm", "L_two") * 1e-3) / 1e9, 0)
la = F["ln_accuracy"]
for mu in ("0", "30", "300", "3000"):
    for k in ("two", "naive", "welford"):
        E[f"lnacc_{k}_{mu}"] = f"{la[mu][k]:.1e}" if la[mu][k] < 1 else f(la[mu][k], 0)
E["rms_x"] = f(ms("norm", "RU") / ms("norm", "RF"), 2)

# ---- fusion around a matmul
for K in (1024, 256):
    for k in ("MM", "E", "EC", "U", "F0", "Fp", "F", "RE", "RS", "RF0", "RF"):
        E[f"fu_{k}_{K}"] = f(ms("fuse", f"{k}@{K}"), 2)
    E[f"fu_saved_{K}"] = f(ms("fuse", f"U@{K}") - ms("fuse", f"F@{K}"), 2)
    E[f"fu_over_{K}"] = f(ms("fuse", f"F@{K}") - ms("fuse", f"MM@{K}"), 2)
    E[f"fu_tf_{K}"] = f(2 * 4096 * 4096 * K / (ms("fuse", f"MM@{K}") * 1e-3) / 1e12, 2)
E["fu_bytes_mb"] = f(2 * 4096 * 4096 * 4 / 1e6, 0)

# ---- dequantising GEMV
NO, K = 14336, 4096
bh = NO * K * 2; bq = NO * K // 2 + 2 * (NO * K // 64) * 2; bcodes = NO * K // 2
E["gv_bh"] = f(bh / 1e6, 1); E["gv_bq"] = f(bq / 1e6, 1); E["gv_ratio"] = f(bh / bq, 2)
E["gv_bpw"] = f(bq / (NO * K), 4)
for k in ("read_q", "H_lib", "H_ours", "D", "Q1", "Q2", "Q3", "Q_lib"):
    E[f"gv_{k}_ms"] = f(ms("gemv", k), 2)
E["gv_Q_lib_lo"] = f(M["gemv"]["Q_lib"]["lo"], 2)
E["gv_speed"] = f(ms("gemv", "H_ours") / ms("gemv", "Q2"), 1)
# two-point fit t = t0 + bytes / bw, from reading the codes and the float16 GEMV
t1, b1, t2, b2 = ms("gemv", "read_q") * 1e-3, bcodes, ms("gemv", "H_ours") * 1e-3, bh
bw = (b2 - b1) / (t2 - t1); t0 = t1 - b1 / bw
E["gv_fit_bw"] = f(bw / 1e9, 0); E["gv_fit_t0"] = f(t0 * 1e3, 2)
E["gv_pred_q"] = f((t0 + bq / bw) * 1e3, 2)
E["gv_qerr"] = f"{F['gemv_quant_rel_err'] * 100:.1f}"

# ---- attention
for n in (1024, 2048, 4096, 8192):
    for k in ("full_s1", "full_s0", "c_mask", "c_skip", "c_lib"):
        E[f"at_{k}_{n}"] = f(ms("attn", f"{k}@{n}"), 2)
    E[f"at_grid_x_{n}"] = f(ms("attn", f"full_s0@{n}") / ms("attn", f"full_s1@{n}"), 1)
    E[f"at_skip_x_{n}"] = f(ms("attn", f"c_mask@{n}") / ms("attn", f"c_skip@{n}"), 2)
    B = n // 64
    E[f"at_skip_ideal_{n}"] = f(2 * B * B / (B * (B + 1)), 2)
    E[f"at_tf_{n}"] = f(4 * 4 * n * n * 64 / (ms("attn", f"full_s1@{n}") * 1e-3) / 1e12, 2)
E["at_tg_full"] = str(8192 // 64 * 4)

# ---- decode
for L in (4096, 16384, 65536):
    for S in (1, 2, 4, 8, 16, 32, 64):
        E[f"dec_S{S}_{L}"] = f(ms("decode", f"S{S}@{L}"), 2)
    E[f"dec_lib_{L}"] = f(ms("decode", f"lib@{L}"), 2)
    best = min((ms("decode", f"S{S}@{L}"), S) for S in (2, 4, 8, 16, 32, 64))
    E[f"dec_best_{L}"] = f(best[0], 2); E[f"dec_bestS_{L}"] = str(best[1])
    E[f"dec_x_{L}"] = f(ms("decode", f"S1@{L}") / best[0], 1)
    E[f"dec_mb_{L}"] = f(2 * 8 * L * 128 * 2 / 1e6, 0)
for L in (65536, 66048):
    for S in (4, 8, 16):
        E[f"camp_S{S}_{L}"] = f(ms("camp", f"S{S}@{L}"), 2)
E["camp_stride_mib"] = f(65536 // 8 * 128 * 2 / 2 ** 20, 0)

# ---- published arithmetic
E["fa2_ratio"] = f(P["fa2"]["a100_mm"] / P["fa2"]["a100_nonmm"], 0)
E["fa3_ratio"] = f(P["fa3"]["h100_mm"] / P["fa3"]["h100_sfu"], 0)
# per score: 4d matmul FLOPs (QK^T and PV, 2d each) and one exponential; time of exps / time of matmuls
E["fa3_exp_share"] = f(100 * (1 / P["fa3"]["h100_sfu"]) / (4 * 128 / P["fa3"]["h100_mm"]), 0)
E["boehm_k6"] = f(P["boehm"]["rows"][5][3], 1)

# ---- compiled (static SASS counts, sm_90a)
C = D["cuda"]
def cnt(fn, op, a="sm_90a"): return C[fn][a]["counts"].get(op, 0)
for fn in ("k1_naive", "k2_coalesced", "k3_smem", "k4_tile1d", "k5_tile2d", "k6_vectorized"):
    E[f"sass_{fn}_regs"] = str(C[fn]["sm_90a"]["regs"])
    E[f"sass_{fn}_ffma"] = str(cnt(fn, "FFMA"))
    E[f"sass_{fn}_lds"] = str(cnt(fn, "LDS") + cnt(fn, "LDS.128"))
    E[f"sass_{fn}_n"] = str(C[fn]["sm_90a"]["instructions"])
    lds = cnt(fn, "LDS") + cnt(fn, "LDS.128")
    E[f"sass_{fn}_ratio"] = f(cnt(fn, "FFMA") / lds, 1) if lds else "n/a"

json.dump(E, open(os.path.join(HERE, "out/expected.json"), "w"), indent=1, sort_keys=True)
print(len(E), "values in out/expected.json")

if "--fill" in sys.argv:
    miss = set()
    for p in sorted(glob.glob(os.path.join(HERE, "parts/*.html"))):
        s = open(p).read()
        def rep(m):
            k = m.group(1)
            if k not in E:
                miss.add(k); return m.group(0)
            return f'<span data-wk="{k}">{E[k]}</span>'
        t = re.sub(r'<span data-wk="([\w-]+)">[^<]*</span>', rep, s)
        if t != s:
            open(p, "w").write(t)
    if miss:
        print("MISSING keys:", sorted(miss)); sys.exit(1)
    print("filled")

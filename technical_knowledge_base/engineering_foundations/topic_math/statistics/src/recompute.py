#!/usr/bin/env python3
"""Recompute every number on the Statistics page.

Writes expected.json; check_page.mjs compares it with the numbers the page's JavaScript computes
and with the numbers written in the page's text. Simulation outputs are read from inputs/sims_*.json
(written by sims.py, seeded) and the derived counts (coverage of the 100 animated intervals, BH
decisions, closed-form bounds) are recomputed here from them.
Run from src/:  uv run --no-project --with numpy==2.5.3 --with scipy==1.18.1 python recompute.py
"""
import json, math, os
import numpy as np
from scipy import stats

HERE = os.path.dirname(os.path.abspath(__file__))
S = {k: json.load(open(os.path.join(HERE, "inputs", "sims_%s.json" % k)))
     for k in ("grid", "anim", "clt", "boot", "entropy", "dd", "conc", "peek", "cv")}
E = {}
def put(k, v, nd=4):
    E[k] = round(float(v), nd) if isinstance(v, (float, np.floating)) else v
    print(k, E[k]); return v
Phi = stats.norm.cdf; z975 = stats.norm.ppf(0.975)

# ---- the tiny model: the loss of a sampled next word ----
z = np.array([2.0, 1.0, 0.0]); p = np.exp(z) / np.exp(z).sum(); L = -np.log(p)
E["tiny_p"] = [round(v, 3) for v in p]; E["tiny_L"] = [round(v, 3) for v in L]
mu = float((p * L).sum()); var = float((p * L * L).sum() - mu * mu); sd = math.sqrt(var)
put("tiny_mu", mu, 3); put("tiny_var", var, 4); put("tiny_sd", sd, 3)
put("tiny_se30", sd / math.sqrt(30), 3); put("tiny_hw30", z975 * sd / math.sqrt(30), 3)
put("tiny_skew", float((p * (L - mu) ** 3).sum()) / sd ** 3, 2)
put("tiny_mle_var_n5", 0.8 * var, 3)

# ---- section 1: two samples of ten ----
put("s1_mean_a", (7 * L[0] + 2 * L[1] + 1 * L[2]) / 10, 3); put("s1_mean_b", (5 * L[0] + 3 * L[1] + 2 * L[2]) / 10, 3)
put("s1_se10", sd / math.sqrt(10), 3)

# ---- section 2: estimators ----
put("shrink_mse_xbar", 4 / 4, 2); put("shrink_mse_half", 0.25 + 0.25 * 1, 2)
put("shrink_c_opt", 1 / (1 + 4 / 4), 2)
for n in ("5", "10", "30", "100"):
    r = S["entropy"]["by_n"][n]
    for k in ("plugin", "mm", "mc"):
        E["ent_%s_%s" % (k, n)] = r[k]
put("ent_H", S["entropy"]["H"], 4)

# ---- section 3: sample variance ----
x = np.array([2, 4, 4, 4, 5, 5, 7, 9], float)
put("sv_mean", x.mean(), 2); put("sv_ss", ((x - x.mean()) ** 2).sum(), 1)
put("sv_mle", x.var(), 3); put("sv_unb", x.var(ddof=1), 3); put("sv_s", x.std(ddof=1), 3)
put("sv_se", x.std(ddof=1) / math.sqrt(8), 3); put("t7", stats.t.ppf(0.975, 7), 3)
put("sv_ci_lo", 5 - stats.t.ppf(0.975, 7) * x.std(ddof=1) / math.sqrt(8), 2)
put("sv_ci_hi", 5 + stats.t.ppf(0.975, 7) * x.std(ddof=1) / math.sqrt(8), 2)
put("sv_s_bias_n2_normal", math.sqrt(2 / 1) * math.gamma(1) / math.gamma(0.5), 3)  # E[s]/sigma at n = 2

# ---- section 4 and 5: CLT, SE, intervals ----
put("t4", stats.t.ppf(0.975, 4), 3); put("t29", stats.t.ppf(0.975, 29), 3); put("t9", stats.t.ppf(0.975, 9), 3)
put("se500", math.sqrt(0.25 / 500), 5); put("se2000", math.sqrt(0.25 / 2000), 5)
put("hw500_2se", 2 * math.sqrt(0.25 / 500), 4); put("hw500_196", z975 * math.sqrt(0.25 / 500), 4)
put("be_C", 0.4748, 4)
put("replication_capture", 2 * Phi(z975 / math.sqrt(2)) - 1, 3)
# the 100 animated intervals: recount coverage exactly as the page's JavaScript does
anim = {}
for key, sc in S["anim"].items():
    X = np.array(sc["x"]); n = sc["n"]
    m = X.mean(1); s = X.std(1, ddof=1)
    tc = stats.t.ppf(0.975, n - 1)
    cov_t = int(((m - tc * s / math.sqrt(n) <= sc["mu"]) & (sc["mu"] <= m + tc * s / math.sqrt(n))).sum())
    cov_z = int(((m - 1.96 * s / math.sqrt(n) <= sc["mu"]) & (sc["mu"] <= m + 1.96 * s / math.sqrt(n))).sum())
    lo_miss = int((m + tc * s / math.sqrt(n) < sc["mu"]).sum())
    anim[key] = {"cov_t": cov_t, "cov_z": cov_z, "miss_low_t": lo_miss, "tcrit": round(float(tc), 4)}
E["anim"] = anim; print("anim", anim)
g = S["grid"]["dists"]
for d, n in (("normal", 5), ("normal", 30), ("tiny", 30), ("lognormal", 5), ("lognormal", 30), ("exponential", 5), ("pareto25", 200), ("t3", 10)):
    for m_ in ("z", "t", "pct", "bca"):
        E["grid_%s_%d_%s" % (d, n, m_)] = g[d]["by_n"][str(n)][m_]["cov"]
c = S["clt"]["dists"]
E["clt_tcov"] = {d: {n: c[d]["by_n"][n].get("tcov") for n in c[d]["by_n"]} for d in c}
E["clt_skew"] = {d: {n: c[d]["by_n"][n]["skew"] for n in c[d]["by_n"]} for d in c}
put("logn_skew", (math.e + 2) * math.sqrt(math.e - 1), 2)

# ---- section 6: bootstrap ----
for key in ("tiny30", "lognormal10"):
    b = S["boot"][key]
    E["boot_" + key] = {k: b[k] for k in ("mean", "s", "boot_sd", "true_sd", "se_formula", "ci")}
    xs = np.array(b["x"]); put("boot_%s_mean_chk" % key, xs.mean(), 4)
for k in ("counts", "H_plugin", "H_boot_mean", "H_boot_bias", "H_boot_corrected"):
    E["boot_tiny30_" + k] = S["boot"]["tiny30"][k]
put("boot_distinct_n3", math.comb(5, 3), 0); put("boot_distinct_n30", math.comb(59, 30), 0)
put("boot_p_left_out", (1 - 1 / 30) ** 30, 3); put("boot_p_left_out_inf", math.exp(-1), 3)

# ---- section 7 and 8: tests ----
put("coin_one", 11 / 1024, 5); put("coin_two", 22 / 1024, 4)
put("mcn1_chi", 25 / 55, 4); put("mcn1_p", stats.chi2.sf(25 / 55, 1), 3)
put("mcn2_chi", 225 / 45, 2); put("mcn2_p", stats.chi2.sf(5.0, 1), 4)
put("mcn2_cc", 196 / 45, 3); put("mcn2_cc_p", stats.chi2.sf(196 / 45, 1), 4)
put("mcn2_exact", min(1.0, 2 * stats.binom.cdf(15, 45, 0.5)), 4)
put("chi_crit", stats.chi2.ppf(0.95, 1), 2)
put("paired_se", math.sqrt(55 - 25 / 500) / 500, 5); put("paired_hw", z975 * math.sqrt(55 - 25 / 500) / 500, 4)
put("unpaired_se", math.sqrt(2 * 0.25 / 500), 4); put("unpaired_hw196", z975 * math.sqrt(2 * 0.25 / 500), 4)
put("unpaired_hw2", 2 * math.sqrt(2 * 0.25 / 500), 4)
# power and sample size: two-sided z test, effect 0.5 sd, power 0.8
zb = stats.norm.ppf(0.8); put("z80", zb, 4)
put("n_power", ((z975 + zb) / 0.5) ** 2, 2)
put("power_n30_d05", Phi(0.5 * math.sqrt(30) - z975) + Phi(-0.5 * math.sqrt(30) - z975), 3)
# permutation: the sign-flip test on the 8 differences used on the page
dif = np.array([0.31, -0.12, 0.25, 0.40, 0.05, 0.18, -0.07, 0.22])
obs = dif.mean(); cnt = 0
for mask in range(256):
    sg = np.array([1 if (mask >> i) & 1 == 0 else -1 for i in range(8)])
    if abs((sg * dif).mean()) >= abs(obs) - 1e-12: cnt += 1
put("perm_mean", obs, 4); put("perm_count", cnt, 0); put("perm_p", cnt / 256, 4)
tt = stats.ttest_1samp(dif, 0.0); put("perm_t", tt.statistic, 3); put("perm_t_p", tt.pvalue, 4)
# multiple comparisons
put("fwer20", 1 - 0.95 ** 20, 4); put("bonf20", 0.05 / 20, 4)
pv = [0.001, 0.008, 0.012, 0.019, 0.030, 0.041, 0.045, 0.21, 0.50, 0.80]; m = len(pv)
put("mc_raw", sum(v < 0.05 for v in pv), 0); put("mc_bonf", sum(v <= 0.05 / m for v in pv), 0)
holm = 0
for k, v in enumerate(sorted(pv)):
    if v <= 0.05 / (m - k): holm += 1
    else: break
put("mc_holm", holm, 0)
bh = max([k + 1 for k, v in enumerate(sorted(pv)) if v <= (k + 1) * 0.05 / m] or [0]); put("mc_bh", bh, 0)
E["peek"] = S["peek"]["rate"]

# ---- section 10: concentration and generalisation ----
put("markov_tiny", mu / L[2], 4); put("markov_true", p[2], 3)
put("cheb_tiny_bound", 0.25, 2)
put("hoeff500", 2 * math.exp(-2 * 500 * 0.05 ** 2), 4); put("hoeff_n", math.log(2 / 0.05) / (2 * 0.05 ** 2), 1)
put("cheb500", 0.25 / (500 * 0.05 ** 2), 3); put("clt500", 2 * (1 - Phi(0.05 / math.sqrt(0.25 / 500))), 4)
ci = S["conc"]["n"].index(500); put("exact500", S["conc"]["exact"][ci], 4)
put("gen_single", math.sqrt(math.log(2 / 0.05) / (2 * 10000)), 4)
put("gen_million", math.sqrt(math.log(2 * 1e6 / 0.05) / (2 * 10000)), 4)
put("cos_sd_1024", 1 / math.sqrt(1024), 4)

# ---- section 11: bias-variance for models, ensembles, double descent ----
put("ens_rho0", 1 / 10, 2); put("ens_rho05", 0.5 + 0.5 / 10, 2)
dd = S["dd"]; P = dd["p"]
def at(kind, lam, key, pp): return dd["betas"][kind][str(lam)][key][P.index(pp)]
for kind in ("even", "decay05", "decay1"):
    th = dd["betas"][kind]["theory"]
    E["dd_%s_theory_p10" % kind] = th[P.index(10)]; E["dd_%s_theory_p100" % kind] = th[P.index(100)]
    E["dd_%s_sim_p10" % kind] = at(kind, 0.0, "mean", 10); E["dd_%s_sim_p100" % kind] = at(kind, 0.0, "mean", 100)
    E["dd_%s_sim_p40_median" % kind] = at(kind, 0.0, "median", 40)
    E["dd_%s_ridge01_p40" % kind] = at(kind, 0.1, "mean", 40)
    # worst relative gap between simulation and theory away from the threshold
    gaps = [abs(at(kind, 0.0, "mean", pp) / th[i] - 1) for i, pp in enumerate(P) if th[i] is not None and abs(pp - dd["n"]) >= 5]
    E["dd_%s_maxgap" % kind] = round(max(gaps), 4)
    E["dd_%s_sim_p40" % kind] = at(kind, 0.0, "mean", 40)
    bk = np.ones(100) if kind == "even" else np.arange(1, 101) ** -(0.5 if kind == "decay05" else 1.0); bk = bk / np.linalg.norm(bk)
    def thx(pp, nn=40, sig=0.2):
        bP = float((bk[:pp] ** 2).sum()); bR = float((bk[pp:] ** 2).sum())
        return (bR + sig ** 2) * (1 + pp / (nn - pp - 1)) if pp <= nn - 2 else bP * (1 - nn / pp) + (bR + sig ** 2) * (1 + nn / (pp - nn - 1))
    th_min_under = min((thx(pp), pp) for pp in P if pp <= dd["n"] - 2)
    th_min_over = min((thx(pp), pp) for pp in P if pp >= dd["n"] + 2)
    E["dd_%s_best_under" % kind] = [round(th_min_under[0], 6), th_min_under[1]]
    E["dd_%s_best_over" % kind] = [round(th_min_over[0], 6), th_min_over[1]]
E["dd_smin"] = {str(pp): dd["smin"][P.index(pp)] for pp in (10, 30, 38, 40, 42, 60, 100)}
# sample-wise: p = 40 features of the decaying (a = 1) signal, n from 30 to 40 data points (theory, Belkin, Hsu and Xu Theorem 1)
def th(pp, nn, beta, sig=0.2):
    bP = float((beta[:pp] ** 2).sum()); bR = float((beta[pp:] ** 2).sum())
    if pp <= nn - 2: return (bR + sig ** 2) * (1 + pp / (nn - pp - 1))
    if pp >= nn + 2: return bP * (1 - nn / pp) + (bR + sig ** 2) * (1 + nn / (pp - nn - 1))
    return None
beta = np.ones(100) / 10
put("dd_samplewise_n30", th(60, 30, beta), 3); put("dd_samplewise_n55", th(60, 55, beta), 3); put("dd_samplewise_n80", th(60, 80, beta), 3); put("dd_samplewise_n200", th(60, 200, beta), 3)

# ---- section 12: cross-validation ----
E["cv"] = S["cv"]

# ---- section 13: Bayesian ----
put("bayes_post_mean", 10 / 12, 3)
put("bayes_ci_lo", stats.beta.ppf(0.025, 10, 2), 3); put("bayes_ci_hi", stats.beta.ppf(0.975, 10, 2), 3)
put("bayes_p_gt_half", stats.beta.sf(0.5, 10, 2), 4)
ev1 = 10 * math.gamma(10) * math.gamma(2) / math.gamma(12)  # C(10,9) B(10, 2)
ev0 = 10 / 1024
put("bf_ev1", ev1, 4); put("bf_ev0", ev0, 5); put("bf10", ev1 / ev0, 2); put("bf_post_h0", 1 / (1 + ev1 / ev0), 3)

# ---- section 14: mistakes ----
put("overlap_sep", 2 * z975, 2); put("overlap_needed", z975 * math.sqrt(2), 2)
put("overlap_p", 2 * (1 - Phi(2 * z975 / math.sqrt(2))), 4)

json.dump(E, open(os.path.join(HERE, "expected.json"), "w"), indent=1)

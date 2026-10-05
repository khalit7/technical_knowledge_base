#!/usr/bin/env python3
"""Recompute every number on the Probability page (stdlib only).

Writes expected.json; check_page.mjs compares it with the numbers the page's
JavaScript computes and with the numbers written in the page's text.
Run from src/:  python3 recompute.py
"""
import json, math, os, random

E = {}
def put(k, v, nd=4):
    E[k] = round(v, nd) if isinstance(v, float) else v
    return v

ln = math.log
# ---------------- the tiny model (root page, src/read/numbers.json) ----------------
z = [2.0, 1.0, 0.0]; words = ["cat", "dog", "sat"]
ez = [math.exp(v) for v in z]; S = sum(ez); p = [v / S for v in ez]
put("tiny_sum_exp", S, 3); E["tiny_p"] = [round(v, 3) for v in p]
put("tiny_loss_sat", -ln(p[2]), 3); put("tiny_loss_cat", -ln(p[0]), 3)
put("tiny_p_cat_or_dog", p[0] + p[1], 3)
H = -sum(v * ln(v) for v in p); put("tiny_entropy", H, 3)
E["tiny_cdf"] = [round(p[0], 3), round(p[0] + p[1], 3), 1.0]
# categorical covariance diag(p) - p p^T
E["tiny_cov"] = [[round((p[i] if i == j else 0) - p[i] * p[j], 3) for j in range(3)] for i in range(3)]
E["tiny_grad_sat"] = [round(p[0], 3), round(p[1], 3), round(p[2] - 1, 3)]
E["tiny_grad_cat"] = [round(p[0] - 1, 3), round(p[1], 3), round(p[2], 3)]

# ---------------- section 1: counting ----------------
put("die_even", 3 / 6); put("die_ge5", 2 / 6, 3)

# ---------------- section 2: Bayes with base rates ----------------
base, tpr, fpr = 0.01, 0.95, 0.05
N = 10000
tox = N * base; clean = N - tox
tp_ = tox * tpr; fp_ = clean * fpr
E["bayes_counts"] = [tox, clean, tp_, fp_]
put("bayes_precision", tp_ / (tp_ + fp_), 3)
put("bayes_p_flag", (tp_ + fp_) / N, 4)
# umbrella
pr, pu_r, pu_n = 0.3, 0.8, 0.2
pu = pu_r * pr + pu_n * (1 - pr); put("umb_pu", pu, 2)
put("umb_joint", pu_r * pr, 2); put("umb_prod", pr * pu, 3)
put("umb_post", pu_r * pr / pu, 3)
cov = pu_r * pr - pr * pu; put("umb_cov", cov, 3)
put("umb_corr", cov / math.sqrt(pr * (1 - pr) * pu * (1 - pu)), 3)

# ---------------- section 3: densities ----------------
put("unif_half_density", 1 / 0.5, 1)
put("gauss_peak_sd01", 1 / math.sqrt(2 * math.pi * 0.01), 3)
Phi = lambda x: 0.5 * (1 + math.erf(x / math.sqrt(2)))
put("Phi1", Phi(1), 4); put("p_within_1sd", Phi(1) - Phi(-1), 4)
put("p_within_196", Phi(1.96) - Phi(-1.96), 4); put("p_within_2sd", Phi(2) - Phi(-2), 4)
put("p_within_3sd", Phi(3) - Phi(-3), 4)

# ---------------- section 4: expectation ----------------
put("die_mean", 3.5, 1); put("die_var", sum((k - 3.5) ** 2 for k in range(1, 7)) / 6, 3)
put("lin_exp_fixed_points", 1.0, 1)
# law of total expectation and variance (illustrative token mix)
w_easy, m_easy, v_easy, m_hard, v_hard = 0.7, 1.0, 0.5, 4.0, 2.0
put("tot_mean", w_easy * m_easy + (1 - w_easy) * m_hard, 2)
EV = w_easy * v_easy + (1 - w_easy) * v_hard
VE = w_easy * (m_easy - E["tot_mean"]) ** 2 + (1 - w_easy) * (m_hard - E["tot_mean"]) ** 2
put("tot_EV", EV, 2); put("tot_VE", VE, 2); put("tot_var", EV + VE, 2)
# zero correlation, dependent
put("x_xsq_cov", sum(x ** 3 for x in (-1, 0, 1)) / 3 - 0 * (2 / 3), 1)

# ---------------- section 6: distributions ----------------
put("binom_mean", 500 * 0.7, 1); put("binom_sd", math.sqrt(500 * 0.7 * 0.3), 2)
put("pois_p3", 2 ** 3 * math.exp(-2) / 6, 3)
# multivariate Gaussian example
s1, s2, rho = 1.0, 1.0, 0.8
L = [[s1, 0.0], [rho * s2, s2 * math.sqrt(1 - rho * rho)]]
E["chol_L"] = [[round(v, 3) for v in r] for r in L]
# eigenvalues of [[1,.8],[.8,1]]
E["mvn_eig"] = [1.8, 0.2]
put("laplace_var_b1", 2.0, 1)
a0, b0 = 2, 2
put("beta22_mean", 0.5, 2)
put("beta22_sd", math.sqrt(a0 * b0 / ((a0 + b0) ** 2 * (a0 + b0 + 1))), 3)
alpha = [2, 1, 1]; a0d = sum(alpha)
E["dir_mean"] = [round(a / a0d, 3) for a in alpha]
# exponential family: Bernoulli curvature at z=0 and z=ln 9
sig = lambda t: 1 / (1 + math.exp(-t))
put("bern_curv_z0", sig(0) * (1 - sig(0)), 3); put("bern_curv_ln9", sig(ln(9)) * (1 - sig(ln(9))), 3)

# ---------------- section 7: distribution to loss ----------------
put("bce_spam_pos", -ln(0.8), 3); put("bce_spam_neg", -ln(0.2), 3)
put("bce_ratio", ln(0.2) / ln(0.8), 1)
put("gauss_nll", 0.5 * 0.25 + 0.5 * ln(2 * math.pi), 3); put("gauss_const", 0.5 * ln(2 * math.pi), 3)
put("laplace_nll", 0.5 + ln(2), 3)
put("pois_nll", 2 - 3 * ln(2) + ln(6), 3); put("pois_model_part", 2 - 3 * ln(2), 3)
# learned variance: at residual 0.5, best sigma^2 = 0.25
r = 0.5
put("gnll_var1", 0.5 * (ln(1.0) + r * r / 1.0), 4); put("gnll_var025", 0.5 * (ln(0.25) + r * r / 0.25), 4)
# proper scoring: q = 0.7
q = 0.7
logS = lambda rr: -(q * ln(rr) + (1 - q) * ln(1 - rr))
brier = lambda rr: q * (1 - rr) ** 2 + (1 - q) * rr ** 2
absS = lambda rr: q * (1 - rr) + (1 - q) * rr
put("ps_log_07", logS(0.7), 3); put("ps_log_09", logS(0.9), 3); put("ps_log_05", logS(0.5), 3)
put("ps_brier_07", brier(0.7), 3); put("ps_brier_09", brier(0.9), 3)
put("ps_abs_07", absS(0.7), 2); put("ps_abs_10", absS(1.0), 2)

# ---------------- section 8: MLE ----------------
data = [2, 4, 4, 4, 5, 5, 7, 9]
m = sum(data) / len(data); put("mle_mean", m, 1)
put("mle_var", sum((x - m) ** 2 for x in data) / len(data), 3)
put("unb_var", sum((x - m) ** 2 for x in data) / (len(data) - 1), 3)
put("lik_p3_integral", 0.25, 2)
# ---------------- section 9: MAP ----------------
xs, ys = [1, 2, 3], [2, 3, 7]
sxy = sum(a * b for a, b in zip(xs, ys)); sxx = sum(a * a for a in xs)
put("ridge_mle", sxy / sxx, 3); put("ridge_map", sxy / (sxx + 1), 3)
put("map_coin", (2 + 3 - 1) / (2 + 2 + 3 - 2), 2)
put("map_logit_coin", 5 / 7, 3)
# Dirichlet smoothing of bigram counts
cnt = [3, 1, 0]
E["bigram_mle"] = [round(c / sum(cnt), 3) for c in cnt]
E["bigram_add1"] = [round((c + 1) / (sum(cnt) + 3), 3) for c in cnt]

# ---------------- section 10: Beta-Bernoulli coin ----------------
flips = "HHHTHHTHTHHT"
E["coin_flips"] = flips

def beta_cdf(x, a, b, n=4000):
    # Simpson on [0, x] of the Beta density (same rule as the page's JS)
    if x <= 0: return 0.0
    if x >= 1: return 1.0
    lB = math.lgamma(a) + math.lgamma(b) - math.lgamma(a + b)
    f = lambda t: math.exp((a - 1) * ln(t) + (b - 1) * ln(1 - t) - lB) if 0 < t < 1 else (0.0 if (t <= 0 and a > 1) or (t >= 1 and b > 1) else 1.0 / math.exp(lB))
    h = x / n; s = f(0) + f(x)
    for i in range(1, n): s += (4 if i % 2 else 2) * f(i * h)
    return s * h / 3

def beta_q(qq, a, b):
    lo, hi = 0.0, 1.0
    for _ in range(50):
        mid = (lo + hi) / 2
        if beta_cdf(mid, a, b) < qq: lo = mid
        else: hi = mid
    return (lo + hi) / 2

steps = []; h = t = 0; cum_b = 0.0; cum_m = 0.0
for i in range(len(flips) + 1):
    a, b = 2 + h, 2 + t; n = h + t
    row = {"n": n, "h": h, "t": t, "a": a, "b": b,
           "mle": None if n == 0 else round(h / n, 3),
           "map": round((a - 1) / (a + b - 2), 3), "mean": round(a / (a + b), 3),
           "lo": round(beta_q(0.025, a, b), 3), "hi": round(beta_q(0.975, a, b), 3),
           "cum_bayes": round(cum_b, 3), "cum_mle": (None if math.isinf(cum_m) else round(cum_m, 3))}
    steps.append(row)
    if i < len(flips):
        pb = a / (a + b); pm = 0.5 if n == 0 else h / n
        if flips[i] == "H":
            cum_b += -ln(pb); cum_m += (math.inf if pm == 0 else -ln(pm)); h += 1
        else:
            cum_b += -ln(1 - pb); cum_m += (math.inf if pm == 1 else -ln(1 - pm)); t += 1
E["coin_steps"] = steps
put("coin3_post_sd", math.sqrt(5 * 2 / (49 * 8)), 3)
put("coin3_tails_bayes", -ln(2 / 7), 3)
# evidence: sum of sequential log losses equals -ln of the marginal likelihood
lBf = lambda a, b: math.lgamma(a) + math.lgamma(b) - math.lgamma(a + b)
put("coin_neg_log_evidence", -(lBf(2 + 8, 2 + 4) - lBf(2, 2)), 3)
put("rule_succession_3of3", (3 + 1) / (3 + 2), 1)

# ---------------- section 11: sampling ----------------
put("exp_invcdf_u05_l2", -ln(1 - 0.5) / 2, 3)
us = [0.2, 0.9, 0.5]; g = [-ln(-ln(u)) for u in us]
E["gumbel_g"] = [round(v, 3) for v in g]; E["gumbel_zg"] = [round(a + b, 3) for a, b in zip(z, g)]
E["exp_race_E"] = [round(-ln(u), 3) for u in us]
def topp(pp, thr):
    idx = sorted(range(len(pp)), key=lambda i: -pp[i]); keep = []; c = 0
    for i in idx:
        keep.append(i); c += pp[i]
        if c >= thr: break
    s = sum(pp[i] for i in keep)
    return [round(pp[i] / s, 3) if i in keep else 0 for i in range(len(pp))]
E["topp09"] = topp(p, 0.9)
for T in (0.5, 2.0):
    e = [math.exp(v / T) for v in z]; s = sum(e); E["temp_%g" % T] = [round(v / s, 3) for v in e]
# p^(1/T) equivalence
e = [v ** 2 for v in p]; s = sum(e); E["pow2"] = [round(v / s, 3) for v in e]

# ---------------- section 12: Monte Carlo ----------------
f = [-ln(v) for v in p]
mf = sum(a * b for a, b in zip(p, f)); vf = sum(a * (b - mf) ** 2 for a, b in zip(p, f))
put("mc_entropy_sd", math.sqrt(vf), 3); put("mc_entropy_se100", math.sqrt(vf / 100), 3)
put("mc_entropy_se10000", math.sqrt(vf / 10000), 4)
# importance sampling with q uniform: weights 3 p_i
E["is_weights"] = [round(3 * v, 3) for v in p]
# ---------------- section 13: reparameterisation ----------------
# J(mu) = E[x^2], x ~ N(mu, 1); at mu = 1. pathwise 2(mu+eps): var 4. score x^2 (x - mu): var 30.
put("rep_grad", 2.0, 1); put("rep_var_path", 4.0, 1); put("rep_var_score", 30.0, 1)
# score with baseline b = E[x^2] = mu^2 + 1 = 2: (x^2 - 2) eps with x = 1 + eps -> (2 eps + eps^2 - 1) eps
# E[(2e^2 + e^3 - e)^2] = 4*3 + 15 + 1 + 2*(2*0... ) computed by simulation below and exactly:
# (2e^2 + e^3 - e)^2 = 4e^4 + e^6 + e^2 + 4e^5 - 4e^3 - 2e^4 -> 4*3 + 15 + 1 - 2*3 = 22; mean 2 -> var 18
put("rep_var_score_baseline", 18.0, 1)
rng = random.Random(1)
n = 200000; sp = ss = sb = 0.0; sp2 = ss2 = sb2 = 0.0
for _ in range(n):
    e = rng.gauss(0, 1); x = 1 + e
    a = 2 * x; b = x * x * e; c = (x * x - 2) * e
    sp += a; sp2 += a * a; ss += b; ss2 += b * b; sb += c; sb2 += c * c
put("rep_sim_var_path", sp2 / n - (sp / n) ** 2, 2); put("rep_sim_var_score", ss2 / n - (ss / n) ** 2, 1)
put("rep_sim_var_base", sb2 / n - (sb / n) ** 2, 1)

# ---------------- handoff to statistics (numbers in handoff_statistics.md) ----------------
put("h_unpaired_196", 1.96 * math.sqrt(2 * 0.25 / 500), 3)
put("h_mcnemar_exact", 2 * sum(math.comb(45, i) for i in range(16)) / 2 ** 45, 3)

# ---------------- calibration (real models, from inputs/calibration.json) ----------------
here = os.path.dirname(os.path.abspath(__file__))
cp = os.path.join(here, "inputs", "calibration.json")
if os.path.exists(cp):
    C = json.load(open(cp)); E["calib"] = {}
    for mk, M in C["models"].items():
        out = {}
        for T, d in M["per_T"].items():
            n = sum(b[0] for b in d["bins"])
            ece = sum(abs(b[1] - b[2]) for b in d["bins"]) / n
            out[T] = {"ece": round(ece, 4), "nll": round(d["nll"], 4)}
        bestT = min(M["per_T"], key=lambda T: M["per_T"][T]["nll"])
        E["calib"][mk] = {"T1": out["1.0"], "bestT": bestT, "best": out[bestT],
                          "acc": round(M["top1_acc"], 4), "tokens": M["tokens"]}

# ---------------- extra Reading numbers ----------------
put("br_fpr05", 0.95 * 0.01 / (0.95 * 0.01 + 0.005 * 0.99), 3)
put("br_base20", 0.95 * 0.2 / (0.95 * 0.2 + 0.05 * 0.8), 3)
E["exp_race_ratio"] = [round(pp / (-ln(u)), 3) for pp, u in zip(p, us)]
# ---------------- Distribution explorer defaults ----------------
lg = math.lgamma
def lchoose(n, k): return lg(n + 1) - lg(k + 1) - lg(n - k + 1)
zb = ln(0.7 / 0.3)
E["dx"] = {
 "bern": {"mean": 0.8, "var": 0.16, "loss": round(-ln(0.8), 3), "grad": round(0.8 - 1, 3)},
 "cat": {"mean": [round(v, 3) for v in p], "loss": round(-ln(p[2]), 3), "grad": round(p[2] - 1, 3)},
 "binom": {"mean": 7.0, "var": 2.1, "loss": round(10 * ln(1 + math.exp(zb)) - 7 * zb - lchoose(10, 7), 3), "grad": round(10 * 0.7 - 7, 3)},
 "pois": {"mean": 2.0, "var": 2.0, "loss": round(2 - 3 * ln(2) + ln(6), 3), "grad": -1.0},
 "gauss": {"mean": 2.5, "var": 1.0, "loss": round(0.125 + 0.5 * ln(2 * math.pi), 3), "grad": -0.5},
 "lap": {"mean": 2.5, "var": 2.0, "loss": round(0.5 + ln(2), 3), "grad": -1.0},
 "expo": {"mean": 0.5, "var": 0.25, "loss": round(-ln(2) + 2 * 0.5, 3), "grad": 0.0},
 "beta": {"mean": 0.5, "var": 0.05, "loss": round(-ln(0.7) - ln(0.3) + (lg(2) + lg(2) - lg(4)), 3)},
 "dir": {"mean": [0.5, 0.25, 0.25]},
}
E["dx"]["binom"]["loss_check_pmf"] = round(-(lchoose(10, 7) + 7 * ln(0.7) + 3 * ln(0.3)), 3)

json.dump(E, open(os.path.join(here, "expected.json"), "w"), indent=1)
print(json.dumps({k: v for k, v in E.items() if k not in ("coin_steps",)}, indent=0)[:6000])

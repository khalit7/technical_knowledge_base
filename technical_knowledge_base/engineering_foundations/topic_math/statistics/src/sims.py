#!/usr/bin/env python3
"""Simulations behind the Statistics page. Writes inputs/sims_<part>.json (seeded, reproducible).

Run from src/ (outside the repo's uv project):
  uv run --no-project --with numpy==2.5.3 --with scipy==1.18.1 python sims.py [part ...]
Parts: grid anim clt boot dd conc peek cv entropy (default: all). Each part rewrites only its own key.
"""
import json, math, os, sys, time
import numpy as np
from scipy import stats

IN = os.path.join(os.path.dirname(os.path.abspath(__file__)), "inputs")
parts = sys.argv[1:] or ["grid", "anim", "clt", "boot", "dd", "conc", "peek", "cv", "entropy"]

# ---------------- the tiny model (root page): loss of a sampled next word ----------------
z = np.array([2.0, 1.0, 0.0]); P = np.exp(z) / np.exp(z).sum()
LOSS = -np.log(P)  # 0.408, 1.408, 2.408 nats

# ---------------- populations: name -> (sampler(rng, shape), mean, sd) ----------------
def pareto(a):
    # classical Pareto with x_m = 1: X = U^(-1/a)
    return lambda r, s: r.random(s) ** (-1.0 / a)
DIST = {
    "normal": (lambda r, s: r.standard_normal(s), 0.0, 1.0),
    "tiny": (lambda r, s: LOSS[r.choice(3, size=s, p=P)], float((P * LOSS).sum()),
             float(math.sqrt((P * LOSS ** 2).sum() - (P * LOSS).sum() ** 2))),
    "exponential": (lambda r, s: r.exponential(1.0, s), 1.0, 1.0),
    "lognormal": (lambda r, s: r.lognormal(0.0, 1.0, s), math.exp(0.5), math.sqrt((math.e - 1) * math.e)),
    "t3": (lambda r, s: r.standard_t(3, s), 0.0, math.sqrt(3.0)),
    "pareto25": (pareto(2.5), 2.5 / 1.5, math.sqrt(2.5 / (1.5 ** 2 * 0.5))),
}

def put(k, v):
    # one file per part, so parts can run in parallel: inputs/sims_<part>.json
    json.dump(v, open(os.path.join(IN, "sims_" + k + ".json"), "w"), separators=(",", ":"))

def r4(a): return [round(float(x), 4) for x in a]

# ---------------- part grid: coverage and power of four 95% intervals ----------------
def intervals(x, rng, B):
    """x: (R, n). Returns dict method -> (lo, hi) arrays for z, t, percentile and BCa bootstrap."""
    R, n = x.shape
    m = x.mean(1); s = x.std(1, ddof=1); se = s / math.sqrt(n)
    zc = stats.norm.ppf(0.975); tc = stats.t.ppf(0.975, n - 1)
    out = {"z": (m - zc * se, m + zc * se), "t": (m - tc * se, m + tc * se)}
    plo = np.empty(R); phi = np.empty(R); blo = np.empty(R); bhi = np.empty(R)
    CH = max(1, int(2e7 // (B * n)))
    for a in range(0, R, CH):
        xb = x[a:a + CH]; k = xb.shape[0]
        idx = rng.integers(0, n, size=(k, B, n))
        bm = np.take_along_axis(xb[:, None, :].repeat(B, 1), idx, 2).mean(2)  # (k, B)
        bm.sort(1)
        plo[a:a + k] = np.quantile(bm, 0.025, axis=1); phi[a:a + k] = np.quantile(bm, 0.975, axis=1)
        th = m[a:a + k, None]
        frac = ((bm < th).sum(1) + 0.5 * (bm == th).sum(1)) / B
        frac = np.clip(frac, 0.5 / B, 1 - 0.5 / B)
        z0 = stats.norm.ppf(frac)
        jk = (n * m[a:a + k, None] - xb) / (n - 1)  # jackknife means, closed form for the mean
        d = jk.mean(1, keepdims=True) - jk
        den = 6.0 * (d ** 2).sum(1) ** 1.5
        acc = np.where(den > 0, (d ** 3).sum(1) / np.where(den > 0, den, 1), 0.0)
        for q, dst in ((0.025, blo), (0.975, bhi)):
            zq = stats.norm.ppf(q)
            al = stats.norm.cdf(z0 + (z0 + zq) / (1 - acc * (z0 + zq)))
            al = np.nan_to_num(al, nan=q)
            dst[a:a + k] = [np.quantile(bm[i], al[i]) for i in range(k)]
    out["pct"] = (plo, phi); out["bca"] = (blo, bhi)
    return out

H_GRID = [round(h, 2) for h in np.arange(-1.0, 1.0001, 0.1)]
if "grid" in parts:
    t0 = time.time(); R, B = 5000, 999
    rng = np.random.default_rng(20261005)
    g = {"R": R, "B": B, "n": [5, 10, 20, 30, 50, 100, 200], "h": H_GRID, "dists": {}}
    for name, (smp, mu, sd) in DIST.items():
        g["dists"][name] = {"mean": round(mu, 4), "sd": round(sd, 4), "by_n": {}}
        for n in g["n"]:
            x = smp(rng, (R, n))
            iv = intervals(x, rng, B)
            cell = {}
            for meth, (lo, hi) in iv.items():
                cov = float(((lo <= mu) & (mu <= hi)).mean())
                below = float((hi < mu).mean()); above = float((lo > mu).mean())
                # operating characteristic: fraction of intervals that contain mu + h*sd
                oc = [float(((lo <= mu + h * sd) & (mu + h * sd <= hi)).mean()) for h in H_GRID]
                cell[meth] = {"cov": round(cov, 4), "miss_lo": round(below, 4), "miss_hi": round(above, 4),
                              "width": round(float((hi - lo).mean()) / sd, 4), "oc": r4(oc)}
            g["dists"][name]["by_n"][str(n)] = cell
            print(name, n, {k: v["cov"] for k, v in cell.items()}, round(time.time() - t0, 1), flush=True)
    put("grid", g)

# ---------------- part anim: 100 repetitions of one experiment, three scenarios ----------------
if "anim" in parts:
    rng = np.random.default_rng(30)
    sc = {}
    for key, (smp, mu, n) in {
        "normal30": (lambda r, s: 0.832 + 0.651 * r.standard_normal(s), 0.832, 30),
        "tiny30": (DIST["tiny"][0], DIST["tiny"][1], 30),
        "lognormal5": (DIST["lognormal"][0], DIST["lognormal"][1], 5),
    }.items():
        x = np.round(smp(rng, (100, n)), 3)
        sc[key] = {"mu": round(mu, 4), "n": n, "x": [[float(v) for v in row] for row in x]}
    put("anim", sc)

# ---------------- part clt: the sampling distribution of the mean ----------------
if "clt" in parts:
    rng = np.random.default_rng(7)
    R = 20000
    cd = {"R": R, "n": [1, 2, 5, 30, 100, 1000], "dists": {}}
    sp = dict(DIST); sp["pareto15"] = (pareto(1.5), 3.0, float("inf"))
    for name in ["tiny", "exponential", "lognormal", "pareto15"]:
        smp, mu, sd = sp[name]
        cd["dists"][name] = {"mean": round(mu, 4), "sd": None if math.isinf(sd) else round(sd, 4), "by_n": {}}
        for n in cd["n"]:
            x = np.empty((R, n))
            for a in range(0, R, 2000): x[a:a + 2000] = smp(rng, (2000, n))
            m = x.mean(1)
            lo, hi = np.quantile(m, [0.005, 0.995])
            if name == "tiny" and n == 1: lo, hi = 0.0, 2.8
            cnt, edges = np.histogram(np.clip(m, lo, hi), bins=40, range=(lo, hi))
            cell = {"lo": round(float(lo), 4), "hi": round(float(hi), 4), "cnt": [int(c) for c in cnt],
                    "skew": round(float(stats.skew(m)), 3), "median": round(float(np.median(m)), 4)}
            if not math.isinf(sd):
                se = sd / math.sqrt(n)
                cell["within196"] = round(float((np.abs(m - mu) <= 1.96 * se).mean()), 4)
            if n >= 2:
                s = x.std(1, ddof=1); tc = stats.t.ppf(0.975, n - 1)
                cell["tcov"] = round(float((np.abs(m - mu) <= tc * s / math.sqrt(n)).mean()), 4)
            cd["dists"][name]["by_n"][str(n)] = cell
            print("clt", name, n, cell.get("within196"), cell.get("tcov"), cell["skew"], flush=True)
    put("clt", cd)

# ---------------- part boot: one sample, its bootstrap, and the truth it imitates ----------------
def plugin_H(counts, axis=-1):
    n = counts.sum(axis, keepdims=True); q = counts / n
    with np.errstate(divide="ignore", invalid="ignore"):
        t = np.where(q > 0, -q * np.log(np.where(q > 0, q, 1)), 0.0)
    return t.sum(axis)

if "boot" in parts:
    rng = np.random.default_rng(11)
    B, R = 4000, 20000
    bo = {"B": B, "R": R}
    for key, dname, n in (("tiny30", "tiny", 30), ("lognormal10", "lognormal", 10)):
        smp, mu, sd = DIST[dname]
        x = np.round(smp(rng, (1, n)), 3)
        m = float(x.mean()); s = float(x.std(ddof=1))
        idx = rng.integers(0, n, size=(B, n)); bm = np.sort(x[0][idx].mean(1))
        truth = np.empty(R)
        for a in range(0, R, 2000): truth[a:a + 2000] = smp(rng, (2000, n)).mean(1)
        lo = float(min(bm.min(), np.quantile(truth, 0.001))); hi = float(max(bm.max(), np.quantile(truth, 0.999)))
        hb, _ = np.histogram(bm, bins=40, range=(lo, hi)); ht, _ = np.histogram(np.clip(truth, lo, hi), bins=40, range=(lo, hi))
        iv = intervals(x, np.random.default_rng(12), 999)
        tc = stats.t.ppf(0.975, n - 1)
        bo[key] = {"x": [float(v) for v in x[0]], "n": n, "mu": round(mu, 4), "mean": round(m, 4), "s": round(s, 4),
                   "lo": round(lo, 4), "hi": round(hi, 4), "hist_boot": [int(c) for c in hb], "hist_true": [int(c) for c in ht],
                   "boot_sd": round(float(bm.std(ddof=1)), 4), "true_sd": round(float(truth.std(ddof=1)), 4),
                   "se_formula": round(s / math.sqrt(n), 4),
                   "ci": {"t": [round(m - tc * s / math.sqrt(n), 4), round(m + tc * s / math.sqrt(n), 4)],
                          "pct": [round(float(np.quantile(bm, 0.025)), 4), round(float(np.quantile(bm, 0.975)), 4)],
                          "bca": [round(float(iv["bca"][0][0]), 4), round(float(iv["bca"][1][0]), 4)]}}
        if dname == "tiny":
            c = np.array([int((np.isclose(x[0], round(float(L), 3))).sum()) for L in LOSS])
            Hhat = float(plugin_H(c.astype(float)))
            cb = np.stack([(idx_vals == k).sum(1) for k in range(3)], 1) if False else None
            lab = np.array([int(np.argmin(np.abs(LOSS - v))) for v in x[0]])
            cbs = np.stack([(lab[idx] == k).sum(1) for k in range(3)], 1).astype(float)
            Hb = plugin_H(cbs)
            bo[key]["counts"] = [int(v) for v in c]
            bo[key]["H_plugin"] = round(Hhat, 4); bo[key]["H_boot_mean"] = round(float(Hb.mean()), 4)
            bo[key]["H_boot_bias"] = round(float(Hb.mean() - Hhat), 4); bo[key]["H_boot_corrected"] = round(float(2 * Hhat - Hb.mean()), 4)
        print("boot", key, bo[key]["ci"], bo[key].get("H_plugin"), flush=True)
    put("boot", bo)

# ---------------- part entropy: exact bias and variance of three entropy estimators ----------------
if "entropy" in parts:
    H = float(-(P * np.log(P)).sum()); en = {"H": round(H, 4), "by_n": {}}
    for n in (5, 10, 30, 100):
        tot = {"plugin": [0, 0], "mm": [0, 0]}
        for a in range(n + 1):
            for b in range(n + 1 - a):
                c = np.array([a, b, n - a - b], float)
                pr = math.exp(math.lgamma(n + 1) - sum(math.lgamma(v + 1) for v in c) + float((c * np.log(P)).sum()))
                h = float(plugin_H(c)); k = int((c > 0).sum())
                for key, v in (("plugin", h), ("mm", h + (k - 1) / (2 * n))):
                    tot[key][0] += pr * v; tot[key][1] += pr * v * v
        row = {}
        for key, (e1, e2) in tot.items():
            var = e2 - e1 * e1
            row[key] = {"mean": round(e1, 4), "bias": round(e1 - H, 4), "var": round(var, 5), "mse": round(var + (e1 - H) ** 2, 5)}
        vf = float((P * LOSS ** 2).sum() - H ** 2)
        row["mc"] = {"mean": round(H, 4), "bias": 0.0, "var": round(vf / n, 5), "mse": round(vf / n, 5)}
        row["mm_first_order_bias"] = round(-(3 - 1) / (2 * n), 4)
        en["by_n"][str(n)] = row; print("entropy", n, row, flush=True)
    put("entropy", en)

# ---------------- part dd: double descent with its bias and variance (weak-features linear regression) ----------------
# Belkin, Hsu and Xu, "Two models of double descent for weak features" (SIAM J. Math. Data Science 2020; arXiv 1903.07571):
# x ~ N(0, I_D), y = x.beta + noise, the model sees only the first p features, least squares (min-norm when p > n).
DD_D, DD_N, DD_SIG = 100, 40, 0.2
def dd_beta(kind):
    b = np.ones(DD_D) if kind == "even" else np.arange(1, DD_D + 1) ** -(0.5 if kind == "decay05" else 1.0)
    return b / np.linalg.norm(b)
def dd_theory(p, beta, n=DD_N, sig=DD_SIG):
    bP = float((beta[:p] ** 2).sum()); bR = float((beta[p:] ** 2).sum())
    if p <= n - 2: return (bR + sig ** 2) * (1 + p / (n - p - 1))
    if p >= n + 2: return bP * (1 - n / p) + (bR + sig ** 2) * (1 + n / (p - n - 1))
    return None  # infinite expectation at p = n - 1, n, n + 1
if "dd" in parts:
    T = 1000; rng = np.random.default_rng(2019)
    X = rng.standard_normal((T, DD_N, DD_D)); E = rng.standard_normal((T, DD_N))
    ps = list(range(1, DD_D + 1)); lams = [0.0, 0.01, 0.1, 1.0]
    dd = {"D": DD_D, "n": DD_N, "sigma": DD_SIG, "T": T, "p": ps, "lam": lams, "betas": {}, "smin": []}
    for p in ps:
        Xp = X[:, :, :p]
        sv = np.linalg.svd(Xp, compute_uv=False)
        dd["smin"].append(round(float(np.median(sv[:, -1])), 4))
    for kind in ("even", "decay05", "decay1"):
        beta = dd_beta(kind); y = X @ beta + DD_SIG * E
        res = {"theory": [None if dd_theory(p, beta) is None else round(dd_theory(p, beta), 4) for p in ps]}
        for lam in lams:
            rows = {"mean": [], "median": [], "bias2": [], "var": []}
            for p in ps:
                Xp = X[:, :, :p]; Xt = np.transpose(Xp, (0, 2, 1))
                if p >= DD_N:  # dual form: w = X^T (X X^T + lam I)^-1 y, the min-norm interpolator at lam = 0
                    w = (Xt @ np.linalg.solve(Xp @ Xt + lam * np.eye(DD_N), y[:, :, None]))[:, :, 0]
                else:  # primal: w = (X^T X + lam I)^-1 X^T y
                    w = np.linalg.solve(Xt @ Xp + lam * np.eye(p), Xt @ y[:, :, None])[:, :, 0]
                bR = float((beta[p:] ** 2).sum())
                err = ((w - beta[:p]) ** 2).sum(1) + bR + DD_SIG ** 2
                rows["mean"].append(round(float(err.mean()), 4)); rows["median"].append(round(float(np.median(err)), 4))
                rows["bias2"].append(round(float(((w.mean(0) - beta[:p]) ** 2).sum() + bR), 4))
                rows["var"].append(round(float(w.var(0).sum()), 4))
            res[str(lam)] = rows
            print("dd", kind, lam, rows["mean"][9], rows["mean"][39], rows["mean"][99], flush=True)
        dd["betas"][kind] = res
    put("dd", dd)

# ---------------- part conc: exact tail of a Bernoulli(0.5) mean, for the bounds chart ----------------
if "conc" in parts:
    ns = sorted(set([10, 20, 30, 50, 75, 100, 150, 200, 300, 400, 500, 600, 738, 800, 1000, 1500, 2000]))
    co = {"p": 0.5, "t": 0.05, "n": ns, "exact": []}
    for n in ns:
        k = np.arange(n + 1)
        pk = stats.binom.pmf(k, n, 0.5)
        co["exact"].append(float(pk[np.abs(k / n - 0.5) >= 0.05 - 1e-12].sum()))
    co["exact"] = [float("%.6g" % v) for v in co["exact"]]
    put("conc", co); print("conc", co["exact"][ns.index(500)])

# ---------------- part peek: optional stopping (testing as the data arrive) ----------------
if "peek" in parts:
    rng = np.random.default_rng(1969); R, N = 200000, 100
    looks = {1: 100, 2: 50, 5: 20, 10: 10, 20: 5, 50: 2, 100: 1}
    hit = {k: np.zeros(R, bool) for k in looks}
    for a in range(0, R, 20000):
        S = np.cumsum(rng.standard_normal((20000, N)), 1)
        Z = np.abs(S) / np.sqrt(np.arange(1, N + 1))  # z statistic with known sigma = 1 after m observations
        for k, step in looks.items():
            at = np.arange(step, N + 1, step) - 1
            hit[k][a:a + 20000] = (Z[:, at] > 1.959964).any(1)
    pk = {"R": R, "N": N, "rate": {str(k): round(float(v.mean()), 4) for k, v in hit.items()}}
    put("peek", pk); print("peek", pk)

# ---------------- part cv: what a naive cross-validation interval covers ----------------
if "cv" in parts:
    rng = np.random.default_rng(2023); R, n, d, K, sig = 4000, 100, 20, 10, 1.0
    beta = np.ones(d) * 0.5
    cov_xy = cov_err = 0; est = []; errxy = []; naive_se = []
    for r in range(R):
        X = rng.standard_normal((n, d)); y = X @ beta + sig * rng.standard_normal(n)
        perm = rng.permutation(n); folds = np.array_split(perm, K); e = np.empty(n)
        for f in folds:
            tr = np.setdiff1d(perm, f)
            w = np.linalg.lstsq(X[tr], y[tr], rcond=None)[0]
            e[f] = (y[f] - X[f] @ w) ** 2
        w = np.linalg.lstsq(X, y, rcond=None)[0]
        exy = sig ** 2 + float(((w - beta) ** 2).sum())  # exact test error of the model fitted on all n (x ~ N(0, I))
        m = e.mean(); se = e.std(ddof=1) / math.sqrt(n)
        est.append(m); errxy.append(exy); naive_se.append(se)
    est = np.array(est); errxy = np.array(errxy); naive_se = np.array(naive_se)
    err_avg = sig ** 2 * (1 + d / (n - d - 1))  # expected test error over training sets, n points (exact for Gaussian x)
    lo = est - 1.96 * naive_se; hi = est + 1.96 * naive_se
    cv = {"R": R, "n": n, "d": d, "K": K, "sigma": sig, "err_avg_n": round(err_avg, 4),
          "err_avg_090n": round(sig ** 2 * (1 + d / (0.9 * n - d - 1)), 4),
          "cov_errxy": round(float(((lo <= errxy) & (errxy <= hi)).mean()), 4),
          "cov_erravg": round(float(((lo <= err_avg) & (err_avg <= hi)).mean()), 4),
          "sd_est": round(float(est.std(ddof=1)), 4), "mean_naive_se": round(float(naive_se.mean()), 4),
          "mean_est": round(float(est.mean()), 4), "sd_errxy": round(float(errxy.std(ddof=1)), 4),
          "corr_est_errxy": round(float(np.corrcoef(est, errxy)[0, 1]), 3)}
    put("cv", cv); print("cv", cv)

#!/usr/bin/env python3
"""Double descent in its smallest exact setting: Belkin, Hsu and Xu's weak-features regression, decomposed.

Moved here from the Statistics page on 2026-10-26 (this page owns bias-variance for model choice and double descent).
Belkin, Hsu and Xu, "Two models of double descent for weak features" (SIAM J. Math. Data Science 2020; arXiv 1903.07571):
x ~ N(0, I_D), y = x.beta + noise, the model sees only the first p features, least squares (min-norm when p > n),
refitted on 1,000 seeded training sets for every p, with ridge strengths 0, 0.01, 0.1 and 1.

Run from src/:
  uv run --no-project --with numpy python weak_features_dd.py sim     # about a minute: rewrites inputs/weak_features_dd.json
  python3 weak_features_dd.py                                         # (needs numpy) checks against Theorem 1, writes
                                                                      # check/weak_features_dd.json and parts/32_js_wf.js
"""
import json, os, sys
import numpy as np

H = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(H, "inputs", "weak_features_dd.json")
D_, N_, SIG = 100, 40, 0.2


def beta_of(kind, D=D_):
    b = np.ones(D) if kind == "even" else np.arange(1, D + 1) ** -(0.5 if kind == "decay05" else 1.0)
    return b / np.linalg.norm(b)


def theory(p, beta, n=N_, sig=SIG):
    """Theorem 1: expected test error of least squares on the first p features (None where it is infinite)."""
    bP = float((beta[:p] ** 2).sum()); bR = float((beta[p:] ** 2).sum())
    if p <= n - 2: return (bR + sig ** 2) * (1 + p / (n - p - 1))
    if p >= n + 2: return bP * (1 - n / p) + (bR + sig ** 2) * (1 + n / (p - n - 1))
    return None  # infinite expectation at p = n - 1, n, n + 1


def simulate():
    T = 1000; rng = np.random.default_rng(2019)
    X = rng.standard_normal((T, N_, D_)); E = rng.standard_normal((T, N_))
    ps = list(range(1, D_ + 1)); lams = [0.0, 0.01, 0.1, 1.0]
    dd = {"D": D_, "n": N_, "sigma": SIG, "T": T, "p": ps, "lam": lams, "betas": {}, "smin": []}
    for p in ps:
        sv = np.linalg.svd(X[:, :, :p], compute_uv=False)
        dd["smin"].append(round(float(np.median(sv[:, -1])), 4))
    for kind in ("even", "decay05", "decay1"):
        beta = beta_of(kind); y = X @ beta + SIG * E
        res = {"theory": [None if theory(p, beta) is None else round(theory(p, beta), 4) for p in ps]}
        for lam in lams:
            rows = {"mean": [], "median": [], "bias2": [], "var": []}
            for p in ps:
                Xp = X[:, :, :p]; Xt = np.transpose(Xp, (0, 2, 1))
                if p >= N_:  # dual form: w = X^T (X X^T + lam I)^-1 y, the min-norm interpolator at lam = 0
                    w = (Xt @ np.linalg.solve(Xp @ Xt + lam * np.eye(N_), y[:, :, None]))[:, :, 0]
                else:  # primal: w = (X^T X + lam I)^-1 X^T y
                    w = np.linalg.solve(Xt @ Xp + lam * np.eye(p), Xt @ y[:, :, None])[:, :, 0]
                bR = float((beta[p:] ** 2).sum())
                err = ((w - beta[:p]) ** 2).sum(1) + bR + SIG ** 2
                rows["mean"].append(round(float(err.mean()), 4)); rows["median"].append(round(float(np.median(err)), 4))
                rows["bias2"].append(round(float(((w.mean(0) - beta[:p]) ** 2).sum() + bR), 4))
                rows["var"].append(round(float(w.var(0).sum()), 4))
            res[str(lam)] = rows
            print("dd", kind, lam, rows["mean"][9], rows["mean"][39], rows["mean"][99], flush=True)
        dd["betas"][kind] = res
    json.dump(dd, open(DATA, "w"), separators=(",", ":"))


def expected():
    dd = json.load(open(DATA)); P = dd["p"]; E = {}
    at = lambda kind, lam, key, pp: dd["betas"][kind][str(lam)][key][P.index(pp)]
    E["ens_rho0"] = round(1 / 10, 2); E["ens_rho05"] = round(0.5 + 0.5 / 10, 2)
    for kind in ("even", "decay05", "decay1"):
        th = dd["betas"][kind]["theory"]; bk = beta_of(kind)
        # Theorem 1 recomputed here must equal the stored column
        assert all((t is None and theory(pp, bk) is None) or abs(t - theory(pp, bk)) < 1e-4 for t, pp in zip(th, P)), kind
        E["dd_%s_theory_p10" % kind] = th[P.index(10)]; E["dd_%s_theory_p100" % kind] = th[P.index(100)]
        E["dd_%s_sim_p10" % kind] = at(kind, 0.0, "mean", 10); E["dd_%s_sim_p100" % kind] = at(kind, 0.0, "mean", 100)
        E["dd_%s_sim_p40_median" % kind] = at(kind, 0.0, "median", 40)
        E["dd_%s_ridge01_p40" % kind] = at(kind, 0.1, "mean", 40)
        gaps = [abs(at(kind, 0.0, "mean", pp) / th[i] - 1) for i, pp in enumerate(P) if th[i] is not None and abs(pp - dd["n"]) >= 5]
        E["dd_%s_maxgap" % kind] = round(max(gaps), 4)
        E["dd_%s_sim_p40" % kind] = at(kind, 0.0, "mean", 40)
        under = min((theory(pp, bk), pp) for pp in P if pp <= dd["n"] - 2)
        over = min((theory(pp, bk), pp) for pp in P if pp >= dd["n"] + 2)
        E["dd_%s_best_under" % kind] = [round(under[0], 6), under[1]]
        E["dd_%s_best_over" % kind] = [round(over[0], 6), over[1]]
    E["dd_smin"] = {str(pp): dd["smin"][P.index(pp)] for pp in (10, 30, 38, 40, 42, 60, 100)}
    # sample-wise: p = 60 features, the signal spread evenly, n from 30 to 200 (Theorem 1)
    b = np.ones(100) / 10
    for nn in (30, 55, 80, 200):
        E["dd_samplewise_n%d" % nn] = round(theory(60, b, n=nn), 3)
    os.makedirs(os.path.join(H, "check"), exist_ok=True)
    json.dump(E, open(os.path.join(H, "check", "weak_features_dd.json"), "w"), indent=1)
    # data part for the page: ridge keys as JavaScript writes them (String(0) is "0", String(1) is "1")
    for kind, res in dd["betas"].items():
        for k in list(res):
            if k != "theory":
                res[str(int(float(k))) if float(k).is_integer() else str(float(k))] = res.pop(k)
    with open(os.path.join(H, "parts", "32_js_wf.js"), "w") as f:
        f.write("// Generated by src/weak_features_dd.py from inputs/weak_features_dd.json (seeded). Do not edit.\n")
        f.write("window.WF=" + json.dumps(dd, separators=(",", ":")) + ";\n")
    for k, v in E.items(): print(k, v)


if __name__ == "__main__":
    if sys.argv[1:] == ["sim"]: simulate()
    expected()

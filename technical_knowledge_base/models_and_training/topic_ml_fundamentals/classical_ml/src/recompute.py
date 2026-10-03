# Recompute every default number the page quotes, independently of the page's JS (scikit-learn / NumPy).
# Run from src/: OMP_NUM_THREADS=2 uv run --with scikit-learn python recompute.py   (writes inputs/recompute.json)
import json, math, numpy as np, warnings
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import GradientBoostingRegressor, RandomForestRegressor
from sklearn.svm import SVC
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
warnings.filterwarnings("ignore")
D = json.load(open("inputs/datasets.json")); S = json.load(open("inputs/svm_digits_surface.json"))
R = {}
# 1. tree depth on the breast cancer pair
c = D["lab"]["cancer"]; X, y, Xt, yt = map(np.array, (c["Xtr"], c["ytr"], c["Xte"], c["yte"]))
R["tree_depth"] = []
for d in list(range(1, 13)) + [None]:
    t = DecisionTreeClassifier(max_depth=d, random_state=0).fit(X, y)
    R["tree_depth"].append({"depth": d, "leaves": int(t.get_n_leaves()), "train": float(t.score(X, y)), "test": float(t.score(Xt, yt))})
R["cancer_majority_test"] = float(max(yt.mean(), 1 - yt.mean()))
# 2. mcycle: every 4th reading held out
m = D["mcycle"]; x = np.array(m["x"])[:, None]; v = np.array(m["y"]); te = np.arange(len(v)) % 4 == 3
xtr, ytr, xte, yte = x[~te], v[~te], x[te], v[te]
mse = lambda p, t: float(np.mean((p - t) ** 2))
R["mcycle"] = {"n_train": int((~te).sum()), "n_test": int(te.sum()), "var_test": float(np.var(yte)),
    "tree": {str(d): [mse(DecisionTreeRegressor(max_depth=d, random_state=0).fit(xtr, ytr).predict(xtr), ytr), mse(DecisionTreeRegressor(max_depth=d, random_state=0).fit(xtr, ytr).predict(xte), yte)] for d in [1, 2, 3, 4, 5, 6, 8, None]}}
gb = GradientBoostingRegressor(n_estimators=200, learning_rate=0.3, max_depth=2, random_state=0).fit(xtr, ytr)
R["mcycle"]["gb"] = {str(k + 1): [mse(a, ytr), mse(b, yte)] for k, (a, b) in enumerate(zip(gb.staged_predict(xtr), gb.staged_predict(xte))) if k + 1 in [1, 2, 3, 5, 10, 20, 50, 100, 200]}
# random forest (bagging; one feature, so every split sees it): sklearn's own bootstrap, 5 seeds, mean
rf = {}
for n in [1, 2, 3, 5, 10, 20, 50, 100, 200]:
    a = [RandomForestRegressor(n, random_state=s).fit(xtr, ytr) for s in range(5)]
    rf[str(n)] = [float(np.mean([mse(r.predict(xtr), ytr) for r in a])), float(np.mean([mse(r.predict(xte), yte) for r in a]))]
R["mcycle"]["rf_sklearn_5seeds"] = rf
# 3. SVM C sweep on moons
mo = D["lab"]["moons"]; X, y, Xt, yt = map(np.array, (mo["Xtr"], mo["ytr"], mo["Xte"], mo["yte"]))
R["svm_moons"] = {}
for k in ["linear", "rbf"]:
    for C in [0.01, 0.03, 0.1, 0.3, 1, 3, 10, 30, 100]:
        s = SVC(kernel=k, C=C).fit(X, y)
        R["svm_moons"][f"{k}_{C}"] = {"nsv": int(s.support_.size), "train": float(s.score(X, y)), "test": float(s.score(Xt, yt)),
            "margin": float(2 / np.linalg.norm(s.coef_)) if k == "linear" else None}
# 4. PCA on wine
W = np.array(D["wine"]["X"]); R["pca"] = {}
for nm, A in [("std", StandardScaler().fit_transform(W)), ("raw", W)]:
    p = PCA().fit(A); R["pca"][nm] = {"ratio": p.explained_variance_ratio_.tolist(), "cum2": float(p.explained_variance_ratio_[:2].sum())}
R["pca"]["raw_top_feature"] = D["wine"]["features"][int(np.argmax(np.abs(PCA().fit(W).components_[0])))]
R["wine_var"] = dict(zip(D["wine"]["features"], np.var(W, 0).round(4).tolist()))
# 5. search: random-search arithmetic and grid values on the real surface
A = np.array(S["acc"]); flat = A.ravel(); n1, n2 = A.shape
R["surface"] = {"best": S["best"] if "best" in S else None, "max": float(flat.max()), "cells": int(flat.size),
    "share_ge_985": float((flat >= 0.985).mean()), "share_top5": 0.05,
    "p_hit_top5_60": 1 - 0.95 ** 60, "main_effect_C": float(np.var(A.mean(1)) / np.var(flat)), "main_effect_g": float(np.var(A.mean(0)) / np.var(flat))}
def grid(k):
    ii = [round(t * (n1 - 1) / (k - 1)) for t in range(k)]; jj = [round(t * (n2 - 1) / (k - 1)) for t in range(k)]
    return float(max(A[i][j] for i in ii for j in jj))
R["surface"]["grid"] = {str(k): grid(k) for k in range(2, 11)}
# Bayesian optimisation path (GP with RBF kernel, length-scale 0.15 on [0,1]^2, noise 1e-6, EI with xi 0.01),
# a Python port of the page's ML.gpEI so check_search.mjs can compare paths step by step.
def mulberry32(seed):
    a = seed & 0xffffffff
    def imul(p, q): return (p * q) & 0xffffffff
    def f():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xffffffff; t = a
        t = imul(t ^ (t >> 15), t | 1)
        t = (t ^ ((t + imul(t ^ (t >> 7), t | 61)) & 0xffffffff)) & 0xffffffff
        return ((t ^ (t >> 14)) & 0xffffffff) / 4294967296
    return f
P = np.array([[i / (n1 - 1), j / (n2 - 1)] for i in range(n1) for j in range(n2)])
def Phi(z): return 0.5 * (1 + np.vectorize(math.erf)(z / math.sqrt(2)))
def bo(seed, B, ell=0.15, xi=0.01, n0=3):
    r = mulberry32(seed); obs = []
    while len(obs) < n0:
        c = int(r() * flat.size)
        if c not in obs: obs.append(c)
    while len(obs) < B:
        f = flat[obs]; mu, sd = f.mean(), f.std(); sd = sd if sd > 1e-12 else 1; yz = (f - mu) / sd
        K = np.exp(-((P[obs][:, None] - P[obs][None]) ** 2).sum(-1) / (2 * ell ** 2)) + 1e-6 * np.eye(len(obs))
        Ks = np.exp(-((P[:, None] - P[obs][None]) ** 2).sum(-1) / (2 * ell ** 2))
        L = np.linalg.cholesky(K); al = np.linalg.solve(L.T, np.linalg.solve(L, yz)); m = Ks @ al
        V = np.linalg.solve(L, Ks.T); s = np.sqrt(np.maximum(1 - (V ** 2).sum(0), 1e-12))
        z = (m - yz.max() - xi) / s; ei = (m - yz.max() - xi) * Phi(z) + s * np.exp(-z * z / 2) / math.sqrt(2 * math.pi)
        ei[obs] = -1; obs.append(int(np.argmax(ei)))
    return obs
paths = {s: bo(s, 40) for s in range(1, 41)}
R["bo_paths"] = {str(s): p for s, p in list(paths.items())[:3]}
R["bo_best_by_budget"] = {str(B): sorted(float(flat[p[:B]].max()) for p in paths.values()) for B in [4, 9, 16, 25, 36]}
json.dump(R, open("inputs/recompute.json", "w"), indent=1)
print(json.dumps({k: R[k] for k in ["tree_depth", "cancer_majority_test"]})[:1500]); print(R["mcycle"]); print({k: v for k, v in R["svm_moons"].items()}); print(R["pca"]["std"]["ratio"][:3], R["pca"]["raw"]["ratio"][:2], R["pca"]["raw_top_feature"]); print(R["surface"]); print({k: (v[len(v)//2], v[0], v[-1]) for k, v in R["bo_best_by_budget"].items()})

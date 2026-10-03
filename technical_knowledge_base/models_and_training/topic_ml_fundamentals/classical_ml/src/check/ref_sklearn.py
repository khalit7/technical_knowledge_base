# Reference outputs from scikit-learn for the page's JS engine (parts/30_js_ml.js); compared by check_ml.mjs.
# Run from src/: OMP_NUM_THREADS=2 uv run --with scikit-learn python check/ref_sklearn.py
import json, warnings, numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor
from sklearn.ensemble import GradientBoostingClassifier, GradientBoostingRegressor, RandomForestClassifier
from sklearn.svm import SVC
from sklearn.cluster import KMeans, DBSCAN
from sklearn.mixture import GaussianMixture
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler
warnings.filterwarnings("ignore")
D = json.load(open("inputs/datasets.json"))

def mulberry32(seed):
    a = seed & 0xffffffff
    def imul(x, y): return (x * y) & 0xffffffff
    def f():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xffffffff
        t = a
        t = imul(t ^ (t >> 15), t | 1)
        t = (t ^ ((t + imul(t ^ (t >> 7), t | 61)) & 0xffffffff)) & 0xffffffff
        return ((t ^ (t >> 14)) & 0xffffffff) / 4294967296
    return f

def boot(n, r):
    c = [0] * n
    for _ in range(n): c[int(r() * n)] += 1
    return c

R = {"lab": {}}
for key, d in D["lab"].items():
    X = np.array(d["Xtr"]); y = np.array(d["ytr"]); Xt = np.array(d["Xte"]); yt = np.array(d["yte"])
    allx = np.vstack([X, Xt]); lo = np.floor(allx.min(0) - 0.5); hi = np.ceil(allx.max(0) + 0.5)
    g0 = np.linspace(lo[0], hi[0], 41); g1 = np.linspace(lo[1], hi[1], 41)
    G = np.array([[a, b] for b in g1 for a in g0])
    o = {"grid": G.round(6).tolist()}
    m = LogisticRegression(C=1.0, tol=1e-10, max_iter=10000).fit(X, y)
    o["logreg"] = {"coef": m.coef_[0].tolist(), "b0": float(m.intercept_[0]), "p": m.predict_proba(G)[:, 1].tolist()}
    o["knn"] = {k: KNeighborsClassifier(k).fit(X, y).predict_proba(G)[:, 1].tolist() for k in [1, 5, 15]}
    o["tree"] = {}
    for dep in [1, 2, 3, 5, None]:
        t = DecisionTreeClassifier(max_depth=dep, random_state=0).fit(X, y)
        o["tree"][str(dep)] = {"p": t.predict_proba(G)[:, 1].tolist(), "leaves": int(t.get_n_leaves())}
    r = mulberry32(7); P = np.zeros(len(G))
    for b in range(25):
        w = np.array(boot(len(X), r)); t = DecisionTreeClassifier(random_state=0).fit(X, y, sample_weight=w); P += t.predict_proba(G)[:, 1]
    o["bag25_seed7"] = (P / 25).tolist()
    o["rf_acc"] = [float(RandomForestClassifier(100, max_features="sqrt", random_state=s).fit(X, y).score(Xt, yt)) for s in range(10)]
    o["gb"] = {}
    for dep in [1, 3]:
        g = GradientBoostingClassifier(n_estimators=50, learning_rate=0.1, max_depth=dep, random_state=0).fit(X, y)
        o["gb"][str(dep)] = g.decision_function(G).tolist()
    o["svm"] = {}
    for kern, C, gam in [("linear", 0.1, None), ("linear", 1, None), ("linear", 10, None), ("rbf", 1, 0.5), ("rbf", 10, 0.5), ("rbf", 1, 5)]:
        kw = {"kernel": kern, "C": C}; 
        if gam: kw["gamma"] = gam
        s = SVC(**kw).fit(X, y); s2 = SVC(shrinking=False, **kw).fit(X, y)
        o["svm"][f"{kern}_{C}_{gam}"] = {"dec": s.decision_function(G).tolist(), "dec_noshrink": s2.decision_function(G).tolist(),
                                          "nsv": int(s.support_.size), "sv": sorted(s.support_.tolist()), "acc": float(s.score(Xt, yt))}
    R["lab"][key] = o

mc = D["mcycle"]; x = np.array(mc["x"])[:, None]; yv = np.array(mc["y"]); xg = np.linspace(0, 60, 241)[:, None]
R["mcycle"] = {"xg": xg[:, 0].tolist(),
    "gb": GradientBoostingRegressor(n_estimators=100, learning_rate=0.3, max_depth=2, random_state=0).fit(x, yv).predict(xg).tolist(),
    "tree": DecisionTreeRegressor(random_state=0).fit(x, yv).predict(xg).tolist()}
r = mulberry32(11); P = np.zeros(len(xg))
for b in range(50):
    w = np.array(boot(len(x), r)); P += DecisionTreeRegressor(random_state=0).fit(x, yv, sample_weight=w).predict(xg)
R["mcycle"]["bag50_seed11"] = (P / 50).tolist()
# staged GB predictions for the animation counters
gb = GradientBoostingRegressor(n_estimators=100, learning_rate=0.3, max_depth=2, random_state=0).fit(x, yv)
R["mcycle"]["gb_train_mse"] = [float(np.mean((p - yv) ** 2)) for p in gb.staged_predict(x)]

fa = np.array([D["faithful"]["x"], D["faithful"]["y"]]).T; Z = StandardScaler().fit_transform(fa)
C0 = Z[[0, 1, 2]]
km = KMeans(3, init=C0, n_init=1, algorithm="lloyd", tol=0, max_iter=300).fit(Z)
R["kmeans"] = {"init_idx": [0, 1, 2], "centers": km.cluster_centers_.tolist(), "inertia": float(km.inertia_), "n_iter": int(km.n_iter_)}
R["kmeanspp_sklearn_inertia"] = [float(KMeans(2, init="k-means++", n_init=1, random_state=s).fit(Z).inertia_) for s in range(20)]
gm = {}
for it in [1, 5, 30]:
    w0 = np.array([0.5, 0.5]); mu0 = Z[[0, 1]]; v = Z.var(0); prec0 = np.array([np.diag(1 / v)] * 2)
    g = GaussianMixture(2, covariance_type="full", weights_init=w0, means_init=mu0, precisions_init=prec0, max_iter=it, tol=0, reg_covar=1e-6).fit(Z)
    gm[it] = {"w": g.weights_.tolist(), "mu": g.means_.tolist(), "S": g.covariances_.tolist()}
R["gmm"] = gm
R["dbscan"] = {}
for key, eps, ms in [("cmoons", 0.2, 5), ("cblobs", 0.3, 5), ("cblobs", 0.5, 5)]:
    P2 = np.array([D[key]["x"], D[key]["y"]]).T
    R["dbscan"][f"{key}_{eps}_{ms}"] = DBSCAN(eps=eps, min_samples=ms).fit(P2).labels_.tolist()
Xw = np.array(D["wine"]["X"])
R["pca"] = {}
for nm, A in [("std", StandardScaler().fit_transform(Xw)), ("raw", Xw)]:
    p = PCA().fit(A); comps = p.components_.copy()
    for i in range(len(comps)):
        j = np.argmax(np.abs(comps[i])); comps[i] *= np.sign(comps[i][j])
    R["pca"][nm] = {"ratio": p.explained_variance_ratio_.tolist(), "c0": comps[0].tolist(), "c1": comps[1].tolist()}
json.dump(R, open("check/ref.json", "w"))
print("ok")

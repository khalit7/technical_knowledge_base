# Build the page's small datasets into inputs/datasets.json.
# Run from src/: uv run --with scikit-learn python data/prep.py
import json, csv, numpy as np
from sklearn.datasets import make_moons, make_circles, load_breast_cancer, load_wine
from sklearn.model_selection import train_test_split

def split2d(X, y, name, src, kind):
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.3, stratify=y, random_state=0)
    mu, sd = Xtr.mean(0), Xtr.std(0)
    f = lambda A: np.round((A - mu) / sd, 3).tolist()
    return {"name": name, "src": src, "kind": kind, "Xtr": f(Xtr), "ytr": ytr.astype(int).tolist(), "Xte": f(Xte), "yte": yte.astype(int).tolist()}

D = {}
X, y = make_moons(200, noise=0.25, random_state=0)
D["moons"] = split2d(X, y, "Two moons", "sklearn make_moons(200, noise=0.25, random_state=0)", "synthetic")
X, y = make_circles(200, noise=0.1, factor=0.5, random_state=1)
D["circles"] = split2d(X, y, "Circles", "sklearn make_circles(200, noise=0.1, factor=0.5, random_state=1)", "synthetic")
r = np.random.RandomState(2); c = np.array([[1, 1], [-1, -1], [1, -1], [-1, 1]]); lab = np.array([0, 0, 1, 1])
k = r.randint(0, 4, 200); X = c[k] + 0.5 * r.randn(200, 2); y = lab[k]
D["xor"] = split2d(X, y, "XOR", "four Gaussian blobs at (+-1, +-1), sd 0.5, opposite corners share a class, NumPy seed 2", "synthetic")
r = np.random.RandomState(3); y = r.randint(0, 2, 200); X = np.where(y[:, None] == 1, [1, 0.5], [-1, -0.5]) + r.randn(200, 2)
D["blobs"] = split2d(X, y, "Two blobs", "two Gaussian blobs at (-1, -0.5) and (1, 0.5), sd 1, NumPy seed 3", "synthetic")
bc = load_breast_cancer(); fi = [list(bc.feature_names).index("mean radius"), list(bc.feature_names).index("mean texture")]
D["cancer"] = split2d(bc.data[:, fi], (bc.target == 0).astype(int), "Breast cancer (2 features)",
                      "Wisconsin diagnostic breast cancer (UCI, via sklearn load_breast_cancer): mean radius, mean texture; class 1 = malignant", "real")
D["cancer"]["axes"] = ["mean radius (standardised)", "mean texture (standardised)"]

rows = list(csv.DictReader(open("inputs/mcycle.csv")))
mc = {"x": [float(r["times"]) for r in rows], "y": [float(r["accel"]) for r in rows],
      "src": "MASS::mcycle (Silverman 1985): head acceleration (g) against time after impact (ms) in simulated motorcycle crashes, 133 readings"}
rows = list(csv.DictReader(open("inputs/faithful.csv")))
fa = {"x": [float(r["eruptions"]) for r in rows], "y": [float(r["waiting"]) for r in rows],
      "src": "R datasets::faithful: Old Faithful geyser, eruption length (min) and waiting time to the next eruption (min), 272 eruptions"}
w = load_wine()
wine = {"X": np.round(w.data, 4).tolist(), "y": w.target.tolist(), "features": list(w.feature_names),
        "src": "UCI Wine (via sklearn load_wine): 178 wines from 3 cultivars, 13 chemical measurements"}
# clustering toys
X, y = make_moons(300, noise=0.06, random_state=4)
cm = {"x": np.round(X[:, 0], 3).tolist(), "y": np.round(X[:, 1], 3).tolist(), "src": "sklearn make_moons(300, noise=0.06, random_state=4)"}
r = np.random.RandomState(5)
P = np.vstack([r.randn(150, 2) * 0.25 + [0, 0], r.randn(150, 2) * 0.25 + [2.2, 0.2], r.randn(60, 2) * 0.9 + [1, 2.6]])
cb = {"x": np.round(P[:, 0], 3).tolist(), "y": np.round(P[:, 1], 3).tolist(), "src": "three Gaussian blobs, two tight (sd 0.25, 150 points) and one loose (sd 0.9, 60 points), NumPy seed 5"}
r = np.random.RandomState(6); ctr = np.array([[0, 0], [2, 0], [4, 0], [0, 2], [2, 2], [4, 2]])
P6 = np.vstack([ctr[i] + 0.3 * r.randn(50, 2) for i in range(6)])
c6 = {"x": np.round(P6[:, 0], 3).tolist(), "y": np.round(P6[:, 1], 3).tolist(), "src": "six Gaussian blobs on a 3 by 2 grid, 2 apart, sd 0.3, 50 points each, NumPy seed 6"}
json.dump({"c6": c6, "lab": D, "mcycle": mc, "faithful": fa, "wine": wine, "cmoons": cm, "cblobs": cb}, open("inputs/datasets.json", "w"))
print({k: len(v["ytr"]) + len(v["yte"]) for k, v in D.items()})

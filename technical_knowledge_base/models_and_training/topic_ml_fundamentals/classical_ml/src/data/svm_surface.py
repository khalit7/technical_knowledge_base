# Real hyperparameter response surface for the search section:
# 5-fold CV accuracy of an RBF SVM (scikit-learn SVC) on the digits data (1,797 images, 8x8, scaled to [0,1]),
# over the libsvm guide's grid log2 C in [-5, 15], log2 gamma in [-15, 3], at a step of 0.5 (41 x 37 = 1,517 cells).
# Run: OMP_NUM_THREADS=1 uv run --with scikit-learn --with joblib python data/svm_surface.py   (from src/)
import json, numpy as np, time
from sklearn.datasets import load_digits
from sklearn.svm import SVC
from sklearn.model_selection import StratifiedKFold, cross_val_score
from joblib import Parallel, delayed
X, y = load_digits(return_X_y=True); X = X / 16.0
cv = StratifiedKFold(5, shuffle=True, random_state=0)
lc = [(-5 + 0.5 * i) for i in range(41)]; lg = [(-15 + 0.5 * j) for j in range(37)]
def one(a, b):
    return float(cross_val_score(SVC(C=2.0 ** a, gamma=2.0 ** b, cache_size=500), X, y, cv=cv).mean())
t = time.time()
res = Parallel(n_jobs=2)(delayed(one)(a, b) for a in lc for b in lg)
A = np.array(res).reshape(41, 37)
i, j = np.unravel_index(A.argmax(), A.shape)
out = {"what": "5-fold stratified CV accuracy (shuffle, random_state 0) of sklearn SVC(rbf) on load_digits / 16",
       "log2C": lc, "log2gamma": lg, "acc": [[round(v, 5) for v in row] for row in A.tolist()],
       "best": {"log2C": lc[i], "log2gamma": lg[j], "acc": float(A.max())}, "seconds": round(time.time() - t, 1)}
json.dump(out, open("inputs/svm_digits_surface.json", "w"))
print(out["best"], out["seconds"])

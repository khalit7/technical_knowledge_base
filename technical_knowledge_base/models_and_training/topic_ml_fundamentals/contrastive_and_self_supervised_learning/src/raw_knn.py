"""5-NN accuracy (cosine, leave one out) of raw pixels on the toy's 200 held-out digits; writes inputs/raw_knn.json.
Run: uv run --with scikit-learn --with numpy python raw_knn.py"""
import json, numpy as np
from sklearn.datasets import load_digits
X, Y = load_digits(return_X_y=True); X = X / 16.0
rng = np.random.RandomState(0); perm = rng.permutation(len(X))
te = np.sort(np.concatenate([perm[Y[perm] == c][:20] for c in range(10)]))
Z = X[te] / np.linalg.norm(X[te], axis=1, keepdims=True); y = Y[te]
S = Z @ Z.T; np.fill_diagonal(S, -9)
nn = np.argsort(-S, axis=1)[:, :5]
pred = np.array([np.bincount(y[r], minlength=10).argmax() for r in nn])
acc = float((pred == y).mean()); print('raw pixels 5-NN', acc, 'train size', len(X) - len(te))
json.dump(dict(raw_pixels_knn=round(acc, 4), n_test=len(te), n_train=len(X) - len(te)), open('inputs/raw_knn.json', 'w'))

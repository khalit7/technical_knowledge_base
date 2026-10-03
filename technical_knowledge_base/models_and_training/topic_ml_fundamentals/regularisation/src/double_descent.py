"""Model-wise double descent and its removal by ridge, after Nakkiran et al. (2020, arXiv 2003.01897, section 5.2):
random ReLU features x~ = ReLU(W x), W_ij ~ N(0, 1/d), x scaled to [-1, 1], one-hot targets, regularised least squares.
Their data: Fashion-MNIST (d = 784), n = 500. Here: scikit-learn's 8x8 digits (d = 64), n = 200 training images, the
other 1,597 for testing, 10 seeds (features and training subset both redrawn). Objective (1/n)||Phi b - Y||^2 + lam ||b||^2;
lam = 0 is the minimum-norm least-squares solution. Writes inputs/double_descent.json.
Run: OMP_NUM_THREADS=2 uv run --with scikit-learn --with numpy python double_descent.py"""
import json, numpy as np
from sklearn.datasets import load_digits
d = load_digits(); X = d.data / 8.0 - 1.0; y = d.target; N, dim = X.shape
Y = np.eye(10)[y]; n = 200
Ds = [5, 10, 20, 40, 60, 80, 100, 120, 140, 160, 180, 190, 200, 210, 220, 240, 260, 300, 350, 400, 500, 700, 1000, 1500, 2000]
lams = [0.0, 1e-4, 1e-3, 1e-2, 1e-1, 1.0]
S = 10
mse = np.zeros((len(lams), len(Ds), S)); cerr = np.zeros_like(mse); trerr = np.zeros_like(mse)
for s in range(S):
    rng = np.random.default_rng(s); perm = rng.permutation(N); tr, te = perm[:n], perm[n:]
    Wall = rng.normal(0, 1 / np.sqrt(dim), (max(Ds), dim))
    for j, D in enumerate(Ds):
        W = Wall[:D]; F = lambda A: np.maximum(A @ W.T, 0)
        Ptr, Pte = F(X[tr]), F(X[te])
        U, sv, Vt = np.linalg.svd(Ptr, full_matrices=False)
        UtY = U.T @ Y[tr]
        for i, lam in enumerate(lams):
            if lam == 0: f = np.where(sv > sv.max() * 1e-12, 1 / np.where(sv > 0, sv, 1), 0)
            else: f = sv / (sv ** 2 + n * lam)
            b = Vt.T @ (f[:, None] * UtY)
            pr = Pte @ b
            mse[i, j, s] = np.mean(np.sum((pr - Y[te]) ** 2, 1)); cerr[i, j, s] = np.mean(pr.argmax(1) != y[te])
            trerr[i, j, s] = np.mean(np.sum((Ptr @ b - Y[tr]) ** 2, 1))
best = mse.mean(2).argmin(0)  # the best lam per D, chosen on the test set as in Nakkiran et al.'s "optimal" curves
out = {'D': Ds, 'lams': lams, 'n': n, 'seeds': S, 'test_mse': mse.mean(2).round(4).tolist(), 'test_mse_lo': mse.min(2).round(4).tolist(), 'test_mse_hi': mse.max(2).round(4).tolist(),
       'test_err': cerr.mean(2).round(4).tolist(), 'train_mse': trerr.mean(2).round(5).tolist(), 'best_lam_index': best.tolist(),
       'opt_mse': [round(float(mse.mean(2)[best[j], j]), 4) for j in range(len(Ds))], 'opt_err': [round(float(cerr.mean(2)[best[j], j]), 4) for j in range(len(Ds))]}
json.dump(out, open('inputs/double_descent.json', 'w'))
for i, l in enumerate(lams): print(l, [round(v, 2) for v in mse.mean(2)[i]])
print('opt', out['opt_mse'])
print('err0', [round(v, 3) for v in cerr.mean(2)[0]])

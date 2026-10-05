# L2-regularised logistic regression on sklearn's bundled breast-cancer data (569 x 30, standardised, intercept unpenalised).
# Compares gradient descent, Nesterov, Adam, L-BFGS and Newton by f - f* per iteration and per gradient evaluation,
# measures minibatch-gradient noise against batch size, runs SGD with constant and decaying steps,
# and prepares the 1D and 2D slices used by the page's animation and lab.
# usage: uv run --no-project --with numpy --with scipy --with scikit-learn python lr_real.py
import json, math
import numpy as np
from scipy.optimize import minimize
from sklearn.datasets import load_breast_cancer
from sklearn.linear_model import LogisticRegression

d = load_breast_cancer()
Xr, y = d.data, d.target.astype(float)          # y = 1 benign, 0 malignant
n = Xr.shape[0]
Xs = (Xr - Xr.mean(0)) / Xr.std(0)
X = np.hstack([Xs, np.ones((n, 1))])             # last column: intercept
D = X.shape[1]
lam = 1.0 / n                                    # = sklearn C = 1
pen = np.ones(D); pen[-1] = 0.0                  # intercept not penalised

def sig(z): return 0.5 * (1 + np.tanh(0.5 * z))
def f(w):
    z = X @ w
    return np.mean(np.logaddexp(0, z) - y * z) + 0.5 * lam * np.sum(pen * w * w)
def grad(w):
    return X.T @ (sig(X @ w) - y) / n + lam * pen * w
def hess(w):
    p = sig(X @ w); s = p * (1 - p)
    return (X.T * s) @ X / n + lam * np.diag(pen)

# reference optimum by Newton to machine precision
w = np.zeros(D)
for _ in range(50):
    w = w - np.linalg.solve(hess(w), grad(w))
wstar = w; fstar = f(wstar)
sk = LogisticRegression(C=1.0, tol=1e-12, max_iter=10000).fit(Xs, y)
sk_w = np.append(sk.coef_[0], sk.intercept_[0])
H0 = hess(np.zeros(D)); Hs = hess(wstar)
ev0 = np.linalg.eigvalsh(H0); evs = np.linalg.eigvalsh(Hs)
Lglob = np.linalg.eigvalsh(X.T @ X / n).max() / 4 + lam   # global smoothness bound (p(1-p) <= 1/4)
out = {'n': n, 'dims': D, 'lam': lam, 'fstar': fstar, 'f0': f(np.zeros(D)),
       'sklearn_max_abs_diff': float(np.abs(sk_w - wstar).max()),
       'L_global': Lglob, 'H0_eig_max': ev0.max(), 'H0_eig_min': ev0.min(),
       'Hstar_eig_max': evs.max(), 'Hstar_eig_min': evs.min(), 'kappa_star': evs.max() / evs.min(),
       'kappa_0': ev0.max() / ev0.min()}

K = 500
def gd(eta, K=K):
    w = np.zeros(D); gaps = [f(w) - fstar]
    for k in range(K):
        w = w - eta * grad(w); gaps.append(f(w) - fstar)
    return gaps
def gd_armijo(K=K, c=1e-4):
    w = np.zeros(D); gaps = [f(w) - fstar]; nfe = [0]; cnt = 0; t = 1.0
    for k in range(K):
        g = grad(w); fw = f(w); cnt += 1; t = min(t * 2, 1e3)
        while f(w - t * g) > fw - c * t * (g @ g): t *= 0.5; cnt += 1
        w = w - t * g; gaps.append(f(w) - fstar); nfe.append(cnt)
    return gaps, nfe
def nesterov(eta, beta, K=K):
    w = np.zeros(D); wp = w.copy(); gaps = [f(w) - fstar]
    for k in range(K):
        v = w + beta * (w - wp); wp = w; w = v - eta * grad(v); gaps.append(f(w) - fstar)
    return gaps
def adam(lr, K=K, b1=0.9, b2=0.999, eps=1e-8):
    w = np.zeros(D); m = np.zeros(D); v = np.zeros(D); gaps = [f(w) - fstar]
    for k in range(1, K + 1):
        g = grad(w); m = b1 * m + (1 - b1) * g; v = b2 * v + (1 - b2) * g * g
        mh = m / (1 - b1 ** k); vh = v / (1 - b2 ** k)
        w = w - lr * mh / (np.sqrt(vh) + eps); gaps.append(f(w) - fstar)
    return gaps
def newton(K=12):
    w = np.zeros(D); gaps = [f(w) - fstar]
    for k in range(K):
        w = w - np.linalg.solve(hess(w), grad(w)); gaps.append(f(w) - fstar)
    return gaps
def lbfgs(m=10):
    gaps = [f(np.zeros(D)) - fstar]; nfev = [0]; cnt = {'n': 0}
    def fg(w):
        cnt['n'] += 1; return f(w), grad(w)
    def cb(wk):
        gaps.append(f(wk) - fstar); nfev.append(cnt['n'])
    minimize(fg, np.zeros(D), jac=True, method='L-BFGS-B', callback=cb,
             options={'maxcor': m, 'maxiter': 500, 'gtol': 1e-14, 'ftol': 1e-16})
    return gaps, nfev

g_gd = gd(1 / Lglob)
mu = evs.min(); Ls = evs.max()
g_gd_best = gd(2 / (Ls + mu))
kap = Lglob / mu
beta = (math.sqrt(kap) - 1) / (math.sqrt(kap) + 1)
g_nag = nesterov(1 / Lglob, beta)
adam_grid = {}
for lr in [0.001, 0.003, 0.01, 0.03, 0.1, 0.3, 1.0, 3.0]:
    gg = adam(lr); adam_grid[lr] = gg
best_lr = min(adam_grid, key=lambda lr: np.mean(np.log10(np.maximum(adam_grid[lr][1:], 1e-16))))
g_adam = adam_grid[best_lr]
g_newton = newton()
g_arm, nfe_arm = gd_armijo()
g_lb, nfev_lb = lbfgs()
def first_below(g, tol):
    for i, v in enumerate(g):
        if v < tol: return i
    return None
out.update({'eta_gd': 1 / Lglob, 'eta_gd_best': 2 / (Ls + mu), 'nag_beta': beta, 'adam_best_lr': best_lr,
            'adam_grid_final': {str(k): v[-1] for k, v in adam_grid.items()},
            'iters_to_1e-6': {'gd': first_below(g_gd, 1e-6), 'gd_armijo': first_below(g_arm, 1e-6), 'gd_best': first_below(g_gd_best, 1e-6), 'nesterov': first_below(g_nag, 1e-6),
                              'adam': first_below(g_adam, 1e-6), 'lbfgs': first_below(g_lb, 1e-6), 'newton': first_below(g_newton, 1e-6)},
            'lbfgs_nfev_to_1e-6': nfev_lb[first_below(g_lb, 1e-6)] if first_below(g_lb, 1e-6) is not None else None,
            'gd_final_gap': g_gd[-1], 'gd_best_final_gap': g_gd_best[-1]})
# measured late-phase GD rate vs prediction max|1 - eta*lambda_i| at the optimum
def rate(g, a, b): return (g[b] / g[a]) ** (1 / (b - a))
out['gd_rate_measured'] = rate(g_gd, 300, 500) ** 0.5     # gap ~ error^2, so error rate = sqrt(gap rate)
out['gd_rate_predicted'] = max(abs(1 - evs / Lglob))
ia = first_below(g_gd_best, 1e-8); ib = first_below(g_gd_best, 1e-12)
out['gd_best_rate_window'] = [ia, ib]
out['gd_best_rate_measured'] = rate(g_gd_best, ia, ib) ** 0.5
out['gd_best_rate_predicted'] = (out['kappa_star'] - 1) / (out['kappa_star'] + 1)
out['newton_gaps'] = g_newton
rnd = lambda a: [float('%.4g' % max(v, 1e-17)) for v in a]
curves = {'gd': rnd(g_gd), 'gd_armijo': rnd(g_arm), 'gd_armijo_nfev': nfe_arm, 'gd_best': rnd(g_gd_best), 'nesterov': rnd(g_nag), 'adam': rnd(g_adam),
          'lbfgs': rnd(g_lb), 'lbfgs_nfev': nfev_lb, 'newton': rnd(g_newton)}

# minibatch gradient noise at w = 0 (start of training) and at w*
rng = np.random.default_rng(0)
def noise(w, Bs, reps=4000):
    G = X * (sig(X @ w) - y)[:, None] + lam * pen * w   # per-example gradients (n x D)
    g = G.mean(0); res = {}
    sig2 = np.mean(np.sum((G - g) ** 2, 1))            # mean squared deviation of one example's gradient
    for B in Bs:
        e = []
        for _ in range(reps):
            idx = rng.choice(n, B, replace=False); e.append(np.sum((G[idx].mean(0) - g) ** 2))
        res[B] = {'measured': float(np.mean(e)), 'formula': float(sig2 / B * (n - B) / (n - 1))}
    return {'sigma2': float(sig2), 'gnorm2': float(np.sum(g ** 2)), 'by_B': res}
Bs = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512]
out['noise_w0'] = noise(np.zeros(D), Bs); out['noise_wstar'] = noise(wstar, Bs)

# SGD (B = 8, sampling without replacement within an epoch), constant vs decaying step, 3 seeds
def sgd(eta0, decay, epochs=150, B=8, seed=0):
    r = np.random.default_rng(seed); w = np.zeros(D); gaps = [f(w) - fstar]; t = 0
    for ep in range(epochs):
        perm = r.permutation(n)
        for i in range(0, n - B + 1, B):
            idx = perm[i:i + B]
            g = X[idx].T @ (sig(X[idx] @ w) - y[idx]) / B + lam * pen * w
            eta = eta0 / (1 + t / decay) if decay else eta0
            w = w - eta * g; t += 1
        gaps.append(f(w) - fstar)
    return gaps
sg = {}
for name, eta0, dec in [('const_2', 2.0, None), ('const_0.5', 0.5, None), ('const_0.1', 0.1, None), ('decay_2', 2.0, 500)]:
    runs = [sgd(eta0, dec, seed=s) for s in range(3)]
    sg[name] = rnd(np.exp(np.mean(np.log(np.maximum(runs, 1e-17)), 0)))   # geometric mean over seeds
out['sgd_steps_per_epoch'] = (n - 8) // 8 + 1

# 1D slice for the GD vs Newton animation: one standardised feature, no intercept, same lambda
j = list(d.feature_names).index('worst concave points')
x1 = Xs[:, j]; s1 = 1 - 2 * y        # +1 malignant, -1 benign
def f1(w): return np.mean(np.logaddexp(0, -s1 * w * x1)) + 0.5 * lam * w * w
def g1(w): return np.mean(-s1 * x1 * sig(-s1 * w * x1)) + lam * w
def h1(w):
    p = sig(s1 * w * x1); return np.mean(x1 * x1 * p * (1 - p)) + lam
w = 0.0
for _ in range(60): w -= g1(w) / h1(w)
out['one_d'] = {'feature': 'worst concave points', 'wstar': w, 'fstar': f1(w), 'f0': f1(0.0), 'g0': g1(0.0), 'h0': h1(0.0), 'hstar': h1(w)}
x1r = np.round(x1, 3)
# 2D slice for the lab: two features, no intercept
j2 = [list(d.feature_names).index('mean radius'), list(d.feature_names).index('mean texture')]
X2 = np.round(Xs[:, j2], 3)
json.dump({'summary': out, 'curves': curves, 'sgd': sg}, open('lr_out.json', 'w'), indent=0, default=float)
json.dump({'x1': x1r.tolist(), 's': s1.astype(int).tolist(), 'X2': X2.tolist(), 'lam': lam}, open('lr_data.json', 'w'))
for k, v in out.items():
    if k not in ('noise_w0', 'noise_wstar'): print(k, v)
print('noise w0', {B: round(v['measured'] / v['formula'], 3) for B, v in out['noise_w0']['by_B'].items()})

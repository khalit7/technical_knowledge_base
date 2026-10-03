"""Independent recomputation of everything the page computes in JavaScript (check/js_out.json, written by
check_core.mjs), with scikit-learn and NumPy. Also reproduces the published figures the page quotes.
Run: node check_core.mjs && uv run --with scikit-learn --with numpy python recompute.py"""
import json, numpy as np
from sklearn.datasets import load_diabetes
from sklearn.linear_model import lars_path, Lasso, ElasticNet, Ridge, LinearRegression

J = json.load(open('check/js_out.json'))
res = []
def chk(name, a, b, tol):
    a, b = np.asarray(a, float), np.asarray(b, float)
    err = float(np.max(np.abs(a - b) / np.maximum(1, np.abs(b))))
    res.append({'check': name, 'max_rel_err': err, 'tol': tol, 'ok': bool(err <= tol)}); return err

raw = load_diabetes(scaled=False); X0, y0 = raw.data, raw.target
Xs = (X0 - X0.mean(0)); Xs = Xs / np.sqrt((Xs ** 2).sum(0)); yc = y0 - y0.mean(); n = len(yc)
sk = load_diabetes()  # scikit-learn's own scaled copy
chk('standardised raw data equals scikit-learn scaled diabetes', Xs, sk.data, 1e-6)

ols = LinearRegression(fit_intercept=False).fit(Xs, yc).coef_
chk('OLS coefficients', J['ols'], ols, 1e-9)
alphas, active, coefs = lars_path(Xs, yc, method='lasso')
chk('lasso path knots: lambda', [k['lam'] for k in J['knots']], alphas, 1e-8)
chk('lasso path knots: coefficients', np.array([k['b'] for k in J['knots']]).T, coefs, 1e-8)
L = J['lams']
chk('ridge (Ridge alpha = n*lam)', J['ridge'], [Ridge(alpha=n * l, fit_intercept=False, solver='cholesky').fit(Xs, yc).coef_ for l in L], 1e-9)
las = [Lasso(alpha=l, fit_intercept=False, tol=1e-14, max_iter=10**6).fit(Xs, yc).coef_ for l in L]
chk('lasso by coordinate descent', J['lasso_cd'], las, 1e-7)
chk('lasso read off the exact path', J['lasso_path'], las, 1e-7)
chk('elastic net rho 0.5', J['enet5'], [ElasticNet(alpha=l, l1_ratio=.5, fit_intercept=False, tol=1e-14, max_iter=10**6).fit(Xs, yc).coef_ for l in L], 1e-7)
chk('elastic net rho 0.2', J['enet2'], [ElasticNet(alpha=l, l1_ratio=.2, fit_intercept=False, tol=1e-14, max_iter=10**6).fit(Xs, yc).coef_ for l in L], 1e-7)
for k, ix in {'bmi_ltg': [2, 8], 's1_s2': [4, 5]}.items():
    X2 = Xs[:, ix]; s = J['sub'][k]
    chk(k + ' OLS', s['ols'], LinearRegression(fit_intercept=False).fit(X2, yc).coef_, 1e-9)
    a2, _, c2 = lars_path(X2, yc, method='lasso')
    chk(k + ' lasso knots', [kk['lam'] for kk in s['knots']], a2, 1e-8)
    chk(k + ' ridge', s['ridge'], [Ridge(alpha=n * l, fit_intercept=False).fit(X2, yc).coef_ for l in L], 1e-9)
    chk(k + ' enet', s['enet5'], [ElasticNet(alpha=l, l1_ratio=.5, fit_intercept=False, tol=1e-14, max_iter=10**6).fit(X2, yc).coef_ for l in L], 1e-7)
# gradient descent from zero
G = Xs.T @ Xs; c = Xs.T @ yc; eta = J['gd_eta']; b = np.zeros(10); traj = [b.copy()]
for t in range(200): b = b + eta * (c - G @ b) / n; traj.append(b.copy())
chk('gradient descent path', J['gd'], [traj[t] for t in [1, 5, 20, 100, 200]], 1e-9)
chk('stable step: eta = 1.9 n / lambda_max(G)', [eta], [1.9 * n / np.linalg.eigvalsh(G).max()], 1e-9)

# mulberry32 and the splits
def mulberry32(seed):
    a = seed & 0xffffffff
    def r():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xffffffff; t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xffffffff
        t ^= (t + (((t ^ (t >> 7)) * (t | 61)) & 0xffffffff)) & 0xffffffff
        return ((t ^ (t >> 14)) & 0xffffffff) / 4294967296
    return r
r = mulberry32(42); chk('PRNG', J['rng'], [r(), r(), r()], 0)
def split(N, m, seed):
    r = mulberry32(seed); ix = list(range(N))
    for i in range(N - 1, 0, -1):
        j = int(r() * (i + 1)); ix[i], ix[j] = ix[j], ix[i]
    return ix[:m], ix[m:]
for s in J['splits']:
    tr, te = split(n, s['m'], s['seed']); assert tr[:8] == s['tr'], 'split mismatch'
    mu = X0[tr].mean(0); sc = np.sqrt(((X0[tr] - mu) ** 2).sum(0)); my = y0[tr].mean()
    A = (X0[tr] - mu) / sc; B = (X0[te] - mu) / sc; ya = y0[tr] - my; yb = y0[te] - my; m = len(tr)
    mse = lambda w: float(np.mean((yb - B @ w) ** 2))
    chk('held-out MSE ridge, m=%d seed %d' % (s['m'], s['seed']), s['ridge'], [mse(Ridge(alpha=m * l, fit_intercept=False).fit(A, ya).coef_) for l in L], 1e-8)
    chk('held-out MSE lasso, m=%d seed %d' % (s['m'], s['seed']), s['lasso'], [mse(Lasso(alpha=l, fit_intercept=False, tol=1e-14, max_iter=10**6).fit(A, ya).coef_) for l in L], 1e-6)
    chk('held-out MSE OLS, m=%d seed %d' % (s['m'], s['seed']), [s['ols']], [mse(LinearRegression(fit_intercept=False).fit(A, ya).coef_)], 1e-8)

# published figures (Efron et al. 2004, section 1): t = sum|b| reaches 3460.00 at OLS; at t = 1000 only variables 3, 9, 4, 7 are in
t_ols = np.abs(ols).sum()
tk = np.abs(coefs).sum(0); k = np.searchsorted(tk, 1000); nz = sorted(int(i) + 1 for i in np.nonzero(coefs[:, k])[0])
pub = {'t_at_ols': round(float(t_ols), 2), 'vars_at_t1000': nz, 'entry_order': [int(a) + 1 for a in active]}
res.append({'check': 'Efron et al.: t at OLS = 3460.00 (reproduces to 0.02: 3459.98)', 'value': pub['t_at_ols'], 'ok': bool(abs(t_ols - 3460.00) < 0.05)})
res.append({'check': 'Efron et al.: at t = 1000 only variables 3, 9, 4, 7', 'value': nz, 'ok': nz == [3, 4, 7, 9]})
# input dropout on linear regression = ridge with Gamma (Srivastava et al. 2014, section 9.1), by Monte Carlo
rng = np.random.default_rng(0); p = 0.8; K = 4000
GG = np.zeros((10, 10)); cc = np.zeros(10)
for _ in range(K):
    R = rng.random(Xs.shape) < p; XR = Xs * R; GG += XR.T @ XR; cc += XR.T @ yc
w_mc = np.linalg.solve(GG / K, cc / K) * p          # absorb p (w~ = p w)
w_ridge = Ridge(alpha=(1 - p) / p, fit_intercept=False).fit(Xs, yc).coef_  # unit-length columns: Gamma = I
e = float(np.max(np.abs(w_mc - w_ridge)) / np.max(np.abs(w_ridge)))
res.append({'check': 'input dropout (keep 0.8) averaged over 4,000 masks vs ridge alpha (1-p)/p = 0.25 (max diff / max |w|)', 'max_rel_err': e, 'tol': 0.01, 'ok': bool(e < 0.01)})

# the dropout network: the page's JavaScript forward pass against PyTorch on the stored (8-bit) weights
import base64, torch
DG = json.load(open('inputs/digits_mlp.json')); M = DG['model']; KEEP = M['keep']
Ws = [np.frombuffer(base64.b64decode(w), dtype=np.int8).reshape(o, i).astype(np.float64) * np.array(sc)[:, None] for w, sc, (i, o) in zip(M['W'], M['sc'], zip(M['sizes'][:-1], M['sizes'][1:]))]
Bs = [np.array(b) for b in M['b']]
X = np.array([[int(c, 17) / 16 for c in DG['digits'][k * 64:(k + 1) * 64]] for k in range(len(DG['labels']))])
def tfwd(x, masks=None):
    h = torch.tensor(x, dtype=torch.float64)
    for l in range(3):
        if masks is not None: h = h * torch.tensor(masks[l], dtype=torch.float64) / KEEP[l]
        h = h @ torch.tensor(Ws[l]).T + torch.tensor(Bs[l])
        if l < 2: h = torch.relu(h)
    return torch.softmax(h, -1).numpy()
P = tfwd(X)
res.append({'check': 'dropout net: weight-scaled predictions, all 360 test digits (JS vs PyTorch)', 'value': int((P.argmax(1) != np.array(J['ws_pred'])).sum()), 'ok': bool((P.argmax(1) == np.array(J['ws_pred'])).all())})
err = float((P.argmax(1) != np.array([int(c) for c in DG['labels']])).mean())
res.append({'check': 'dropout net: weight-scaled test error equals the recorded 1.39%', 'value': err, 'ok': abs(err - DG['measures']['quantised_weight_scaling_err']) < 1e-12})
chk('dropout net: probabilities on test digit 0', J['ws_probs0'], P[0], 1e-9)
r = mulberry32(1242); th = []
for d in [5, 17]:
    masks = [np.array([r() < KEEP[l] for _ in range(n)]) for l, n in enumerate(M['sizes'][:-1])]
    th.append(tfwd(X[d:d + 1], masks)[0])
chk('dropout net: two thinned networks with the seeded masks', J['thin'], th, 1e-9)
h1 = torch.relu(torch.tensor(X[DG['measures']['clear'][0]]) @ torch.tensor(Ws[0]).T + torch.tensor(Bs[0])).numpy()
chk('dropout animation: the 96 first-layer activations', J['acts0'], h1, 1e-9)
json.dump({'checks': res, 'published': pub, 'ridge_equiv_dropout': {'p': p, 'w_mc': w_mc.tolist(), 'w_ridge': w_ridge.tolist()}}, open('check/recompute.json', 'w'), indent=1)
bad = [x for x in res if not x['ok']]
for x in res: print(('ok  ' if x['ok'] else 'FAIL'), x['check'], x.get('max_rel_err', x.get('value')))
print(len(res), 'checks,', len(bad), 'failures')

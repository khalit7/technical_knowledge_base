# Recompute every hand-worked number on the page and summarise the real runs (inputs/*.json).
# Writes numbers.json (read by check_page.mjs, which compares the page's text and JavaScript with it) and recompute.out.
# usage (from this folder): uv run --no-project --with numpy --with sympy python recompute.py
import json, math
import numpy as np
import sympy as sp

N = {}
def put(k, v, nd=4):
    if isinstance(v, (list, tuple, np.ndarray)):
        N[k] = [round(float(a), nd) for a in v]
    else:
        N[k] = round(float(v), nd)
    return v
sig = lambda z: 1 / (1 + math.exp(-z)) if z >= 0 else math.exp(z) / (1 + math.exp(z))

# ---- 1. derivative as slope and best linear approximation: f(x) = x^2 at x = 3 ----
for h in (1, 0.1, 0.01, 0.001):
    put(f'sec_{h}', ((3 + h) ** 2 - 9) / h, 4)          # secant slope 6 + h
    put(f'linerr_{h}', (3 + h) ** 2 - (9 + 6 * h), 6)   # error of the tangent line = h^2
# rules, checked symbolically
x = sp.symbols('x')
rules = {
    'sigmoid': (1 / (1 + sp.exp(-x)), sp.exp(-x) / (1 + sp.exp(-x)) ** 2),
    'softplus': (sp.log(1 + sp.exp(x)), 1 / (1 + sp.exp(-x))),
    'x2ex': (x ** 2 * sp.exp(x), (2 * x + x ** 2) * sp.exp(x)),
    'log1px2': (sp.log(1 + x ** 2), 2 * x / (1 + x ** 2)),
    'tanh': (sp.tanh(x), 1 - sp.tanh(x) ** 2),
}
N['rules_ok'] = all(sp.simplify(sp.diff(f, x) - d) == 0 for f, d in rules.values())
put('sigmoid_slope0', 0.25)
put('x2ex_at1', 3 * math.e)                              # (2 + 1) e

# ---- tiny model (root): x = (2, 1), W rows cat (1,0), dog (0,1), sat (1,-2); target sat ----
z = np.array([2.0, 1.0, 0.0]); p = np.exp(z) / np.exp(z).sum()
L0 = -math.log(p[2]); put('tiny_loss', L0, 3); put('tiny_p', p, 3)
gz = p.copy(); gz[2] -= 1; put('tiny_gz', gz, 3); put('tiny_gnorm', np.linalg.norm(gz), 3)
put('tiny_slope_sat', gz[2], 3)
def Lz(zz): return -zz[2] + math.log(np.exp(zz).sum())
z2 = z.copy(); z2[2] += 0.1
put('nudge_actual', Lz(z2), 4); put('nudge_first', L0 + 0.1 * gz[2], 4)
Hz = np.diag(p) - np.outer(p, p)
put('nudge_second', L0 + 0.1 * gz[2] + 0.5 * 0.01 * Hz[2, 2], 4); put('Hz_satsat', Hz[2, 2], 4)
put('Hz_eigs', np.linalg.eigvalsh(Hz), 4)
Wt = np.array([[1, 0], [0, 1], [1, -2.0]]); Hx = Wt.T @ Hz @ Wt
N['tiny_Hx'] = [[round(float(v), 4) for v in r] for r in Hx]; put('tiny_Hx_eigs', np.linalg.eigvalsh(Hx), 4)
# the root's eta = 0.1 step moves the scores by -0.5 g (||x||^2 = 5)
dz = -0.5 * gz
put('step_actual', Lz(z + dz), 3); put('step_first', L0 + gz @ dz, 3); put('step_second', L0 + gz @ dz + 0.5 * dz @ Hz @ dz, 3)
# directional derivative of the tiny loss along unit u
for name, u in (('cat', [1, 0, 0]), ('sat', [0, 0, 1]), ('grad', gz / np.linalg.norm(gz)), ('neg', -gz / np.linalg.norm(gz))):
    put('dir_' + name, np.dot(gz, u), 3)

# ---- 2. a 2D bowl for the gradient / directional derivative figure: f(x, y) = x^2 + 3 y^2 at (1, 1) ----
g2 = np.array([2.0, 6.0]); put('bowl_g', g2); put('bowl_gnorm', np.linalg.norm(g2), 3)
put('bowl_dir_x', g2 @ [1, 0], 3); put('bowl_dir_45', g2 @ (np.array([1, 1]) / math.sqrt(2)), 3)

# ---- 3. Taylor: e^x at 0, evaluated at 0.5 ----
put('exp_first', 1.5, 4); put('exp_second', 1 + 0.5 + 0.125, 4); put('exp_true', math.exp(0.5), 4)

# ---- 4. gradients of the standard losses ----
put('mse_half_L', 0.5 * 0.5 ** 2); put('mse_half_g', 0.5); put('mse_full_L', 0.5 ** 2); put('mse_full_g', 1.0)
# batch-mean MSE without the half, n = 4 example
put('bce_m6_p', sig(-6), 4); put('bce_m6_L', -math.log(sig(-6)), 4); put('bce_m6_g', sig(-6) - 1, 4)
put('bce_2_p', sig(2), 4); put('bce_2_L', -math.log(sig(2)), 4); put('bce_2_g', sig(2) - 1, 4)
pm = sig(-6); mse_sig = 2 * (pm - 1) * pm * (1 - pm)
put('mse_sig_g', mse_sig, 4); put('mse_vs_ce_ratio', (sig(-6) - 1) / mse_sig, 1)
zc = np.array([2, 1, 0.1]); ec = np.exp(zc); put('ce_exp', ec, 3); put('ce_sum', ec.sum(), 4)
pc = ec / ec.sum(); put('ce_p', pc, 3); put('ce_L', -math.log(pc[0]), 3)
gc = pc.copy(); gc[0] -= 1; put('ce_g', gc, 3)
put('lse_1000', 1001 + math.log(1 + math.exp(-1)), 3)
# Poisson with log link: rate e^z, NLL = e^z - y z + ln y!; gradient e^z - y. y = 3, z = ln 2
put('pois_rate', 2.0); put('pois_g', 2.0 - 3); put('pois_L', 2 - 3 * math.log(2) + math.log(6), 3)
# soft labels: z = (2,1,0), q = (0.9, 0.05, 0.05) -> p - q
q = np.array([0.9, 0.05, 0.05]); put('soft_g', p - q, 3)
# normal equations example (old page)
X = np.array([[1, 1], [1, 2], [1, 3.0]]); yv = np.array([1, 3, 4.0])
w = np.linalg.solve(X.T @ X, X.T @ yv); put('ne_w', w, 4); put('ne_res', X @ w - yv, 3)
# one logistic unit, one step (old page)
xv = np.array([1, 2.0]); wv = np.array([0.5, -0.25]); b = 0.1
zz = wv @ xv + b; pp = sig(zz); put('lu_z', zz); put('lu_p', pp, 3); put('lu_L', -math.log(pp), 3)
gzz = pp - 1; put('lu_gz', gzz, 3); put('lu_gw', gzz * xv, 3); put('lu_gx', gzz * wv, 4)
w2 = wv - 0.1 * gzz * xv; b2 = b - 0.1 * gzz; put('lu_w2', w2, 4); put('lu_b2', b2, 4)
put('lu_z2', w2 @ xv + b2, 3); put('lu_p2', sig(w2 @ xv + b2), 3)

# ---- 5. Hessians and critical points ----
a, c = sp.symbols('a c')
for nm, fx in (('bowl', a ** 2 + c ** 2), ('saddle', a ** 2 - c ** 2), ('cap', -a ** 2 - c ** 2), ('flat', a ** 2 + c ** 4)):
    H = sp.hessian(fx, (a, c)).subs({a: 0, c: 0}); N['H_' + nm] = [[float(v) for v in row] for row in H.tolist()]
Hxy = sp.hessian(a ** 2 * c, (a, c)); N['H_x2y_symmetric'] = bool(Hxy == Hxy.T)
# monkey-saddle style lab saddle: f = x^2 + y^4/4 - y^2/2 has a saddle at 0 and minima at y = +-1
put('lab_saddle_min_y', 1.0); put('lab_saddle_min_f', 0.25 - 0.5)

# ---- 7. step-size limit and rate on a quadratic: H = diag(1, 10) ----
lmin, lmax = 1.0, 10.0; kap = lmax / lmin
put('q_limit', 2 / lmax); put('q_best_eta', 2 / (lmax + lmin), 4); put('q_rate', (kap - 1) / (kap + 1), 4)
put('q_steps_1000', math.log(1000) / math.log((kap + 1) / (kap - 1)), 2)
put('q_rate_1overL', 1 - 1 / kap, 3); put('q_steps_1000_1overL', math.log(1000) / -math.log(1 - 1 / kap), 2)
# check the rate by running GD at the best step from (1, 1)
th = np.array([1.0, 1.0]); eta = 2 / 11
for _ in range(35): th = th - eta * np.array([1, 10]) * th
put('q_after35', np.max(np.abs(th)), 6)
# momentum (Goh 2017): optimal alpha, beta and rate
al = (2 / (math.sqrt(lmin) + math.sqrt(lmax))) ** 2; be = ((math.sqrt(lmax) - math.sqrt(lmin)) / (math.sqrt(lmax) + math.sqrt(lmin))) ** 2
put('hb_alpha', al, 4); put('hb_beta', be, 4); put('hb_rate', (math.sqrt(kap) - 1) / (math.sqrt(kap) + 1), 4)
put('hb_steps_1000', math.log(1000) / -math.log((math.sqrt(kap) - 1) / (math.sqrt(kap) + 1)), 2)
# simulate heavy ball (Goh's form z <- beta z + grad, w <- w - alpha z) and measure the late rate
w_ = np.array([1.0, 1.0]); zv = np.zeros(2); hist = []
for k in range(200):
    zv = be * zv + np.array([1, 10]) * w_; w_ = w_ - al * zv; hist.append(np.linalg.norm(w_))
put('hb_rate_measured', (hist[150] / hist[100]) ** (1 / 50), 4)
put('hb_limit_beta09', 2 * (1 + 0.9) / lmax, 3)   # stable while alpha * lambda < 2 + 2 beta
# the root's tiny model: lambda_max along W = 5 * top eigenvalue of Hz
put('tiny_lmax_W', 5 * np.linalg.eigvalsh(Hz).max(), 3); put('tiny_eta_limit', 2 / (5 * np.linalg.eigvalsh(Hz).max()), 3)

# ---- 9. Newton cost at scale ----
put('newton_entries_1e9', 1e18, 0); put('newton_bytes_bf16_EB', 1e18 * 2 / 1e18, 1)
# 1D logistic regression slice (breast-cancer feature 'worst concave points', +1 malignant)
D1 = json.load(open('inputs/lr_data.json')); x1 = np.array(D1['x1']); s1 = np.array(D1['s']); lam = D1['lam']; n1 = len(x1)
def f1(w): return float(np.mean(np.logaddexp(0, -s1 * w * x1)) + 0.5 * lam * w * w)
def g1(w): return float(np.mean(-s1 * x1 * np.exp(-np.logaddexp(0, s1 * w * x1))) + lam * w)
def h1(w):
    pp = 1 / (1 + np.exp(-s1 * w * x1)); return float(np.mean(x1 * x1 * pp * (1 - pp)) + lam)
Lb = float(np.mean(x1 * x1)) / 4 + lam
put('od_L', Lb, 4); put('od_eta', 1 / Lb, 4)
for start in (0.0, 8.0):
    w = start; nt = [w]
    for k in range(6): w = w - g1(w) / h1(w); nt.append(w)
    w = start; gd = [w]
    for k in range(30): w = w - g1(w) / Lb; gd.append(w)
    put(f'od_newton_{int(start)}', nt, 3); put(f'od_gd_{int(start)}', gd, 3)
    put(f'od_f_{int(start)}', f1(start), 4); put(f'od_g_{int(start)}', g1(start), 4); put(f'od_h_{int(start)}', h1(start), 4)
w = 0.0
for _ in range(60): w -= g1(w) / h1(w)
put('od_wstar', w, 3); put('od_fstar', f1(w), 4); put('od_hstar', h1(w), 4)
put('od_gd_rate', 1 - h1(w) / Lb, 3)

# 2D slice for the lab (mean radius, mean texture; no intercept)
X2 = np.array(D1['X2'])
def g2(w):
    m = s1 * (X2 @ w); return -(X2 * (s1 / (1 + np.exp(m)))[:, None]).mean(0) + lam * w
def H2(w):
    q = 1 / (1 + np.exp(-(X2 @ w))); return (X2 * (q * (1 - q))[:, None]).T @ X2 / len(X2) + lam * np.eye(2)
w2 = np.zeros(2)
for _ in range(40): w2 = w2 - np.linalg.solve(H2(w2), g2(w2))
put('lab_logit_wstar', w2, 4); put('lab_logit_Hstar_eigs', np.linalg.eigvalsh(H2(w2)), 4)
put('hb_kappa100', 9 / 11, 4); put('gd_kappa100', 99 / 101, 4); put('gd_steps_kappa100', math.log(1000) / math.log(101 / 99), 1)
# ---- 10/14. real logistic regression runs (inputs/lr_out.json, made by inputs/lr_real.py) ----
R = json.load(open('inputs/lr_out.json')); S = R['summary']
for k in ('fstar', 'f0', 'L_global', 'Hstar_eig_max', 'Hstar_eig_min', 'kappa_star', 'kappa_0', 'eta_gd', 'eta_gd_best',
          'nag_beta', 'adam_best_lr', 'gd_best_rate_measured', 'gd_best_rate_predicted', 'sklearn_max_abs_diff', 'gd_final_gap'):
    put('lr_' + k, S[k], 6)
N['lr_iters'] = S['iters_to_1e-6']; N['lr_lbfgs_nfev'] = S['lbfgs_nfev_to_1e-6']
N['lr_newton_gaps'] = [float('%.3g' % max(v, 0)) for v in S['newton_gaps'][:10]]
N['lr_noise_w0'] = {B: [round(v['measured'], 4), round(v['formula'], 4)] for B, v in S['noise_w0']['by_B'].items()}
put('lr_sigma2_w0', S['noise_w0']['sigma2'], 3); put('lr_gnorm2_w0', S['noise_w0']['gnorm2'], 3); put('lr_sigma2_wstar', S['noise_wstar']['sigma2'], 3)
sg = R['sgd']; N['sgd_final'] = {k: float('%.3g' % v[-1]) for k, v in sg.items()}

# ---- 11. XGBoost leaf (old page example, logistic loss) ----
g = np.array([-0.5, -0.5, -0.5, 0.5]); hh = np.full(4, 0.25); lam_x = 1.0
G, H = g.sum(), hh.sum(); put('xgb_w', -G / (H + lam_x), 4)
GL, HL, GR, HR = g[:3].sum(), hh[:3].sum(), g[3], hh[3]
gain = 0.5 * (GL ** 2 / (HL + lam_x) + GR ** 2 / (HR + lam_x) - G ** 2 / (H + lam_x))
put('xgb_gain', gain, 3); put('xgb_wL', -GL / (HL + lam_x), 3); put('xgb_wR', -GR / (HR + lam_x), 3)
put('xgb_newton_unreg', -G / H, 3)

# ---- 12. convexity and Jensen ----
put('chord_lhs', 1.0); put('chord_rhs', 0.5 * (1 + 9))
put('jensen_logE', math.log(2.5), 3); put('jensen_Elog', 0.5 * (math.log(1) + math.log(4)), 3)
# ---- 13. Lagrange, KKT, max entropy, KL-constrained step ----
put('lag_x', 1 / math.sqrt(2), 3); put('lag_lam', 1 / math.sqrt(2), 3); put('lag_f', math.sqrt(2), 3)
put('lag_shadow', 1 / math.sqrt(2 * 1), 3)
put('kkt_mu', 2.0)   # min (x-2)^2 s.t. x <= 1: x* = 1, mu = -f'(1) = 2
put('maxent_p', p, 3)
for pp in (0.5, 0.9):
    F = pp * (1 - pp); eps = 0.01; d = math.sqrt(2 * eps / F)
    q2 = sig(math.log(pp / (1 - pp)) + d)
    kl = pp * math.log(pp / q2) + (1 - pp) * math.log((1 - pp) / (1 - q2))
    put(f'trpo_F_{pp}', F, 3); put(f'trpo_step_{pp}', d, 3); put(f'trpo_kl_{pp}', kl, 5); put(f'trpo_newp_{pp}', q2, 3)

# ---- 15. edge of stability run (inputs/eos_out.json, inputs/eos_extra.json) ----
E = json.load(open('inputs/eos_out.json'))['runs']; X2 = json.load(open('inputs/eos_extra.json'))
for eta, r in E.items():
    Ls = r['loss_each_step']; sh = [q['sharp'] for q in r['rec']]
    late = sh[len(sh) // 2:]
    N[f'eos_{eta}'] = {'ups': sum(1 for u, v in zip(Ls, Ls[1:]) if v > u), 'steps': len(Ls) - 1,
                       'sharp0': sh[0], 'sharp_max': max(sh), 'late_mean': round(sum(late) / len(late), 3),
                       'final_loss': round(Ls[-1], 5), 'two_over_eta': round(2 / float(eta), 3)}
for k, r in X2.items():
    if k == 'crosscheck': continue
    sh = [q['sharp'] for q in r['rec']]; late = sh[len(sh) // 2:]
    N[f'eos_seed_{k}'] = round(sum(late) / len(late), 3)
N['eos_crosscheck'] = {'power': round(X2['crosscheck']['power_iteration_200'], 4), 'lanczos': round(X2['crosscheck']['lanczos_top3'][0], 4),
                       'params': X2['crosscheck']['params']}

json.dump(N, open('numbers.json', 'w'), indent=1)
with open('recompute.out', 'w') as fo:
    for k, v in N.items(): fo.write(f'{k}: {v}\n')
print(open('recompute.out').read())

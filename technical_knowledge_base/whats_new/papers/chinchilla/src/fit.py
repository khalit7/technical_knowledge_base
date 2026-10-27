"""Refit Chinchilla's Approaches 2 and 3 on the 245 points Besiroglu et al. (2024) read from Figure 4.

  uv run --no-project --with numpy --with scipy python fit.py      (about a minute on 2 threads)

Writes inputs/fit.json, which mk_paper.py puts into window.PAPER.fit and the page's
"Refit Approach 3" tab checks its in-browser fit against.

What it does:
  1. Approach 3 exactly as Hoffmann et al. Appendix D.2 and Besiroglu et al. describe it: Huber (delta 1e-3)
     on LSE(a - alpha log N, b - beta log D, e) - log L, L-BFGS-B from the paper's grid of initialisations,
     the five highest-loss points dropped (Besiroglu's main fit).  Summed Huber, as it should be.
  2. The same with the Huber losses averaged instead of summed (the bug Borgeaud confirmed), to see whether
     L-BFGS-B's default stopping rule then halts early.
  3. With the outliers kept; with larger delta.
  4. Bootstrap standard errors (200 resamples, BFGS from the best fit, as Besiroglu do with 4000).
  5. Approach 2 on the same points: points within 0.08 dex of one of the paper's nine IsoFLOP budgets,
     a parabola in log N per budget, then power laws through the minima.
  6. The tokens per parameter each fit implies at Chinchilla's budget, and its exponent a = beta/(alpha+beta).
"""
import itertools, json, math, os
import numpy as np
from scipy.optimize import minimize

os.environ.setdefault('OMP_NUM_THREADS', '2')
HERE = os.path.dirname(os.path.abspath(__file__))
rows = [l.split(',') for l in open(os.path.join(HERE, 'inputs', 'epoch_fig4_points.csv')) if l[0].isdigit()]
N = np.array([float(r[0]) for r in rows]); C = np.array([float(r[1]) for r in rows]); L = np.array([float(r[2]) for r in rows])
D = C / (6 * N)
order = np.argsort(L)
keep = np.ones(len(L), bool); keep[order[-5:]] = False   # Besiroglu: drop the five highest losses


def huber(r, d):
    a = np.abs(r)
    return np.where(a <= d, 0.5 * r * r, d * (a - 0.5 * d))


def obj(p, n, dd, l, delta=1e-3, mean=False):
    a, b, e, al, be = p
    t = np.stack([a - al * np.log(n), b - be * np.log(dd), np.full(n.shape, e)])
    m = t.max(0)
    lse = m + np.log(np.exp(t - m).sum(0))
    h = huber(lse - np.log(l), delta)
    return h.mean() if mean else h.sum()


GRID = list(itertools.product(np.arange(0, 30, 5), np.arange(0, 30, 5), np.arange(-1, 1.5, 0.5), np.arange(0, 2.5, 0.5), np.arange(0, 2.5, 0.5)))


def fit_grid(mask, delta=1e-3, mean=False, grid=GRID):
    best = None
    for a, b, e, al, be in grid:
        r = minimize(obj, [a, b, e, al, be], args=(N[mask], D[mask], L[mask], delta, mean), method='L-BFGS-B')
        if best is None or r.fun < best.fun: best = r
    return best


def to_named(p):
    a, b, e, al, be = [float(x) for x in p]
    return {'A': math.exp(a), 'B': math.exp(b), 'E': math.exp(e), 'alpha': al, 'beta': be, 'a_exp': be / (al + be)}


def tpp(f, Cb):
    """Tokens per parameter on the frontier of L = E + A/N^alpha + B/D^beta at budget Cb (Eq. 4)."""
    G = (f['alpha'] * f['A'] / (f['beta'] * f['B'])) ** (1 / (f['alpha'] + f['beta']))
    a = f['beta'] / (f['alpha'] + f['beta']); b = 1 - a
    n = G * (Cb / 6) ** a; d = (Cb / 6) ** b / G
    return n, d, d / n


def resid_stats(f, mask):
    pred = f['E'] + f['A'] / N[mask] ** f['alpha'] + f['B'] / D[mask] ** f['beta']
    r = np.log(pred) - np.log(L[mask])
    return {'mean': float(r.mean()), 'rms': float(np.sqrt((r * r).mean())), 'huber_sum': float(huber(r, 1e-3).sum())}


out = {'n_points': int(len(L)), 'n_kept': int(keep.sum())}
CG = 5.76e23
H_R = {'A': 406.4, 'B': 410.7, 'E': 1.69, 'alpha': 0.34, 'beta': 0.28}
H_U = to_named([6.0073404, 6.0179186, 0.5267228, 0.33917084, 0.2849083])
H_R['a_exp'] = H_R['beta'] / (H_R['alpha'] + H_R['beta'])
fits = {}
print('fitting, summed Huber, 240 points (grid of %d starts)' % len(GRID))
r = fit_grid(keep); fits['sum'] = dict(to_named(r.x), obj=float(r.fun), nit=int(r.nit))
print(fits['sum'])
print('averaged Huber (the bug)')
r = fit_grid(keep, mean=True); fits['mean'] = dict(to_named(r.x), obj=float(r.fun) * keep.sum(), nit=int(r.nit))
print(fits['mean'])
# the bug from one start near the paper's own reported optimum's neighbourhood: how far does it move?
starts = []
for s in ([5, 5, 0.5, 0.5, 0.5], [5, 10, 0.5, 0.5, 0.5], [0, 0, 0, 0, 0]):
    rs = minimize(obj, s, args=(N[keep], D[keep], L[keep], 1e-3, False), method='L-BFGS-B')
    rm = minimize(obj, s, args=(N[keep], D[keep], L[keep], 1e-3, True), method='L-BFGS-B')
    starts.append({'start': s, 'sum': dict(to_named(rs.x), nit=int(rs.nit)), 'mean': dict(to_named(rm.x), nit=int(rm.nit), msg=str(rm.message))})
fits['starts'] = starts
print('outliers kept')
r = fit_grid(np.ones(len(L), bool)); fits['all'] = dict(to_named(r.x), obj=float(r.fun))
print(fits['all'])
print('delta 1e-1 (close to least squares in log)')
r = fit_grid(keep, delta=0.1); fits['d01'] = dict(to_named(r.x), obj=float(r.fun))
print(fits['d01'])
for k in ('sum', 'mean', 'all', 'd01'):
    n, d, t = tpp(fits[k], CG); fits[k].update(N_gopher=n, D_gopher=d, tpp_gopher=t, resid=resid_stats(fits[k], keep))
for nm, f in (('hoff_rounded', H_R), ('hoff_unrounded', H_U)):
    n, d, t = tpp(f, CG); fits[nm] = dict(f, N_gopher=n, D_gopher=d, tpp_gopher=t, resid=resid_stats(f, keep))
print({k: (round(v['tpp_gopher'], 1), round(v['a_exp'], 4)) for k, v in fits.items() if k != 'starts'})

# bootstrap
rng = np.random.default_rng(42)
idx = np.where(keep)[0]
p0 = np.log([fits['sum']['A'], fits['sum']['B'], fits['sum']['E']]).tolist() + [fits['sum']['alpha'], fits['sum']['beta']]
bs = []
for i in range(200):
    s = rng.choice(idx, size=len(idx), replace=True)
    rb = minimize(obj, p0, args=(N[s], D[s], L[s]), method='BFGS')
    f = to_named(rb.x); bs.append([f['A'], f['B'], f['E'], f['alpha'], f['beta'], f['a_exp'], tpp(f, CG)[2]])
bs = np.array(bs)
names = ['A', 'B', 'E', 'alpha', 'beta', 'a_exp', 'tpp_gopher']
out['bootstrap'] = {n: {'se': float(bs[:, j].std(ddof=1)), 'p10': float(np.percentile(bs[:, j], 10)), 'p90': float(np.percentile(bs[:, j], 90))} for j, n in enumerate(names)}
out['bootstrap']['n'] = 200
print('bootstrap', out['bootstrap'])

# Approach 2 on the extracted points
budgets = [6e18, 1e19, 3e19, 6e19, 1e20, 3e20, 6e20, 1e21, 3e21]
iso = []
for cb in budgets:
    m = np.abs(np.log10(C) - math.log10(cb)) < 0.08
    if m.sum() < 4: continue
    x = np.log10(N[m]); y = L[m]
    c2, c1, c0 = np.polyfit(x, y, 2)
    nopt = 10 ** (-c1 / (2 * c2)) if c2 > 0 else float('nan')
    iso.append({'C': cb, 'n': int(m.sum()), 'quad': [float(c2), float(c1), float(c0)], 'N_opt': float(nopt), 'D_opt': float(cb / (6 * nopt)),
                'pts': [[float(N[i]), float(L[i])] for i in np.where(m)[0]]})
lc = np.log10([q['C'] for q in iso]); ln = np.log10([q['N_opt'] for q in iso]); ld = np.log10([q['D_opt'] for q in iso])
aN, kN = np.polyfit(lc, ln, 1); aD, kD = np.polyfit(lc, ld, 1)
out['approach2'] = {'iso': iso, 'a': float(aN), 'b': float(aD), 'kN': float(kN), 'kD': float(kD),
                    'N_gopher': float(10 ** (kN + aN * math.log10(CG))), 'D_gopher': float(10 ** (kD + aD * math.log10(CG)))}
print('approach 2 on extracted points: a=%.3f b=%.3f N(Gopher)=%.3g D=%.3g' % (aN, aD, out['approach2']['N_gopher'], out['approach2']['D_gopher']))
out['fits'] = fits
json.dump(out, open(os.path.join(HERE, 'inputs', 'fit.json'), 'w'), indent=1)
print('wrote inputs/fit.json')

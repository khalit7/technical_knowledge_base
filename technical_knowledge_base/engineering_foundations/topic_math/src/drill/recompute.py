"""Practice drills (t-drill): recompute every answer and every number shown in a solution step.

Run from anywhere (no repo venv needed):
  uv run --no-project --with numpy --with sympy --with scipy python recompute.py

Part 1 computes each problem's answer and the intermediate numbers its steps quote, with numpy/sympy.
Part 2 reads ../parts/33_tab_drill.html and checks, for every problem card:
  - data-ans (the value the page's answer box checks against) equals the computed answer within 0.2% (or 1e-9),
  - each intermediate number, formatted as the page shows it, appears in the card's text,
  - every card in the page is computed here, and every computed problem is in the page.
Exit status 1 on any mismatch.
"""
import math, re, sys, html, os
from fractions import Fraction as Fr
import numpy as np
import sympy as sp

P = {}  # id -> dict(ans=float or list, nums=[(value, text as shown)])


def put(pid, ans, *nums):
    P[pid] = dict(ans=ans, nums=list(nums))


def f(v, d):
    """format v with d decimals, the way the page writes it (minus sign as the Unicode minus in prose is normalised later)."""
    return f"{v:.{d}f}"


def g(v):
    """thousands separators for integers"""
    return f"{int(round(v)):,}"

# ---------------- Linear algebra ----------------
a, b = np.array([1, 2, 3]), np.array([4, -1, 2])
put('la1', float(a @ b), ('4', '4'), ('-2', '-2'), ('6', '6'))

u, v = np.array([1, 0, 1]), np.array([1, 1, 0])
cs = u @ v / np.linalg.norm(u) / np.linalg.norm(v)
put('la2', cs, (np.linalg.norm(u), f(np.linalg.norm(u), 3)), (cs, '0.5'))

W = np.array([[1, 0], [0, 1], [1, -2]]); x = np.array([2, 1])  # the Reading's tiny model (src/read/numbers.json)
put('la3', list((W @ x).astype(float)))

M = np.array([[4, 1], [2, 3]])
ev = sorted(np.linalg.eigvals(M).real)
assert np.isclose(np.trace(M), 7) and np.isclose(np.linalg.det(M), 10)
put('la4', ev)

S = np.array([[2, 1], [1, 2]])
w, V = np.linalg.eigh(S)
assert np.allclose(sorted(w), [1, 3])
assert np.allclose(S @ np.array([1, 1]), 3 * np.array([1, 1])) and np.allclose(S @ np.array([1, -1]), np.array([1, -1]))
put('la5', [1.0, 3.0])

R = np.array([[1, 2, 3], [2, 4, 6], [1, 0, 1]])
put('la6', float(np.linalg.matrix_rank(R)))

A = np.array([[2, 2], [1, 1]])
sv = np.linalg.svd(A, compute_uv=False)
assert np.isclose(sv[0], math.sqrt(10)) and np.isclose(sv[1], 0)
put('la7', sv[0], (math.sqrt(5), f(math.sqrt(5), 3)), (math.sqrt(2), f(math.sqrt(2), 3)), (sv[0], f(sv[0], 3)),
    (2 / math.sqrt(5), f(2 / math.sqrt(5), 3)), (1 / math.sqrt(5), f(1 / math.sqrt(5), 3)), (1 / math.sqrt(2), f(1 / math.sqrt(2), 3)))

d = 4096; r = 8
full = d * d; lora = r * (d + d)
put('la8', lora, (full, g(full)), (lora, g(lora)), (full / lora, g(full / lora)), (100 * lora / full, f(100 * lora / full, 2)),
    (d * d / (2 * d), g(d * d / (2 * d))))

# attention cost per token per layer (Kaplan et al. 2020 Table 1, forward FLOPs): non-context 24 d^2, context 2 n d
dm = 4096; n_cross = 12 * dm
put('la9', n_cross, (n_cross, g(n_cross)), (4096 ** 2 * 128, g(4096 ** 2 * 128)), (24 * dm ** 2, g(24 * dm ** 2)),
    (2 * 8192 * dm / (24 * dm ** 2) * 100, f(2 * 8192 * dm / (24 * dm ** 2) * 100, 1)))

U, s, Vt = np.linalg.svd(S)
A1 = s[0] * np.outer(U[:, 0], Vt[0])
err = np.linalg.norm(S - A1)
assert np.allclose(A1, [[1.5, 1.5], [1.5, 1.5]])
put('la10', err, (s[0] ** 2 / (s ** 2).sum(), f(s[0] ** 2 / (s ** 2).sum(), 1)))

e = np.array([1, -1]); xx = np.array([1, 0, 2])
G = np.outer(e, xx)
assert np.linalg.matrix_rank(G) == 1
put('la11', list(G.flatten().astype(float)))

# ---------------- Probability and statistics ----------------
die = np.arange(1, 7)
m, var = die.mean(), die.var()
assert Fr(int(round(var * 12)), 12) == Fr(35, 12)
put('ps1', [m, var], (var, f(var, 3)), ((die ** 2).mean(), f((die ** 2).mean(), 3)))

two = np.add.outer(die, die).flatten()
assert np.isclose(two.var(), 35 / 6) and np.isclose(two.mean(), 7)
put('ps2', 35 / 6, (35 / 6, f(35 / 6, 3)), (4 * 35 / 12, f(4 * 35 / 12, 3)))

z = np.array([2.0, 1.0, 0.0]); ez = np.exp(z); p = ez / ez.sum()
put('ps3', list(p), (ez[0], f(ez[0], 3)), (ez[1], f(ez[1], 3)), (ez.sum(), f(ez.sum(), 3)),
    (p[0], f(p[0], 3)), (p[1], f(p[1], 3)), (p[2], f(p[2], 3)))

X = np.array([-1, 0, 1]); Y = X ** 2
cov = (X * Y).mean() - X.mean() * Y.mean()
put('ps4', cov, (2 / 3, f(2 / 3, 3)))

prev, sens, fpr = 0.01, 0.8, 0.096
tp, fp = prev * sens, (1 - prev) * fpr
put('ps5', tp / (tp + fp), (tp, f(tp, 3)), (fp, f(fp, 5)), (tp / (tp + fp), f(tp / (tp + fp), 4)))

prev, rec, fpr = 0.001, 0.95, 0.01
tp, fp = prev * rec, (1 - prev) * fpr
prec = tp / (tp + fp)
tp2, fp2 = 0.1 * rec, 0.9 * fpr
put('ps6', prec, (tp, f(tp, 5)), (fp, f(fp, 5)), (prec, f(prec, 4)), (tp2 / (tp2 + fp2), f(tp2 / (tp2 + fp2), 3)))

q = 1.0
for i in range(23):
    q *= (365 - i) / 365
nhalf = math.sqrt(2 * math.log(2) * 2 ** 32)
put('ps7', 1 - q, (q, f(q, 4)), (1 - q, f(1 - q, 4)), (nhalf, g(nhalf)))

H10 = sum(1 / k for k in range(1, 11))
put('ps8', 10 * H10, (H10, f(H10, 4)), (10 * H10, f(10 * H10, 2)))

data = np.array([2, 4, 4, 4, 5, 5, 7, 9.0])
mu = data.mean(); v_mle = ((data - mu) ** 2).mean(); v_unb = ((data - mu) ** 2).sum() / 7
put('ps9', [mu, v_mle], (((data - mu) ** 2).sum(), '32'), (v_unb, f(v_unb, 3)))

acc, n = 0.8, 500
se = math.sqrt(acc * (1 - acc) / n)
put('ps10', 100 * se, (100 * se, f(100 * se, 2)), (196 * se, f(196 * se, 1)), (acc * (1 - acc), '0.16'))

# paired vs unpaired: 500 shared questions, A right 400, B right 410; A right & B wrong 20, B right & A wrong 30
n = 500; pa, pb = 0.80, 0.82
se_un = math.sqrt(pa * (1 - pa) / n + pb * (1 - pb) / n)
dvec = np.array([-1] * 20 + [1] * 30 + [0] * 450)
se_pair = dvec.std(ddof=1) / math.sqrt(n)
mcn = (30 - 20) ** 2 / (30 + 20)
put('ps11', 100 * se_pair, (100 * se_un, f(100 * se_un, 2)), (0.02 / se_un, f(0.02 / se_un, 2)), (100 * se_pair, f(100 * se_pair, 2)),
    (0.02 / se_pair, f(0.02 / se_pair, 2)), (mcn, '2.0'), (dvec.var(ddof=1), f(dvec.var(ddof=1), 4)), (100 * (1 - se_pair / se_un), f(100 * (1 - se_pair / se_un), 0) + '%'))

eps, delta = 0.05, 0.05
nh = math.log(2 / delta) / (2 * eps ** 2)
nclt = (1.96 * 0.5 / 0.05) ** 2
put('ps12', math.ceil(nh), (math.log(2 / delta), f(math.log(2 / delta), 3)), (nh, f(nh, 1)), (nclt, f(nclt, 1)), (math.ceil(nclt), str(math.ceil(nclt))))

from scipy import stats
zc = (60 - 50) / math.sqrt(100 * 0.25)
pn = 2 * (1 - stats.norm.cdf(zc))
pexact = stats.binomtest(60, 100, 0.5).pvalue
pcc = 2 * (1 - stats.norm.cdf(9.5 / 5))
assert abs(pcc - pexact) < 0.001
put('ps13', pn, (zc, '2.0'), (pn, f(pn, 4)), (pexact, f(pexact, 4)), (9.5 / 5, '1.9'))

# ---------------- Calculus and optimisation ----------------
xs = sp.symbols('x')
put('co1', float(sp.diff((3 * xs + 1) ** 2, xs).subs(xs, 2)))

w1, w2 = sp.symbols('w1 w2')
fq = (w1 - 1) ** 2 + 4 * w2 ** 2
gr = [float(sp.diff(fq, s_).subs({w1: 3, w2: 1})) for s_ in (w1, w2)]
w_new = (3 - 0.1 * gr[0], 1 - 0.1 * gr[1]); f_new = float(fq.subs({w1: w_new[0], w2: w_new[1]}))
put('co2', gr, (w_new[0], f(w_new[0], 1)), (w_new[1], f(w_new[1], 1)), (float(fq.subs({w1: 3, w2: 1})), '8'), (f_new, f(f_new, 2)))

zz = sp.symbols('z')
sig = 1 / (1 + sp.exp(-zz))
assert sp.simplify(sp.diff(sig, zz) - sig * (1 - sig)) == 0
dval = float(sp.diff(sig, zz).subs(zz, sp.log(3)))
put('co3', dval, (0.75, '0.75'), (dval, f(dval, 4)))

lam = [10.0, 1.0]
put('co4', 2 / max(lam), (1 - 0.25 * 10, f(1 - 0.25 * 10, 1)), (1 - 0.1 * 10, '0'), (1 - 0.15 * 10, f(1 - 0.15 * 10, 1)))

k = math.log(0.01) / math.log(0.9)
put('co5', math.ceil(k), (k, f(k, 1)))

xh, yh = sp.symbols('x y')
Hs = sp.hessian(xh ** 2 + 3 * xh * yh + yh ** 2, (xh, yh))
put('co6', sorted(float(t) for t in Hs.eigenvals()))

# two-weight net: x=1, h=relu(w1 x), yhat = w2 h, L = 1/2 (yhat - y)^2 with w1=2, w2=-1, y=0
xv, yv, a1, a2 = 1.0, 0.0, 2.0, -1.0
h = max(0, a1 * xv); yhat = a2 * h; L = 0.5 * (yhat - yv) ** 2
g7 = [(yhat - yv) * h, (yhat - yv) * a2 * (1 if a1 * xv > 0 else 0) * xv]
put('co7', g7, (L, '2'), (yhat, '-2'), (a2 - 0.1 * g7[0], f(a2 - 0.1 * g7[0], 1)), (a1 - 0.1 * g7[1], f(a1 - 0.1 * g7[1], 1)))

put('co8', 6 * 7e9 * 2e12, (2 * 7e9 * 2e12, '2.8e22'), (6 * 7e9 * 2e12, '8.4e22'))

Gl, Hl, lm = -4.0, 2.0, 1.0
put('co9', -Gl / (Hl + lm), (-Gl / (Hl + lm), f(-Gl / (Hl + lm), 3)), (-0.5 * Gl ** 2 / (Hl + lm), f(-0.5 * Gl ** 2 / (Hl + lm), 3)))

pz = 0.9
assert np.isclose(1 / (1 + math.exp(-math.log(9))), 0.9)
put('co10', pz * (1 - pz), (math.log(9), f(math.log(9), 3)), (pz * (1 - pz), '0.09'))

# Adam first step (Kingma and Ba 2015, Algorithm 1), eps ignored
lr, b1, b2 = 1e-3, 0.9, 0.999
for gg in (2.0, 0.002):
    m1 = (1 - b1) * gg; v1 = (1 - b2) * gg * gg
    upd = lr * (m1 / (1 - b1)) / math.sqrt(v1 / (1 - b2))
    assert np.isclose(upd, lr)
nob = lr * 0.2 / math.sqrt(0.004)
put('co11', lr, (0.2, '0.2'), (0.004, '0.004'), (nob, f(nob, 4)))

# ---------------- Information theory ----------------
put('it1', -math.log2(1 / 8))

Hb = lambda q: -(q * math.log2(q) + (1 - q) * math.log2(1 - q))
put('it2', Hb(0.9), (-math.log2(0.9), f(-math.log2(0.9), 3)), (-math.log2(0.1), f(-math.log2(0.1), 3)), (Hb(0.9), f(Hb(0.9), 3)))

V_ = 50000
put('it3', math.log(V_), (math.log(V_), f(math.log(V_), 2)), (math.log2(V_), f(math.log2(V_), 2)))

put('it4', [math.log(4), 4.0], (math.log(4), f(math.log(4), 3)), (math.exp(2), f(math.exp(2), 3)))

KL = lambda P_, Q_: float(sum(a_ * math.log(a_ / b_) for a_, b_ in zip(P_, Q_) if a_ > 0))
k1, k2 = KL([.5, .5], [.9, .1]), KL([.9, .1], [.5, .5])
put('it5', [k1, k2], (math.log(0.5 / 0.9), f(math.log(0.5 / 0.9), 4)), (math.log(5), f(math.log(5), 4)),
    (math.log(0.9 / 0.5), f(math.log(0.9 / 0.5), 4)), (math.log(0.2), f(math.log(0.2), 4)))

ce = -(0.5 * math.log(0.9) + 0.5 * math.log(0.1))
assert np.isclose(ce, math.log(2) + k1)
put('it6', ce, (-0.5 * math.log(0.9), f(-0.5 * math.log(0.9), 4)), (-0.5 * math.log(0.1), f(-0.5 * math.log(0.1), 4)), (math.log(2), f(math.log(2), 4)), (k1, f(k1, 4)))

bits = 1000 * 0.8 / math.log(2)
put('it7', bits / 4200, (bits, f(bits, 1)), (bits / 4200, f(bits / 4200, 3)))

put('it8', 1 - Hb(0.1), (1 - Hb(0.1), f(1 - Hb(0.1), 3)))

Lnce = -math.log(p[0])
put('it9', [math.log(3) - Lnce, math.log(1024)], (Lnce, f(Lnce, 3)), (math.log(3), f(math.log(3), 3)), (math.log(3) - Lnce, f(math.log(3) - Lnce, 3)), (math.log(1024), f(math.log(1024), 3)))

Pm = [0.495, 0.01, 0.495]; Q1 = [0.98, 0.01, 0.01]; Q2 = [1 / 3] * 3
four = [KL(Pm, Q1), KL(Pm, Q2), KL(Q1, Pm), KL(Q2, Pm)]
assert four[1] < four[0] and four[2] < four[3]
terms = [[a_ * math.log(a_ / b_) for a_, b_ in zip(A_, B_)] for A_, B_ in [(Pm, Q1), (Pm, Q2), (Q1, Pm), (Q2, Pm)]]
put('it10', four, *[(t, f(t, 3)) for t in four], *[(t, f(t, 3)) for row in terms for t in row if abs(t) > 1e-12])

# ---------------- Classic derivations ----------------
zs = sp.symbols('z1:4'); ys = sp.symbols('y1:4')
den = sum(sp.exp(t) for t in zs)
Lce = -sum(ys[i] * sp.log(sp.exp(zs[i]) / den) for i in range(3))
for k_ in range(3):
    gk = sp.diff(Lce, zs[k_])
    target = sp.exp(zs[k_]) / den * sum(ys) - ys[k_]  # = p_k - y_k when sum(y) = 1
    assert sp.simplify(gk - target) == 0
grad = p - np.array([1, 0, 0])
put('iv1', list(grad), (-math.log(p[0]), f(-math.log(p[0]), 3)), (math.log(ez.sum()), f(math.log(ez.sum()), 3)),
    (grad[0], f(grad[0], 3)), (1 / p[0], f(1 / p[0], 3)))

# logistic regression, one weight, no bias: (x=1,y=1), (x=2,y=0), w=0
Xl = np.array([1.0, 2.0]); yl = np.array([1.0, 0.0]); pl = 1 / (1 + np.exp(-0 * Xl))
gl = float(((pl - yl) * Xl).sum()); hl = float((pl * (1 - pl) * Xl ** 2).sum())
wv, xv_, yv_ = sp.symbols('w x y', real=True)
ll = -(yv_ * sp.log(1 / (1 + sp.exp(-wv * xv_))) + (1 - yv_) * sp.log(1 - 1 / (1 + sp.exp(-wv * xv_))))
pp = 1 / (1 + sp.exp(-wv * xv_))
assert sp.simplify(sp.diff(ll, wv) - (pp - yv_) * xv_) == 0
assert sp.simplify(sp.diff(ll, wv, 2) - pp * (1 - pp) * xv_ ** 2) == 0
put('iv2', [gl, hl], (-gl / hl, f(-gl / hl, 1)))

# Gaussian MLE and the bias of the variance estimator
nn, s2 = 5, 10.0
rng = np.random.default_rng(0)
sims = rng.normal(0, math.sqrt(s2), size=(200000, nn))
mc = sims.var(axis=1, ddof=0).mean()
assert abs(mc - (nn - 1) / nn * s2) < 0.05
musym, s2sym = sp.symbols('mu s2', positive=True)
xsy = sp.symbols('x1:6')
ll_g = sum(-(t - musym) ** 2 / (2 * s2sym) - sp.log(2 * sp.pi * s2sym) / 2 for t in xsy)
assert sp.simplify(sp.solve(sp.diff(ll_g, musym), musym)[0] - sum(xsy) / 5) == 0
put('iv3', (nn - 1) / nn * s2, (mc, f(mc, 2)))

h_, n_, al, be = 7, 10, 3, 3
put('iv4', (h_ + al - 1) / (n_ + al + be - 2), ((h_ + al - 1) / (n_ + al + be - 2), f((h_ + al - 1) / (n_ + al + be - 2), 3)),
    ((h_ + al) / (n_ + al + be), f((h_ + al) / (n_ + al + be), 3)), (0.7, '0.7'))

nll = 0.5 * (3 - 2) ** 2 + 0.5 * math.log(2 * math.pi)
put('iv5', nll, (0.5 * math.log(2 * math.pi), f(0.5 * math.log(2 * math.pi), 3)), (nll, f(nll, 3)))

put('iv6', [-math.log(0.8), -math.log(0.2)])

xv4 = np.arange(4); pw = 2.0 ** xv4; pw = pw / pw.sum()
lam_s = sp.symbols('lam')
put('iv7', [2.0, float(pw @ xv4)], (float(pw @ xv4), f(float(pw @ xv4), 3)))

pxz = np.array([0.2, 0.1]); qz = np.array([0.5, 0.5])
logpx = math.log(pxz.sum()); elbo = float((qz * np.log(pxz / qz)).sum()); post = pxz / pxz.sum()
gap = KL(qz, post)
assert np.isclose(logpx - elbo, gap)
put('iv8', elbo, (logpx, f(logpx, 3)), (elbo, f(elbo, 3)), (gap, f(gap, 4)), (post[0], f(post[0], 3)))

th = 0.4
est = th * 3 * (1 / th) + (1 - th) * 1 * (-1 / (1 - th))
put('iv9', est)

put('iv10', 4 + 9 + 2 * (-3))


# ---------------- more step numbers (appended to the cards above) ----------------
def add(pid, *nums):
    P[pid]['nums'].extend(nums)

add('it2', (0.9 * -math.log2(0.9), f(0.9 * -math.log2(0.9), 3)), (0.1 * -math.log2(0.1), f(0.1 * -math.log2(0.1), 3)))
add('it5', (0.5 * math.log(0.5 / 0.9), f(0.5 * math.log(0.5 / 0.9), 4)), (0.5 * math.log(5), f(0.5 * math.log(5), 4)),
    (0.9 * math.log(1.8), f(0.9 * math.log(1.8), 3)), (0.1 * math.log(0.2), f(-0.1 * math.log(0.2), 3)))
add('iv8', (math.log(0.4), f(math.log(0.4), 3)), (math.log(0.2), f(math.log(0.2), 3)), (post[1], f(post[1], 3)))
add('ps10', (se, f(se, 4)), (se ** 2, f(se ** 2, 5)), (80 - 196 * se, f(80 - 196 * se, 1)), (80 + 196 * se, f(80 + 196 * se, 1)))
add('ps11', (se_un, f(se_un, 4)), (se_pair, f(se_pair, 5)))
add('la9', (4096 ** 2 / 1e6, f(4096 ** 2 / 1e6, 1)))
add('ps7', (math.comb(23, 2), str(math.comb(23, 2))))
add('ps1', (die.std(), f(die.std(), 2)))
add('iv2', (0.25 * 1 + 0.25 * 4, '1.25'))
add('iv3', ((nn - 1) / nn * s2, '8'))
add('it9', (math.log2(1024), '10'))
add('iv1', (math.log(ez.sum()), '2.408'))
# the animation's figures (numbers quoted in the tab's static text)
assert 50000 ** 2 == 2.5e9



# ---------------- problems added from the old child pages and the Reading's tiny model ----------------
put('ps14', 0.24 / 0.38, (0.8 * 0.3 + 0.2 * 0.7, '0.38'), (0.3 * 0.38, '0.114'), (0.24 / 0.38, f(0.24 / 0.38, 3)))
b_, c_, n_ = 30, 25, 500
se_m = math.sqrt((b_ + c_) - (b_ - c_) ** 2 / n_) / n_
chi1 = (b_ - c_) ** 2 / (b_ + c_); chi2 = (30 - 15) ** 2 / 45; chicc = (abs(30 - 15) - 1) ** 2 / 45
put('ps15', chi2, (chi1, f(chi1, 2)), (stats.chi2.sf(chi1, 1), f(stats.chi2.sf(chi1, 1), 2)), ((b_ + c_) - (b_ - c_) ** 2 / n_, f((b_ + c_) - (b_ - c_) ** 2 / n_, 2)),
    (se_m, f(se_m, 4)), (196 * se_m, f(196 * se_m, 1)), (stats.chi2.sf(chi2, 1), f(stats.chi2.sf(chi2, 1), 3)), (chicc, f(chicc, 2)), (stats.chi2.sf(chicc, 1), f(stats.chi2.sf(chicc, 1), 3)),
    (1.96 * 100 * math.sqrt(0.8 * 0.2 / 500 * 2), None))
# unpaired interval for the McNemar example, as the old child page computed it: two accuracies around 80%; the page states the corrected 6.2
P['ps15']['nums'].pop()
# one training step of the tiny model
xr = np.array([2.0, 1.0]); Wr = np.array([[1.0, 0], [0, 1], [1, -2]]); yr = np.array([0, 0, 1.0])
zr = Wr @ xr; pr = np.exp(zr) / np.exp(zr).sum(); gz = pr - yr; gW = np.outer(gz, xr); W1 = Wr - 0.1 * gW
z1 = W1 @ xr; p1 = np.exp(z1) / np.exp(z1).sum(); L1 = -math.log(p1[2])
assert np.linalg.matrix_rank(gW) == 1
put('co12', L1, *[(v, f(v, 3)) for v in list(gz) + list(z1) + list(p1)], *[(v, f(v, 3)) for v in W1.flatten()],
    (gW[0, 0], '1.33'), (gW[0, 1], '0.665'), (gW[1, 0], '0.489'), (gW[2, 0], '-1.82'), (-math.log(pr[2]), f(-math.log(pr[2]), 3)))
import json as _json
NJ = _json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'read', 'numbers.json')))
assert np.allclose(gz, NJ['g_z'], atol=1e-3) and np.allclose(z1, NJ['step0.1_z'], atol=1e-3) and abs(L1 - NJ['step0.1_loss']) < 1e-3
assert abs(NJ['step0.3_loss'] - 0.778) < 1e-9 and abs(NJ['step1.0_loss'] - 0.011) < 1e-9
for eta, want in ((0.3, 0.778), (1.0, 0.011)):
    Wt = Wr - eta * gW; zt = Wt @ xr; pt = np.exp(zt) / np.exp(zt).sum(); assert abs(-math.log(pt[2]) - want) < 6e-4
# XGBoost split (old calculus child page)
g4 = np.array([-0.5, -0.5, -0.5, 0.5]); h4 = np.full(4, 0.25); lam_ = 1.0
GL, HL, GR, HR = g4[:3].sum(), h4[:3].sum(), g4[3], h4[3]
gain = 0.5 * (GL ** 2 / (HL + lam_) + GR ** 2 / (HR + lam_) - (GL + GR) ** 2 / (HL + HR + lam_))
put('co13', gain, (GL ** 2 / (HL + lam_), f(GL ** 2 / (HL + lam_), 3)), (gain, f(gain, 3)), (-GL / (HL + lam_), f(-GL / (HL + lam_), 3)), (-GR / (HR + lam_), '-0.4'), (0.5, '0.5'))
# Beta(2,2) after 3 heads in 3 flips (old probability child page)
from scipy.stats import beta as _beta
add('iv4', ((3 + 1) / (3 + 2), '0.8'), (5 / 7, f(5 / 7, 3)), (_beta(5, 2).std(), f(_beta(5, 2).std(), 2)))

# the animation's displayed numbers, for the browser check (check_drill.mjs compares the drawn SVG text with these)
import json
J = np.array([[p[i] * ((1 if i == k else 0) - p[k]) for k in range(3)] for i in range(3)])
fm = lambda v: ('\u2212' if v < 0 and round(abs(v), 3) > 0 else '') + f"{abs(v):.3f}"
ya = np.array([0, 0, 1.0]); ga = p - ya
ANIM = dict(p=[fm(v) for v in p], negy=[fm(-v) for v in ya], dLdp=[fm(-yv / pv) for yv, pv in zip(ya, p)],
            J=[fm(v) for v in J.flatten()], g=[fm(v) for v in ga], loss=f"{-math.log(p[2]):.3f}")
assert np.allclose((-ya / p) @ J, ga)  # the long route lands on p - y
assert abs(-math.log(p[2]) - NJ['loss_sat_nats']) < 1e-3 and np.allclose(ga, NJ['g_z'], atol=1e-3)
json.dump(ANIM, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'anim_expected.json'), 'w'), ensure_ascii=False, indent=1)

# ---------------- Part 2: compare with the page ----------------
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', 'parts', '33_tab_drill.html')


NS = dict(sqrt=math.sqrt, ln=math.log, log2=math.log2, exp=math.exp, pi=math.pi, e=math.e)


def num_list(s):
    return [float(eval(t.replace('^', '**'), {'__builtins__': {}}, NS)) for t in s.split(',') if t.strip()]


def close(a_, b_):
    return abs(a_ - b_) <= max(1e-9, 0.002 * abs(b_))


def main():
    page = open(SRC, encoding='utf-8').read()
    arts = re.findall(r'<article class="pd-q"([^>]*)>(.*?)</article>', page, re.S)
    seen, bad = set(), 0
    for attrs, body in arts:
        pid = re.search(r'id="pd-([a-z0-9]+)"', attrs).group(1)
        seen.add(pid)
        if pid not in P:
            print('NOT COMPUTED', pid); bad += 1; continue
        m_ = re.search(r'data-ans="([^"]+)"', attrs)
        exp = P[pid]['ans']; exp_l = exp if isinstance(exp, list) else [exp]
        if m_:
            got = num_list(m_.group(1))
            if 'data-set' in attrs:
                got, exp_l = sorted(got), sorted(exp_l)
            if len(got) != len(exp_l) or not all(close(a_, b_) for a_, b_ in zip(got, exp_l)):
                print('ANSWER MISMATCH', pid, got, exp_l); bad += 1
        text = html.unescape(re.sub(r'<[^>]+>', ' ', body)).replace('−', '-').replace(' ', '').replace(' ', ' ')
        for val, shown in P[pid]['nums']:
            if shown not in text:
                print('STEP NUMBER NOT FOUND', pid, shown, '(value', val, ')'); bad += 1
    for pid in P:
        if pid not in seen:
            print('MISSING ON PAGE', pid); bad += 1
    print(f'{len(arts)} cards, {len(P)} computed, {sum(len(v["nums"]) for v in P.values())} step numbers checked, problems: {bad}')
    return bad


if __name__ == '__main__':
    if '--print' in sys.argv:
        for k_, v_ in P.items():
            print(k_, v_['ans'], [t for _, t in v_['nums']])
    sys.exit(1 if main() else 0)

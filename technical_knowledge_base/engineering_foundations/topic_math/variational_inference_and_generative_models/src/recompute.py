# Every closed-form number on the page, recomputed, with Monte Carlo checks of each closed form.
# Run: python3 recompute.py   (NumPy only). Writes inputs/numbers.json; check_js.mjs compares the page's JavaScript with it.
import json, math, os
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
rng = np.random.default_rng(2026)
N = {}
def r(v, k=4): return float(round(float(v), k))
LN2PI = math.log(2 * math.pi)
def lognorm(x, m, v): return -0.5 * (LN2PI + np.log(v)) - (x - m) ** 2 / (2 * v)

# ---------- 1. The running 1-D latent model A: z ~ N(0, 1), x | z ~ N(z, s2), s = 0.5, observed x = 1.5 ----------
s2, x = 0.25, 1.5
logpx = lognorm(x, 0, 1 + s2)
pm, pv = x / (1 + s2), s2 / (1 + s2)           # exact posterior N(1.2, 0.2)
N['A'] = {'s2': s2, 'x': x, 'logpx': r(logpx), 'px': r(math.exp(logpx)), 'post_m': r(pm), 'post_v': r(pv), 'post_sd': r(math.sqrt(pv))}
def elbo_A(m, v, x=x, s2=s2):
    e_lik = -0.5 * (LN2PI + math.log(s2)) - ((x - m) ** 2 + v) / (2 * s2)
    e_pri = -0.5 * LN2PI - (m * m + v) / 2
    ent = 0.5 * (LN2PI + 1 + math.log(v))
    return e_lik, e_pri, ent, e_lik + e_pri + ent
def kl_gauss(m1, v1, m2, v2): return 0.5 * (math.log(v2 / v1) + (v1 + (m1 - m2) ** 2) / v2 - 1)
qm, qv = 0.5, 0.25                                # the worked q: N(0.5, 0.5^2)
el, ep, en, elbo = elbo_A(qm, qv)
gap = kl_gauss(qm, qv, pm, pv)
N['A']['q'] = {'m': qm, 'v': qv, 'e_lik': r(el), 'e_prior': r(ep), 'entropy': r(en), 'elbo': r(elbo), 'kl_post': r(gap),
               'sum': r(elbo + gap), 'recon': r(el), 'kl_prior': r(kl_gauss(qm, qv, 0, 1))}
assert abs(elbo + gap - logpx) < 1e-12
# Monte Carlo ELBO with the same q
z = qm + math.sqrt(qv) * rng.standard_normal(1_000_000)
w = lognorm(x, z, s2) + lognorm(z, 0, 1) - lognorm(z, qm, qv)
N['A']['q']['elbo_mc'] = r(w.mean()); N['A']['q']['elbo_mc_sd1'] = r(w.std())
# importance-sampling bound (IWAE) for K = 1, 10, 100, 1000: average of log mean of K weights, 2000 repeats
iw = {}
for K in [1, 10, 100, 1000]:
    reps = 2000 if K <= 100 else 400
    zz = qm + math.sqrt(qv) * rng.standard_normal((reps, K))
    lw = lognorm(x, zz, s2) + lognorm(zz, 0, 1) - lognorm(zz, qm, qv)
    mx = lw.max(1, keepdims=True); iw[K] = r((mx[:, 0] + np.log(np.exp(lw - mx).mean(1))).mean())
N['A']['q']['iwae'] = iw
# at the exact posterior the weight is constant: p(x,z)/q(z) = p(x) for every z
el2, ep2, en2, elbo2 = elbo_A(pm, pv); N['A']['at_post'] = {'elbo': r(elbo2)}
# the KL-to-prior form: ELBO = E_q log p(x|z) - KL(q || p(z))
assert abs((el - kl_gauss(qm, qv, 0, 1)) - elbo) < 1e-12

# ---------- model B: z ~ N(0,1), x | z ~ N(z^2, s2), observed x = 2: a two-humped posterior ----------
zg = np.linspace(-6, 6, 24001); dz = zg[1] - zg[0]
def postB(xb=2.0, sb2=0.25):
    lj = lognorm(xb, zg ** 2, sb2) + lognorm(zg, 0, 1); mx = lj.max(); p = np.exp(lj - mx); Z = p.sum() * dz
    return lj, math.log(Z) + mx, p / Z
ljB, logpxB, pB = postB()
def elboB(m, sd):
    lq = lognorm(zg, m, sd * sd); q = np.exp(lq); return float((q * (ljB - lq)).sum() * dz)
best = max(((elboB(m, sd), m, sd) for m in np.arange(0.0, 2.01, 0.01) for sd in np.arange(0.05, 2.0, 0.005)))
N['B'] = {'x': 2.0, 's2': 0.25, 'logpx': r(logpxB), 'best_elbo': r(best[0]), 'best_m': r(best[1], 2), 'best_sd': r(best[2], 3),
          'best_gap': r(logpxB - best[0]), 'ln2': r(math.log(2)), 'mode': r(float(zg[np.argmax(pB)]), 3)}

# ---------- 2. Mean-field CAVI on a Gaussian with unknown mean and precision (Bishop 2006, section 10.1.3) ----------
d = np.round(np.random.default_rng(7).normal(1.0, 0.5, 10), 2)   # ten illustrative observations
mu0, lam0, a0, b0 = 0.0, 1.0, 1.0, 1.0
n, xbar, sxx = len(d), float(d.mean()), float(((d - d.mean()) ** 2).sum())
muN = (lam0 * mu0 + n * xbar) / (lam0 + n); aN = a0 + (n + 1) / 2
Et = 1.0; hist = []
for it in range(12):
    lamN = (lam0 + n) * Et                                     # q(mu) = N(muN, 1/lamN)
    Emu, Emu2 = muN, muN ** 2 + 1 / lamN
    bN = b0 + 0.5 * (float((d ** 2).sum()) - 2 * Emu * float(d.sum()) + n * Emu2 + lam0 * (Emu2 - 2 * mu0 * Emu + mu0 ** 2))
    Et = aN / bN; hist.append([it + 1, r(lamN), r(bN), r(Et)])
# exact posterior: Normal-Gamma(mu', lam', a', b')
lp, ap = lam0 + n, a0 + n / 2
bp = b0 + 0.5 * sxx + lam0 * n * (xbar - mu0) ** 2 / (2 * (lam0 + n))
N['cavi'] = {'data': [float(v) for v in d], 'n': n, 'xbar': r(xbar), 'sxx': r(sxx), 'muN': r(muN), 'aN': aN, 'hist': hist,
             'mf_var_mu': r(1 / hist[-1][1], 5), 'exact_var_mu': r(bp / (lp * (ap - 1)), 5), 'exact_a': ap, 'exact_b': r(bp),
             'mf_E_tau': r(hist[-1][3]), 'exact_E_tau': r(ap / bp), 'mf_var_tau': r(aN / hist[-1][2] ** 2), 'exact_var_tau': r(ap / bp ** 2)}

# ---------- 3. Gradient estimators for the ELBO of model A, d independent copies ----------
def grads(m, v, dim, S=400_000):
    sd = math.sqrt(v); eps = rng.standard_normal((S, dim)); zz = m + sd * eps
    f = (lognorm(x, zz, s2) + lognorm(zz, 0, 1) - lognorm(zz, m, v)).sum(1)  # log p(x,z) - log q(z), summed over the d copies
    rep = (x - zz[:, 0]) / s2 - zz[:, 0]                                      # pathwise: d/dz log p(x,z) for copy 1 (log q term cancels)
    sco = f * (zz[:, 0] - m) / v                                              # score function: f * d/dm log q
    true = (x - m) / s2 - m
    base = sco - f.mean() * (zz[:, 0] - m) / v
    return {'true': r(true), 'rep_mean': r(rep.mean(), 3), 'rep_var': r(rep.var(), 3), 'sf_mean': r(sco.mean(), 2), 'sf_var': r(sco.var(), 1), 'sfb_var': r(base.var(), 1)}
N['est'] = {str(dim): grads(qm, qv, dim) for dim in [1, 10, 100]}
# exact pathwise variance: rep = (x - m)/s2 - m - (1/s2 + 1) sd eps  ->  var = (1/s2 + 1)^2 v
N['est']['rep_var_exact'] = r((1 / s2 + 1) ** 2 * qv)

# ---------- 4. Gaussian KL closed form, checked by Monte Carlo ----------
def kl_diag(mu, sig): mu, sig = np.array(mu), np.array(sig); return float(0.5 * (mu ** 2 + sig ** 2 - 1 - np.log(sig ** 2)).sum())
ex = {'mu': [1.0, -0.5], 'sig': [0.5, 2.0]}
zz = np.array(ex['mu']) + np.array(ex['sig']) * rng.standard_normal((2_000_000, 2))
mc = (lognorm(zz, np.array(ex['mu']), np.array(ex['sig']) ** 2) - lognorm(zz, 0, 1)).sum(1)
N['kl'] = {'ex': ex, 'closed': r(kl_diag(ex['mu'], ex['sig'])), 'mc': r(mc.mean()), 'mc_se': r(mc.std() / math.sqrt(len(mc)), 5),
           'dim1': r(0.5 * (1 + 0.25 - 1 - math.log(0.25))), 'dim2': r(0.5 * (0.25 + 4 - 1 - math.log(4))), 'it6': 0.818}

# ---------- 5. Change of variables (normalising flows) ----------
N['flow'] = {'affine_px_at_3': r(math.exp(lognorm(1.0, 0, 1)) / 2), 'lognormal_px_at_2': r(math.exp(lognorm(math.log(2), 0, 1)) / 2),
             'logdet_affine': r(math.log(2))}
zz = rng.standard_normal(4_000_000); xs = np.exp(zz)
N['flow']['lognormal_mc_at_2'] = r(((xs > 1.99) & (xs < 2.01)).mean() / 0.02, 3)

# ---------- 6. Diffusion: schedules, q(x_t | x_0) by Monte Carlo of the step-by-step chain ----------
T = 1000
bl = np.linspace(1e-4, 0.02, T); abl = np.cumprod(1 - bl)
tt = np.arange(T + 1); f = np.cos((tt / T + 0.008) / 1.008 * math.pi / 2) ** 2; abc_raw = f / f[0]
bc = np.clip(1 - abc_raw[1:] / abc_raw[:-1], 0, 0.999); abc = np.cumprod(1 - bc)
N['sched'] = {'lin': {str(t): r(abl[t - 1], 6) for t in [1, 10, 100, 200, 250, 500, 750, 1000]},
              'cos': {str(t): r(abc[t - 1], 6) for t in [1, 10, 100, 200, 250, 500, 750, 999, 1000]}}
N['sched']['lin_lambda'] = {str(t): r(math.log(abl[t - 1] / (1 - abl[t - 1])), 2) for t in [1, 200, 500, 1000]}
N['sched']['cos_lambda'] = {str(t): r(math.log(abc[t - 1] / (1 - abc[t - 1])), 2) for t in [1, 200, 500, 999, 1000]}
a200 = abl[199]
x0 = np.array([0.5, -0.2]); e = np.array([1.0, -0.5])
N['root'] = {'abar200': r(a200), 'sqrt': r(math.sqrt(a200)), 'sqrt1m': r(math.sqrt(1 - a200)), 'xt': [r(v) for v in math.sqrt(a200) * x0 + math.sqrt(1 - a200) * e]}
M = 200_000; xt = np.tile(x0, (M, 1)); mc = {}
for t in range(1, T + 1):
    xt = math.sqrt(1 - bl[t - 1]) * xt + math.sqrt(bl[t - 1]) * rng.standard_normal((M, 2))
    if t in (1, 200, 1000):
        mc[str(t)] = {'mean': [r(v) for v in xt.mean(0)], 'var': [r(v) for v in xt.var(0)],
                      'closed_mean': [r(v) for v in math.sqrt(abl[t - 1]) * x0], 'closed_var': r(1 - abl[t - 1])}
N['qxt_mc'] = mc
# posterior q(x_{t-1} | x_t, x_0) (Ho et al. Eq. 6-7) against Gaussian conditioning of the joint, 1-D, t = 200
t = 200; ap_, at_, be = abl[t - 2], abl[t - 1], bl[t - 1]
mu_coef0 = math.sqrt(ap_) * be / (1 - at_); mu_coefT = math.sqrt(1 - be) * (1 - ap_) / (1 - at_); btil = (1 - ap_) / (1 - at_) * be
# joint of (x_{t-1}, x_t) given x0: cov [[1-ap, sqrt(a_t)(1-ap)], [ ., 1-at]]
c12 = math.sqrt(1 - be) * (1 - ap_); cond_var = (1 - ap_) - c12 ** 2 / (1 - at_)
N['post'] = {'t': t, 'coef_x0': r(mu_coef0, 6), 'coef_xt': r(mu_coefT, 6), 'beta_tilde': r(btil, 8), 'beta': r(be, 8),
             'cond_coef_xt': r(c12 / (1 - at_), 6), 'cond_coef_x0': r(math.sqrt(ap_) - c12 * math.sqrt(at_) / (1 - at_), 6), 'cond_var': r(cond_var, 8)}
# the weight Ho et al. drop (Eq. 12 with sigma_t^2 = beta_t): beta_t / (2 alpha_t (1 - abar_t))
wts = {str(t): r(bl[t - 1] / (2 * (1 - bl[t - 1]) * (1 - abl[t - 1])), 4) for t in [1, 2, 10, 100, 200, 500, 1000]}
N['w12'] = wts
# Tweedie on Gaussian data: x0 ~ N(0, 1) -> x_t ~ N(0, 1); optimal eps = sqrt(1-abar) x_t; score = -x_t
zz0 = rng.standard_normal(1_000_000); ee = rng.standard_normal(1_000_000); xt1 = math.sqrt(a200) * zz0 + math.sqrt(1 - a200) * ee
bslope = float((xt1 * ee).mean() / (xt1 * xt1).mean())
N['tweedie'] = {'slope_mc': r(bslope), 'slope_closed': r(math.sqrt(1 - a200))}
json.dump(N, open(os.path.join(HERE, 'inputs', 'numbers.json'), 'w'), indent=1)
print(json.dumps(N, indent=1)[:6000])

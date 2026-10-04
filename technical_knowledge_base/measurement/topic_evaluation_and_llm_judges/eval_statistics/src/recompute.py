"""Recompute every number the page states, independently of its JavaScript; writes recompute.json.
check_page.mjs loads the built page, reads window.ES_CHECK (filled by the page's own code) and compares.
usage: uv run --with scipy --with numpy python3 recompute.py
"""
import json, math, os, collections
import numpy as np
from scipy import stats
H = os.path.dirname(os.path.abspath(__file__))
Z, ZB = stats.norm.ppf(0.975), stats.norm.ppf(0.8)
out = {}

# ---------- 1. Published figures ----------
# Root page (Topic: evaluation-and-llm-judges, Reading, Statistics): 70% on 200 items, 2-point drop, 10% discordant
p, n, d, dl = 0.70, 200, 0.10, 0.02
se1 = math.sqrt(p * (1 - p) / n); seU = math.sqrt(2) * se1; seP = math.sqrt((d - dl ** 2) / n)
out['root'] = {'se1': 100 * se1, 'ciU': 100 * 1.96 * seU, 'ciP': 100 * 1.96 * seP,
               'nU': math.ceil((1.96 + 0.8416) ** 2 * 2 * p * (1 - p) / dl ** 2), 'nP': math.ceil((1.96 + 0.8416) ** 2 * (d - dl ** 2) / dl ** 2),
               'mdeP': 100 * (1.96 + 0.8416) * math.sqrt(d / n), 'mdeU': 100 * (1.96 + 0.8416) * seU, 'fwer20': 1 - 0.95 ** 20}
# Old Production page (handoff_statistics.md)
out['old'] = {'sem100': 100 * math.sqrt(0.21 / 100), 'sem1000': 100 * math.sqrt(0.21 / 1000),
              'n_2pt_rule': 2.8 ** 2 * 2 * 0.21 / 0.02 ** 2, 'n_2pt_onesided': 2.49 ** 2 * 2 * 0.21 / 0.02 ** 2, 'n_2pt_single_var': 2.8 ** 2 * 0.21 / 0.02 ** 2,
              'se_diff_78_300': 100 * math.sqrt(2 * 0.78 * 0.22 / 300), 'z_5pt': 5 / (100 * math.sqrt(2 * 0.78 * 0.22 / 300)),
              'n_unpaired_5pt': 16 * 0.17 / 0.05 ** 2, 'n_unpaired_5pt_exact': (Z + ZB) ** 2 * 2 * 0.78 * 0.22 / 0.05 ** 2}
# McNemar at 300 items, 15% discordant, 5-point regression: b = 30, c = 15 expected
out['old']['mc_z'] = 15 / math.sqrt(45)
out['old']['mc_power_normal'] = stats.norm.cdf(15 / math.sqrt(45) - 1.96)
out['old']['mc_n80_normal'] = 2.8 ** 2 * 0.15 / 0.05 ** 2

def mc_power(n, p10, p01, alpha=0.05):
    pd = p10 + p01; q = p10 / pd; pw = tm = 0.0
    for m in range(1, n + 1):
        pm = stats.binom.pmf(m, n, pd)
        if pm < 1e-13:
            continue
        b = np.arange(m + 1)
        pv = np.minimum(1, 2 * stats.binom.cdf(np.minimum(b, m - b), m, 0.5))
        rej = pv <= alpha
        pb = stats.binom.pmf(b, m, q)
        pw += pm * (pb * rej).sum(); tm += pm * (pb * rej * np.abs(2 * b - m) / n).sum()
    return pw, (tm / pw / abs(p10 - p01)) if pw > 0 else float('nan')
out['old']['mc_power_exact_300'] = mc_power(300, 0.10, 0.05)[0]
nn = 300
while mc_power(nn, 0.10, 0.05)[0] < 0.8:
    nn += 5
out['old']['mc_n80_exact_step5'] = nn

# Card et al. 2020, Appendix C: n = 500, P_a = 0.9, delta = 0.02 -> power about 0.25, Type-M 1.9; n = 2000 nearly 80%, Type-M 1.1
out['card'] = {'p500': mc_power(500, 0.06, 0.04), 'p2000': mc_power(2000, 0.06, 0.04),
               'p500_d4': mc_power(500, 0.07, 0.03), 'p500_pa975': mc_power(500, 0.0225, 0.0025)}

# Miller 2024
mil = {}
mil['K_factor'] = {K: (1 + 2 / K) / 3 for K in (1, 2, 4, 6, 10)}
mil['T0_var'] = [1 / 12, 1 / 4]; mil['T0_var2'] = [1 / 27, 3 / 16]
mil['paired_uniform'] = [1 / 6, 1 / 9]
mil['n969'] = (Z + ZB) ** 2 * (1 / 9) / 0.03 ** 2
mil['mde_K1'] = (Z + ZB) * math.sqrt((1 / 9 + 1 / 6 + 1 / 6) / 198)
mil['mde_K10'] = (Z + ZB) * math.sqrt((1 / 9 + 1 / 60 + 1 / 60) / 198)
mil['t4_ratio'] = {'DROP': 1.34 / 0.44, 'RACE-H': 0.51 / 0.46, 'MGSM': 1.62 / 0.86}
mil['t2_bern'] = {'MATH_G': 100 * math.sqrt(.655 * .345 / 5000), 'MATH_D': 100 * math.sqrt(.63 * .37 / 5000),
                  'HE_G': 100 * math.sqrt(.836 * .164 / 164), 'HE_D_867': 100 * math.sqrt(.867 * .133 / 164),
                  'MGSM_G': 100 * math.sqrt(.753 * .247 / 2500), 'MGSM_D': 100 * math.sqrt(.78 * .22 / 2500)}
mil['t5_ci'] = {'MATH': [2.5 - 1.96 * 0.7, 2.5 + 1.96 * 0.7], 'HumanEval': [-3.1 - 1.96 * 2.1, -3.1 + 1.96 * 2.1], 'MGSM': [-2.7 - 1.96 * 1.7, -2.7 + 1.96 * 1.7]}
out['miller'] = mil

# Bowyer et al. 2025: coverage of 95% intervals, theta ~ U(0,1), exact over k (they simulate; N = 100 CLT coverage 92.5%)
def cov(N, meth):
    k = np.arange(N + 1); ph = k / N
    if meth == 'wald':
        h = Z * np.sqrt(ph * (1 - ph) / N); lo, hi = ph - h, ph + h
    elif meth == 'wilson':
        den = 1 + Z * Z / N; c = (ph + Z * Z / (2 * N)) / den; h = Z * np.sqrt(ph * (1 - ph) / N + Z * Z / (4 * N * N)) / den; lo, hi = c - h, c + h
    elif meth == 'cp':
        lo = np.where(k == 0, 0, stats.beta.ppf(.025, np.maximum(k, 1), N - k + 1)); hi = np.where(k == N, 1, stats.beta.ppf(.975, k + 1, np.maximum(N - k, 1)))
    else:
        lo = stats.beta.ppf(.025, 1 + k, 1 + N - k); hi = stats.beta.ppf(.975, 1 + k, 1 + N - k)
    th = (np.arange(400) + 0.5) / 400
    return float(np.mean([(stats.binom.pmf(k, N, t) * ((lo <= t) & (t <= hi))).sum() for t in th]))
out['bowyer'] = {N: {m: cov(N, m) for m in ('wald', 'wilson', 'cp', 'bayes')} for N in (10, 30, 100)}

# Madaan et al. 2024 Table 1: analytic CI at the seed mean (their CI column is an average over 210 checkpoints)
mad = {'COPA': (100, 78.80, 2.15, 8.30), 'HumanEval': (164, 11.89, 1.11, 3.98), 'GSM8k': (1319, 4.10, 0.41, 0.87), 'ARC-C': (1165, 39.71, 0.80, 2.74),
       'SIQA': (1954, 46.69, 0.55, 2.21), 'PIQA': (1838, 76.93, 0.41, 1.99), 'MMLU': (14042, 25.86, 0.57, 0.72), 'Hellaswag': (10042, 70.08, 0.21, 0.93)}
out['madaan'] = {k: {'n': v[0], 'mu': v[1], 'seed_sd': v[2], 'ci_pub': v[3], 'ci_at_mean': 100 * 1.96 * math.sqrt(v[1] / 100 * (1 - v[1] / 100) / v[0])} for k, v in mad.items()}
# Correlation -> sample size reduction (Anthropic: correlations 0.3 to 0.7 between frontier models)
out['corr_factor'] = {r: 1 / (1 - r) for r in (0.3, 0.5, 0.7, 0.9)}

# ---------- 2. Real data ----------
ES = json.loads(open(os.path.join(H, 'parts', '30_js_data.js')).read().split('window.ES=', 1)[1].rstrip().rstrip(';'))
B36 = '0123456789abcdefghijklmnopqrstuvwxyz'
cl = []
for c, ch in enumerate(ES['race']['csize']):
    cl += [c] * B36.index(ch)
cl = np.array(cl)
P = [np.array([(B36.index(s[i]) * 36 + B36.index(s[i + 1])) / 1000 for i in range(0, len(s), 2)]) for s in ES['race']['p']]
G = [np.array([int(x) for x in s]) for s in ES['race']['g']]
def se_clt(a): return math.sqrt(np.var(a, ddof=1) / len(a))
def se_clu(a, cl, corr=False):
    m = a.mean(); s = collections.defaultdict(float)
    for x, c in zip(a, cl): s[c] += x - m
    v = sum(x * x for x in s.values())
    C = len(s)
    if corr: v *= C / (C - 1)
    return math.sqrt(v) / len(a)
def four(a, b, cl):
    d = b - a; n = len(a)
    return {'n': n, 'diff': float(d.mean()), 'unpaired': math.sqrt(np.var(a, ddof=1) / n + np.var(b, ddof=1) / n), 'paired': se_clt(d),
            'clustered': se_clu(d, cl), 'unpairedClu': math.sqrt(se_clu(a, cl) ** 2 + se_clu(b, cl) ** 2), 'r': float(np.corrcoef(a, b)[0, 1]), 'C': len(set(cl.tolist()))}
race = {'n': len(cl), 'C': int(cl.max() + 1)}
for j, nm in enumerate(['A', 'B']):
    race['acc_greedy_' + nm] = float(G[j].mean()); race['acc_p_' + nm] = float(P[j].mean())
    race['se_greedy_' + nm] = se_clt(G[j]); race['seclu_greedy_' + nm] = se_clu(G[j], cl); race['seclu_greedy_inspect_' + nm] = se_clu(G[j], cl, True)
    race['se_p_' + nm] = se_clt(P[j]); race['seclu_p_' + nm] = se_clu(P[j], cl)
    race['var_x_' + nm] = float(np.var(P[j], ddof=1)); race['e_sig2_' + nm] = float(np.mean(P[j] * (1 - P[j])))
    race['se_K_pred_' + nm] = {K: math.sqrt((race['var_x_' + nm] + race['e_sig2_' + nm] / K) / len(cl)) for K in (1, 2, 5, 10, 20)}
race['four_greedy'] = four(G[0].astype(float), G[1].astype(float), cl)
race['four_p'] = four(P[0], P[1], cl)
b = int(((G[0] == 1) & (G[1] == 0)).sum()); c = int(((G[0] == 0) & (G[1] == 1)).sum())
race['mc'] = {'b': b, 'c': c, 'p_exact': float(min(1, 2 * stats.binom.cdf(min(b, c), b + c, 0.5))),
              'p_chi_cc': float(stats.chi2.sf((abs(b - c) - 1) ** 2 / (b + c), 1)), 'disc': (b + c) / len(cl)}
out['race'] = race

# MT-Bench claude-v1 vs claude-instant-v1 (the production page's swap)
mods = {m[0]: [None if ch == '.' else (ord(ch) - 95) / 2 for ch in m[1]] for m in ES['mtb']['models']}
qid = np.array([o[0] for o in ES['mtb']['order']])
A_, B_ = mods['claude-v1'], mods['claude-instant-v1']
keep = [i for i in range(len(A_)) if A_[i] is not None and B_[i] is not None]
a = np.array([A_[i] for i in keep]); bb = np.array([B_[i] for i in keep]); q = qid[keep]
out['mtb_claude'] = four(a, bb, q)
# all 34*33/2 pairs: ratio clustered / paired, paired / unpaired
rat_c, rat_p = [], []
names = list(mods)
for i in range(len(names)):
    for j in range(i + 1, len(names)):
        A1, B1 = mods[names[i]], mods[names[j]]
        k = [t for t in range(160) if A1[t] is not None and B1[t] is not None]
        f = four(np.array([A1[t] for t in k]), np.array([B1[t] for t in k]), qid[k])
        rat_c.append(f['clustered'] / f['paired']); rat_p.append(f['paired'] / f['unpaired'])
out['mtb_all'] = {'pairs': len(rat_c), 'clu_over_paired_median': float(np.median(rat_c)), 'clu_over_paired_min': float(min(rat_c)), 'clu_over_paired_max': float(max(rat_c)),
                  'paired_over_unpaired_median': float(np.median(rat_p)), 'paired_over_unpaired_min': float(min(rat_p)), 'paired_over_unpaired_max': float(max(rat_p))}

# MathArena: per model, item variance vs within-item variance from 4 runs
ma = {}
for comp in ES['ma']:
    rows = []
    for m in comp['models']:
        r = m['r']; x = np.array([int(ch) / r for ch in m['s']]); n_ = len(x)
        vx_raw = np.var(x, ddof=1)
        sig2 = float(np.mean(x * (1 - x)) * r / (r - 1))  # unbiased within-problem variance
        varx = max(0.0, vx_raw - sig2 / r)  # variance of true per-problem rates (law of total variance)
        se_problem = math.sqrt(vx_raw / n_)  # SE over problem means (K = r)
        se_answers = math.sqrt(x.mean() * (1 - x.mean()) / (n_ * r))  # pooled over all answers (MathArena's)
        rows.append({'n': m['n'], 'acc': float(x.mean()), 'varx': varx, 'sig2': sig2, 'se_problem': se_problem, 'se_answers': se_answers,
                     'se_K1_pred': math.sqrt((varx + sig2) / n_)})
    ma[comp['name']] = rows
out['ma'] = {k: {'models': len(v), 'median_ratio_problem_over_answers': float(np.median([r['se_problem'] / r['se_answers'] for r in v if r['se_answers'] > 0])),
                 'median_share_within': float(np.median([r['sig2'] / (r['sig2'] + r['varx']) for r in v if r['sig2'] + r['varx'] > 0]))} for k, v in ma.items()}
out['ma_rows'] = ma

# MT-Bench expert human votes: judge noise as a variance component (one-way random effects ANOVA on vote scores 0, 0.5, 1)
hv = []
for pr in ES['hv']['pairs']:
    its = [[int(ch) / 2 for ch in v] for _, _, v in pr['items']]
    allv = [x for v in its for x in v]
    multi = [v for v in its if len(v) > 1]
    within = sum(sum((x - np.mean(v)) ** 2 for x in v) for v in multi) / sum(len(v) - 1 for v in multi) if multi else float('nan')
    means = np.array([np.mean(v) for v in its]); nbar = np.mean([len(v) for v in its])
    between = max(0.0, np.var(means, ddof=1) - within / nbar)
    hv.append({'a': pr['a'], 'b': pr['b'], 'votes': len(allv), 'items': len(its), 'multi': len(multi), 'mean': float(np.mean(allv)), 'within': float(within), 'between': float(between)})
out['hv'] = hv
tot_w = [h['within'] for h in hv]; out['hv_summary'] = {'median_within': float(np.median(tot_w)), 'median_share_within': float(np.median([h['within'] / (h['within'] + h['between']) for h in hv]))}

json.dump(out, open(os.path.join(H, 'recompute.json'), 'w'), indent=1, default=float)
print(json.dumps({k: out[k] for k in ['root', 'old', 'card', 'miller', 'bowyer', 'race', 'mtb_claude', 'mtb_all', 'ma', 'hv_summary']}, indent=1, default=float))

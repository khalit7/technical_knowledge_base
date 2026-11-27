"""Recompute what the article's results chart can and cannot tell apart; writes inputs/recompute.json (read by mk_article.py).

usage (from this src/ folder): python3 -I recompute.py
input: inputs/chart.json (decode_chart.py: the chart's printed labels and its 50% bootstrap ellipses).
Standard library only; every test is exact or a closed form, so the output is deterministic.

What it computes, per effort (medium, xhigh), on the share of runs that passed all 37 hidden tests:
  1. runs passed k = pct x n (each must land on a whole number of runs: a check that the labels were read right);
  2. a chi-square test that all 30 conditions share one pass rate (29 degrees of freedom);
  3. each condition against Default: Fisher's exact test (two-sided), then Holm's correction over the 29 comparisons;
  4. the smallest difference from Default that 80 runs a side detects with 80% power at the 5% level (normal approximation);
  5. the correlation of the conditions' medium and xhigh pass rates (a real effect of an instruction should show at both efforts);
  6. a null band: the central 95% range of one condition's pass rate if every condition shared the pooled rate (binomial quantiles);
  and, for cost, the same chi-square test with the chart's own bootstrap standard deviations, plus the named cost gaps.
"""
import json, math
from decimal import Decimal, ROUND_HALF_UP

D = json.load(open('inputs/chart.json'))
C = D['conditions']
EFF = ('medium', 'xhigh')


def r(x, nd):  # exact half-up rounding of a float printed to nd places (writing-style: never float round())
    return float(Decimal(repr(x)).quantize(Decimal(1).scaleb(-nd), rounding=ROUND_HALF_UP))


def gammaq(a, x):  # regularized upper incomplete gamma Q(a, x) (Numerical Recipes 6.2)
    if x < a + 1:
        s, t, ap = 1 / a, 1 / a, a
        for _ in range(1000):
            ap += 1; t *= x / ap; s += t
            if abs(t) < abs(s) * 1e-15: break
        return 1 - s * math.exp(-x + a * math.log(x) - math.lgamma(a))
    b, c, d = x + 1 - a, 1e300, 1 / (x + 1 - a); h = d
    for i in range(1, 1000):
        an = -i * (i - a); b += 2
        d = an * d + b; d = 1e-300 if abs(d) < 1e-300 else d
        c = b + an / c; c = 1e-300 if abs(c) < 1e-300 else c
        d = 1 / d; h *= d * c
        if abs(d * c - 1) < 1e-15: break
    return math.exp(-x + a * math.log(x) - math.lgamma(a)) * h


def fisher(k1, n1, k2, n2):  # two-sided Fisher exact p for a 2x2 table
    K, N = k1 + k2, n1 + n2
    def pr(k): return math.comb(n1, k) * math.comb(n2, K - k) / math.comb(N, K)
    p0 = pr(k1)
    return min(1.0, sum(pr(k) for k in range(max(0, K - n2), min(n1, K) + 1) if pr(k) <= p0 * (1 + 1e-9)))


def binom_q(n, p, q):  # smallest k with P(X <= k) >= q
    acc = 0.0
    for k in range(n + 1):
        acc += math.comb(n, k) * p ** k * (1 - p) ** (n - k)
        if acc >= q: return k
    return n


out = {'effort': {}}
for e in EFF:
    rows = []
    for c in C:
        x = c[e]; n = x['n']; kf = float(x['pct']) * n / 100; k = round(kf)
        assert abs(kf - k) < 0.06, (c['label'], e, kf)  # printed to 0.1%: k must be whole
        rows.append({'id': c['id'], 'label': c['label'], 'n': n, 'k': k, 'pct': float(x['pct']), 'cost': float(x['cost']), 'cost_sd': x['cost_sd']})
    K, N = sum(r_['k'] for r_ in rows), sum(r_['n'] for r_ in rows)
    p = K / N
    chi = sum((r_['k'] - r_['n'] * p) ** 2 / (r_['n'] * p * (1 - p)) for r_ in rows)
    df = len(rows) - 1
    dflt = next(r_ for r_ in rows if r_['id'] == 'default')
    comps = []
    for r_ in rows:
        if r_ is dflt: continue
        comps.append({'label': r_['label'], 'diff': r(r_['pct'] - dflt['pct'], 1), 'p': fisher(r_['k'], r_['n'], dflt['k'], dflt['n'])})
    comps.sort(key=lambda c_: c_['p'])
    m = len(comps); holm = []; run = 0
    for i, c_ in enumerate(comps):
        run = max(run, min(1, (m - i) * c_['p'])); c_['holm'] = run
    pd = dflt['k'] / dflt['n']
    mde = (1.959964 + 0.841621) * math.sqrt(2 * pd * (1 - pd) / 80)
    lo, hi = binom_q(80, p, 0.025), binom_q(80, p, 0.975)
    # cost: weighted chi-square with the chart's own bootstrap sds (Default against every other condition is a z score)
    w = [1 / r_['cost_sd'] ** 2 for r_ in rows]; cbar = sum(wi * r_['cost'] for wi, r_ in zip(w, rows)) / sum(w)
    cchi = sum(wi * (r_['cost'] - cbar) ** 2 for wi, r_ in zip(w, rows))
    rank = sorted(rows, key=lambda r_: -r_['pct']).index(dflt) + 1
    out['effort'][e] = {
        'pooled_pct': r(100 * p, 1), 'runs': N, 'passed': K,
        'min': min(rows, key=lambda r_: r_['pct'])['label'] + ' ' + str(min(r_['pct'] for r_ in rows)),
        'max': max(rows, key=lambda r_: r_['pct'])['label'] + ' ' + str(max(r_['pct'] for r_ in rows)),
        'chi2': r(chi, 1), 'df': df, 'chi2_p': r(gammaq(df / 2, chi / 2), 2),
        'default_pct': dflt['pct'], 'default_k': dflt['k'], 'default_rank': rank,
        'n_p05': sum(1 for c_ in comps if c_['p'] < 0.05), 'expected_p05': r(0.05 * m, 2),
        'smallest_p': {'label': comps[0]['label'], 'diff': comps[0]['diff'], 'p': r(comps[0]['p'], 3), 'holm': r(comps[0]['holm'], 2)},
        'mde_points': r(100 * mde, 1),
        'null_band': [r(100 * lo / 80, 1), r(100 * hi / 80, 1)], 'null_band_runs': [lo, hi],
        'inside_band': sum(1 for r_ in rows if r_['n'] == 80 and lo <= r_['k'] <= hi), 'n80': sum(1 for r_ in rows if r_['n'] == 80),
        'cost_chi2': r(cchi, 0), 'cost_chi2_p': gammaq(df / 2, cchi / 2),
        'rows': [{k_: r_[k_] for k_ in ('label', 'n', 'k', 'pct', 'cost', 'cost_sd')} for r_ in rows],
    }

# do the conditions keep their order from medium to xhigh?
a = [c['medium']['pct'] for c in C]; b = [c['xhigh']['pct'] for c in C]
a = [float(v) for v in a]; b = [float(v) for v in b]
ma, mb = sum(a) / len(a), sum(b) / len(b)
cor = sum((x - ma) * (y - mb) for x, y in zip(a, b)) / math.sqrt(sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))
t = cor * math.sqrt((len(a) - 2) / (1 - cor ** 2))
out['medium_xhigh_r'] = r(cor, 2)
# two-sided p for Pearson r via the t distribution with 28 df: p = I_{df/(df+t^2)}(df/2, 1/2); computed by numeric integration of the t density
df = len(a) - 2
def tdens(x): return math.exp(math.lgamma((df + 1) / 2) - math.lgamma(df / 2)) / math.sqrt(df * math.pi) * (1 + x * x / df) ** (-(df + 1) / 2)
steps = 200000; T = abs(t); hstep = T / steps
area = sum(tdens((i + 0.5) * hstep) for i in range(steps)) * hstep
out['medium_xhigh_p'] = r(1 - 2 * area, 2)

# the named cost gaps (Hegel skill against Hegel; Audit and Kani against Default), z with the chart's sds
def gap(lab1, lab2, e):
    x = next(c for c in C if c['label'] == lab1)[e]; y = next(c for c in C if c['label'] == lab2)[e]
    d = float(x['cost']) - float(y['cost']); s = math.hypot(x['cost_sd'], y['cost_sd'])
    return {'a': lab1, 'b': lab2, 'effort': e, 'diff': r(d, 2), 'pct': r(100 * d / float(y['cost']), 0), 'z': r(d / s, 1)}
out['cost_gaps'] = [gap('Hegel Skill', 'Hegel', 'medium'), gap('Hegel Skill', 'Hegel', 'xhigh'), gap('Audit', 'Default', 'xhigh'), gap('Kani', 'Default', 'medium')]
# the post's ordering (sections from worst to best): it matches the mean of the two efforts
mean = sorted(C, key=lambda c: (float(c['medium']['pct']) + float(c['xhigh']['pct'])) / 2)
out['order_by_mean'] = [c['label'] for c in mean]
json.dump(out, open('inputs/recompute.json', 'w'), indent=1)
for e in EFF:
    o = out['effort'][e]
    print(e, {k_: v for k_, v in o.items() if k_ != 'rows'})
print('medium-xhigh r', out['medium_xhigh_r'], 'p', out['medium_xhigh_p'])
print(out['cost_gaps'])
print(out['order_by_mean'])

# the follow-up (GPT-6 Astra, IMAP, xhigh): the same homogeneity test on its chart data
A = json.load(open('inputs/astra_imap.json'))['points']
K, N = sum(p_['k'] for p_ in A), sum(p_['n'] for p_ in A); p = K / N
chi = sum((p_['k'] - p_['n'] * p) ** 2 / (p_['n'] * p * (1 - p)) for p_ in A)
dA = next(p_ for p_ in A if p_['label'] == 'Default')
better = [p_ for p_ in A if p_['k'] / p_['n'] > dA['k'] / dA['n']]
out['astra_imap'] = {'conditions': len(A), 'pooled_pct': r(100 * p, 1), 'chi2': r(chi, 1), 'df': len(A) - 1, 'chi2_p': r(gammaq((len(A) - 1) / 2, chi / 2), 2),
                     'default_pct': r(100 * dA['k'] / dA['n'], 1), 'default_k': dA['k'], 'above_default': [(p_['label'], p_['k'], p_['n']) for p_ in better],
                     'min_pct': r(min(100 * p_['k'] / p_['n'] for p_ in A), 1), 'max_pct': r(max(100 * p_['k'] / p_['n'] for p_ in A), 1)}
json.dump(out, open('inputs/recompute.json', 'w'), indent=1)
print('astra imap', out['astra_imap'])

# the spread a no-effect world produces: range (best minus worst) of 30 independent Binomial(80, pooled) draws, exactly
def range_dist(n, p, m):
    pmf = [math.comb(n, k) * p ** k * (1 - p) ** (n - k) for k in range(n + 1)]
    cdf = [sum(pmf[:k + 1]) for k in range(n + 1)]
    F = lambda a, b: (cdf[b] - (cdf[a - 1] if a > 0 else 0)) if b >= a else 0.0  # P(a <= X <= b)
    # P(range <= d) = sum over the minimum a of [P(all in [a, a+d])^m - P(all in [a+1, a+d])^m]
    def le(d): return sum(F(a, min(n, a + d)) ** m - F(a + 1, min(n, a + d)) ** m for a in range(n + 1))
    P = [le(d) for d in range(n + 1)]
    mean = sum(1 - P[d] for d in range(n))  # E[range] = sum over d of P(range > d)
    return mean, P
for e in EFF:
    o = out['effort'][e]
    rows80 = [x for x in o['rows'] if x['n'] == 80]
    p = o['passed'] / o['runs']
    mean, P = range_dist(80, p, len(rows80))
    obs = max(x['k'] for x in rows80) - min(x['k'] for x in rows80)
    o['null_range_mean_runs'] = r(mean, 1); o['null_range_mean_points'] = r(100 * mean / 80, 1)
    o['obs_range_runs'] = obs; o['obs_range_points'] = r(100 * obs / 80, 1)
    o['p_range_ge_obs'] = r(1 - P[obs - 1], 2)
    o['null_range_80'] = [next(d for d in range(81) if P[d] >= 0.1), next(d for d in range(81) if P[d] >= 0.9)]

# the SMT example: Number_of_Sequences = byte1 + (byte2 << 8) + 0x7F00 when byte0 == 255 (Zstd format, Sequences_Section_Header)
# against the agents' byte1 + (byte2 << 8) | 0x7F00 (Rust: + binds tighter than |), over every count the 3-byte form can encode in a
# valid block: 0x7F00 = 32,512 (the 2-byte form ends at 0x7EFF) up to 131,072 / 3 = 43,690 (128 KiB block, 3-byte minimum match)
same = [nb for nb in range(0x7F00, 131072 // 3 + 1) if (((nb - 0x7F00) & 0xFF) + (((nb - 0x7F00) >> 8) << 8)) | 0x7F00 == nb]
out['nbseq'] = {'lo': 0x7F00, 'hi': 131072 // 3, 'agree': len(same), 'agree_lo': min(same), 'agree_hi': max(same)}
json.dump(out, open('inputs/recompute.json', 'w'), indent=1)
print({e: {k_: out['effort'][e][k_] for k_ in ('null_range_mean_points', 'obs_range_points', 'p_range_ge_obs', 'null_range_80')} for e in EFF}, out['nbseq'])

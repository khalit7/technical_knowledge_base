"""Recompute every derived number the NeoHorse-1 page shows, and check every number in the paper's text that the
tables can check. Writes inputs/recompute.json (read by mk_paper.py into window.PAPER.rc); prints a pass count.
  python3 recompute.py      (build.sh runs it; exits non-zero if a check fails)
"""
import json, math, os, random

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
K = [b['k'] for b in T['bench']]
checks, out = [], {}


def ck(name, ok, detail, where):
    checks.append({'name': name, 'ok': bool(ok), 'detail': detail, 'at': where})


def row(t, m):
    return next(r for r in T[t]['rows'] if r['m'] == m)


r2 = lambda x: round(x + 1e-12, 2)

# 1. every printed average in Tables 1 and 2 is the plain mean of its ten columns
for t in ('t1', 't2'):
    for r in T[t]['rows']:
        m = sum(r['v']) / 10
        ck('%s average of %s' % (T[t]['id'], r['m']), abs(m - r['avg']) < 0.006, 'mean of 10 columns %.3f, printed %s' % (m, r['avg_p']), T[t]['id'])
ck('benchmarks in Tables 1 and 2', len(K) == 10, '10 columns; the HTML abstract and §6 say ten, the arXiv listing abstract says eleven', 'S5.T1')

b4, n4, b9, n9 = row('t1', 'Qwen3.5-4B'), row('t1', 'NeoHorse-1-4B'), row('t2', 'Qwen3.5-9B'), row('t2', 'NeoHorse-1-9B')
d4 = [r2(a - b) for a, b in zip(n4['v'], b4['v'])]
d9 = [r2(a - b) for a, b in zip(n9['v'], b9['v'])]
out['d4'], out['d9'] = d4, d9
out['gain4'], out['gain9'] = r2(n4['avg'] - b4['avg']), r2(n9['avg'] - b9['avg'])
ck('4B macro gain', abs(sum(d4) / 10 - 5.93) < 0.006, '64.87 − 58.94 = 5.93; mean of the ten per-benchmark gains %.3f' % (sum(d4) / 10), 'S5.T1')
ck('9B macro gain', abs(sum(d9) / 10 - 3.44) < 0.006, '69.04 − 65.60 = 3.44; mean of the ten per-benchmark gains %.3f' % (sum(d9) / 10), 'S5.T2')
ck('"NeoHorse-1-4B outperforms Qwen3.5-4B on every benchmark"', all(x > 0 for x in d4), 'gains ' + ', '.join('%+.2f' % x for x in d4), 'S5')
up9, tie9, dn9 = sum(x > 0 for x in d9), sum(x == 0 for x in d9), sum(x < 0 for x in d9)
out['ud9'] = [up9, tie9, dn9]
ck('"9B improves on most benchmarks, one minor decrease"', (up9, tie9, dn9) == (7, 2, 1), '%d up, %d identical to two decimals (LiveCodeBench 65.14, IFBench 66.33), %d down (IFEval 89.46 to 89.09)' % (up9, tie9, dn9), 'S5')
d94 = [r2(a - b) for a, b in zip(n9['v'], n4['v'])]
out['d94'] = d94
ck('"NeoHorse-1-9B consistently outperforms NeoHorse-1-4B"', all(x > 0 for x in d94), 'smallest gaps: IFEval %+.2f, IFBench %+.2f, HumanEval %+.2f' % (d94[9], d94[8], d94[6]), 'S5')
# gap closure: the post-trained 4B against the base 9B
gap = b9['avg'] - b4['avg']; closed = n4['avg'] - b4['avg']
out['gap_closed'] = round(100 * closed / gap, 1)
ck('share of the 4B-to-9B macro gap closed', abs(out['gap_closed'] - 89.0) < 0.06, '(64.87 − 58.94) / (65.60 − 58.94) = 5.93 / 6.66 = %.1f%%; the macro-average still trails by %.2f' % (out['gap_closed'], b9['avg'] - n4['avg']), 'S5.T1')
w = [b['n'] for b, a, c in zip(T['bench'], n4['v'], b9['v']) if a > c]
out['beats9'] = w
ck('benchmarks where the post-trained 4B beats the base 9B', len(w) == 5, ', '.join(w) + ' (5 of 10); the paper says "matches or exceeds on several"', 'S5')
ck('NeoHorse-1-4B best average in the 4B track', max(T['t1']['rows'], key=lambda r: r['avg'])['m'] == 'NeoHorse-1-4B', '64.87 against Nanbeige-4.2-3B 62.31 and Spark-X2.5-4B 62.22', 'S5.T1')
ck('NeoHorse-1-9B best average in the 9B track', max(T['t2']['rows'], key=lambda r: r['avg'])['m'] == 'NeoHorse-1-9B', '69.04 against Muse-Glimmer-30B 67.86 (a 30B reference)', 'S5.T2')
nb = row('t1', 'Nanbeige-4.2-3B')
nb9 = sum(v for v, s in zip(nb['v'], nb['star']) if not s) / 9
n49 = sum(v for v, s in zip(n4['v'], nb['star']) if not s) / 9
out['nanbeige9'] = [round(nb9, 2), round(n49, 2)]
ck('Nanbeige average without its starred (not re-run) LiveCodeBench', True, 'nine re-run columns: Nanbeige %.2f, NeoHorse-1-4B %.2f' % (nb9, n49), 'S5.T1')
# where the gain comes from: agentic six against code and instruction following
ag = [0, 1, 2, 3, 4, 5]
out['ag4'] = [r2(sum(b4['v'][i] for i in ag) / 6), r2(sum(n4['v'][i] for i in ag) / 6)]
out['ag9'] = [r2(sum(b9['v'][i] for i in ag) / 6), r2(sum(n9['v'][i] for i in ag) / 6)]
out['rest4'] = [r2(sum(b4['v'][i] for i in range(6, 10)) / 4), r2(sum(n4['v'][i] for i in range(6, 10)) / 4)]
out['rest9'] = [r2(sum(b9['v'][i] for i in range(6, 10)) / 4), r2(sum(n9['v'][i] for i in range(6, 10)) / 4)]
ck('agentic-six averages', True, '4B %.2f to %.2f, 9B %.2f to %.2f; code and instruction following: 4B %.2f to %.2f, 9B %.2f to %.2f' % tuple(out['ag4'] + out['ag9'] + out['rest4'] + out['rest9']), 'S0.F1')

# 2. Figure 1's printed labels agree with Tables 1 and 2 at one decimal
F1 = json.load(open(os.path.join(HERE, 'inputs', 'figs.json')))['fig1']['words']
nums = [float(x) for x in F1 if x.replace('.', '', 1).isdigit() and '.' in x]
order4 = ['NeoHorse-1-4B', 'Gemma-4-E4B-it', 'Qwen3.5-4B', 'Spark-X2.5-4B', 'Nanbeige-4.2-3B', 'Agents-A1-4B']
order9 = ['NeoHorse-1-9B', 'Granite-4.2-8B', 'Gemma-4-12B-it', 'Ornith-1.5-9B', 'Muse-Glimmer-30B', 'Qwen3.5-9B']
figcols = [1, 3, 4, 5, 0, 2]  # Vita, Pinch, WorkBuddy, QwenClaw, BFCL, tau2
want = []
for t, order in (('t1', order4), ('t2', order9)):
    for c in figcols:
        for m in order: want.append(round(row(t, m)['v'][c] + 1e-9, 1))
bad = [(a, b) for a, b in zip(nums, want) if abs(a - b) > 0.051]
ck('Figure 1 bar labels against Tables 1 and 2', len(nums) == 72 and not bad, '%d labels, %d disagree beyond rounding' % (len(nums), len(bad)), 'S0.F1')

# 3. Table 3 and Figure 7: the controlled data experiments, against the base model they never print beside
t3 = T['t3']; ci = [K.index(k) for k in t3['cols']]
tou, har, dif = [r['v'] for r in t3['rows']]
for nm, r, p in (('Toucan', tou, 64.32), ('routing-harness', har, 70.57)):
    m = sum(r[:5]) / 5
    ck('Table 3 average, ' + nm, abs(m - p) < 0.006, 'mean %.3f, printed %.2f' % (m, p), 'S5.T3')
ck('Table 3 differences', all(abs((h - u) - d) < 0.006 for h, u, d in zip(har[:5], tou[:5], dif[:5])) and abs((sum(har[:5]) - sum(tou[:5])) / 5 - dif[5]) < 0.006, 'every printed difference is the row difference (the average\'s 6.26 is 70.572 − 64.316, so it is not 70.57 − 64.32 = 6.25)', 'S5.T3')
base5 = sum(b4['v'][i] for i in ci) / 5
fin5 = sum(n4['v'][i] for i in ci) / 5
f7 = T['fig7']
out['base5'], out['fin5'] = r2(base5), r2(fin5)
ck('Figure 7 baseline is Qwen3.5-4B on the five Table 3 benchmarks', abs(base5 - f7['baseline_printed']) < 0.006, 'mean of LiveCodeBench 53.71, HumanEval 87.20, IFBench 60.33, BFCL 61.02, τ² 84.29 = %.3f; Figure 7 prints 69.31' % base5, 'S5.F7')
ck('Figure 7 decode', abs(f7['baseline'] - 69.31) < 0.006 and abs(f7['points'][-1]['avg'] - 71.45) < 0.006, 'calibrated baseline %.3f and last point %.3f against printed 69.31 and 71.45' % (f7['baseline'], f7['points'][-1]['avg']), 'S5.F7')
p2 = f7['points'][1]
ck('Table 3 routing-harness run is Figure 7\'s second point', abs(p2['avg'] - 70.57) < 0.01, 'second marker %.3f at %.2fM unique supervised tokens; Table 3 prints 70.57' % (p2['avg'], p2['tokens_M']), 'S5.F7')
out['tou_vs_base'] = r2(64.32 - base5); out['har_vs_base'] = r2(70.57 - base5); out['fin_vs_base'] = r2(fin5 - base5)
out['f7max_vs_base'] = r2(f7['points'][-1]['avg'] - base5)
ck('Toucan run against the untrained base', 64.32 < base5, 'Toucan %.2f is %.2f below the base model\'s %.2f; the routing-harness run is %+.2f above it' % (64.32, base5 - 64.32, base5, 70.57 - base5), 'S5.T3')
ck('controlled runs against the released 4B', fin5 > f7['points'][-1]['avg'], 'released NeoHorse-1-4B on the same five: %.2f; largest Figure 7 run %.2f; so %.0f%% of the released model\'s five-benchmark gain is not in the controlled experiments' % (fin5, f7['points'][-1]['avg'], 100 * (fin5 - f7['points'][-1]['avg']) / (fin5 - base5)), 'S5.F7')
out['f7_share_missing'] = round(100 * (fin5 - f7['points'][-1]['avg']) / (fin5 - base5))
sp = [p['tokens_M'] for p in f7['points']]
steps = [b - a for a, b in zip(sp, sp[1:])]
ck('Figure 7 x positions', max(steps) - min(steps) < 0.05, 'markers at %s million tokens: equal steps of about %.2fM, the largest %.1fM' % (', '.join('%.2f' % x for x in sp), sum(steps) / len(steps), sp[-1]), 'S5.F7')
# Table 3: BFCL below the base for both sources
ck('Table 3 BFCL below the base', har[3] < b4['v'][0] and tou[3] < b4['v'][0], 'routing-harness 57.20 and Toucan 54.77 against the base 61.02', 'S5.T3')

# 4. sample sizes read from the score granularity, and binomial error bars the paper does not give
N = {'he': 164, 'lcb': 175, 'ifb': 300, 'ife': 541, 'vita': 400}
gran = {}
for k, n in N.items():
    i = K.index(k); vals = []
    for t in ('t1', 't2'):
        for r in T[t]['rows']:
            if not r['star'][i]: vals.append(r['v'][i])
    if k in t3['cols']:
        vals += [tou[t3['cols'].index(k)], har[t3['cols'].index(k)]]
    okk = all(abs(v * n / 100 - round(v * n / 100)) <= n * 0.005 / 100 + 1e-9 for v in vals)  # printed to two decimals
    gran[k] = okk
    ck('every %s score is a whole number of items out of %d' % (T['bench'][i]['n'], n), okk, '%d scores checked' % len(vals), 'S5.T1')
nb_l = nb['v'][K.index('lcb')]
ck('Nanbeige\'s starred LiveCodeBench is not out of 175', abs(nb_l * 1.75 - round(nb_l * 1.75)) > 0.1, '72.50 × 1.75 = %.3f: a different problem set or protocol, as the star says' % (nb_l * 1.75), 'S5.T1')
se = {}
for k, n in N.items():
    i = K.index(k)
    for tag, a, b in (('4', b4['v'][i], n4['v'][i]), ('9', b9['v'][i], n9['v'][i])):
        pa, pb = a / 100, b / 100
        s = 100 * math.sqrt(pa * (1 - pa) / n + pb * (1 - pb) / n)
        se[k + tag] = {'n': n, 'items': [round(a * n / 100), round(b * n / 100)], 'se': round(s, 2), 'z': round((b - a) / s, 2) if s else None}
out['se'] = se
ck('binomial standard errors', True, '; '.join('%s %s: %+d items, SE %.2f, z %.1f' % (k[:-1], k[-1] + 'B', v['items'][1] - v['items'][0], v['se'], v['z'] or 0) for k, v in se.items()), 'derived')
# sign test: ten of ten gains at 4B
p10 = 2 * 0.5 ** 10
out['sign_p'] = round(p10, 4)
ck('sign test, 10 of 10 benchmarks up at 4B', p10 < 0.01, 'two-sided p = 2 × 0.5^10 = %.4f, treating benchmarks as independent' % p10, 'derived')

# 5. the curriculum score (Eq. 2) and the coarsened OPD objective (Eq. 3) as the page computes them
def soft(pi): return sum(k * p for k, p in enumerate(pi))
ck('Eq. 2 soft score', abs(soft([0.1, 0.2, 0.3, 0.4]) - 2.0) < 1e-12 and abs(soft([0, 0.6, 0.4, 0]) - 1.4) < 1e-12, 'π = (0.1, 0.2, 0.3, 0.4) gives 2.0; (0, 0.6, 0.4, 0) gives 1.4 (hard tier C1, soft 1.4)', 'S4.E2')
rng = random.Random(7)


def kl(p, q): return sum(a * math.log(a / b) for a, b in zip(p, q) if a > 0)


def coarse(p, q, K_):
    idx = sorted(range(len(p)), key=lambda i: -p[i])[:K_]
    P = [p[i] for i in idx] + [1 - sum(p[i] for i in idx)]
    Q = [q[i] for i in idx] + [1 - sum(q[i] for i in idx)]
    return kl([max(x, 0) for x in P], [max(x, 1e-300) for x in Q])


worst = 0; viol = 0
for _ in range(4000):
    V = rng.randint(4, 40)
    p = [rng.random() ** 3 for _ in range(V)]; s = sum(p); p = [x / s for x in p]
    q = [rng.random() ** 3 + 1e-6 for _ in range(V)]; s = sum(q); q = [x / s for x in q]
    K_ = rng.randint(1, V - 1)
    c, f = coarse(p, q, K_), kl(p, q)
    if c > f + 1e-12: viol += 1
    worst = max(worst, c - f)
ck('coarsened reverse KL never exceeds the full one', viol == 0, '4,000 random student and teacher pairs, vocabularies 4 to 40, K from 1 to V − 1: %d violations (the data-processing inequality)' % viol, 'S4.E3')

json.dump({'checks': checks, **out}, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1, ensure_ascii=False)
ok = sum(c['ok'] for c in checks)
print('recompute: %d of %d checks pass' % (ok, len(checks)))
for c in checks:
    if not c['ok']: print('FAIL', c['name'], c['detail'])
if ok != len(checks): raise SystemExit(1)

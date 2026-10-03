"""Recompute every derived number the page shows from tables.json, and check the paper's printed changes.
Writes inputs/recompute.json (embedded in the page as PAPER.rc).
usage: python3 recompute.py"""
import json, math

TB = json.load(open('tables.json'))
R = {}
Phi = lambda z: 0.5 * (1 + math.erf(z / math.sqrt(2)))


def rel(a, b): return 100 * (b - a) / a


# 1. every printed change in Tables I to III, recomputed
checks = []
for tk, metric_pts in (('T1', ('pass',)), ('T2', ('score',)), ('T3', ('pass',))):
    rows = TB[tk]['rows']
    base = {r['model']: r for r in rows if r['setting'] == 'Baseline'}
    for r in rows:
        if r['setting'] == 'Baseline': continue
        b = base[r['model']]
        for m in ('pass', 'score', 'actions', 'input', 'output'):
            if m not in r or 'dp' not in r[m]: continue
            pts = m in metric_pts
            got = (r[m]['v'] - b[m]['v']) if pts else rel(b[m]['v'], r[m]['v'])
            printed = r[m]['dir'] * float(r[m]['dp'].rstrip('%'))
            dec = len(r[m]['dp'].rstrip('%').split('.')[1]) if '.' in r[m]['dp'] else 0
            tol = 0.5 * 10 ** -dec + (0.051 if pts else 0.06)   # printed rounding plus the rounding of the two inputs
            checks.append({'t': tk, 'model': r['model'], 'setting': r['setting'], 'metric': m, 'printed': printed,
                           'recomputed': round(got, 3), 'ok': abs(got - printed) <= tol, 'unit': 'pp' if (pts and tk != 'T2') else ('points' if pts else '%')})
R['checks'] = checks
R['bad'] = [c for c in checks if not c['ok']]

# 2. Pass@1 granularity: one run over N instances, or three seeds averaged (3N runs)
gran = []
for r in TB['T1']['rows'] + TB['T3']['rows']:
    N = 300 if r['model'].startswith('Gemini') else (110 if r in TB['T3']['rows'] else 500)
    p = r['pass']['v']
    k1, k3 = p * N / 100, p * 3 * N / 100
    gran.append({'model': r['model'], 'setting': r['setting'], 'N': N, 'solved_1run': round(k1, 2), 'solved_3runs': round(k3, 2),
                 'whole_1run': abs(k1 - round(k1)) < 0.5 * N / 1000 + 1e-9 and abs(round(k1) / N * 100 - p) < 0.05 + 1e-9,
                 'whole_3runs': abs(round(k3) / (3 * N) * 100 - p) < 0.05 + 1e-9})
R['granularity'] = gran

# 3. how wide is each Pass@1 change? unpaired 95% interval with N instances on each side (conservative),
#    and, for a paired McNemar test, how many fail-to-pass flips a drop of k instances can carry and stay p < 0.05
ci = []
for r in TB['T1']['rows']:
    if r['setting'] == 'Baseline': continue
    b = next(x for x in TB['T1']['rows'] if x['model'] == r['model'] and x['setting'] == 'Baseline')
    N = 300 if r['model'].startswith('Gemini') else 500
    p1, p2 = b['pass']['v'] / 100, r['pass']['v'] / 100
    se = math.sqrt(p1 * (1 - p1) / N + p2 * (1 - p2) / N)
    d = p2 - p1
    k = round(-d * N, 1)
    maxdisc = (k * k / 3.841) if k > 0 else 0
    ci.append({'model': r['model'], 'setting': r['setting'], 'N': N, 'diff_pp': round(100 * d, 2), 'se_pp': round(100 * se, 2),
               'lo': round(100 * (d - 1.96 * se), 1), 'hi': round(100 * (d + 1.96 * se), 1), 'z_unpaired': round(d / se, 2),
               'stars': r['pass']['sig'], 'drop_instances': k,
               'mcnemar_max_up_flips': max(0, math.floor((maxdisc - k) / 2)) if k > 0 else None})
R['ci'] = ci

# 4. RQ4 on SWE-rebench: 17.27% of 110 = 19 instances, unchanged. What drop could it have seen?
n, p = 110, 19 / 110
rel_drop = (46.8 - 35.6) / 46.8
exp_pp = 100 * p * rel_drop
se0 = math.sqrt(2 * p * (1 - p) / n)
z = (exp_pp / 100) / se0
power = Phi(z - 1.96) + Phi(-z - 1.96)
mdd80 = 100 * (1.96 + 0.8416) * se0
R['rq4'] = {'n': n, 'solved': 19, 'p': round(100 * p, 2), 'verified_rel_drop': round(100 * rel_drop, 1), 'expected_pp': round(exp_pp, 2),
            'expected_instances': round(exp_pp * n / 100, 1), 'se_pp': round(100 * se0, 2), 'power': round(power, 3), 'mdd80_pp': round(mdd80, 1),
            'ci_unchanged': [round(-196 * se0, 1), round(196 * se0, 1)],
            'act_rel_verified': round(rel(11.25, 19.83), 1), 'act_rel_rebench': round(rel(15.82, 17.11), 2),
            'in_rel_verified': round(rel(65905, 234216), 1), 'in_rel_rebench': round(rel(143626.49, 175231.61), 2)}

# 5. Figure 1: share with leakage evidence, share at patch/test level
f1 = {}
for m, v in TB['F1']['rows'].items():
    tot = sum(v)
    f1[m] = {'total': tot, 'leak': tot - v[0], 'leak_pct': round(100 * (tot - v[0]) / tot, 1), 'patch_pct': round(100 * v[3] / tot, 1),
             'strong': v[2] + v[3], 'strong_pct': round(100 * (v[2] + v[3]) / tot, 1)}
R['f1'] = f1
R['f1_min_leak'] = min(x['leak_pct'] for x in f1.values()); R['f1_min_patch'] = min(x['patch_pct'] for x in f1.values())
g = TB['F1']['rows']['Gemini-3.1-Flash-Lite']
R['gemini300'] = {'strong': g[2] + g[3], 'from_file_symbol': 300 - g[2] - g[3]}

# 6. Figure 3: exploration share of the extra actions
f3 = {}
for m, v in TB['F3']['rows'].items():
    vv = [x or 0 for x in v]
    f3[m] = {'explore': round(sum(vv[:4]), 1), 'edit_test': round(vv[4] + vv[5], 1), 'sum': round(sum(vv), 1)}
R['f3'] = f3
t1 = {(r['model'], r['setting']): r for r in TB['T1']['rows']}
for m in ('DeepSeek-v4-Flash', 'GPT-5.4-mini'):
    extra = t1[(m, 'SchrodingerRepo')]['actions']['v'] - t1[(m, 'Baseline')]['actions']['v']
    f3[m]['extra_actions'] = round(extra, 2); f3[m]['explore_actions'] = round(extra * f3[m]['explore'] / 100, 1)

# 7. ratios quoted in the text
R['input_x'] = {m: round(t1[(m, 'SchrodingerRepo')]['input']['v'] / t1[(m, 'Baseline')]['input']['v'], 2) for m in ('GPT 5.1', 'GPT-5.4-mini', 'DeepSeek-v4-Flash', 'Gemini-3.1-Flash-Lite')}
R['case_x'] = round(217 / 37, 2)
R['l1_mini_actions'] = round(rel(11.25, 11.56), 2)
R['drop_range'] = [min(-c['diff_pp'] for c in ci if c['setting'] == 'SchrodingerRepo'), max(-c['diff_pp'] for c in ci if c['setting'] == 'SchrodingerRepo')]
json.dump(R, open('inputs/recompute.json', 'w'), indent=1)
print('changes checked', len(checks), 'mismatches', [(c['t'], c['model'], c['setting'], c['metric'], c['printed'], c['recomputed']) for c in R['bad']])
print('granularity', [(g['model'][:8], g['setting'], g['solved_1run'], g['whole_1run'], g['whole_3runs']) for g in gran])
for c in ci: print(c)
print(R['rq4']); print(f1); print(f3); print(R['input_x'], R['case_x'], R['l1_mini_actions'], R['drop_range'], R['gemini300'])

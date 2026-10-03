"""Recompute every derived number the page shows, from the paper's tables (tables.json), the released data
(inputs/released.json, made by mk_data.py) and the figures read from the vector PDFs (inputs/fig4_fig5.json).
Writes inputs/recompute.json; build.sh runs it first.  usage: python3 recompute.py"""
import json, math, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
TB = json.load(open(os.path.join(HERE, 'tables.json')))
RL = json.load(open(os.path.join(HERE, 'inputs', 'released.json')))
FG = json.load(open(os.path.join(HERE, 'inputs', 'fig4_fig5.json')))
pct = lambda s: float(s.rstrip('%'))
out = {}

# ---- Table 4: cost = extra (checklist, once) + N x per-test cost ----
M = 1e6
ck = 1.38 * 1.25 + 0.228 * 5.00                      # GPT-4o batch price, checklist tokens from the Table 4 footnote
g4o = 1.84 * 1.25 + 0.220 * 5.00                     # one full WildBench run judged by GPT-4o (CoT)
mini = 1.84 * 0.075 + 0.220 * 0.30
std = {'g4o': 1.84 * 2.50 + 0.220 * 10.0, 'mini': 1.84 * 0.15 + 0.220 * 0.60, 'ck': 1.38 * 2.50 + 0.228 * 10.0}
gpu = {'Llama-3-70B (AWQ)': (3760, 1.44), 'Llama-3-8B': (685, 0.36), 'Gemma-2-2B': (248, 0.36), 'Qwen2.5-1.5B': (165, 0.36)}
rows = [{'judge': 'GPT-4o (20240806)', 'extra': 0, 'per': g4o}, {'judge': 'GPT-4o-mini (20240718)', 'extra': 0, 'per': mini}]
for k, (s, p) in gpu.items(): rows.append({'judge': k, 'extra': ck, 'per': s * p / 3600, 'sec': s, 'hr': p})
for r, t in zip(rows, TB['t4']['rows']):
    r['printed'] = t['n']; r['calc'] = [r['extra'] + n * r['per'] for n in (10, 100, 1000)]
    r['rel'] = [abs(c - float(p.strip('$'))) / float(p.strip('$')) for c, p in zip(r['calc'], t['n'])]
r70 = rows[2]; imp = [(float(p.strip('$')) - ck) / n for p, n in zip(r70['printed'], (10, 100, 1000))]
out['cost'] = {'ck': ck, 'g4o': g4o, 'mini': mini, 'std': std, 'rows': rows,
               'l70_implied_per_test': imp, 'l70_implied_sec': [x / 1.44 * 3600 for x in imp], 'l70_from_sec': 3760 * 1.44 / 3600,
               'ratio_1000': {r['judge']: 3400 / float(r['printed'][2].strip('$')) for r in rows[2:]},
               'share_1000': {r['judge']: float(r['printed'][2].strip('$')) / 3400 for r in rows[2:]},
               'breakeven_vs_mini': {r['judge']: ck / (mini - r['per']) for r in rows[3:]}}
# ---- rank statistics with n = 12 test models ----
n = 12; P = n * (n - 1) // 2
def disc(tau): return (1 - tau) * P / 2                 # discordant pairs, no ties
def sumd2(rho): return (1 - rho) * n * (n * n - 1) / 6  # sum of squared rank differences, no ties
k3 = {}
for r in TB['t3']['rows']:
    vals = r[1:]; k3[r[0]] = [None if v == '-' else round(disc(float(v)), 2) for v in vals[0::2]]
out['t3_discordant'] = k3
out['one_swap'] = {'kendall': 2 / P, 'spearman': 6 * 2 / (n * (n * n - 1))}
# ---- the released GPT-4o grades reproduce Table 3's GPT-4o row ----
def ranks(x):
    o = sorted(range(len(x)), key=lambda i: x[i]); r = [0.0] * len(x); i = 0
    while i < len(o):
        j = i
        while j + 1 < len(o) and x[o[j + 1]] == x[o[i]]: j += 1
        for k in range(i, j + 1): r[o[k]] = (i + j) / 2 + 1
        i = j + 1
    return r
def spearman(a, b):
    ra, rb = ranks(a), ranks(b); m = len(a); ma, mb = sum(ra) / m, sum(rb) / m
    return sum((x - ma) * (y - mb) for x, y in zip(ra, rb)) / math.sqrt(sum((x - ma) ** 2 for x in ra) * sum((y - mb) ** 2 for y in rb))
def kendall(a, b):
    c = d = 0
    for i in range(len(a)):
        for j in range(i + 1, len(a)):
            s = (a[i] - a[j]) * (b[i] - b[j]); c += s > 0; d += s < 0
    return (c - d) / (len(a) * (len(a) - 1) / 2), d
dec = lambda ch: 10 if ch == 'A' else int(ch)
means = [sum(dec(c) for c in t['g']) / len(t['g']) for t in RL['test']]; elo = [t['elo'] for t in RL['test']]
kt, dd = kendall(means, elo)
pairs = [(RL['test'][i]['short'], RL['test'][j]['short']) for i in range(n) for j in range(i + 1, n) if (means[i] - means[j]) * (elo[i] - elo[j]) < 0]
out['g4o_rerun'] = {'means': [round(x, 3) for x in means], 'spearman': spearman(means, elo), 'kendall': kt, 'discordant': dd, 'pairs': pairs, 'nq': RL['nq']}
ci_overlap = [(RL['test'][i]['short'], RL['test'][i + 1]['short']) for i in range(n - 1) if RL['test'][i]['lo'] < RL['test'][i + 1]['hi']]
out['elo_ci_overlap'] = ci_overlap
tin = [t['tin'] / t['n'] * 1000 for t in RL['test']]; tout = [t['tout'] / t['n'] * 1000 for t in RL['test']]
out['tokens'] = {'mean_in_per_1000': sum(tin) / n, 'mean_out_per_1000': sum(tout) / n, 'min_in': min(t['tin'] for t in RL['test']), 'max_in': max(t['tin'] for t in RL['test']),
                 'mean_in_run': sum(t['tin'] for t in RL['test']) / n, 'mean_out_run': sum(t['tout'] for t in RL['test']) / n, 'mean_n': sum(t['n'] for t in RL['test']) / n}
# ---- the released small-judge gradings against GPT-4o's grade of the same response ----
def pearson(a, b):
    m = len(a); ma, mb = sum(a) / m, sum(b) / m
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / math.sqrt(sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))
jr = []
for j in RL['judges']:
    s, h, g = zip(*j['rows']); items = sum(j['hist'])
    jr.append({'judge': j['judge'], 'model': j['model'], 'n': len(s), 'r_soft': pearson(s, g), 'r_hard': pearson(h, g), 'rho_soft': spearman(list(s), list(g)), 'rho_hard': spearman(list(h), list(g)),
               'mid': sum(j['hist'][6:14]) / items, 'mean_soft': sum(s) / len(s), 'mean_g': sum(g) / len(g), 'none': j['none']})
out['judges'] = jr
ckl = {int(k): v for k, v in RL['ck_len'].items()}
out['ck'] = {'n': RL['ck_n'], 'min': min(ckl), 'max': max(ckl), 'in_5_10': sum(v for k, v in ckl.items() if 5 <= k <= 10), 'over_10': sum(v for k, v in ckl.items() if k > 10),
             'under_5': sum(v for k, v in ckl.items() if k < 5), 'mean': sum(k * v for k, v in ckl.items()) / RL['ck_n']}
mt = RL['mt']; f = lambda x: x[1] / x[0]
out['mt'] = {k: ({kk: [vv[0], vv[1], f(vv)] if isinstance(vv, list) else vv for kk, vv in v.items()} if isinstance(v, dict) else v) for k, v in mt.items()}
out['mt']['hh_all6'] = [mt['hh_all6'][0], mt['hh_all6'][1], f(mt['hh_all6'])]
out['mt']['se_two'] = math.sqrt(0.43 * 0.57 / 200)
out['alpha'] = RL['alpha']
# ---- claims in the text checked against the tables ----
t2 = {r[0]: r[1:] for r in TB['t2']['rows']}
out['t2'] = {
 'unsup_beats_cot': [k for k, v in t2.items() if v[3] != '-' and pct(v[3]) > pct(v[0])],
 'fixed_below_cot': [k for k, v in t2.items() if v[2] != '-' and pct(v[2]) < pct(v[0])],
 'over64_unsup': [k for k, v in t2.items() if v[3] != '-' and pct(v[3]) > 64], 'over64_any': [k for k, v in t2.items() if any(x != '-' and pct(x) > 64 for x in v[3:])],
 'small_over60_unsup': [k for k, v in t2.items() if v[3] != '-' and pct(v[3]) > 60],
 'sup_below_unsup': [k for k, v in t2.items() if v[4] != '-' and pct(v[4]) < pct(v[3])],
 'gain_gemma': pct(t2['Gemma-2-2B'][3]) - pct(t2['Gemma-2-2B'][0]),
 'mean_gain': sum(pct(v[3]) - pct(v[0]) for v in t2.values() if v[3] != '-') / sum(1 for v in t2.values() if v[3] != '-')}
t3 = {r[0]: r[1:] for r in TB['t3']['rows']}
out['t3'] = {'sup_gt_unsup_spea': [k for k, v in t3.items() if v[9] != '-' and float(v[9]) > float(v[7])], 'sup_eq_unsup_spea': [k for k, v in t3.items() if v[9] != '-' and float(v[9]) == float(v[7])],
             'sup_lt_unsup_spea': [k for k, v in t3.items() if v[9] != '-' and float(v[9]) < float(v[7])], 'unsup_ge_g4o': [k for k, v in t3.items() if v[7] != '-' and float(v[7]) >= 0.979]}
t7 = {r[0]: r[1:] for r in TB['t7']['rows']}
out['t7'] = {'norm_drop_mean': sum(pct(v[0]) - pct(v[1]) for v in t7.values()) / len(t7), 'indep_drop_mean': sum(pct(v[0]) - pct(v[2]) for v in t7.values()) / len(t7),
             'indep_helps_count': sum(1 for v in t7.values() if pct(v[2]) > pct(v[0])), 'n': len(t7)}
out['fig'] = {'fig4_at3': {k: v[2] for k, v in FG['fig4_sampling'].items()}, 'fig5_at7': {k: v[6] for k, v in FG['fig5_position'].items()},
              'fig5_monotone': {k: all(v[i] < v[i + 1] for i in range(len(v) - 1)) for k, v in FG['fig5_position'].items()}}
json.dump(out, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
if __name__ == '__main__':
    c = out['cost']
    print('checklist $%.3f  GPT-4o/test $%.2f  mini/test $%.3f  std GPT-4o/test $%.2f' % (c['ck'], c['g4o'], c['mini'], c['std']['g4o']))
    for r in c['rows']: print(' ', r['judge'], ['%.2f' % x for x in r['calc']], r['printed'], ['%.1f%%' % (100 * x) for x in r['rel']])
    print('70B implied per test', ['%.4f' % x for x in c['l70_implied_per_test']], 'implied s', ['%.0f' % x for x in c['l70_implied_sec']], 'from 3760s', '%.4f' % c['l70_from_sec'])
    print('ratio at 1000', {k: round(v, 1) for k, v in c['ratio_1000'].items()}, 'share', {k: round(100 * v, 2) for k, v in c['share_1000'].items()})
    print('breakeven vs mini', {k: round(v, 1) for k, v in c['breakeven_vs_mini'].items()})
    print('one swap', out['one_swap']); print('t3 discordant', {k: v for k, v in out['t3_discordant'].items() if k in ('GPT-4o', 'Gemma-2-2B', 'Mistral-Nemo', 'Llama-3-8B', 'Prometheus-7B-v2.0')})
    print('g4o rerun', out['g4o_rerun']); print('elo CI overlaps', ci_overlap); print('tokens', out['tokens'])
    for j in jr: print('judge', {k: (round(v, 3) if isinstance(v, float) else v) for k, v in j.items()})
    print('ck', out['ck']); print('mt', out['mt']); print('alpha', {k: v for k, v in out['alpha'].items() if k != 'train'})
    print('t2', out['t2']); print('t3', out['t3']); print('t7', out['t7']); print('fig', out['fig'])

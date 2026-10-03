"""Every derived number on the page, recomputed from tables.json, inputs/figs.json (vector figure points) and the
Hugging Face config. Writes inputs/recompute.json; build.sh runs it first. Prints one line per check."""
import json, math
T = json.load(open('tables.json')); F = json.load(open('inputs/figs.json'))
R = {}; checks = []
def chk(name, got, want, tol, note=''):
    ok = abs(got - want) <= tol
    checks.append({'name': name, 'got': round(got, 4), 'printed': want, 'ok': ok, 'note': note}); return ok
f = float

# 1. Theorem 3.1 and Figure 2: merge weights for 10 checkpoints (k = 9 updates spans, t_i = i/10)
def c_from_w(w):
    k = len(w); c = [0.0] * (k + 1)
    c[k] = w[k - 1]
    for j in range(1, k): c[j] = w[j - 1] - w[j]
    c[0] = 1 - w[0]; return c
def w_from_c(c):
    k = len(c) - 1; return [sum(c[j] for j in range(i, k + 1)) for i in range(1, k + 1)]
shapes = {'EMA': lambda t: 1 - 0.1 ** (1 - t), 'Linear': lambda t: 1 - t, 'Cosine': lambda t: (1 + math.cos(math.pi * t)) / 2, '1-sqrt': lambda t: 1 - math.sqrt(t)}
printed = {'EMA': [0.126, 0.033, 0.041, 0.052, 0.065, 0.082, 0.103, 0.130, 0.163, 0.206], 'Linear': [0.1] * 10,
           'Cosine': [0.024, 0.071, 0.111, 0.139, 0.155, 0.155, 0.139, 0.111, 0.071, 0.024],
           '1-sqrt': [0.316, 0.131, 0.101, 0.085, 0.075, 0.067, 0.062, 0.058, 0.054, 0.051]}
R['fig2'] = {}
nmatch = 0
for k, fn in shapes.items():
    w = [fn(i / 10) for i in range(1, 10)]
    c = c_from_w(w)
    m = sum(abs(round(a, 3) - b) < 0.0011 for a, b in zip(c, printed[k])); nmatch += m
    R['fig2'][k] = {'w': [round(x, 4) for x in w], 'c': [round(x, 4) for x in c], 'printed': printed[k], 'match': m}
    back = w_from_c(c); assert max(abs(a - b) for a, b in zip(back, w)) < 1e-12
chk('Figure 2: printed merge weights reproduced by Theorem 3.1 (of 40)', nmatch, 40, 0, 'EMA curve read from the panel label as w(t) = 1 - 0.1^(1-t)')
# EMA with alpha per checkpoint: last weight alpha, so the equivalent LR ends at alpha x peak
R['ema_end'] = R['fig2']['EMA']['w'][-1]
# curvature: second differences of w (positive = convex, bends upward)
R['curv'] = {k: round(shapes[k](0.25) + shapes[k](0.75) - 2 * shapes[k](0.5), 4) for k in shapes}

# 2. Table 1 and 2 improvement columns (relative %), and points
for t in ('t1', 't2'):
    a = [f(x) for x in T[t]['rows']['WSD']]; b = [f(x) for x in T[t]['rows']['WSM']]
    for col, x, y, p in zip(T[t]['cols'], a, b, T[t]['improv']):
        chk('%s Improv. %s' % (t.upper().replace('T', 'Table '), col), (y / x - 1) * 100, f(p.rstrip('%')), 0.006)
R['t1_pts'] = round(f(T['t1']['rows']['WSM'][-1]) - f(T['t1']['rows']['WSD'][-1]), 2)
R['t2_pts'] = round(f(T['t2']['rows']['WSM'][-1]) - f(T['t2']['rows']['WSD'][-1]), 2)
R['t1_cat_pts'] = [round(f(b) - f(a), 2) for a, b in zip(T['t1']['rows']['WSD'], T['t1']['rows']['WSM'])]

# 3. Table 7 -> Table 1 / Table 3 category averages (dataset means)
cats = ['General Knowledge & Reasoning', 'Language Understanding', 'Math', 'Code', 'Professional Knowledge']
t3cols = {'WSD': 'Decay (1-sqrt)', 'WSM EMA': 'Merge: EMA', 'WSM mean': 'Merge: Mean', 'WSM 1-sqrt': 'Merge: 1-sqrt'}
order = [0, 1, 2, 3, 4]  # Table 1 column order: GK, LM, Math, Code, PK
t1map = {'General Knowledge & Reasoning': 0, 'Language Understanding': 1, 'Math': 2, 'Code': 3, 'Professional Knowledge': 4}
R['t7_avg'] = {}
for ci, col in enumerate(T['t7']['cols']):
    rowsT3 = T['t3']['rows'][t3cols[col]]
    allv = []
    R['t7_avg'][col] = {}
    for cat in cats:
        v = [f(r[2 + ci]) for r in T['t7']['rows'] if r[0] == cat]; allv += v
        m = sum(v) / len(v); R['t7_avg'][col][cat] = round(m, 3)
        chk('Table 7 %s mean of %s (%d) vs Table 3' % (col, cat, len(v)), m, f(rowsT3[t1map[cat]]), 0.06)
    m = sum(allv) / len(allv); R['t7_avg'][col]['all'] = round(m, 3)
    cm = sum(R['t7_avg'][col][c] for c in cats) / 5
    R['t7_avg'][col]['mean_of_cats'] = round(cm, 3)
    chk('Table 7 %s overall: mean of 41 benchmarks vs Table 3 overall' % col, m, f(rowsT3[5]), 0.06)
# best-of per-benchmark wins
w = sum(1 for r in T['t7']['rows'] if f(r[4]) > f(r[2])); l = sum(1 for r in T['t7']['rows'] if f(r[4]) < f(r[2]))
R['t7_mean_wins'] = [w, l, len(T['t7']['rows']) - w - l]
w2 = sum(1 for r in T['t7']['rows'] if f(r[5]) > f(r[2])); l2 = sum(1 for r in T['t7']['rows'] if f(r[5]) < f(r[2]))
R['t7_sqrt_wins'] = [w2, l2, len(T['t7']['rows']) - w2 - l2]
# headline benchmarks in Table 7 (mean = the Table 1 WSM row)
R['t7_headline'] = {}
for name in ('MATH', 'HumanEval', 'MMLU-Pro'):
    r = next(r for r in T['t7']['rows'] if r[1] == name)
    R['t7_headline'][name] = {'WSD': f(r[2]), 'mean': f(r[4]), 'pts': round(f(r[4]) - f(r[2]), 1), 'rel': round((f(r[4]) / f(r[2]) - 1) * 100, 2)}
# Figure 10 printed labels (best of each curve per benchmark)
lab = {l['dataset'].lower(): l for l in F['fig10_labels']['labels']}
R['fig10'] = F['fig10_labels']['labels']
R['fig10_pos'] = sum(1 for l in F['fig10_labels']['labels'] if l['pts'] > 0)
for d, key in (('MATH', 'math'), ('HumanEval', 'openai_humaneval'), ('MMLU-Pro', 'mmlu_pro')):
    R['t7_headline'][d]['fig10'] = lab[key]
# label self-consistency: pts / pct implies the WSD best value
R['abstract'] = {'MATH': 3.5, 'HumanEval': 2.9, 'MMLU-Pro': 5.5}

# 4. Table 8/9 sub-averages and Table 2 categories
R['sft_avgs'] = []
for t in ('t8', 't9'):
    groups = {}
    for r in T[t]['rows']:
        groups.setdefault(r[0], []).append(r)
    for g, rows in groups.items():
        data = [r for r in rows if r[1] != 'Average']; avg = [r for r in rows if r[1] == 'Average'][0]
        for ci, col in enumerate(T[t]['cols']):
            m = sum(f(r[2 + ci]) for r in data) / len(data)
            ok = chk('%s %s %s average of %d' % (t.upper().replace('T', 'Table '), g, col, len(data)), m, f(avg[2 + ci]), 0.006)
            R['sft_avgs'].append({'table': t, 'group': g, 'col': col, 'n': len(data), 'recomputed': round(m, 2), 'printed': avg[2 + ci], 'ok': ok})
# Multi-LogiEval: what the reasoning average would be without it
rr = [r for r in T['t9']['rows'] if r[0].startswith('Reasoning') and r[1] not in ('Average',)]
R['reason'] = {c: {'all10': round(sum(f(r[2 + i]) for r in rr) / len(rr), 2), 'no_mle': round(sum(f(r[2 + i]) for r in rr if r[1] != 'Multi-LogiEval') / (len(rr) - 1), 2)} for i, c in enumerate(['WSD', 'WSM'])}
# Table 2 categories as dataset-weighted means of Table 8/9 groups
def grp(t, g, ci):
    rows = [r for r in T[t]['rows'] if r[0] == g and r[1] != 'Average']; return [f(r[2 + ci]) for r in rows]
def gavg(t, g, ci):
    a = [r for r in T[t]['rows'] if r[0] == g and r[1] == 'Average'][0]; return f(a[2 + ci]), len(grp(t, g, ci))
t2def = {'Language': [('t9', 'Language Language Understanding')], 'Knowledge': [('t8', 'Knowledge Basic Knowledge'), ('t8', 'Professional Knowledge')],
         'Math': [('t8', 'Math Elementary Mathematics'), ('t8', 'Intermediate Mathematics'), ('t8', 'Advanced Mathematics')],
         'Code': [('t8', 'Code Code Completion'), ('t8', 'Code Generation')], 'Reason': [('t9', 'Reasoning Complex Reasoning')],
         'Agent': [('t9', 'Agent Tool-use'), ('t9', 'Instruction Following')]}
R['t2_from_groups'] = {}
for ci, col in enumerate(['WSD', 'WSM']):
    allrows = []
    for cat, gs in t2def.items():
        num = sum(gavg(t, g, ci)[0] * gavg(t, g, ci)[1] for t, g in gs); den = sum(gavg(t, g, ci)[1] for t, g in gs)
        v = num / den; R['t2_from_groups'].setdefault(col, {})[cat] = round(v, 3)
        chk('Table 2 %s %s = dataset-weighted mean of printed Table 8/9 group averages' % (col, cat), v, f(T['t2']['rows'][col][T['t2']['cols'].index(cat)]), 0.006)
        for t, g in gs: allrows += grp(t, g, ci)
    m = sum(allrows) / len(allrows)
    R['t2_from_groups'][col]['overall_rows'] = round(m, 3)
    num = sum(R['t2_from_groups'][col][c] * sum(gavg(t, g, ci)[1] for t, g in gs) for c, gs in t2def.items()); den = sum(sum(gavg(t, g, ci)[1] for t, g in gs) for gs in t2def.values())
    R['t2_from_groups'][col]['overall_groups'] = round(num / den, 3)
    chk('Table 2 %s overall = mean of all %d benchmarks (printed group averages)' % (col, den), num / den, f(T['t2']['rows'][col][-1]), 0.006)

# 5. Figure 3 and Figure 4 (vector points): best checkpoints and the token budget they used
P = {p['title']: p['series'] for p in F['fig3_main']['panels']}
ov = P['Overall Average']
best = lambda s, cap=1e9: max((v, x) for x, v in s if x <= cap + 1)
R['fig3'] = {'WSD_best': best(ov['WSD']), 'WSD_last': ov['WSD'][-1]}
wsm_all = [(v, x, k) for k, s in ov.items() if k.startswith('WSM (Merge') for x, v in s]
R['fig3']['WSM_best'] = max(wsm_all)
R['fig3']['WSM_best_le400'] = max(t for t in wsm_all if t[1] <= 401)
R['fig3']['before_merge_best'] = best(ov['WSM (before merge)'])
R['fig3']['before_merge_le400'] = best(ov['WSM (before merge)'], 400)
chk('Table 1 WSD 62.67 = best WSD point in Figure 3', R['fig3']['WSD_best'][0], 62.67, 0.006)
chk('Table 1 WSM 63.95 = best merged point in Figure 3', R['fig3']['WSM_best'][0], 63.95, 0.006)
R['fig3']['gap_matched'] = round(R['fig3']['WSM_best_le400'][0] - R['fig3']['WSD_best'][0], 2)
R['fig3']['gap_table'] = round(R['fig3']['WSM_best'][0] - R['fig3']['WSD_best'][0], 2)
R['fig3']['merge_over_raw_400'] = round(R['fig3']['WSM_best_le400'][0] - dict(map(tuple, [(x, v) for x, v in ov['WSM (before merge)']]))[400.003 if False else min(dict((x, v) for x, v in ov['WSM (before merge)']), key=lambda x: abs(x - 400))], 2)
# categories at matched 400B: best merged point up to 400B against WSD's best
R['fig3']['cats'] = {}
for title, s in P.items():
    wsd = best(s['WSD']); m = max((v, x, k) for k, ss in s.items() if k.startswith('WSM (Merge') for x, v in ss)
    m4 = max((v, x, k) for k, ss in s.items() if k.startswith('WSM (Merge') for x, v in ss if x <= 401)
    R['fig3']['cats'][title] = {'wsd': wsd, 'wsm': m, 'wsm_le400': m4}
W = {}
for p in F['fig4_window']['panels']:
    for k, s in p['series'].items(): W[k] = s
R['fig4'] = {k: {'best': best(s), 'best_le400': best(s, 400) if any(x <= 400 for x, _ in s) else None, 'n': len(s)} for k, s in W.items()}
for alg, t3 in (('Mean', 'Merge: Mean'), ('1-sqrt', 'Merge: 1-sqrt'), ('EMA', 'Merge: EMA')):
    b = max((s['best'][0], s['best'][1], k) for k, s in R['fig4'].items() if k.startswith(alg))
    b4 = max((s['best_le400'][0], s['best_le400'][1], k) for k, s in R['fig4'].items() if k.startswith(alg) and s['best_le400'])
    R['fig4'][alg + '_overall_best'] = b; R['fig4'][alg + '_best_le400'] = b4
    chk('Table 3 %s overall vs best point of Figure 4 %s panel' % (t3, alg), b[0], f(T['t3']['rows'][t3][5]), 0.006, 'at %gB tokens, %s' % (b[1], b[2]))
# duration effect: best per merge window, mean panel
R['fig4']['mean_by_window'] = {k: R['fig4'][k]['best'] for k in R['fig4'] if k.startswith('Mean, Merge')}

# 6. Figure 5(a): merged model against a real 100B decay at five milestones
A = F['fig5a_constant']['panels'][0]['series']
pairs = []
for mx, mv in A['Merge']:
    d = [(abs(x - mx), v, x) for x, v in A['Decay']]
    if d and min(d)[0] < 5: pairs.append({'tokens': round(mx), 'merge': mv, 'decay': min(d)[1], 'diff': round(mv - min(d)[1], 2)})
R['fig5a'] = pairs
R['fig5a_mad'] = round(sum(abs(p['diff']) for p in pairs) / len(pairs), 2)
R['fig5a_constant_at'] = {}
for p in pairs:
    R['fig5a_constant_at'][p['tokens']] = min((abs(x - p['tokens']), v) for x, v in A['constant'])[1]
B = F['fig5b_decay_merge']['panels'][0]['series']; C = F['fig5c_merge_decay']['panels'][0]['series']
R['fig5b'] = {'decay_ends': [(round(x), v) for x, v in B['Decay'] if round(x) % 1000 in (100,)], 'dtm': [(round(x), v) for x, v in B['Decay-then-Merge']]}
R['fig5c'] = {'decay': C['Decay'], 'mtd': C['Merge-then-Decay']}
# 5(a) and 5(b) plot the same constant-LR run and decays at 4T, 6T, 8T, 10T, yet print different decay values
R['fig5ab_decay'] = []
for x, v in A['Decay']:
    if round(x) % 1000 == 100 and round(x) >= 4000:
        vb = min((abs(xb - x), vb) for xb, vb in B['Decay'])
        R['fig5ab_decay'].append({'tokens': round(x), 'fig5a': v, 'fig5b': vb[1]})
ca = A['constant']; cb = B['constant']
R['fig5ab_constant_maxdiff'] = round(max(abs(a[1] - b[1]) for a, b in zip(ca, cb)), 2)

# 7. Table 4: language column and overall
R['t4'] = {k: {'cat_mean': round(sum(f(x) for x in v[:5]) / 5, 2), 'overall': f(v[5])} for k, v in T['t4']['rows'].items()}
R['t1_cat_mean'] = {k: round(sum(f(x) for x in v[:5]) / 5, 2) for k, v in T['t1']['rows'].items()}
# 8. Table 5 relative changes
a, b = T['t5']['rows']['WSD'], T['t5']['rows']['WSM']
R['t5_rel'] = [round((f(y) / f(x) - 1) * 100, 1) for x, y in zip(a, b)]

# 9. Ling-mini parameter recount from Table 6 + the released Ling-mini-2.0 config (same shape)
cfg = json.load(open('inputs/ling_mini_2_0_config.json'))
d, L, hd, H, KV = cfg['hidden_size'], cfg['num_hidden_layers'], cfg['head_dim'], cfg['num_attention_heads'], cfg['num_key_value_heads']
V = cfg['vocab_size']; E, Ea, Es, de, dff = cfg['num_experts'], cfg['num_experts_per_tok'], cfg['num_shared_experts'], cfg['moe_intermediate_size'], cfg['intermediate_size']
attn = d * H * hd + 2 * d * KV * hd + H * hd * d + 2 * hd  # q, k, v, o, q/k norms
norms = 2 * d
dense = 3 * d * dff
expert = 3 * d * de
moe_total = (E + Es) * expert + d * E + E  # experts, router, expert bias
moe_active = (Ea + Es) * expert + d * E + E
emb = V * d * (1 if cfg['tie_word_embeddings'] else 2)
nd = cfg['first_k_dense_replace']
total = L * (attn + norms) + nd * dense + (L - nd) * moe_total + emb + d
active = L * (attn + norms) + nd * dense + (L - nd) * moe_active + emb + d
R['params'] = {'total': total, 'active': active, 'embeddings': emb, 'hf_safetensors_total': 16255643392, 'vocab': V}
chk('Ling-mini total parameters (config recount) vs Table 6 16.3B', total / 1e9, 16.3, 0.05)
chk('Ling-mini active parameters (config recount) vs Table 6 1.43B', active / 1e9, 1.43, 0.005)
chk('Config recount vs Hugging Face safetensors count', total, 16255643392, 2e5)

# 10. Setup arithmetic
R['ckpts_in_branch'] = 400 / 25
R['tokens_per_batch'] = 2048 * 8192
chk('Appendix A: 2048 x 8K tokens per batch is about 16M', R['tokens_per_batch'] / 1e6, 16.8, 0.05)
R['steps_400B'] = round(400e9 / (2048 * 8192))
R['lr'] = {'main': 4.78e-4, 'appendix': 3.74e-4, 'ling_mini_2_0': 3.36e-4}

# Table 4 overall: the 41-benchmark weighting that reproduces Tables 1 and 3 (10, 6, 11, 8, 6 benchmarks per category)
nw = [10, 6, 11, 8, 6]
R['t1_weighted'] = {k: round(sum(f(x) * n for x, n in zip(v[:5], nw)) / 41, 2) for k, v in T['t1']['rows'].items()}
for k in T['t1']['rows']: chk('Table 1 %s overall = benchmark-weighted mean of its categories' % k, R['t1_weighted'][k], f(T['t1']['rows'][k][5]), 0.015)
R['t4_weighted'] = {k: round(sum(f(x) * n for x, n in zip(v[:5], nw)) / 41, 2) for k, v in T['t4']['rows'].items()}
for k, v in T['t4']['rows'].items(): chk('Table 4 %s overall = benchmark-weighted mean of its categories' % k, R['t4_weighted'][k], f(v[5]), 0.015, 'Language Modeling would have to be %.2f' % ((f(v[5]) * 41 - sum(f(x) * n for i, (x, n) in enumerate(zip(v[:5], nw)) if i != 1)) / 6))
R['t4_lm_needed'] = {k: round((f(v[5]) * 41 - sum(f(x) * n for i, (x, n) in enumerate(zip(v[:5], nw)) if i != 1)) / 6, 2) for k, v in T['t4']['rows'].items()}
# storage: weights only, bf16
R['storage'] = {'bytes_per_ckpt': total * 2, 'n_branch': 16, 'branch_bytes': total * 2 * 16, 'online12_bytes': total * 2 * 12}
R['checks'] = checks
json.dump(R, open('inputs/recompute.json', 'w'), indent=1)
for c in checks: print('OK ' if c['ok'] else 'NO ', c['name'], c['got'], c['printed'], c['note'])
print('checks ok', sum(c['ok'] for c in checks), 'of', len(checks))

"""Recompute every derived number the page shows, from tables.json, the released configs and checkpoint lists in
inputs/, the curves read from the figures (inputs/spike_scores.json, inputs/fig1_points.json) and the paper's text.
Writes inputs/recompute.json (read by mk_paper.py into window.PAPER.rc) and prints a report.
usage: python3 recompute.py"""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
IN = os.path.join(HERE, 'inputs')
T = json.load(open(os.path.join(HERE, 'tables.json')))
R = {}
p = print
num = lambda s: float(str(s).replace(',', '')) if str(s).replace(',', '').replace('.', '', 1).lstrip('-').isdigit() else None


def avg_check(key, first, last, avg_col=1, skip_cols=()):
    """Recompute each row's average over columns first..last (inclusive) against the printed one."""
    out = []
    for r in T[key]['rows']:
        c = r['c']; vals = [num(x) for i, x in enumerate(c[first:last + 1]) if (first + i) not in skip_cols]
        if None in vals or num(c[avg_col]) is None: continue
        a = sum(vals) / len(vals)
        out.append({'row': c[0], 'g': r['g'], 'printed': num(c[avg_col]), 'recomputed': round(a, 2), 'diff': round(num(c[avg_col]) - a, 2)})
    return out

p('--- Averages recomputed from each row (|printed - recomputed| > 0.06 flagged)')
for key, f, l in (('t6', 3, 12), ('t7', 3, 12), ('t9', 2, 11), ('t16', 2, 11), ('t22', 3, 12), ('t23', 2, 11), ('t24', 2, 6)):
    a = avg_check(key, f, l)
    R['avg_' + key] = a
    bad = [x for x in a if abs(x['diff']) > 0.06]
    p(' ', key, len(a), 'rows;', len(bad), 'off:', [(x['g'][:12] + ' ' + x['row'], x['printed'], x['recomputed']) for x in bad])

p('--- Mid-training gains, Table 9 (v3, 10 tasks) against the text, and v1 (9 tasks, no TriviaQA)')
t9 = T['t9']['rows']; g9 = {}
for i in range(0, len(t9), 2):
    name = t9[i]['g']; pre = num(t9[i]['c'][1]); mid = num(t9[i + 1]['c'][1])
    g9[name] = {'pre': pre, 'mid': mid, 'gain': round(mid - pre, 1), 'rel_pct': round(100 * (mid - pre) / pre, 1)}
    p(' ', name, pre, '->', mid, '+%.1f' % (mid - pre), '(+%.1f%%)' % (100 * (mid - pre) / pre))
R['t9_gains'] = g9
R['t9_text'] = {'7B': 10.6, '13B': 10.3, 'source': 'v3 §4.2 text, unchanged since v1'}
R['t9_v1'] = {'OLMo 2 7B': [50.6, 61.2], 'OLMo 2 13B': [56.5, 66.8], 'source': 'v1 Table 9, 9 tasks without TriviaQA (https://arxiv.org/html/2501.00656v1)'}
p('  v1 9-task gains: 7B +%.1f, 13B +%.1f (the text\'s 10.6 and 10.3)' % (61.2 - 50.6, 66.8 - 56.5))
R['b1_text_rel'] = {'OLMo 2 1B': 37.0, 'OLMo 2 7B': 18.7, 'OLMo 2 13B': 15.9, 'OLMo 2 32B': 12.3}
p('  Appendix B.1 relative gains printed', R['b1_text_rel'], 'recomputed', {k: v['rel_pct'] for k, v in g9.items()})

p('--- Table 9 against Table 6 for the same final checkpoints')
t6 = {r['c'][0]: r['c'] for r in T['t6']['rows']}; h6 = T['t6']['head']; h9 = T['t9']['head']
diffs = []
for i in range(1, len(t9), 2):
    name = t9[i]['g']; c9 = t9[i]['c']
    if name not in t6: continue
    for j, col in enumerate(h9[1:], start=1):
        k6 = h6.index(col) if col in h6 else (h6.index('TriviaQA') if col == 'TQA' else None)
        if k6 is None: continue
        if c9[j] != t6[name][k6]: diffs.append([name, col, c9[j], t6[name][k6]])
R['t9_vs_t6'] = diffs; p(' ', diffs)
c32 = t6['OLMo 2 32B']; vals = [num(x) for x in c32[3:]]
p('  Table 6 32B average with its own MMLU-Pro 46.9: %.2f; with Table 9\'s 43.3: %.2f; printed 73.3' % (sum(vals) / 10, (sum(vals) - 46.9 + 43.3) / 10))
R['t6_32b_avg_variants'] = [round(sum(vals) / 10, 2), round((sum(vals) - 46.9 + 43.3) / 10, 2)]

p('--- Table 7 against Table 16 (final Instruct rows)')
t7 = {r['c'][0]: r['c'] for r in T['t7']['rows']}; t16 = {r['c'][0]: r['c'] for r in T['t16']['rows']}
d716 = []
for s in ('1B', '7B', '13B', '32B'):
    a = t7['OLMo 2 ' + s]; b = t16['OLMo 2 %s Instruct' % s]
    for j, col in enumerate(T['t16']['head'][1:], start=1):
        k7 = T['t7']['head'].index(col) if col in T['t7']['head'] else (1 if col == 'AVG' else None)
        if k7 is not None and a[k7] != b[j]: d716.append([s, col, a[k7], b[j]])
R['t7_vs_t16'] = d716; p(' ', d716)

p('--- Post-training stage gains (Table 16 averages)')
st = {}
for s in ('1B', '7B', '13B', '32B'):
    sft, dpo, ins = (num(t16['OLMo 2 %s %s' % (s, k)][1]) for k in ('SFT', 'DPO', 'Instruct'))
    gs = {k: [num(t16['OLMo 2 %s %s' % (s, x)][T['t16']['head'].index(k)]) for x in ('SFT', 'DPO', 'Instruct')] for k in ('GSM8K', 'MATH', 'IFE', 'Safety', 'AE2')}
    st[s] = {'sft': sft, 'dpo': dpo, 'rlvr': ins, 'dpo_gain': round(dpo - sft, 1), 'rlvr_gain': round(ins - dpo, 1), 'by_task': gs}
    p('  %s SFT %.1f -> DPO %.1f (+%.1f) -> RLVR %.1f (+%.1f); GSM8K %s MATH %s Safety %s' % (s, sft, dpo, dpo - sft, ins, ins - dpo, gs['GSM8K'], gs['MATH'], gs['Safety']))
R['post_stages'] = st

p('--- Table 11 deltas against the text of §4.3')
t11 = {r['c'][0]: [num(x) for x in r['c'][1:]] for r in T['t11']['rows']}
k = list(t11)
pre, pt, fw2, fw2mi = t11[k[0]], t11[k[1]], t11[k[4]], t11[k[7]]
d = lambda a, b: [round(x - y, 1) for x, y in zip(a, b)]
R['t11_deltas'] = {'PT mix minus pretrain': d(pt, pre), 'text': [4.4, 1.3, 20, -1.5],
                   'Web FW2 minus PT mix': d(fw2, pt), 'text2': [1.2, -0.4, 1.3, 1.5],
                   'Web FW2 + Math + Ins minus PT mix': d(fw2mi, pt), 'text3': [1.7, 5.7, 1.3, 19.5]}
for a, b in (('PT mix minus pretrain', 'text'), ('Web FW2 minus PT mix', 'text2'), ('Web FW2 + Math + Ins minus PT mix', 'text3')):
    p('  %-36s recomputed %s  text %s' % (a, R['t11_deltas'][a], R['t11_deltas'][b]))

p('--- Table 12 against the text of §4.4.2 (GSM* on 200 questions; binomial standard error)')
t12 = [(r['g'], r['c'][0], num(r['c'][3]), num(r['c'][4])) for r in T['t12']['rows']]
se = lambda q, n=200: 100 * math.sqrt(q / 100 * (1 - q / 100) / n)
R['t12'] = [{'exp': e, 'mix': m, 'mmlu': a, 'gsm': g, 'se': round(se(g), 1)} for e, m, a, g in t12]
for x in R['t12']: p('  %-26s %-16s GSM* %.1f ± %.1f' % (x['exp'], x['mix'], x['gsm'], x['se']))
R['t12_text'] = {'exp2_one_copy_text': 61, 'exp2_one_copy_table': 63.5, 'note': 'the text of experiment 2 says one copy gives 61, two 66, four 65; the table says 63.5, 66.0, 65.0 (61.0 is experiment 1\'s 10/90 mix)'}
sed = lambda a, b: math.sqrt(se(a) ** 2 + se(b) ** 2)
R['gsm_diff_se'] = {'2x minus 1x': [66.0 - 63.5, round(sed(66.0, 63.5), 1)], '4x minus 2x': [65.0 - 66.0, round(sed(65.0, 66.0), 1)],
                    '35/65 minus 10/90': [63.5 - 61.0, round(sed(63.5, 61.0), 1)], '2x MIND minus MIND': [70.0 - 65.5, round(sed(70.0, 65.5), 1)],
                    'MIND minus baseline': [65.5 - 28.5, round(sed(65.5, 28.5), 1)], 'Inline minus baseline': [25.0 - 28.5, round(sed(25.0, 28.5), 1)]}
p('  differences and their standard errors (independent-sample approximation):', R['gsm_diff_se'])
R['microanneal_tokens'] = {'runs': 19, 'total_B': 130, 'vs_three_50B_anneals_B': 150, 'mean_per_run_B': round(130 / 19, 1)}

p('--- Table 13: do the source fractions multiply out to the mix shares?')
t13 = T['t13']['rows']; R['t13'] = {}
for mi, mix in enumerate(('50B', '100B', '300B')):
    toks = []
    for r in t13:
        src = r['c'][1]; v = float(src[:-1]) * (1000 if src.endswith('T') else 1)
        toks.append((r['c'][0], v * float(r['c'][2 + 2 * mi]) / 100, float(r['c'][3 + 2 * mi])))
    tot = sum(t for _, t, _ in toks)
    rows = [{'src': n, 'tokens_B': round(t, 2), 'share_recomputed': round(100 * t / tot, 2), 'share_printed': s} for n, t, s in toks]
    R['t13'][mix] = {'total_B': round(tot, 1), 'rows': rows, 'printed_share_sum': round(sum(s for *_, s in toks), 2)}
    p('  %s: total %.1fB; ' % (mix, tot) + '; '.join('%s %.1f%% (printed %s)' % (x['src'][:10], x['share_recomputed'], x['share_printed']) for x in rows))
# what math volume would make the printed shares consistent, given the DCLM row
for mix in ('100B', '300B'):
    r0 = R['t13'][mix]['rows'][0]; implied_total = r0['tokens_B'] / (r0['share_printed'] / 100)
    m = [x for x in R['t13'][mix]['rows'] if x['src'].startswith('Dolmino Math')][0]
    R['t13'][mix]['math_implied_B'] = round(implied_total * m['share_printed'] / 100, 1)
    p('  %s: the printed DCLM share implies a %.0fB mix, in which the printed math share is %.1fB of math (Source %% says %.1fB)' % (mix, implied_total, implied_total * m['share_printed'] / 100, m['tokens_B']))

p('--- Table 14: soup minus best single')
t14 = []
for r in T['t14']['rows']:
    c = [num(x) for x in r['c'][1:]]
    t14.append({'mix': r['c'][0], 'delta': [round(c[4 + i] - c[i], 1) for i in range(4)]})
R['t14'] = t14
for x in t14: p('  mix %s: OLMES %+.1f  Gen %+.1f  MMLU %+.1f  GSM* %+.1f' % (x['mix'], *x['delta']))
neg = [(x['mix'], ['OLMES', 'OLMES-Gen', 'MMLU', 'GSM*'][i], v) for x in t14 for i, v in enumerate(x['delta']) if v < 0]
R['t14_negative'] = neg; p('  cells where the soup is below the best single run:', neg)

p('--- Parameters recounted from the released config.json files (untied embeddings, QK-norm, two output norms per layer)')
cfgs = {}
for m in ('OLMo-2-0425-1B', 'OLMo-2-1124-7B', 'OLMo-2-1124-13B', 'OLMo-2-0325-32B'):
    c = json.load(open(os.path.join(IN, 'config_%s.json' % m)))
    d, f, L, h, kv, V = c['hidden_size'], c['intermediate_size'], c['num_hidden_layers'], c['num_attention_heads'], c['num_key_value_heads'], c['vocab_size']
    hd = d // h
    attn = d * d + 2 * d * kv * hd + d * d  # q, k, v, o
    qk = d + kv * hd                         # QK-norm weights (OLMo 2 normalises the full q and k projections)
    mlp = 3 * d * f
    norms = 2 * d
    layer = attn + qk + mlp + norms
    emb = V * d
    tot = L * layer + 2 * emb + d
    cfgs[m] = {'d': d, 'ffn': f, 'layers': L, 'heads': h, 'kv': kv, 'vocab': V, 'params': tot, 'non_embedding': L * layer, 'embedding_pair': 2 * emb}
    p('  %-16s d %d ffn %d L %d heads %d/%d vocab %d -> %.3fB total (%.3fB non-embedding)' % (m, d, f, L, h, kv, V, tot / 1e9, L * layer / 1e9))
R['params'] = cfgs

p('--- Tokens from the released checkpoints (stage 1 last step x batch x 4096) and 6ND')
refs = json.load(open(os.path.join(IN, 'hf_refs_extract.json')))
batch = {'OLMo-2-0425-1B': 512, 'OLMo-2-1124-7B': 1024, 'OLMo-2-1124-13B': 2048, 'OLMo-2-0325-32B': 2048}
mid = {'OLMo-2-0425-1B': [50], 'OLMo-2-1124-7B': [50, 50, 50], 'OLMo-2-1124-13B': [100, 100, 100, 300], 'OLMo-2-0325-32B': [100, 100, 100, 300]}
printed = {'OLMo-2-0425-1B': ('4T (B.1)', None, '0.35 (Table 7), 0.4 (Table 22)'), 'OLMo-2-1124-7B': ('3.90T (§2.3), 4T (Table 3, §4.1, Table 9)', 4.05, '1.8'),
           'OLMo-2-1124-13B': ('5T', 5.6, '4.6'), 'OLMo-2-0325-32B': ('6.06T (§2.3), 7T (Table 9 caption)', 6.6, '13.0')}
tok = {}
for m, b in batch.items():
    last = refs[m]['stage1']['last']; step = int(last.split('step')[1].split('-')[0])
    s1 = step * b * 4096 / 1e12
    tot_all = s1 + sum(mid[m]) / 1000; n = cfgs[m]['params']
    tok[m] = {'stage1_last_branch': last, 'stage1_T': round(s1, 3), 'total_all_ingredients_T': round(tot_all, 3), 'printed_stage1': printed[m][0], 'printed_total_T': printed[m][1],
              'flops_6ND_e23': round(6 * n * tot_all * 1e12 / 1e23, 2), 'flops_6ND_stage1_e23': round(6 * n * s1 * 1e12 / 1e23, 2), 'printed_flops_e23': printed[m][2]}
    p('  %-16s %s -> stage 1 %.3fT; with all anneal ingredients %.3fT (printed %s); 6ND %.2fe23 (stage 1 only %.2fe23; printed %s)' % (m, last, s1, tot_all, printed[m][1], tok[m]['flops_6ND_e23'], tok[m]['flops_6ND_stage1_e23'], printed[m][2]))
R['tokens'] = tok
R['refs'] = {m: {k: (v['count'] if isinstance(v, dict) else v) for k, v in refs[m].items()} for m in batch}
R['flops_ratio_qwen7_olmo7'] = round(8.2 / 1.8, 2)

p('--- Figure 1 marker positions against Table 6 FLOPs')
F1 = json.load(open(os.path.join(IN, 'fig1_points.json')))['points']
R['fig1'] = []
for x in F1:
    t = num(x['table6_flops_e23']); ratio = x['flops'] / (t * 1e23) if t else None
    R['fig1'].append({'model': x['table6_row'], 'fig_flops': x['flops'], 'table6_e23': x['table6_flops_e23'], 'fig_avg': x['avg'], 'table6_avg': num(x['table6_avg']), 'ratio': round(ratio, 3) if ratio else None})
    if ratio and abs(ratio - 1) > 0.05: p('  %-14s figure %.3g, Table 6 %se23 (ratio %.2f)' % (x['table6_row'], x['flops'], x['table6_flops_e23'], ratio))
R['qwen25'] = {'32B_6ND_18T_e23': round(6 * 32.5e9 * 18e12 / 1e23, 1), '14B_6ND_18T_e23': round(6 * 14.7e9 * 18e12 / 1e23, 1), 'table6_32B': 16.0, 'table7_32B': 35.0,
               'params_source': 'Hugging Face model cards Qwen/Qwen2.5-32B (32.5B) and Qwen2.5-14B (14.7B); 18T from the Qwen2.5 blog (inputs/qwen25_extract.txt)'}
p('  Qwen 2.5 6ND at 18T: 32B %.1fe23, 14B %.1fe23 (Table 6 prints 16.0 for both; Table 7 prints 35.0 for the 32B)' % (R['qwen25']['32B_6ND_18T_e23'], R['qwen25']['14B_6ND_18T_e23']))

p('--- Data tables: totals and retention')
R['t4_total_B'] = round(3710 + 83.0 + 58.6 + 20.8 + 12.2 + 11.8 + 3.7, 1)
R['t5_hq_total_B'] = round(752 + 17.0 + 58.6 + 3.7 + 1.26, 2)
R['t5_math_total_B'] = round(0.230 + 0.0287 + 6.48 + 3.87 + 0.0842 + 0.00178 + 0.00274, 3)
R['web_share_pt'] = round(100 * 3710 / R['t4_total_B'], 1)
R['dclm_hq_retention_pct'] = round(100 * 752 / 3710, 1)
p('  Table 4 total %.1fB (printed 3.90T), web share %.1f%%; Table 5 high-quality total %.2fB (printed 832.6B), math total %.3fB (printed 10.7B); 752B / 3.71T = %.1f%% (text: FineWeb >= 2 keeps 20.3%%)' % (R['t4_total_B'], R['web_share_pt'], R['t5_hq_total_B'], R['t5_math_total_B'], R['dclm_hq_retention_pct']))
R['gsm_split'] = {'dev': 200, 'heldout': 1319 - 200}

p('--- Table 19 and §6.5: energy, carbon, water')
t19 = []
for r in T['t19']['rows']:
    c = r['c']; P = num(c[1]); pue = num(c[2]); ci = num(c[3]); co2 = num(c[4]); wue = num(c[5]) if '-' not in c[5] else None; w = num(c[6])
    row = {'model': c[0], 'mwh': P, 'pue': pue, 'ci': ci, 'co2_printed': co2, 'water_printed_kL': w}
    if ci: row['co2_recomputed'] = round(P * pue * ci, 1)
    if wue: row['water_recomputed_kL'] = round(P * pue * wue, 1)
    t19.append(row)
R['t19'] = t19
for x in t19: p('  ', x)
R['env_text'] = {'mwh_text': 391, 'mwh_sum_column': 131 + 257, 'mwh_with_pue': round(131 * 1.2 + 257 * 1.12, 1), 'co2_text_t': 154, 'co2_sum': 52 + 101, 'water_text_ML': 1.1, 'water_sum_kL': 202 + 892,
                 'iowa_ci_text': 0.352, 'iowa_ci_table': 0.351}
p('  text 391 MWh against the column sum %d (x PUE: %.1f); 154 t against %d; 1.1 ML against %d kL' % (388, R['env_text']['mwh_with_pue'], 153, 1094))

p('--- Table 27 and the DPO prompt counts')
c27 = [(r['c'][0], num(r['c'][1]), r['c'][2], r['c'][3]) for r in T['t27']['rows'] if r['c'][0] != 'Total']
s13 = sum(n for _, n, _, b in c27 if b); s7 = sum(n for _, n, a, _ in c27 if a)
R['t27'] = {'sum_13B': s13, 'sum_7B': s7, 'printed_total': 377743, 'text_7B': '366.7k', 'text_13B': '377.7k'}
p('  13B column sums to %d (printed total 377,743; text 377.7k); 7B column to %d (text 366.7k)' % (s13, s7))

p('--- Spike scores (mk_curves.py) and the learning-rate figure')
S = json.load(open(os.path.join(IN, 'spike_scores.json')))
R['spikes'] = {k: {'ours': v['vertices_W1000_k7'], 'paper': v['paper'], 'resampled': [x for kk, x in v.items() if kk.startswith('resampled')][0],
                   'W250': v['vertices_W250_k7'], 'W500': v['vertices_W500_k7'], 'W2000': v['vertices_W2000_k7'], 'k5': v['vertices_W1000_k5'], 'k10': v['vertices_W1000_k10'],
                   'log': v['log_values_W1000_k7'], 'vertices': v['vertices'], 'clipped': v['clipped_vertices']} for k, v in S['scores'].items()}
R['lr_ends'] = S['lr_ends_last2B']; R['lr_cross'] = S['lr_crossover_Btokens']
for k, v in R['spikes'].items(): p('  %-45s ours %.3f%%  paper %s' % (k, v['ours']['pct'], v['paper']))
p('  anneal end losses (mean of the last 2B tokens):', R['lr_ends'])
p('  3e-4 stays below 6e-4 after %.0fB tokens (paper: "well past 200B")' % R['lr_cross']['3e-4 below 6e-4'])
# learning rate at the truncation point of a cosine to 10% of peak (Table 3 schedules)
cos10 = lambda t, T: 0.1 + 0.9 * 0.5 * (1 + math.cos(math.pi * t / T))
R['lr_at_cut'] = {'7B': round(cos10(tok['OLMo-2-1124-7B']['stage1_T'], 5.0), 4), '13B': round(cos10(5.0, 5.0), 4), '32B': round(cos10(tok['OLMo-2-0325-32B']['stage1_T'], 6.5), 4)}
p('  learning rate at the end of stage 1, as a fraction of peak:', R['lr_at_cut'])
R['gpu_hours_7B_at_40pct'] = round(1.8e23 / (0.4 * 989.4e12 * 3600))
p('  7B: 1.8e23 FLOPs at 40% of 989.4 TFLOP/s =', R['gpu_hours_7B_at_40pct'], 'GPU-hours (this page\'s estimate)')
R['t8'] = {'spread_50B': [62.5, 63.9, 64.1, 63.6], 'spread_100B': [64.6, 64.5, 64.2], 'spread_2T': [73.8, 73.9]}

json.dump(R, open(os.path.join(IN, 'recompute.json'), 'w'), indent=1, ensure_ascii=False)
p('wrote inputs/recompute.json')

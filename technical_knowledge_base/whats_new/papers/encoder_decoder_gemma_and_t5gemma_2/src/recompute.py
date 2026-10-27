"""Recompute every derived number the page shows, from tables.json, inputs/figs.json, inputs/configs.json and
inputs/hf_params.json. Writes inputs/recompute.json (build.sh runs this first).

A = Encoder-Decoder Gemma (arXiv 2504.06225v1), B = T5Gemma 2 (arXiv 2512.14856v2).
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
FIG = json.load(open(os.path.join(HERE, 'inputs', 'figs.json')))
CFG = json.load(open(os.path.join(HERE, 'inputs', 'configs.json')))
HF = json.load(open(os.path.join(HERE, 'inputs', 'hf_params.json')))
R = {}
f = lambda s: float(s.split()[0].strip('()'))      # "46.4 (46.1)" -> 46.4 (SFT), "(39.0)" -> 39.0
rl = lambda s: float(s.split('(')[-1].strip(')')) if '(' in s else None   # the RLHF number in brackets
r1 = lambda v: round(v + 1e-9, 1)

# ---------------------------------------------------------------- parameters, recounted from the configs
def block(c, cross_kv_from=None):
    """Parameters of one Gemma block: attention (q, k, v, o), gated FFN (3 matrices), and with cross_kv_from a
    cross-attention with the same heads and head size whose keys and values read a d=cross_kv_from encoder."""
    d, h, kv, hd, ff = c['hidden_size'], c['num_attention_heads'], c['num_key_value_heads'], c['head_dim'], c['intermediate_size']
    att = d * h * hd * 2 + d * kv * hd * 2
    ffn = 3 * d * ff
    norms = 4 * d + (2 * hd if c.get('rope_local_base_freq') else 0)    # pre/post norms (+ QK-norm in Gemma 3)
    cross = (d * h * hd * 2 + cross_kv_from * kv * hd * 2) if cross_kv_from else 0
    return att, ffn, norms, cross

def stack(name, cross_kv_from=None):
    c = CFG[name]; a, f_, n, x = block(c, cross_kv_from)
    L = c['num_hidden_layers']
    return {'nonemb': L * (a + f_ + n) + c['hidden_size'], 'cross': L * x, 'emb': c['vocab_size'] * c['hidden_size'], 'L': L,
            'attn_per_layer': a, 'cross_per_layer': x}

P = {}
for n in CFG: P[n] = stack(n)
R['parts'] = {}
for n in CFG:
    c = CFG[n]; a, f_, nm, _ = block(c); L = c['num_hidden_layers']
    R['parts'][n] = {'emb': P[n]['emb'], 'attn': L * a, 'ffn': L * f_, 'norm': L * nm + c['hidden_size'], 'L': L, 'd': c['hidden_size'],
                     'cross_self': L * block(c, c['hidden_size'])[3]}
R['parts']['cross_9b_into_2b'] = stack('gemma-2-2b', CFG['gemma-2-9b']['hidden_size'])['cross']
R['parts']['vision'] = 417e6
g2, g9 = P['gemma-2-2b'], P['gemma-2-9b']
x22 = stack('gemma-2-2b', CFG['gemma-2-2b']['hidden_size'])['cross']
x99 = stack('gemma-2-9b', CFG['gemma-2-9b']['hidden_size'])['cross']
x92 = stack('gemma-2-2b', CFG['gemma-2-9b']['hidden_size'])['cross']
R['params'] = {
    'gemma2_2b_nonemb': g2['nonemb'], 'gemma2_9b_nonemb': g9['nonemb'], 'gemma2_2b_emb': g2['emb'], 'gemma2_9b_emb': g9['emb'],
    'gemma2_2b_total_recount': g2['nonemb'] + g2['emb'], 'gemma2_2b_total_hf': HF['google/gemma-2-2b']['safetensors']['total'],
    'gemma2_9b_total_recount': g9['nonemb'] + g9['emb'], 'gemma2_9b_total_hf': HF['google/gemma-2-9b']['safetensors']['total'],
    'cross_2b2b': x22, 'cross_9b9b': x99, 'cross_9b2b': x92,
    # encoder-decoder, model (non-embedding) parameters with and without cross-attention
    'ed_2b2b_nocross': 2 * g2['nonemb'], 'ed_2b2b': 2 * g2['nonemb'] + x22,
    'ed_9b9b_nocross': 2 * g9['nonemb'], 'ed_9b9b': 2 * g9['nonemb'] + x99,
    'ed_9b2b_nocross': g9['nonemb'] + g2['nonemb'], 'ed_9b2b': g9['nonemb'] + g2['nonemb'] + x92,
    # untied: encoder input embedding + decoder embedding (decoder input and softmax shared, as in Gemma 2)
    'ed_2b2b_emb': 2 * g2['emb'], 'ed_9b9b_emb': 2 * g9['emb'], 'ed_9b2b_emb': g9['emb'] + g2['emb'],
}
p = R['params']
p['ed_2b2b_total'] = p['ed_2b2b'] + p['ed_2b2b_emb']; p['ed_2b2b_total_hf'] = HF['google/t5gemma-2b-2b-prefixlm']['safetensors']['total']
p['ed_9b9b_total'] = p['ed_9b9b'] + p['ed_9b9b_emb']; p['ed_9b9b_total_hf'] = HF['google/t5gemma-9b-9b-prefixlm']['safetensors']['total']
p['ed_9b2b_total'] = p['ed_9b2b'] + p['ed_9b2b_emb']; p['ed_9b2b_total_hf'] = HF['google/t5gemma-9b-2b-prefixlm']['safetensors']['total']
p['cross_share_9b9b'] = x99 / p['ed_9b9b']
# The paper's Table 1 says 4.0B (2B-2B), 16.7B (9B-9B) and 10.4B (9B-2B): these match the counts WITHOUT cross-attention.
p['paper_A1'] = {'2B-2B': 4.0e9, '9B-9B': 16.7e9, '9B-2B': 10.4e9}

# B, Table 1 (built on Gemma 2 2B): baseline 4417M (1180M); tied embeddings; merged attention; cross-attention on global layers only
glob_2b = CFG['gemma-2-2b']['num_hidden_layers'] // 2           # Gemma 2 alternates local and global layers 1:1
base_model, base_emb = p['ed_2b2b'], p['ed_2b2b_emb']
p['B1'] = {'baseline_model': base_model, 'baseline_emb': base_emb, 'tied_emb': g2['emb'],
           'merged_model': base_model - x22, 'global_only_model': base_model - x22 + glob_2b * stack('gemma-2-2b', CFG['gemma-2-2b']['hidden_size'])['cross_per_layer'],
           'global_only_one_in_six_model': base_model - x22 + (CFG['gemma-2-2b']['num_hidden_layers'] // 6) * stack('gemma-2-2b', CFG['gemma-2-2b']['hidden_size'])['cross_per_layer']}
b1 = p['B1']; tot = base_model + base_emb
b1['tied_saving'] = (base_emb - g2['emb']) / tot; b1['merged_saving'] = x22 / tot
b1['paper_tied_saving'] = 0.105; b1['paper_merged_saving'] = 0.065
# B, Table 2 from the Gemma 3 configs (merged attention: the decoder has no extra weights, so encoder = decoder)
p['B2'] = {n: {'emb': P[k]['emb'], 'stack': P[k]['nonemb'], 'paper': T['B2']['rows'][n]} for n, k in (('270M-270M', 'gemma-3-270m'), ('1B-1B', 'gemma-3-1b'), ('4B-4B', 'gemma-3-4b'))}
for n, hf in (('270M-270M', 'google/t5gemma-2-270m-270m'), ('1B-1B', 'google/t5gemma-2-1b-1b'), ('4B-4B', 'google/t5gemma-2-4b-4b')):
    row = T['B2']['rows'][n]; mm = lambda s: float(s.rstrip('M')) * 1e6
    p['B2'][n]['paper_total'] = sum(mm(x) for x in row)
    p['B2'][n]['hf_bf16'] = HF[hf]['safetensors']['parameters'].get('BF16'); p['B2'][n]['hf_total'] = HF[hf]['safetensors']['total']
p['gemma3_4b_hf'] = HF['google/gemma-3-4b-pt']['safetensors']['total']
p['ratio_1b1b_to_gemma3_4b'] = p['B2']['1B-1B']['hf_bf16'] / p['gemma3_4b_hf']
p['ratio_4b4b_to_gemma3_4b'] = p['B2']['4B-4B']['hf_bf16'] / p['gemma3_4b_hf']
g3 = {'270M-270M': HF['google/gemma-3-270m']['safetensors']['total'], '1B-1B': HF['google/gemma-3-1b-pt']['safetensors']['total'], '4B-4B': p['gemma3_4b_hf']}
vis = 417e6
p['ratio_all'] = {k: round(p['B2'][k]['hf_bf16'] / g3[k], 2) for k in g3}
p['ratio_text'] = {k: round((p['B2'][k]['hf_bf16'] - vis) / (g3[k] - (vis if k == '4B-4B' else 0)), 2) for k in g3}
p['ratio_range_all'] = '%.1f to %.1f' % (min(p['ratio_all'].values()), max(p['ratio_all'].values()))
p['ratio_range_text'] = '%.1f to %.1f' % (min(p['ratio_text'].values()), max(p['ratio_text'].values()))
p['ratio_270m_to_gemma3_270m'] = p['B2']['270M-270M']['hf_bf16'] / HF['google/gemma-3-270m']['safetensors']['total']

# ---------------------------------------------------------------- A: headline deltas (Table 2)
a2 = T['A2a']['rows']; sg = T['A2b']['rows']
R['A2'] = {
    'pt_gain_9b9b': r1(f(a2['9B-9B'][1]) - f(a2['9B-9B'][0])), 'it_gain_9b9b_rlhf': r1(rl(a2['9B-9B'][4]) - f(a2['9B-9B'][3])),
    'pt_gain_2b2b': r1(f(a2['2B-2B'][1]) - f(a2['2B-2B'][0])), 'it_gain_2b2b_rlhf': r1(rl(a2['2B-2B'][4]) - f(a2['2B-2B'][3])),
    'it_gain_xlxl': r1(f(a2['XL-XL'][4]) - f(a2['XL-XL'][3])),
    'it_gain_9b9b_sft_vs_rlhf': r1(f(a2['9B-9B'][4]) - f(a2['9B-9B'][3])), 'it_gain_2b2b_sft_vs_rlhf': r1(f(a2['2B-2B'][4]) - f(a2['2B-2B'][3])),
    'prefix_minus_ul2_9b2b_pt': r1(f(a2['9B-2B'][1]) - f(a2['9B-2B'][2])), 'prefix_minus_ul2_9b2b_it': r1(f(a2['9B-2B'][4]) - f(a2['9B-2B'][5])),
    '9b2b_minus_2b2b_pt': r1(f(a2['9B-2B'][1]) - f(a2['2B-2B'][1])), '9b2b_minus_2b2b_it_rlhf': r1(rl(a2['9B-2B'][4]) - rl(a2['2B-2B'][4])),
    '9b2b_minus_2b2b_it_sft': r1(f(a2['9B-2B'][4]) - f(a2['2B-2B'][4])),
}
# PT below decoder-only at small scale (PrefixLM column)
R['A2']['pt_below_small'] = {k: r1(f(a2[k][1]) - f(a2[k][0])) for k in ('S-S', 'B-B', 'L-L', 'XL-XL')}
# SuperGLUE: encoder-decoder above decoder-only in every cell?
cells = []
for k, v in sg.items():
    if v[0] == '-': continue
    for gi, ci in ((0, 1), (0, 2), (3, 4), (3, 5)):
        cells.append((k, ci, f(v[ci]) - f(v[gi])))
R['A2']['sg_min_gain'] = r1(min(c[2] for c in cells)); R['A2']['sg_cells'] = len(cells); R['A2']['sg_all_positive'] = all(c[2] > 0 for c in cells)
# where UL2 beats PrefixLM on SuperGLUE
R['A2']['sg_ul2_wins'] = sum(1 for k, v in sg.items() for a, b in ((1, 2), (4, 5)) if f(v[b]) > f(v[a]))
R['A2']['sg_ul2_total'] = sum(1 for k, v in sg.items() for a, b in ((1, 2), (4, 5)))
R['A2']['pt_it_prefix_wins'] = sum(1 for k, v in a2.items() for a, b in ((1, 2), (4, 5)) if f(v[a]) > f(v[b]))
R['A2']['pt_it_total'] = sum(1 for k, v in a2.items() for a, b in ((1, 2), (4, 5)))
R['A2']['gemma2_2b_sg_pt_vs_it'] = [f(sg['2B-2B'][0]), f(sg['2B-2B'][3])]

# A, Table 3: averages recomputed from the task rows; tasks where decoder-only wins
for key in ('A3a', 'A3b'):
    rows = {k: [float(x) for x in v['v']] for k, v in T[key]['rows'].items() if k != 'Average'}
    avg = [r1(sum(r[i] for r in rows.values()) / len(rows)) for i in range(5)]
    R[key] = {'n_tasks': len(rows), 'avg_recomputed': avg, 'avg_printed': [float(x) for x in T[key]['rows']['Average']['v']],
              'dec_wins_9b': sorted([k for k, r in rows.items() if r[1] > r[4]]), 'dec_wins_2b': sorted([k for k, r in rows.items() if r[0] > r[2]])}
R['A3a']['arc_c_gap'] = r1(float(T['A3a']['rows']['ARC-C']['v'][1]) - float(T['A3a']['rows']['ARC-C']['v'][4]))
R['A3a']['wino_gap'] = r1(float(T['A3a']['rows']['Winogrande']['v'][4]) - float(T['A3a']['rows']['Winogrande']['v'][1]))
R['A3b']['wmt_gap'] = r1(float(T['A3b']['rows']['WMT23']['v'][1]) - float(T['A3b']['rows']['WMT23']['v'][4]))
R['A3a']['gsm_gain_9b'] = r1(float(T['A3a']['rows']['GSM8K']['v'][4]) - float(T['A3a']['rows']['GSM8K']['v'][1]))
R['A3a']['drop_gain_9b'] = r1(float(T['A3a']['rows']['DROP']['v'][4]) - float(T['A3a']['rows']['DROP']['v'][1]))
R['A3b']['mmlu_gain_2b'] = r1(float(T['A3b']['rows']['MMLU']['v'][2]) - float(T['A3b']['rows']['MMLU']['v'][0]))

# A, Table 4: adaptation against scratch, per size and metric
a4 = T['A4']['rows']
R['A4'] = {k: {m: r1(float(v[i]) - float(v[i + 3])) for i, m in enumerate(('PT', 'IT', 'SG'))} for k, v in a4.items()}
R['A4_sizes_nonemb'] = {'S-S': 29.4e6, 'B-B': 113.3e6, 'L-L': 409.1e6, 'XL-XL': 1.6e9, '2B-2B': 4.0e9}

# A, Section 6 ablations
R['A6'] = {'causal_pt': 45.6, 'causal_it': 41.7, 'causal_pt_gap': r1(f(a2['2B-2B'][1]) - 45.6), 'causal_it_gap': r1(f(a2['2B-2B'][4]) - 41.7),
           'causal_it_vs_gemma': r1(41.7 - rl(a2['2B-2B'][3]) if rl(a2['2B-2B'][3]) else 41.7 - f(a2['2B-2B'][3])),
           'extra6t_pt': 48.57, 'extra6t_gap': round(f(a2['2B-2B'][1]) - 48.57, 2), 'extra6t_gain_over_gemma': round(48.57 - f(a2['2B-2B'][0]), 2),
           'warmup': {'K=1000': 62.5, 'K=0': 61.8, 'K=5000': 60.2}, 'mha_pt': 50.2, 'mha_it': 43.5,
           'mha_pt_gain': r1(50.2 - f(a2['2B-2B'][1])), 'mha_it_loss': r1(f(a2['2B-2B'][4]) - 43.5)}

# ---------------------------------------------------------------- A: decoded figures
lat = {q['label']: q for q in FIG['latency']['points']}
R['fig4'] = {k: {'ms': round(v['x']), 'gsm8k': round(v['y'], 1)} for k, v in lat.items()}
R['fig4']['ratio_9b2b_over_2b'] = round(lat['9B-2B']['x'] / lat['2B']['x'], 3)
R['fig4']['ratio_2b2b_over_2b'] = round(lat['2B-2B']['x'] / lat['2B']['x'], 3)
R['fig4']['ratio_9b9b_over_9b'] = round(lat['9B-9B']['x'] / lat['9B']['x'], 3)
fl = FIG['pt_score_vs_flops']['points']
dec = sorted([q for q in fl if q['c'] == 'blue'], key=lambda q: q['x']); ed = sorted([q for q in fl if q['c'] == 'orange'], key=lambda q: q['x'])
R['fig3'] = {'dec_x': [q['x'] for q in dec], 'ed_x': [q['x'] for q in ed], 'dec_names': ['S', 'B', 'L', 'XL', '2B', '9B'],
             'ed_names': ['S-S', 'B-B', 'L-L', 'XL-XL', '2B-2B', '9B-2B', '9B-9B'], 'unit': '1e14 FLOPs per sequence (paper)'}
bal = {'S': 'S-S', 'B': 'B-B', 'L': 'L-L', 'XL': 'XL-XL', '2B': '2B-2B', '9B': '9B-9B'}
R['fig3']['ratio_balanced'] = {k: round(ed[R['fig3']['ed_names'].index(v)]['x'] / dec[R['fig3']['dec_names'].index(k)]['x'], 3) for k, v in bal.items()}
# Figure 2: tokens at which each balanced model first reaches its decoder-only source's PT score
lines = FIG['ptscore_vs_step']['lines']
def first_reach(curve, y):
    for (x0, y0), (x1, y1) in zip(curve, curve[1:]):
        if y0 < y <= y1: return round(x0 + (y - y0) / (y1 - y0) * (x1 - x0), 1)
    return None
R['fig2'] = {'2B-2B_reaches_2B_at_B_tokens': first_reach(lines['2B-2B'], lines['Gemma 2 2B (horizontal line)']),
             '9B-9B_reaches_9B_at_B_tokens': first_reach(lines['9B-9B'], lines['Gemma 2 9B (horizontal line)']),
             '9B-2B_reaches_2B_at_B_tokens': first_reach(lines['9B-2B'], lines['Gemma 2 2B (horizontal line)']),
             'final': {k: v[-1] for k, v in lines.items() if isinstance(v, list)}, 'start': {k: v[0] for k, v in lines.items() if isinstance(v, list)},
             'n_points': {k: len(v) for k, v in lines.items() if isinstance(v, list)},
             'first_x': round(lines['2B-2B'][1][0]), 'first_gap_2b': r1(lines['Gemma 2 2B (horizontal line)'] - lines['2B-2B'][1][1]),
             'first_gap_9b': r1(lines['Gemma 2 9B (horizontal line)'] - lines['9B-9B'][1][1])}
# Figure 6: Spearman correlations from the decoded points (all, and within each size cluster)
def rank(v):
    s = sorted(range(len(v)), key=lambda i: v[i]); r = [0] * len(v)
    i = 0
    while i < len(s):
        j = i
        while j + 1 < len(s) and v[s[j + 1]] == v[s[i]]: j += 1
        for k in range(i, j + 1): r[s[k]] = (i + j) / 2
        i = j + 1
    return r
def spearman(x, y):
    rx, ry = rank(x), rank(y); n = len(x); mx = sum(rx) / n; my = sum(ry) / n
    num = sum((a - mx) * (b - my) for a, b in zip(rx, ry)); den = (sum((a - mx) ** 2 for a in rx) * sum((b - my) ** 2 for b in ry)) ** .5
    return num / den
def clusters(pts, gap=3.0):
    xs = sorted(pts, key=lambda q: q['x']); out = [[xs[0]]]
    for q in xs[1:]:
        if q['x'] - out[-1][-1]['x'] > gap: out.append([q])
        else: out[-1].append(q)
    return out
R['fig6'] = {}
for key, paper_all, paper_within in (('corr_pt_vs_sft', 0.97, 0.42), ('corr_pt_vs_sg', 0.89, 0.05)):
    pts = FIG[key]['points']
    cl = clusters(pts)
    within = [spearman([q['x'] for q in c], [q['y'] for q in c]) for c in cl if len(c) >= 3]
    R['fig6'][key] = {'n': len(pts), 'all': round(spearman([q['x'] for q in pts], [q['y'] for q in pts]), 3),
                      'clusters': [len(c) for c in cl], 'cluster_pt_ranges': [[round(c[0]['x'], 1), round(c[-1]['x'], 1)] for c in cl],
                      'within_mean': round(sum(within) / len(within), 3), 'within': [round(w, 2) for w in within],
                      'paper_all': paper_all, 'paper_within': paper_within}
R['fig5'] = {k: FIG[k]['groups'] for k in ('ul2prefix_delta_pt', 'ul2prefix_delta_it', 'ul2prefix_delta_superglue')}

# ---------------------------------------------------------------- B: Tables 3 to 5
B4, B5 = T['B4']['groups'], T['B5']['groups']
def avg_check(G):
    out = {}
    for g, rows in G.items():
        body = {k: v for k, v in rows.items() if k != 'Average'}
        rec = []
        for i in range(8):
            vals = [float(v[i]) for v in body.values() if v[i] != '-']
            rec.append(r1(sum(vals) / len(vals)) if vals and len(vals) == len(body) else None)
        out[g] = {'recomputed': rec, 'printed': [None if x == '-' else float(x) for x in rows['Average']]}
    return out
R['B4_avg'] = avg_check(B4); R['B5_avg'] = avg_check(B5)
lc, lc5 = B4['Long Context'], B5['Long Context']
R['B_long'] = {
    'ruler32_4b': [float(lc['Ruler 32K'][2]), float(lc['Ruler 32K'][7])], 'ruler128_4b': [float(lc['Ruler 128K'][2]), float(lc['Ruler 128K'][7])],
    'ruler32_270m': [float(lc['Ruler 32K'][0]), float(lc['Ruler 32K'][5])],
    'gap_by_len_4b_pt': {b: r1(float(lc[b][7]) - float(lc[b][2])) for b in ('Ruler 32K', 'Ruler 128K', 'MRCR 32K', 'MRCR 128K')},
    'gap_by_len_4b_post': {b: r1(float(lc5[b][7]) - float(lc5[b][2])) for b in ('Ruler 32K', 'Ruler 128K', 'MRCR 32K', 'MRCR 128K')},
    'gap_by_len_1b_pt': {b: r1(float(lc[b][6]) - float(lc[b][1])) for b in ('Ruler 32K', 'Ruler 128K', 'MRCR 32K', 'MRCR 128K')},
    'gap_by_len_270m_pt': {b: r1(float(lc[b][5]) - float(lc[b][0])) for b in ('Ruler 32K', 'Ruler 128K', 'MRCR 32K', 'MRCR 128K')},
    'ctx_window': {k: CFG[k]['max_position_embeddings'] for k in ('gemma-2-2b', 'gemma-3-270m', 'gemma-3-1b', 'gemma-3-4b')},
    'post_1b_ruler128_drop': [float(lc['Ruler 128K'][6]), float(lc5['Ruler 128K'][6])],
}
mm = B4['Multimodal']['Average']
R['B_mm'] = {'1b1b_vs_g3_4b_mm': r1(float(mm[2]) - float(mm[6])), '1b1b_vs_g3_4b_long': r1(float(lc['Average'][2]) - float(lc['Average'][6]))}
# per-capability deltas, T5Gemma 2 minus Gemma 3 at the same size (pretrained, Table 4; post-trained, Table 5)
def cap_deltas(G):
    out = {}
    for g, rows in G.items():
        a = rows['Average']; out[g] = {}
        for si, ti, n in ((0, 5, '270M'), (1, 6, '1B'), (2, 7, '4B')):
            out[g][n] = None if a[si] == '-' else r1(float(a[ti]) - float(a[si]))
    return out
R['B4_deltas'] = cap_deltas(B4); R['B5_deltas'] = cap_deltas(B5)
b3 = T['B3']['rows']
R['B3'] = {'ul2_minus_ul2kd_1b': r1(float(b3['1B-1B']['UL2'][0]) - float(b3['1B-1B']['UL2 + KD'][0])),
           'ul2_minus_ul2kd_270m': r1(float(b3['270M-270M']['UL2'][0]) - float(b3['270M-270M']['UL2 + KD'][0])),
           'ul2_minus_prefix_1b': r1(float(b3['1B-1B']['UL2'][0]) - float(b3['1B-1B']['PrefixLM + KD'][0]))}
b1t = T['B1']['rows']
R['B1'] = {k: r1(float(v[0]) - float(b1t['Baseline'][0])) for k, v in b1t.items()}
# UL2 mixture of T5Gemma 2 (Section 3.1): expected share of corrupted tokens
mix = [(3, .15, 1), (12, .5, 1), (32, .15, 1), (32, .5, 1), ('3/4 L', .75, 4)]
R['B_ul2'] = {'mix': [[str(m), r, w] for m, r, w in mix], 'mean_corruption': round(sum(r * w for _, r, w in mix) / sum(w for *_, w in mix), 4)}

json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
if __name__ == '__main__':
    import pprint; pprint.pprint(R, width=150, compact=True)

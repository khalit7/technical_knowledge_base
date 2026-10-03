"""Every number the page derives from the paper, recomputed from tables.json, inputs/hf_configs.json and
inputs/figs.json. Writes inputs/recompute.json (read by mk_paper.py into window.PAPER.rc).
usage: python3 recompute.py   (build.sh runs it)"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
C = json.load(open(os.path.join(HERE, 'inputs', 'hf_configs.json')))
FG = json.load(open(os.path.join(HERE, 'inputs', 'figs.json')))
f = lambda s: float(s.replace(',', '').replace('M', ''))
R = {}
SIZES = ['17m', '32m', '68m', '150m', '400m', '1b']


# ---- 1. parameters recounted from the released configs (ModernBERT layout), against Table 11 ----
def count(c):
    d, I, L, V = c['hidden_size'], c['intermediate_size'], c['num_hidden_layers'], c['vocab_size']
    emb = V * d + d                                   # token embeddings + embedding norm (no bias)
    layer = 3 * d * d + d * d + d * 2 * I + I * d + 2 * d  # Wqkv, Wo, Wi (GLU: 2I), Wo, two norms
    body = L * layer - d                              # the first layer has no attention pre-norm
    head = d * d + d + V                              # MLM / LM prediction head: dense + norm + output bias (weights tied)
    final = d
    # Table 11 counts the backbone (what AutoModel loads); the prediction head is reported separately
    return {'total': emb + body + final, 'embed': V * d, 'nonembed': emb - V * d + body + final, 'head': head}


t11 = {r['name']: r['v'] for r in T['T11']['rows']}
rows = []
for s in SIZES:
    ce, cd = C['encoder-' + s], C['decoder-' + s]
    same = all(ce[k] == cd[k] for k in ('hidden_size', 'intermediate_size', 'num_hidden_layers', 'num_attention_heads', 'vocab_size'))
    n = count(ce)
    pr = t11['Ettin-' + ('1B' if s == '1b' else s)]
    rows.append({'size': s, 'layers': ce['num_hidden_layers'], 'hidden': ce['hidden_size'], 'inter': ce['intermediate_size'], 'heads': ce['num_attention_heads'],
                 'total_M': round(n['total'] / 1e6, 2), 'head_M': round(n['head'] / 1e6, 3), 'embed_M': round(n['embed'] / 1e6, 2), 'nonembed_M': round(n['nonembed'] / 1e6, 2),
                 'printed': pr, 'pair_identical': same, 'enc_causal': ce.get('is_causal'), 'dec_causal': cd.get('is_causal')})
R['params'] = rows

# ---- 2. tokens, checkpoints, phases ----
R['checkpoints'] = {'n': 236, 'every_B': 8.5, 'tokens_B': 236 * 8.5}
t2 = T['T2']
R['mix_totals'] = {'printed': t2['total'], 'sums': [round(sum(f(r['v'][i]) for r in t2['rows'] if r['v'][i] not in ('–', '-')), 1) for i in (0, 2, 4)],
                   'pct_sums': [round(sum(f(r['v'][i]) for r in t2['rows'] if r['v'][i] not in ('–', '-')), 1) for i in (1, 3, 5)],
                   'text_B': [1700, 250, 50]}
R['cross_share'] = {'tokens_B': 50, 'pretrain_B': 2000, 'share': 50 / 2000, 'oneb_cross_B': round(50 / 3, 1), 'oneb_pretrain_B': 667, 'oneb_share': round(50 / 3 / 667, 4)}
R['llm2vec'] = {'mntp_tokens': 1000 * 32 * 512, 'ratio_50B': round(50e9 / (1000 * 32 * 512)), 'paper_says_B': 10}

# ---- 3. averages recomputed ----
def avg_check(tab, cols_idx, avg_idx):
    out = []
    for r in T[tab]['rows']:
        vals = [r['v'][i] for i in cols_idx]
        if any(v in ('-', '–') for v in vals): continue
        m = sum(f(v) for v in vals) / len(vals)
        out.append({'name': r['name'], 'printed': r['v'][avg_idx], 'mean': round(m, 2), 'diff': round(m - f(r['v'][avg_idx]), 2)})
    return out


R['avg_T4'] = avg_check('T4', range(10), 10)
R['avg_T7'] = avg_check('T7', range(8), 8)
R['avg_T8'] = avg_check('T8', range(10), 10)
R['avg_bad'] = {k: [x for x in R[k] if abs(x['diff']) > 0.051] for k in ('avg_T4', 'avg_T7', 'avg_T8')}

# ---- 4. Table 8's SciQ / SIQA columns against Table 4 ----
t4 = {r['name']: r['v'] for r in T['T4']['rows']}
t8 = {r['name']: r['v'] for r in T['T8']['rows']}
c4, c8 = T['T4']['cols'], T['T8']['cols']
sw = []
for s in ['17m', '32m', '68m', '150m', '400m', '1B']:
    a = t4['Ettin-Dec-' + s]; b = t8['Ettin-Dec-' + s]
    sw.append({'size': s, 'T4_SciQ': a[c4.index('SciQ')], 'T4_SIQA': a[c4.index('SIQA')], 'T8_col_SIQA': b[c8.index('SIQA')], 'T8_col_SciQ': b[c8.index('SciQ')]})
R['sciq_siqa'] = {'decoder_rows': sw, 'T4_cols': c4, 'T8_cols': c8,
                  'all_swapped': all(x['T4_SciQ'] == x['T8_col_SIQA'] and x['T4_SIQA'] == x['T8_col_SciQ'] for x in sw)}
# with the decoder rows read in Table 4's order: the 400M comparison the text makes
e400 = t8['Ettin-Enc-400m']; d400 = t8['Ettin-Dec-400m']
R['sciq_siqa']['at400'] = {'enc_SciQ': e400[c8.index('SciQ')], 'enc_SIQA': e400[c8.index('SIQA')], 'dec_SciQ': d400[c8.index('SIQA')], 'dec_SIQA': d400[c8.index('SciQ')],
                           'enc_ARC': e400[0], 'dec_ARC': d400[0]}

# ---- 5. Table 9 (Figure 1's data): who wins, by how much, and the biggest size ratio a native model beats ----
t9 = {r['name'].lower().replace('–', '-'): r['v'] for r in T['T9']['rows']}
def g9(kind, s, i):
    key = {'enc': 'ettin-enc-%s', 'dec': 'ettin-dec-%s', 'efd': 'ettin-enc-from-dec-%s', 'dfe': 'ettin-dec-from-enc-%s'}[kind] % s
    return f(t9[key][i])
MB = {'17m': 17, '32m': 32, '68m': 68, '150m': 150, '400m': 400, '1b': 1000}
fig1 = {}
for i, task in enumerate(['msmarco', 'mnli', 'gen']):
    fig1[task] = {k: [g9(k, s, i) for s in SIZES] for k in ('enc', 'dec', 'efd', 'dfe')}
R['fig1_data'] = fig1
gaps = {'msmarco_enc_minus_efd': [round(a - b, 2) for a, b in zip(fig1['msmarco']['enc'], fig1['msmarco']['efd'])],
        'mnli_enc_minus_efd': [round(a - b, 1) for a, b in zip(fig1['mnli']['enc'], fig1['mnli']['efd'])],
        'mnli_efd_minus_dec': [round(a - b, 1) for a, b in zip(fig1['mnli']['efd'], fig1['mnli']['dec'])],
        'msmarco_efd_minus_dec': [round(a - b, 2) for a, b in zip(fig1['msmarco']['efd'], fig1['msmarco']['dec'])],
        'gen_dec_minus_dfe': [round(a - b, 1) for a, b in zip(fig1['gen']['dec'], fig1['gen']['dfe'])],
        'gen_dfe_minus_enc': [round(a - b, 1) for a, b in zip(fig1['gen']['dfe'], fig1['gen']['enc'])],
        'mnli_dfe_minus_enc': [round(a - b, 1) for a, b in zip(fig1['mnli']['dfe'], fig1['mnli']['enc'])]}
R['fig1_gaps'] = gaps


def biggest_ratio(task, winner, losers):
    """Largest size ratio at which `winner` at size a beats some loser kind at a larger size b."""
    best = None
    for i, a in enumerate(SIZES):
        for j, b in enumerate(SIZES):
            if MB[b] <= MB[a]: continue
            for lk in losers:
                if fig1[task][winner][i] > fig1[task][lk][j]:
                    r = MB[b] / MB[a]
                    if best is None or r > best['ratio']: best = {'ratio': round(r, 2), 'small': a, 'big': b, 'loser': lk, 'v_small': fig1[task][winner][i], 'v_big': fig1[task][lk][j]}
    return best


R['size_ratio'] = {'mnli_enc_vs_dec': biggest_ratio('mnli', 'enc', ['dec']), 'mnli_enc_vs_efd': biggest_ratio('mnli', 'enc', ['efd']),
                   'msmarco_enc_vs_dec': biggest_ratio('msmarco', 'enc', ['dec']), 'msmarco_enc_vs_efd': biggest_ratio('msmarco', 'enc', ['efd']),
                   'gen_dec_vs_enc': biggest_ratio('gen', 'dec', ['enc']), 'gen_dec_vs_dfe': biggest_ratio('gen', 'dec', ['dfe'])}

# Figure 1 decoded from the SVG against Table 9
mx = 0
names = {'Encoders': 'enc', 'Decoders': 'dec', 'Enc-from-Dec': 'efd', 'Dec-from-Enc': 'dfe'}
for task, pan in (('mnli', 'mnli'), ('msmarco', 'msmarco'), ('gen', 'gen')):
    for sname, pts in FG['fig1']['panels'][pan]['series'].items():
        for k, p in enumerate(pts):
            mx = max(mx, abs(p['value'] - fig1[task][names[sname]][k]))
R['fig1_vs_T9_maxdiff'] = round(mx, 3)
R['fig1_x'] = {'tick_labels': FG['fig1']['x_tick_labels'], 'decoded_sizes_M': [p['size_M'] for p in FG['fig1']['panels']['mnli']['series']['Encoders']]}

# ---- 6. noise: binomial standard errors on the evaluation sets ----
def se(p, n): return 100 * math.sqrt(p * (1 - p) / n)
N_MNLI = 9815      # MNLI matched dev set (GLUE); the paper does not say matched or mismatched
N_MARCO = 6980     # MS MARCO passage dev (small) queries
R['noise'] = {'mnli_n': N_MNLI, 'mnli_se_at_89': round(se(.89, N_MNLI), 2), 'mnli_diff_se': round(math.sqrt(2) * se(.89, N_MNLI), 2),
              'marco_n': N_MARCO, 'marco_se_bound': round(100 * 0.5 / math.sqrt(N_MARCO), 2), 'marco_diff_se_bound': round(math.sqrt(2) * 100 * 0.5 / math.sqrt(N_MARCO), 2)}
# generative average: ten tasks, binomial SE per task at the 1B decoder's own score, standard split sizes
GEN_N = {'ARC': (2376 + 1172) / 2, 'HS': 10042, 'LMB': 5153, 'OBQA': 500, 'PIQA': 1838, 'SciQ': 1000, 'SIQA': 1954, 'TQA': 17944, 'WG': 1267, 'WSC': 273}
d1 = t4['Ettin-Dec-1B']
var = sum((se(f(d1[c4.index(k)]) / 100, n) ** 2) for k, n in GEN_N.items())
R['noise']['gen_avg_se_1b'] = round(math.sqrt(var) / 10, 2)
R['noise']['gen_split_sizes'] = GEN_N
# WinoGender: Table 10's printed standard errors imply the set sizes
R['noise']['winogender'] = {'all_720_at_50': round(se(.5, 720), 2), 'gotcha_240_at_50': round(se(.5, 240), 2), 'half_120_at_50': round(se(.5, 120), 2)}

# ---- 7. Figure 2 decoded: counts out of 240 Gotcha sentences ----
f2 = FG['fig2']
cnt = {}
for panel, rowsz in f2.items():
    cnt[panel] = {s: {k: round(v * 2.4) for k, v in d.items()} for s, d in rowsz.items()}
R['fig2_counts'] = cnt
R['fig2_means'] = {p: {k: round(sum(d[k] for d in v.values()) / 6, 1) for k in ('male', 'female', 'neutral')} for p, v in f2.items()}
R['fig2_neutral_flip'] = [s for s in f2['Ettin-Encoder'] if f2['Ettin-Encoder'][s]['neutral'] < f2['Ettin-Decoder'][s]['neutral']]
R['fig2_male_flip'] = [s for s in f2['Ettin-Encoder'] if f2['Ettin-Encoder'][s]['male'] > f2['Ettin-Decoder'][s]['male']]
R['fig3'] = FG['fig3']

# ---- 8. headline comparisons the text and the Notion page quote ----
t3 = {r['name']: r['v'] for r in T['T3']['rows']}
R['claims'] = {
 'glue_base': [t3['Ettin-Enc-150m'][7], t3['ModernBERT base'][7]], 'mteb_base': [t3['Ettin-Enc-150m'][4], t3['ModernBERT base'][4]],
 'glue_large': [t3['Ettin-Enc-400m'][7], t3['ModernBERT large'][7]], 'glue_68m': [t3['Ettin-Enc-68m'][7], t3['DistilRoBERTa'][7]],
 'dec150_vs_smol': [t4['Ettin-Dec-150m'][10], t4['SmolLM2-135m'][10]], 'dec1b_vs_llama': [t4['Ettin-Dec-1B'][10], t4['Llama-3.2-1B'][10]],
 'mnli_enc150_vs_dec400': [fig1['mnli']['enc'][3], fig1['mnli']['dec'][4]], 'mnli_enc400_vs_dec1b': [fig1['mnli']['enc'][4], fig1['mnli']['dec'][5]],
 'marco_400_enc_vs_efd': [fig1['msmarco']['enc'][4], fig1['msmarco']['efd'][4]],
 'gen_1b_gap': round(fig1['gen']['dec'][5] - fig1['gen']['dfe'][5], 1), 'gen_68m_gap': round(fig1['gen']['dec'][2] - fig1['gen']['dfe'][2], 1),
}

# ---- 9. compute: 6ND estimate of training FLOPs and the utilisation it implies (derived, labelled) ----
H100 = 989e12  # dense BF16 FLOP/s per H100 SXM (NVIDIA datasheet)
def util(params, tokens, days, gpus=4):
    fl = 6 * params * tokens
    return {'flops': fl, 'util': round(fl / (days * 86400 * gpus * H100), 3)}
R['compute'] = {'17m': util(16.8e6, 1.7e12, 6), '1b': util(1028.1e6, 667e9 * 1700 / 2000, 40 * 1.0)}

json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
if __name__ == '__main__':
    for r in R['params']: print(r)
    print('mix', R['mix_totals']); print('avg_bad', R['avg_bad']); print('sciq/siqa swapped:', R['sciq_siqa']['all_swapped'], R['sciq_siqa']['at400'])
    print('gaps', R['fig1_gaps']); print('ratios', json.dumps(R['size_ratio'])); print('fig1 vs T9', R['fig1_vs_T9_maxdiff'], R['fig1_x'])
    print('noise', R['noise']); print('fig2 means', R['fig2_means'], 'neutral flip', R['fig2_neutral_flip'], 'male flip', R['fig2_male_flip'])
    print('compute', R['compute']); print('llm2vec', R['llm2vec']); print(R['claims'])

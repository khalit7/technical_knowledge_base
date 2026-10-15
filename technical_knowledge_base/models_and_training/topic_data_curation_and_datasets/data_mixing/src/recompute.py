"""Recompute every number this page derives, and write data/mx2_data.json (what the page embeds) and data/checks.json.

Inputs: src/inputs/*.json (published tables cut by scripts/extract_inputs.py), data/regmix_fit.json (scripts/regmix_fit.py),
the OLMo 2 paper page's transcribed tables (reference/papers/olmo_2/src/tables.json in this repo).
Pure Python 3 standard library; run from anywhere: python3 recompute.py
"""
import json, math, os, csv
H = os.path.dirname(os.path.abspath(__file__))
IN = os.path.join(H, 'inputs'); DA = os.path.join(H, 'data')
REPO_KB = os.path.normpath(os.path.join(H, '..', '..', '..', '..'))   # technical_knowledge_base/
checks = []
def chk(name, ok, detail): checks.append({'check': name, 'ok': bool(ok), 'detail': detail})
def r(x, n=4): return round(x, n)

# ------------------------------------------------------------------ 1. The Pile, Table 1
pile = json.load(open(f'{IN}/pile_table1.json'))['rows']
raw_total = sum(p['raw_gib'] for p in pile); eff_total = sum(p['eff_gib'] for p in pile)
chk('pile raw total = 825.18 GiB', abs(raw_total - 825.18) < 0.05, f'{raw_total:.2f}')
chk('pile effective total = 1254.20 GiB', abs(eff_total - 1254.20) < 0.05, f'{eff_total:.2f}')
worst = max(abs(p['raw_gib'] * p['epochs'] - p['eff_gib']) for p in pile)
chk('pile eff = raw x epochs (rounding)', worst < 0.02, f'max abs diff {worst:.3f} GiB')
worstw = max(abs(100 * p['eff_gib'] / eff_total - p['weight_pct']) for p in pile)
chk('pile weight = eff / total', worstw < 0.01, f'max abs diff {worstw:.4f} points')

# temperature sampling and UniMax on the raw sizes (bytes stand in for tokens: same ratio for one tokenizer only roughly)
def temperature(sizes, tau):
    if tau == math.inf: return [1 / len(sizes)] * len(sizes)
    tot = sum(sizes); q = [(s / tot) ** (1 / tau) for s in sizes]; z = sum(q); return [x / z for x in q]
def unimax(sizes, budget, n_ep):
    order = sorted(range(len(sizes)), key=lambda i: sizes[i]); B = budget; U = [0.0] * len(sizes)
    for j, i in enumerate(order):
        b = B / (len(sizes) - j)
        U[i] = sizes[i] * n_ep if b > sizes[i] * n_ep else b
        B -= U[i]
    z = sum(U); return [u / z for u in U]
sizes = [p['raw_gib'] for p in pile]
t1 = temperature(sizes, 1.0)
chk('temperature 1 = natural shares', abs(t1[0] - sizes[0] / raw_total) < 1e-12, f'{t1[0]:.4f}')
um = unimax(sizes, eff_total, 3.0)
chk('unimax shares sum to 1', abs(sum(um) - 1) < 1e-9, f'{sum(um):.6f}')
# example for the prose: Wikipedia under each scheme at the Pile's own budget (1254.20 GiB)
wi = [p['name'] for p in pile].index('Wikipedia (en)')
ex = {'natural': r(t1[wi]), 'tau2': r(temperature(sizes, 2)[wi]), 'tau333': r(temperature(sizes, 3.33)[wi]), 'uniform': r(1 / 22), 'unimax3': r(um[wi]), 'pile': pile[wi]['weight_pct'] / 100}
ex['tau333_epochs'] = r(ex['tau333'] * eff_total / sizes[wi], 2); ex['uniform_epochs'] = r(eff_total / 22 / sizes[wi], 2)
pcc = [p['name'] for p in pile].index('Pile-CC')
ex['pcc_tau333_epochs'] = r(temperature(sizes, 3.33)[pcc] * eff_total / sizes[pcc], 3)

# ------------------------------------------------------------------ 2. DoReMi weights vs the Pile's own table
dw = json.load(open(f'{IN}/doremi_weights.json'))
t1d = dw['table1']; cfg = dw['configs']
name_map = {p['name']: p['name'] for p in pile}; name_map['Gutenberg (PG-19)'] = 'Gutenberg (PG-19)'
cmp_rows = []
for p in pile:
    d = t1d.get(p['name']) or t1d.get(p['name'].replace('Stack Exchange', 'StackExchange'))
    cmp_rows.append({'name': p['name'], 'pile_table1': r(p['weight_pct'] / 100), 'doremi_baseline': d['baseline'], 'doremi_280m': d['doremi280m'],
                     'nopack_50k': r(cfg['pile_baseline_50kvocab_nopack'][p['name'].replace('Stack Exchange', 'StackExchange')]),
                     'pack_50k': r(cfg['pile_baseline_50kvocab'][p['name'].replace('Stack Exchange', 'StackExchange')]),
                     'doremi_120m_r1': r(cfg['pile_doremi_r1_120M_ref:pile_baseline_50kvocab_nopack_120M'][p['name'].replace('Stack Exchange', 'StackExchange')])})
chk('doremi table1 baseline sums to 1', abs(sum(c['doremi_baseline'] for c in cmp_rows) - 1) < 0.002, f"{sum(c['doremi_baseline'] for c in cmp_rows):.4f}")
chk('doremi table1 280M sums to 1', abs(sum(c['doremi_280m'] for c in cmp_rows) - 1) < 0.002, f"{sum(c['doremi_280m'] for c in cmp_rows):.4f}")
chk('doremi paper config = table 1', all(abs(cfg['pile_doremi_280M_256kvocab_paper'][k.replace('Stack Exchange', 'StackExchange')] - c['doremi_280m']) < 1e-9 for c in cmp_rows for k in [c['name']]), 'all 22 equal')
# does document count explain the "baseline"? docs ~ eff size / mean doc size; share of docs
docs = [p['eff_gib'] * 1024 * 1024 / p['mean_doc_kib'] for p in pile]
dshare = [x / sum(docs) for x in docs]
def spearman(a, b):
    def rk(v):
        o = sorted(range(len(v)), key=lambda i: v[i]); rr = [0] * len(v)
        for j, i in enumerate(o): rr[i] = j
        return rr
    ra, rb = rk(a), rk(b); n = len(a); return 1 - 6 * sum((x - y) ** 2 for x, y in zip(ra, rb)) / (n * (n * n - 1))
rho_bytes = spearman([c['pile_table1'] for c in cmp_rows], [c['doremi_baseline'] for c in cmp_rows])
rho_docs = spearman(dshare, [c['doremi_baseline'] for c in cmp_rows])
for c, s in zip(cmp_rows, dshare): c['doc_share_derived'] = r(s)

# ------------------------------------------------------------------ 3. RegMix released runs (compact for the page) and the refits
fit = json.load(open(f'{DA}/regmix_fit.json'))
def rcsv(f):
    rows = list(csv.reader(open(f'{IN}/regmix_data/{f}'))); return rows[0], rows[1:]
TGT = ['pile_cc', 'github', 'arxiv', 'wikipedia_en', 'stackexchange', 'freelaw']
def pack(mf, lf):
    hm, rm = rcsv(mf); hl, rl = rcsv(lf)
    li = {h.replace('metric/the_pile_', '').replace('_val_loss', ''): j for j, h in enumerate(hl)}
    assert [x[0] for x in rm] == [x[0] for x in rl], (mf, lf)
    X = [[round(float(v), 4) for v in row[1:]] for row in rm]
    Y = {t: [round(float(row[li[t]]), 4) for row in rl] for t in TGT}
    return {'X': X, 'Y': Y}
regmix = {'domains': fit['domains'], 'train': pack('train_mixture_1m.csv', 'train_pile_loss_1m.csv'),
          'test': {'1M': pack('test_mixture_1m.csv', 'test_pile_loss_1m.csv'), '60M': pack('test_mixture_60m.csv', 'test_pile_loss_60m.csv'), '1B': pack('test_mixture_1B.csv', 'test_pile_loss_1B.csv')},
          'fit': {k: fit[k] for k in ('linear', 'lightgbm', 'dml', 'paper_table2', 'dml_params', 'linear_coef', 'linear_intercept', 'lightgbm_version')},
          'lgb_pred': fit.get('lightgbm_pred'),
          'prior': [0.11328527, 0.07960865, 0.00391349, 0.1853759, 0.05108136, 0.01596293, 0.10175077, 0.00370752, 0.06652935, 0.00175077, 0.02708548, 0.23686921, 0.01184346, 0.00792997, 0.00803296, 0.03882595, 0.04644696],
          'mixtures_1b': json.load(open(f'{IN}/regmix_1b_mixtures.json'))['mixtures'],
          'table4': {'cols': ['Human', 'DoReMi', 'PPL', 'ODM', 'Pile-CC', 'RegMix'], 'avg': [45.1, 46.8, 46.2, 45.0, 46.8, 47.3], 'flops': ['0', '3.7e19', '1.8e19', '0', '0', '3.5e18'], 'best_on': ['2/14', '0/14', '1/14', '0/14', '5/14', '7/14']}}
chk('regmix prior sums to 1', abs(sum(regmix['prior']) - 1) < 1e-6, f"{sum(regmix['prior']):.6f}")
chk('regmix human mix = doremi baseline', all(abs(regmix['mixtures_1b']['human']['train_the_pile_' + d] - v) < 1e-9 for d, v in [('pile_cc', 0.1121), ('wikipedia_en', 0.0919), ('arxiv', 0.1052)]), 'Pile-CC 0.1121, Wikipedia 0.0919, ArXiv 0.1052')
regmix['ratio_flops_doremi'] = r(3.5e18 / 3.7e19, 3)

# ------------------------------------------------------------------ 4. Muennighoff et al.: effective data under repetition
RD = 15.387756   # fitted R*_D, arXiv 2305.16264 Appendix A
def eff(epochs, Rs=RD):
    R = epochs - 1; return 1 + Rs * (1 - math.exp(-R / Rs))   # D'/U_D
mu = {'R_D_star': RD, 'R_N_star': 5.309743, 'table': {str(e): r(eff(e), 3) for e in (1, 2, 4, 8, 16, 32, 64, 100)}}
mu['value_4ep'] = r(eff(4) / 4, 3); mu['value_16ep'] = r(eff(16) / 16, 3); mu['cap'] = r(1 + RD, 2)
chk('4 epochs worth ~3.7 fresh epochs', 3.6 < eff(4) < 3.8, f'{eff(4):.3f}')

# ------------------------------------------------------------------ 5. Staged recipes (published), grouped by this page
sm = json.load(open(f'{IN}/smollm3_stages.json'))['stages']
def grp(f):
    n = f.lower()
    if 'fineweb-edu' in n or '/dclm' in n: return 'web_en'
    if 'fw2-' in n: return 'multilingual'
    if any(k in n for k in ('math', 'gsm')): return 'math'
    if any(k in n for k in ('stack-edu', 'pull-requests', 'kaggle', 'jupyter', 'github-issues', 'code')): return 'code'
    return 'other'
keep = [s for s in sm if (s['file'], s['name']) in (('stage1_8T', 'stable'), ('stage2_8T_9T', 'stable stage 2'), ('stage3_9T_11T', 'decay stage'))]
tps = keep[0]['tokens_per_step']; end = keep[0]['train_steps']
sm_out = []
for j, s in enumerate(keep):
    a = s['start_step'] - 1; b = keep[j + 1]['start_step'] - 1 if j + 1 < len(keep) else end
    tot = sum(s['weights']); g = {}
    for f, w in zip(s['folders'], s['weights']): g[grp(f)] = g.get(grp(f), 0) + w / tot
    sm_out.append({'name': ['Stage 1 (stable)', 'Stage 2 (stable)', 'Stage 3 (decay)'][j], 'from_T': r(a * tps / 1e12, 2), 'to_T': r(b * tps / 1e12, 2), 'raw_weight_sum': r(tot, 4),
                   'groups': {k: r(v, 4) for k, v in sorted(g.items())}, 'n_sources': len(s['folders'])})
chk('smollm3 decay stage starts at lr decay step', keep[2]['start_step'] == keep[2]['lr_decay_start'], f"{keep[2]['start_step']} vs {keep[2]['lr_decay_start']}")
olmo = json.load(open(os.path.join(REPO_KB, 'reference/papers/olmo_2/src/tables.json')))
t4 = olmo['t4']['rows']; t13 = olmo['t13']['rows']
def tok(s):
    m = {'T': 1e12, 'B': 1e9, 'M': 1e6}; return float(s[:-1]) * m[s[-1]]
olmo_pt = [{'src': x['c'][0], 'type': x['c'][1], 'tokens': tok(x['c'][2])} for x in t4 if x['c'][0] != 'Total']
olmo_mid = [{'src': x['c'][0], 'pool': tok(x['c'][1]), 'src_pct_50B': float(x['c'][2]), 'mix_pct_50B': float(x['c'][3]), 'src_pct_100B': float(x['c'][4]), 'mix_pct_100B': float(x['c'][5]), 'src_pct_300B': float(x['c'][6]), 'mix_pct_300B': float(x['c'][7])} for x in t13]
for b in ('50B', '100B', '300B'):
    chk(f'olmo2 dolmino {b} mix sums to 100', abs(sum(x['mix_pct_' + b] for x in olmo_mid) - 100) < 0.2, f"{sum(x['mix_pct_' + b] for x in olmo_mid):.2f}")
# implied repeats: source % / 100; check against mix % x budget / pool
for x in olmo_mid:
    for b, B in (('50B', 50e9), ('100B', 100e9), ('300B', 300e9)):
        x['implied_src_pct_' + b] = r(100 * x['mix_pct_' + b] / 100 * B / x['pool'], 1)
recipes = {
    'smollm3': sm_out,
    'olmo2_pretrain': olmo_pt, 'olmo2_dolmino': olmo_mid,
    'smollm2': [{'name': 'Stage 1', 'T': '0-6T', 'mix': 'web 90% (FineWeb-Edu 60 / DCLM 40), code 10%'}, {'name': 'Stage 2', 'T': '6-8T', 'mix': 'web 75%, code 20%, math 5% (OWM)'},
                {'name': 'Stage 3', 'T': '8-10T', 'mix': 'math about 10% (OWM + InfiMM-WebMath), FineWeb-Edu/DCLM 40/60, Stack-Edu'}, {'name': 'Stage 4 (decay)', 'T': '10-11T', 'mix': 'web 58%, code 24%, Cosmopedia v2 4%, math 14% (derived: 100 - 58 - 24 - 4)'}],
    'smollm2_table3': {'Knowledge/Reasoning': [55.50, 56.76, 57.47, 60.24], 'Math': [3.21, 3.7, 7.27, 22.07], 'Code': [8.87, 10.56, 16.75, 23.21], 'Generative': [31.54, 31.30, 34.70, 36.12]},
    'llama3_final': {'general knowledge': 50, 'math and reasoning': 25, 'code': 17, 'multilingual': 8},
    'deepseekmath_cpt': {'DeepSeekMath Corpus': 56, 'GitHub code': 20, 'arXiv': 10, 'Common Crawl (en, zh)': 10, 'AlgebraicStack': 4},
}
chk('deepseekmath cpt sums to 100', sum(recipes['deepseekmath_cpt'].values()) == 100, '100')

# ------------------------------------------------------------------ 6. Aioli Table 2 (difference in average test perplexity vs stratified; 160M models)
aioli = {'cols': ['A/SE', 'GH/C4', 'B/SE', 'A/B/SE', 'CC/GH/W', 'SlimPajama'], 'stratified': [16.532, 35.991, 47.192, 35.114, 41.583, 26.426],
         'rows': {'GS': [-0.399, -0.407, -0.645, -0.247, 0.298, 0.490], 'DML': [-0.241, -0.110, -0.644, -0.599, 0.242, 1.641], 'Skill-It': [-0.326, 0.551, -0.728, -0.568, -0.195, -0.184],
                  'DoReMi': [-0.307, 5.303, -0.217, -0.393, 6.898, 0.703], 'DoGE': [0.419, 0.184, -0.678, 1.843, 0.604, 0.949], 'Aioli': [-0.205, -0.340, -0.439, -0.226, -0.196, -0.240]},
         'beats': {'GS': 4, 'DML': 4, 'Skill-It': 5, 'DoReMi': 3, 'DoGE': 1, 'Aioli': 6}}
for k, v in aioli['rows'].items(): chk(f'aioli {k} count < stratified', sum(1 for x in v if x < 0) == aioli['beats'][k], f'{sum(1 for x in v if x < 0)} of 6')

# ------------------------------------------------------------------ 7. DoReMi toy (illustrative loss curves; the same code runs in the page)
def mulberry32(a):
    def f():
        nonlocal a
        a = (a + 0x6D2B79F5) & 0xFFFFFFFF; t = a
        t = ((t ^ (t >> 15)) * (t | 1)) & 0xFFFFFFFF
        t = (t ^ (t + (((t ^ (t >> 7)) * (t | 61)) & 0xFFFFFFFF))) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return f
TOY = {'names': ['web', 'wiki', 'code', 'math', 'papers'], 'E': [3.0, 2.2, 0.8, 1.3, 2.4], 'A': [1.5, 5.0, 4.0, 7.0, 6.0], 'a': [0.30, 0.30, 0.60, 0.35, 0.30],
       'tr_web': 0.3, 'n0': 1.0, 'b': 1.0, 'T': 200, 'eta': 1.0, 'c': 1e-3, 'noise': 0.04, 'seed': 7, 'ref': [0.4, 0.25, 0.15, 0.1, 0.1]}
def toy_loss(P, i, n):
    # effective tokens: own tokens plus a share tr_web of the web tokens (web is diverse and helps every domain)
    ne = n[i] + (P['tr_web'] * n[0] if i else 0.0)
    return P['E'][i] + P['A'][i] * (ne + P['n0']) ** (-P['a'][i])
def toy_main(P, w):
    k = len(w); n = [w[i] * P['b'] * k * P['T'] for i in range(k)]
    return [toy_loss(P, i, n) for i in range(k)]
def toy_run(P):
    k = len(P['names']); u = [1 / k] * k; rnd = mulberry32(P['seed'])
    ref = toy_main(P, P['ref'])
    al = u[:]; n = [0.0] * k; steps = []; avg = [0.0] * k
    for t in range(1, P['T'] + 1):
        lp = [toy_loss(P, i, n) for i in range(k)]
        noise = [P['noise'] * (2 * rnd() - 1) for _ in range(k)]
        ex = [max(lp[i] - ref[i] + noise[i], 0.0) for i in range(k)]
        al2 = [al[i] * math.exp(P['eta'] * ex[i]) for i in range(k)]; z = sum(al2)
        al = [(1 - P['c']) * x / z + P['c'] * u[i] for i, x in enumerate(al2)]
        for i in range(k): n[i] += al[i] * P['b'] * k
        for i in range(k): avg[i] += al[i] / P['T']
        steps.append({'t': t, 'lp': [r(x, 4) for x in lp], 'ex': [r(x, 4) for x in ex], 'al': [r(x, 5) for x in al]})
    after = toy_main(P, avg)
    return {'ref': [r(x, 4) for x in ref], 'steps': steps, 'avg': [r(x, 5) for x in avg], 'main_ref': [r(x, 4) for x in ref], 'main_doremi': [r(x, 4) for x in after]}
toy = toy_run(TOY)
chk('doremi toy avg weights sum to 1', abs(sum(toy['avg']) - 1) < 1e-4, f"{sum(toy['avg']):.5f}")

# ------------------------------------------------------------------ 8. CMR (Gu et al., arXiv 2407.17467): the published values only; the calculator lives on the CPT page
cmr = {'finance': {'460M': 29.8, '940M': 34.9, '1.6B': 41.4, '3.1B': 47.8}, 'academic_460M': 36.7, 'epsilon': 0.05}

snip = {'sampling': open(f'{H}/scripts/snippet_sampling.py').read(), 'sampling_out': open(f'{H}/scripts/snippet_sampling.out').read()}
smoke = json.load(open(f'{DA}/smoke.json')) if os.path.exists(f'{DA}/smoke.json') else None
proxy = json.load(open(f'{DA}/proxy_runs.json')) if os.path.exists(f'{DA}/proxy_runs.json') else None
data = {'as_of': '2026-10-14', 'snippets': snip, 'smoke': smoke, 'proxy_runs': proxy, 'pile': pile, 'pile_totals': {'raw': r(raw_total, 2), 'eff': r(eff_total, 2)}, 'pile_examples': ex,
        'pile_cmp': cmp_rows, 'pile_cmp_rho': {'bytes_vs_doremi_baseline': r(rho_bytes, 3), 'docshare_vs_doremi_baseline': r(rho_docs, 3)},
        'regmix': regmix, 'muennighoff': mu, 'recipes': recipes, 'aioli': aioli, 'toy': {'params': TOY, 'check_avg': toy['avg'], 'check_t50': toy['steps'][49], 'main_ref': toy['main_ref'], 'main_doremi': toy['main_doremi']}, 'cmr': cmr}
os.makedirs(DA, exist_ok=True)
json.dump(data, open(f'{DA}/mx2_data.json', 'w'), separators=(',', ':'))
json.dump(checks, open(f'{DA}/checks.json', 'w'), indent=1)
bad = [c for c in checks if not c['ok']]
print(f"{len(checks)} checks, {len(bad)} failed"); [print('FAIL', c) for c in bad]
print('pile example', ex); print('rho bytes/docs vs doremi baseline', r(rho_bytes, 3), r(rho_docs, 3))
print('muennighoff', mu['table'], mu['value_4ep'], mu['value_16ep']); print('toy avg', toy['avg'])
print('smollm3', json.dumps(sm_out)); print('size', os.path.getsize(f'{DA}/mx2_data.json'))

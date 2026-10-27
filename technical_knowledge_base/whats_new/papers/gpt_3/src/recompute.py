"""Recompute every derived number the GPT-3 page shows, from tables.json (the paper's tables, transcribed).
Writes inputs/recompute.json (read by mk_paper.py into window.PAPER.rc). Prints a short report.
usage: python3 recompute.py"""
import json, math, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
R = {}
num = lambda s: float(re.sub(r'[^0-9.eE+-]', '', s.replace(',', '')))

# ---------------- Table 2.1: parameter recount from the configurations ----------------
V, CTX = 50257, 2048  # GPT-2 byte-level BPE vocabulary; context 2048 (§2.1); learned positions (GPT-2)
def count(L, d, ff=4):
    per = 4 * d * d + 4 * d + 2 * ff * d * d + ff * d + d + 4 * d  # attention (QKV + out, with biases), MLP (two matrices, biases), two LayerNorms
    return L * per + 2 * d + V * d + CTX * d  # final LayerNorm, token and position embeddings (tied output)
D1 = {r[0]: r for r in T['A4.T1']['rows'][1:]}
rows = []
for r in T['S2.T1']['rows'][1:]:
    name = r[0].replace(' or “GPT-3”', '')
    L, d, h, dh = int(r[2]), int(r[3]), int(r[4]), int(r[5])
    n = count(L, d)
    d1 = num(D1[name.replace('GPT-3 175B', 'GPT-3 175B')][3]) * 1e6
    row = {'name': name, 'printed': r[1], 'L': L, 'd': d, 'heads': h, 'dhead': dh, 'heads_x_dhead': h * dh,
           'recount': n, 'nonembed': 12 * L * d * d, 'tableD1': d1, 'batch': r[6], 'lr': r[7],
           'recount_vs_D1_pct': 100 * (n - d1) / d1}
    if d == 5140:
        row['recount_5120'] = count(L, 5120)
        row['recount_5120_vs_D1_pct'] = 100 * (count(L, 5120) - d1) / d1
    rows.append(row)
R['params'] = rows

# ---------------- Table D.1: training compute, 6 N D ----------------
comp = []
for r in T['A4.T1']['rows'][1:]:
    n, tok = num(r[3]) * 1e6, num(r[4]) * 1e9
    mult = num(r[5])
    fl = mult * n * tok
    comp.append({'name': r[0], 'printed_pfd': num(r[1]), 'printed_flops': num(r[2]), 'params': n, 'tokens': tok, 'mult': mult,
                 'flops': fl, 'pfd': fl / 8.64e19, 'tok_per_param': tok / n})
R['compute'] = comp
g = [c for c in comp if c['name'] == 'GPT-3 175B'][0]
t5 = [c for c in comp if c['name'] == 'T5-11B'][0]
R['gpt3_vs_t5_11b'] = g['pfd'] / t5['pfd']
R['gpt3_175_flops'] = g['flops']; R['gpt3_175_pfd'] = g['pfd']
R['tok_per_param_175'] = 300e9 / 174.6e9
# Figure 3.1 legend (transcribed from the plotted label): L = 2.57 C^-0.048, C in PF-days, embedding parameters excluded
R['fig31'] = {'a': 2.57, 'b': -0.048, 'L_at_3640': 2.57 * 3640 ** -0.048,
              'note': 'C in Figure 3.1 excludes embedding parameters, so it is below Table D.1 compute; illustrative only'}

# ---------------- Chinchilla, beyond the paper: compute-optimal size at GPT-3's budget ----------------
# Chinchilla Table 3 (Approach 1): 67B params optimal at 5.76e23 FLOPs with 1.5T tokens; N_opt grows as C^0.50 (a = 0.50)
C = g['flops']
Nopt = 67e9 * (C / 5.76e23) ** 0.5
R['chinchilla'] = {'Nopt': Nopt, 'Dopt': C / (6 * Nopt), 'tok_per_param': C / (6 * Nopt) / Nopt,
                   'table3_175B_tokens': 3.7e12, 'table3_175B_flops': 3.85e24, 'x_more_compute_175_optimal': 3.85e24 / C,
                   'note': 'interpolated from Chinchilla Table 3 (67B at 5.76e23 FLOPs) with N_opt proportional to C^0.50; derived, not a number Chinchilla prints'}

# ---------------- Table 2.2: data mixture, epochs recomputed ----------------
mix = []
for r in T['S2.T2']['rows'][1:]:
    q = num(r[1].split()[0]) * 1e9; w = num(r[2]) / 100; ep = num(r[3])
    mix.append({'name': r[0], 'tokens': q, 'weight': w, 'epochs_printed': ep, 'epochs_recomputed': w * 300e9 / q,
                'weight_implied_by_epochs': ep * q / 300e9, 'tokens_seen': w * 300e9})
R['mix'] = mix
R['mix_weight_sum'] = sum(m['weight'] for m in mix)
R['mix_implied_weight_sum'] = sum(m['weight_implied_by_epochs'] for m in mix)

# ---------------- Table H.1: every task, every size, every setting ----------------
H = T['A8.T1']['rows']
SIZES = ['Small', 'Medium', 'Large', 'XL', '2.7B', '6.7B', '13B', '175B']
NP = [c['params'] for c in comp if c['name'].startswith('GPT-3')]
CAT = {}
for n in ['HellaSwag', 'LAMBADA', 'StoryCloze']: CAT[n] = 'Language modelling and cloze (§3.1)'
for n in ['NQs', 'TriviaQA', 'WebQs']: CAT[n] = 'Closed-book QA (§3.2)'
for n in ['Winograd', 'Winogrande']: CAT[n] = 'Winograd-style (§3.4)'
for n in ['PIQA', 'ARC (Challenge)', 'ARC (Easy)', 'OpenBookQA']: CAT[n] = 'Common sense (§3.5)'
for n in ['Quac', 'RACE-h', 'RACE-m', 'SQuADv2', 'CoQA', 'DROP']: CAT[n] = 'Reading comprehension (§3.6)'
for n in ['BoolQ', 'CB', 'Copa', 'RTE', 'WiC', 'WSC', 'MultiRC', 'ReCoRD', 'SuperGLUE']: CAT[n] = 'SuperGLUE (§3.7)'
for n in ['ANLI R1', 'ANLI R2', 'ANLI R3']: CAT[n] = 'NLI (§3.8)'
for n in ['2D+', '2D-', '3D+', '3D-', '4D+', '4D-', '5D+', '5D-', '2Dx', '1DC']: CAT[n] = 'Arithmetic (§3.9.1)'
for n in ['Cycled Letters', 'Anagrams 1', 'Anagrams 2', 'Symbol Insertion', 'Reversed Words']: CAT[n] = 'Word manipulation (§3.9.2)'
CAT['SAT Analogies'] = 'SAT analogies (§3.9.3)'
# nominal chance from the number of answer options (derived; ARC questions have mostly 4 options)
CHANCE = {'HellaSwag': 25, 'StoryCloze': 50, 'Winograd': 50, 'Winogrande': 50, 'PIQA': 50, 'ARC (Challenge)': 25, 'ARC (Easy)': 25,
          'OpenBookQA': 25, 'RACE-h': 25, 'RACE-m': 25, 'BoolQ': 50, 'CB': 33.3, 'Copa': 50, 'RTE': 50, 'WiC': 50, 'WSC': 50,
          'ANLI R1': 33.3, 'ANLI R2': 33.3, 'ANLI R3': 33.3, 'SAT Analogies': 20}
tasks = []
for r in H[2:]:
    name = r[0].replace('\\to', '→')
    f = lambda xs: [float(x) for x in xs]
    t = {'name': name, 'metric': r[1], 'split': r[2], 'sota': r[3], 'K': r[4], 'z': f(r[5:13]), 'o': f(r[13:21]), 'f': f(r[21:29]),
         'test': r[29], 'cat': CAT.get(re.sub(r' 1[46]$', '', name).replace('Ro→En', 'tr').replace('En→Ro', 'tr').replace('Fr→En', 'tr').replace('En→Fr', 'tr').replace('De→En', 'tr').replace('En→De', 'tr'), None)}
    if t['cat'] is None and '→' in name: t['cat'] = 'Translation (§3.3)'
    t['chance'] = CHANCE.get(name if t['metric'] == 'acc' else '', None)
    tasks.append(t)
assert all(t['cat'] for t in tasks), [t['name'] for t in tasks if not t['cat']]
R['tasks'] = tasks
R['sizes'] = SIZES; R['nparams'] = NP

# Figure 1.3: aggregate over the accuracy-denominated rows
acc = [t for t in tasks if t['metric'] == 'acc']
R['n_acc_rows'] = len(acc)
def agg(rows, key): return [sum(t[key][i] for t in rows) / len(rows) for i in range(8)]
R['agg'] = {k: agg(acc, k) for k in 'zof'}
acc42 = acc + [t for t in tasks if t['name'] == 'SQuADv2' and t['metric'] == 'em']
R['agg42'] = {k: agg(acc42, k) for k in 'zof'}
R['agg_gap'] = [R['agg']['f'][i] - R['agg']['z'][i] for i in range(8)]
# per task: does the few-minus-zero gap grow from Small to 175B?
grow = [t['name'] + ' ' + t['metric'] for t in acc if (t['f'][7] - t['z'][7]) > (t['f'][0] - t['z'][0])]
R['gap_grows'] = {'n': len(grow), 'of': len(acc)}
R['gap_175_gt_13'] = sum(1 for t in acc if (t['f'][7] - t['z'][7]) > (t['f'][6] - t['z'][6]))

# Fit on the seven smaller models, predict 175B: linear in log10(params)
def linfit(xs, ys):
    n = len(xs); mx = sum(xs) / n; my = sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs); b = sum((x - mx) * (y - my) for x, y in zip(xs, ys)) / sxx
    return my - b * mx, b
lx = [math.log10(p) for p in NP]
pred = []
for t in tasks:
    if t['metric'] in ('ppl',) or t['name'] == 'WiC' and False: continue
    for k in 'zof':
        a, b = linfit(lx[:7], t[k][:7])
        p = a + b * lx[7]
        pred.append({'name': t['name'], 'metric': t['metric'], 'set': k, 'pred': p, 'act': t[k][7], 'res': t[k][7] - p})
fs = [p for p in pred if p['set'] == 'f' and p['metric'] == 'acc']
R['extrap'] = {'few_acc_n': len(fs), 'few_acc_above5': sum(1 for p in fs if p['res'] > 5), 'few_acc_below5': sum(1 for p in fs if p['res'] < -5),
               'few_acc_within5': sum(1 for p in fs if abs(p['res']) <= 5),
               'mean_res_few_acc': sum(p['res'] for p in fs) / len(fs),
               'top': sorted([(round(p['res'], 1), p['name']) for p in fs], reverse=True)[:6],
               'bottom': sorted([(round(p['res'], 1), p['name']) for p in fs])[:4]}

# ---------------- Table C.1: contamination, recomputed; and a second seed for free ----------------
c1 = []
for r in T['A3.T1']['rows'][1:]:
    if len(r) < 12: continue
    allv, dirty, clean = num(r[4]), (None if r[6] == '-' else num(r[6])), num(r[8])
    c1.append({'name': r[0].replace('\\to', '→'), 'split': r[1], 'metric': r[2], 'N': int(r[3]), 'all': allv, 'total': int(r[5]),
               'dirty': dirty, 'dirty_n': int(r[7]), 'clean': clean, 'clean_n': int(r[9]), 'clean_pct_printed': num(r[10]),
               'rel_printed': num(r[11]), 'rel_recomputed': 100 * (clean - allv) / allv,
               'clean_pct_recomputed': 100 * int(r[9]) / int(r[5])})
R['c1'] = c1
R['c1_rel_mismatch'] = [(c['name'], c['rel_printed'], round(c['rel_recomputed'], 1)) for c in c1 if abs(c['rel_printed'] - c['rel_recomputed']) > 0.6]
R['c1_pct_mismatch'] = [(c['name'], c['clean_pct_printed'], round(c['clean_pct_recomputed'], 1)) for c in c1 if abs(c['clean_pct_printed'] - c['clean_pct_recomputed']) > 0.6]
R['c1_n'] = len(c1)
R['c1_over50_dirty'] = sum(1 for c in c1 if c['clean_pct_recomputed'] < 50)
# Table C.1 used "a different seed for the random examples used for in-context learning": compare with Table H.1 few-shot 175B
MAP = {'Quac': ('Quac', 'f1'), 'SQuADv2': ('SQuADv2', 'f1'), 'DROP': ('DROP', 'f1'), 'Symbol Insertion': ('Symbol Insertion', 'acc'), 'CoQa': ('CoQA', 'f1'),
       'ReCoRD': ('ReCoRD', 'acc'), 'Winograd': ('Winograd', 'acc'), 'BoolQ': ('BoolQ', 'acc'), 'MultiRC': ('MultiRC', 'f1a'), 'RACE-h': ('RACE-h', 'acc'),
       'LAMBADA': ('LAMBADA', 'acc'), 'WSC': ('WSC', 'acc'), 'PIQA': ('PIQA', 'acc'), 'RACE-m': ('RACE-m', 'acc'),
       'De→En 16': ('De→En 16', 'BLEU-sb'), 'En→De 16': ('En→De 16', 'BLEU-sb'), 'En→Ro 16': ('En→Ro 16', 'BLEU-sb'), 'Ro→En 16': ('Ro→En 16', 'BLEU-sb'),
       'WebQs': ('WebQs', 'acc'), 'ANLI R1': ('ANLI R1', 'acc'), 'ANLI R2': ('ANLI R2', 'acc'), 'TriviaQA': ('TriviaQA', 'acc'), 'ANLI R3': ('ANLI R3', 'acc'),
       'En→Fr 14': ('En→Fr 14', 'BLEU-sb'), 'Fr→En 14': ('Fr→En 14', 'BLEU-sb'), 'WiC': ('WiC', 'acc'), 'RTE': ('RTE', 'acc'), 'CB': ('CB', 'acc'),
       'Anagrams 2': ('Anagrams 2', 'acc'), 'Reversed Words': ('Reversed Words', 'acc'), 'OpenBookQA': ('OpenBookQA', 'acc'), 'ARC (Easy)': ('ARC (Easy)', 'acc'),
       'Anagrams 1': ('Anagrams 1', 'acc'), 'COPA': ('Copa', 'acc'), 'ARC (Challenge)': ('ARC (Challenge)', 'acc'), 'HellaSwag': ('HellaSwag', 'acc'),
       'NQs': ('NQs', 'acc'), 'Cycled Letters': ('Cycled Letters', 'acc'), 'SAT Analogies': ('SAT Analogies', 'acc'), 'StoryCloze': ('StoryCloze', 'acc'),
       'Winogrande': ('Winogrande', 'acc')}
seed = []
for c in c1:
    if c['name'] not in MAP: continue
    n, m = MAP[c['name']]
    t = [x for x in tasks if x['name'] == n and x['metric'] == m]
    if not t: continue
    seed.append({'name': c['name'], 'c1': c['all'], 'h1': t[0]['f'][7], 'diff': c['all'] - t[0]['f'][7], 'n': c['total']})
R['seed'] = seed
ad = sorted(abs(s['diff']) for s in seed)
R['seed_summary'] = {'n': len(seed), 'same': sum(1 for x in ad if x < 0.05), 'mean_abs': sum(ad) / len(ad), 'median_abs': ad[len(ad) // 2],
                     'over1': sum(1 for x in ad if x > 1.0), 'max': max(seed, key=lambda s: abs(s['diff']))['name']}

# binomial standard errors at the paper's sizes (accuracy p, n examples), for "How much of this to believe"
def se(p, n): return 100 * math.sqrt(p / 100 * (1 - p / 100) / n)
R['se'] = {'ANLI R3 (1,200 test)': se(40.2, 1200), 'ANLI R3 at 1,500 (paper\'s figure)': se(40.2, 1500), 'WiC (638 dev)': se(49.4, 638),
           'CB (56 dev)': se(82.1, 56), 'COPA (100 dev)': se(92.0, 100), 'Winograd (273)': se(88.6, 273), 'TriviaQA (7,993 dev)': se(71.2, 7993),
           'RTE (277 dev)': se(72.9, 277), 'WSC (104 dev)': se(75.0, 104)}

# ---------------- Text against table: every number the prose quotes that differs from its table ----------------
R['text_vs_table'] = [
    ['3-digit addition, few-shot', '80.2% (§3.9.1 text)', '80.4 (Table 3.9 and H.1)'],
    ['Symbol insertion (random insertion), few-shot', '66.9% (§3.9.2 text)', '67.2 (Table 3.10 and H.1); 66.9 is Table C.1, another seed'],
    ['Cycled letters, few-shot', '38.6% (§3.9.2 text)', '37.9 (Tables 3.10, H.1); 38.6 is Table C.1'],
    ['Anagrams 2 (easier anagram), few-shot', '40.2% (§3.9.2 text)', '39.7 (Tables 3.10, H.1); 40.2 is Table C.1'],
    ['PIQA, zero-shot', '81.0% (§3.5 text and Table H.1)', '80.5* (Table 3.6, the one-shot value repeated)'],
    ['PIQA fine-tuned SOTA', '79.4 (Table 3.6, text)', '77.1 (Table H.1)'],
    ['ANLI Round 3 dev set', '"only 1500 examples", dev (Figure 3.9 caption)', '1,200 examples, test split (Tables C.1 and H.1)'],
    ['Model submitted to test servers', '"the 200B few-shot results" (§2.4); "200B (GPT-3)" (Appendix E)', '175B everywhere else'],
    ['Human-study control model', '"a 160M parameter model" (§3.9.4)', '"an unconditional GPT-3 Small model" (Table 3.11 caption; Small is 125M)'],
    ['Table 3.11 caption', '"compares mean accuracy between five different models"', 'the table has eight sizes plus the control'],
    ['Table 3.6 caption', '"three commonsense reasoning tasks"', 'four columns (PIQA, ARC Easy, ARC Challenge, OpenBookQA)'],
    ['RACE, few-shot', '"still 45% behind SOTA" (§3.6)', '43.2 points (RACE-h 90.0 against 46.8) and 35.0 (RACE-m), Table 3.7'],
    ['Common Crawl token count', '"roughly equivalent to 400 billion" (§2.2)', '410 billion (Table 2.2)'],
    ['One-digit composite (1DC) format', '"parentheses around the last two", e.g. 6+(4*8) (§3.9.1)', 'all 2,000 released items put them around the first two, e.g. (9 + 8) * 2 (github.com/openai/gpt-3 data, checked by check_released_data.py)'],
    ['Human-study participants', '"718 unique participants ... in 6 experiments", 97 excluded (Appendix E)', 'Tables E.1 and E.2 list 11 experiments, 873 recruited, 133 excluded'],
    ['Aggregate of Figure 1.3', '"all 42 accuracy-denominated benchmarks"', 'Table H.1 has 41 rows whose metric is acc (42 if SQuADv2 exact match counts); which 42 is not stated'],
]

# ---------------- Smaller checks quoted in the text ----------------
q = {}
q['ptb_gain'] = 35.8 - 20.5
q['lambada_few_gain'] = 86.4 - 68.0; q['lambada_zero_gain'] = 76.2 - 68.0
q['triviaqa_zero_vs_t5'] = 64.3 - 50.1; q['triviaqa_zero_vs_ssm'] = 64.3 - 60.5; q['triviaqa_one_vs_zero'] = 68.0 - 64.3; q['triviaqa_few_vs_one'] = 71.2 - 68.0
tr = T['S3.T4']['rows']; cols = range(1, 7)
avg = lambda row: sum(float(row[i]) for i in cols) / 6
q['mt_avg'] = {'zero': avg(tr[5]), 'one': avg(tr[6]), 'few': avg(tr[7])}
q['mt_one_minus_zero'] = q['mt_avg']['one'] - q['mt_avg']['zero']; q['mt_few_minus_one'] = q['mt_avg']['few'] - q['mt_avg']['one']
best_unsup_into_en = {'Fr→En': max(33.3, 34.9), 'De→En': max(34.3, 35.2, 34.0), 'Ro→En': max(31.8, 33.1, 30.5)}
few_into = {'Fr→En': 39.2, 'De→En': 40.6, 'Ro→En': 39.5}
q['mt_into_en_margin'] = {k: few_into[k] - v for k, v in best_unsup_into_en.items()}
q['mt_into_en_margin_mean'] = sum(q['mt_into_en_margin'].values()) / 3
# SuperGLUE average from Table 3.8's columns (two-metric tasks averaged first)
def sg(r1, r2):
    a = [float(x) for x in r1[1:]]; b = [float(x) for x in r2[1:]]
    boolq, cba, cbf, copa, rte = a[1:6]; wic, wsc, mra, mrf, rca, rcf = b
    return (boolq + (cba + cbf) / 2 + copa + rte + wic + wsc + (mra + mrf) / 2 + (rca + rcf) / 2) / 8
t8 = T['S3.T8']['rows']
q['superglue_avg_gpt3'] = sg(t8[4], t8[9]); q['superglue_avg_bert'] = sg(t8[3], t8[8]); q['superglue_avg_sota'] = sg(t8[2], t8[7])
q['superglue_examples_total'] = 32 * 8
q['arc_gap_challenge'] = 78.5 - 51.5; q['arc_gap_easy'] = 92.0 - 70.1
q['storycloze_gap'] = 91.8 - 87.7
q['arith_overlap_add_pct'] = 100 * 17 / 2000; q['arith_overlap_sub_pct'] = 100 * 2 / 2000
q['largest_prior_ratio'] = 175 / 17
q['humans_participants'] = {'recruited': 718, 'excluded': 97, 'kept': 718 - 97}
e1 = T['A5.T1']['rows'][1:] + T['A5.T2']['rows'][1:]
q['tableE_recruited_sum'] = sum(int(r[1]) for r in e1); q['tableE_excluded_sum'] = sum(int(r[2]) for r in e1)
q['cc_trained_fraction'] = 0.44
R['q'] = q

json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1, ensure_ascii=False)
if __name__ == '__main__':
    for p in rows: print('%-12s printed %-7s recount %8.1fM  D.1 %8.1fM  (%+.2f%%)  heads*dhead %d vs d %d' % (p['name'], p['printed'], p['recount'] / 1e6, p['tableD1'] / 1e6, p['recount_vs_D1_pct'], p['heads_x_dhead'], p['d']) + ('  with 5120: %.1fM (%+.2f%%)' % (p['recount_5120'] / 1e6, p['recount_5120_vs_D1_pct']) if 'recount_5120' in p else ''))
    for c in comp: print('%-14s flops %.3g (printed %.3g)  pfd %.4g (printed %.3g)  tok/param %.1f' % (c['name'], c['flops'], c['printed_flops'], c['pfd'], c['printed_pfd'], c['tok_per_param']))
    print('GPT-3 / T5-11B compute', round(R['gpt3_vs_t5_11b'], 2), 'Fig 3.1 L(3640)', round(R['fig31']['L_at_3640'], 3))
    print('chinchilla', {k: (round(v / 1e9, 1) if isinstance(v, float) and v > 1e6 else v) for k, v in R['chinchilla'].items()})
    for m in mix: print('%-24s weight %.2f epochs printed %.2f recomputed %.2f implied weight %.3f' % (m['name'], m['weight'], m['epochs_printed'], m['epochs_recomputed'], m['weight_implied_by_epochs']))
    print('weight sum', R['mix_weight_sum'], 'implied', round(R['mix_implied_weight_sum'], 3))
    print('acc rows', R['n_acc_rows'], 'agg z', [round(x, 1) for x in R['agg']['z']], 'f', [round(x, 1) for x in R['agg']['f']], 'gap', [round(x, 1) for x in R['agg_gap']])
    print('agg42 f', [round(x, 1) for x in R['agg42']['f']])
    print('gap grows', R['gap_grows'], '175>13', R['gap_175_gt_13'])
    print('extrap', R['extrap'])
    print('c1 rel mismatch', R['c1_rel_mismatch']); print('c1 pct mismatch', R['c1_pct_mismatch'], 'n', R['c1_n'], 'over half dirty', R['c1_over50_dirty'])
    print('seed', R['seed_summary']); print([(s['name'], round(s['diff'], 1)) for s in seed if abs(s['diff']) > 1])
    print('se', {k: round(v, 2) for k, v in R['se'].items()})
    print('q', json.dumps(q))

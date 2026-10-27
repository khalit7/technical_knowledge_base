"""Recompute every derived number the T5 page shows, from the paper's configurations and its own tables.
Writes inputs/recompute.json (read by mk_paper.py into window.PAPER.rc) and prints a report.
usage: python3 recompute.py   (build.sh runs it)"""
import json, math, os, statistics as st

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
HF = json.load(open(os.path.join(HERE, 'inputs', 'hf_t5.json')))
SIZES = json.load(open(os.path.join(HERE, 'inputs', 'task_sizes.json')))
R = {}

# ---- 1. Parameters of the five sizes from their configurations (§3.1.1, §3.6, §3.7) ----
CFG = {  # d_model, d_ff, d_kv, heads, layers per stack; printed size
    'Small': (512, 2048, 64, 8, 6, '60M'), 'Base': (768, 3072, 64, 12, 12, '220M'), 'Large': (1024, 4096, 64, 16, 24, '770M'),
    '3B': (1024, 16384, 128, 32, 24, '2.8B (text) / 3B (name)'), '11B': (1024, 65536, 128, 128, 24, '11B')}
def params(d, ff, kv, h, L, V=32128, buckets=32):
    inner = kv * h
    att = 4 * d * inner                      # q, k, v, o (no biases anywhere in T5)
    ffn = 2 * d * ff                         # wi, wo (ReLU, no biases)
    enc = L * (att + ffn + 2 * d) + d        # two rescale-only norms per block, one final norm
    dec = L * (2 * att + ffn + 3 * d) + d
    emb = V * d                              # one matrix: input embedding = output softmax (tied)
    rel = 2 * buckets * h                    # one bias table per stack, shared across its layers
    return {'total': enc + dec + emb + rel, 'enc': enc, 'dec': dec, 'emb': emb, 'rel': rel, 'cross': L * att,
            'att': att, 'ffn': ffn}
R['params'] = {}
for k, (d, ff, kv, h, L, pr) in CFG.items():
    p = params(d, ff, kv, h, L); p32 = params(d, ff, kv, h, L, V=32000)
    R['params'][k] = {'cfg': {'d_model': d, 'd_ff': ff, 'd_kv': kv, 'heads': h, 'layers': L}, 'printed': pr,
                      'v32128': p['total'], 'v32000': p32['total'], 'untied': p['total'] + p['emb'], 'hf': HF['safetensors_total'].get(k),
                      'cross_share': p['cross'] / p['total'], 'emb': p['emb'], 'enc': p['enc'], 'dec': p['dec'], 'rel': p['rel']}
base = params(768, 3072, 64, 12, 12)
# P = one BERT-Base-sized stack; the L+L encoder-decoder is 2P (§3.2.2, "about 10%" in cross-attention)
R['P'] = {'enc_stack': base['enc'], 'dec_stack': base['dec'], 'cross': base['cross'], 'cross_share': base['cross'] / base['total']}

# ---- 2. Token budgets (§3.1.2, §3.7) ----
R['tokens'] = {'baseline': 2 ** 19 * 2 ** 16, 'bert_ratio': 137e9 / 2 ** 35, 'roberta_ratio': 2.2e12 / 2 ** 35,
               'final_1e6_steps': 1e6 * 2 ** 11 * 512, 'final_2p20_steps': 2 ** 20 * 2 ** 11 * 512,
               'final_ratio_1e6': 1e6 * 2 ** 20 / 2 ** 35, 'final_ratio_2p20': 2 ** 40 / 2 ** 35,
               'finetune': 2 ** 18 * 2 ** 16, 'multitask_steps': 2 ** 19 + 2 ** 18}
# ---- 3. Learning rate: 1/sqrt(max(n, k)), k = 10^4 (§3.1.2) ----
R['lr'] = {'warm': 1 / math.sqrt(1e4), 'end_baseline': 1 / math.sqrt(2 ** 19), 'end_final': 1 / math.sqrt(2 ** 20),
           'halves_at': 4e4}

# ---- 4. Table 16 averages: GLUE = mean of 8 tasks (two-metric tasks averaged, MNLI-m and -mm averaged, WNLI left out) ----
C = T['T16']['cols']
def avgs(v):
    v = dict(zip(C, map(float, v)))
    g = [v['CoLA'], v['SST-2'], (v['MRPC F1'] + v['MRPC Acc']) / 2, (v['STSB PCC'] + v['STSB SCC']) / 2, (v['QQP F1'] + v['QQP Acc']) / 2,
         (v['MNLIm'] + v['MNLImm']) / 2, v['QNLI'], v['GLUE RTE']]
    sg = [v['BoolQ'], (v['CB F1'] + v['CB Acc']) / 2, v['COPA'], (v['MultiRC F1'] + v['MultiRC EM']) / 2,
          (v['ReCoRD F1'] + v['ReCoRD EM']) / 2, v['SGLUE RTE'], v['WiC'], v['WSC']]
    return st.mean(g), st.mean(sg)
ok_g = ok_s = n = 0; bad_avg = []
for r in T['T16']['rows']:
    if 'deviation' in r['name']: continue
    g, s = avgs(r['v']); n += 1
    eg, es = abs(g - float(r['v'][0])) <= 0.0051, abs(s - float(r['v'][18])) <= 0.0051
    ok_g += eg; ok_s += es
    if not (eg and es): bad_avg.append({'row': r['name'], 'table': r['table'], 'glue': [r['v'][0], round(g, 3)], 'sglue': [r['v'][18], round(s, 3)]})
R['averages'] = {'rows': n, 'glue_ok': ok_g, 'sglue_ok': ok_s, 'mismatch': bad_avg}

# ---- 5. Main tables against Table 16 (same experiment, same seven headline numbers) ----
IDX = [C.index(c) for c in ('GLUE', 'CNNDM R-2', 'SQuAD EM', 'SGLUE', 'EnDe', 'EnFr', 'EnRo')]
t16 = {}
for r in T['T16']['rows']: t16.setdefault(r['table'], []).append(r)
diffs = []
for t in [2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]:
    main = T['T%d' % t]['rows']; app = t16.get(t, [])
    if len(main) != len(app): diffs.append({'table': t, 'note': 'row count %d against %d' % (len(main), len(app))}); continue
    for a, b in zip(main, app):
        bv = [b['v'][i] for i in IDX]
        for m, x, y in zip(T['M7'], a['v'], bv):
            if x != y: diffs.append({'table': t, 'row': a['name'], 'metric': m, 'main': x, 'appendix': y})
R['main_vs_t16'] = diffs

# ---- 6. The paper's bold rule: within two baseline standard deviations of the best in that experiment (§3.1.5) ----
SD = [float(x) for x in T['T1']['rows'][1]['v']]
bold = {'checked': 0, 'agree': 0, 'disagree': []}
for t in [2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 15]:
    rows = T['T%d' % t]['rows']
    for j, m in enumerate(T['M7']):
        best = max(float(r['v'][j]) for r in rows)
        for r in rows:
            want = float(r['v'][j]) >= best - 2 * SD[j] - 1e-9
            bold['checked'] += 1
            if want == r['bold'][j]: bold['agree'] += 1
            else: bold['disagree'].append({'table': t, 'row': r['name'], 'metric': m, 'value': r['v'][j], 'best': best, 'printed_bold': r['bold'][j]})
R['bold'] = bold

# ---- 7. Span-corruption lengths, exactly as t5.data.preprocessors.random_spans_helper (inputs 512) ----
def helper(inputs_length, density, span):
    def f(n):
        nn = int(round(n * density)); spans = int(round(nn / span))
        return n - nn + spans + 1, nn + spans + 1
    n = inputs_length - 1
    while f(n + 1)[0] <= inputs_length: n += 1
    i, t = f(n)
    if density == 0.5 and t > i: n -= 1; t -= 1
    return n, i, t
R['spans_per512'] = {'%g_%g' % (d, s): (lambda nn, sp: {'inputs': 512 - nn + sp + 1, 'targets': nn + sp + 1})(int(round(512 * d)), max(1, int(round(round(512 * d) / s)))) for d in (0.1, 0.15, 0.25, 0.5) for s in (2, 3, 5, 10)}
R['spans'] = {'%g_%g' % (d, s): dict(zip(('raw', 'inputs', 'targets'), helper(512, d, s))) for d in (0.1, 0.15, 0.25, 0.5) for s in (1, 2, 3, 5, 10)}
# i.i.d. noise on n = 512 tokens: inputs keep one sentinel per noise run, targets one per clean run (nonnoise_span_to_unique_sentinel), plus EOS
def iid(n, p):
    nr = p + (n - 1) * p * (1 - p); cr = (1 - p) + (n - 1) * p * (1 - p)   # expected noise runs, clean runs
    return {'noise': n * p, 'noise_runs': nr, 'clean_runs': cr, 'inputs_replace': n - n * p + nr + 1, 'targets_replace': n * p + cr + 1, 'targets_drop': n * p + 1, 'targets_full': n}
R['iid'] = {'%g' % p: iid(512, p) for p in (0.1, 0.15, 0.25, 0.5)}

# ---- 8. Relative position buckets (Mesh TensorFlow / HF _relative_position_bucket, 32 buckets, max distance 128) ----
def bucket(rel, bidirectional, nb=32, maxd=128):
    ret = 0; n = -rel
    if bidirectional:
        nb //= 2; ret += (n < 0) * nb; n = abs(n)
    else: n = max(n, 0)
    me = nb // 2
    if n < me: return ret + n
    return ret + min(nb - 1, me + int(math.log(n / me) / math.log(maxd / me) * (nb - me)))
R['buckets'] = {'enc': {str(k): bucket(k, True) for k in range(-200, 201)}, 'dec': {str(k): bucket(k, False) for k in range(-200, 1)}}
edges = {}
for k in range(0, 201):
    b = bucket(-k, True); edges.setdefault(b, [k, k]); edges[b][1] = k
R['bucket_ranges_enc_back'] = edges

# ---- 9. Data: repetition and size ratios (§3.4) ----
R['repeats'] = {str(e): 2 ** 35 / 2 ** e for e in (29, 27, 25, 23)}
R['c4_ratio_unfiltered'] = 6.1e3 / 745; R['c4_ratio_webtext'] = 745 / 17
R['t9_drop'] = {'glue_1024': 83.28 - 79.55, 'squad_1024': 80.88 - 76.27}

# ---- 10. Table 15: scale against the non-scaling changes ----
t15 = {r['name']: [float(x) for x in r['v']] for r in T['T15']['rows']}
R['t15'] = {m: {'scale': t15['Baseline-1T'][j] - t15['Baseline'][j], 'nonscale': t15['T5-Base'][j] - t15['Baseline-1T'][j]} for j, m in enumerate(T['M7'])}

# ---- 11. Table 14: how many tasks T5-11B leads (state of the art on "18 out of the 24 tasks", §3.7) ----
c14 = T['T14']['cols']; pb = T['T14']['rows']['Previous best']; t11 = T['T14']['rows']['T5-11B']
lead = [c for c, a, b in zip(c14, pb, t11) if float(b['v']) >= float(a['v'])]
# group the 34 columns into tasks: a task counts as state of the art only if every one of its metrics is at or above the previous best
def task_of(i, c):
    w = c.split(' ')[0]
    if w == 'WMT': return ' '.join(c.split(' ')[:2])
    if w == 'RTE' and i > c14.index('SuperGLUE Average'): return 'SuperGLUE RTE'
    return {'GLUE': 'GLUE average', 'SuperGLUE': 'SuperGLUE average', 'MNLI-m': 'MNLI', 'MNLI-mm': 'MNLI'}.get(w, w)
tasks = {}
for i, (c, a, b) in enumerate(zip(c14, pb, t11)):
    tasks.setdefault(task_of(i, c), []).append(float(b['v']) >= float(a['v']))
won = [k for k, v in tasks.items() if all(v)]; mixed = [k for k, v in tasks.items() if any(v) and not all(v)]
R['t14'] = {'cols': len(c14), 'lead_cols': lead, 'n_lead_cols': len(lead), 'bold_11b': sum(b['b'] for b in t11),
            'tasks': list(tasks), 'n_tasks': len(tasks), 'won': won, 'n_won': len(won), 'mixed': mixed}

# ---- 12. Multi-task mixing (§3.5.2): r_m = min(e_m, K) / sum min(e_n, K), then r^(1/T) renormalised ----
def mix(K, Tm=1.0, sizes=None):
    sizes = sizes or SIZES['tasks']
    r = {k: min(v, K) for k, v in sizes.items()}
    s = sum(r.values()); r = {k: (v / s) ** (1 / Tm) for k, v in r.items()}; s = sum(r.values())
    return {k: v / s for k, v in r.items()}
R['task_sizes'] = SIZES['tasks']
R['mix_example'] = {'K2^19': mix(2 ** 19), 'T2': mix(2 ** 21, 2), 'equal': {k: 1 / len(SIZES['tasks']) for k in SIZES['tasks']}}

# ---- 13. How big are the gaps, in baseline standard deviations (Table 1, 10 runs)? ----
def row(t, name): return next(x for x in T[t]['rows'] if x['name'] == name)
def gap(t, a, b, j):
    return (float(row(t, a)['v'][j]) - float(row(t, b)['v'][j])) / SD[j]
G = {'enc-dec over LM (Table 2, GLUE)': (float(T['T2']['rows'][0]['v'][0]) - float(T['T2']['rows'][3]['v'][0])) / SD[0],
     'C4 over unfiltered (Table 8, GLUE)': gap('T8', 'C4', 'C4, unfiltered', 0), 'C4 over unfiltered (Table 8, SuperGLUE)': gap('T8', 'C4', 'C4, unfiltered', 3),
     'BERT-style over deshuffling (Table 4, GLUE)': gap('T4', 'BERT-style (Devlin et al., 2018)', 'Deshuffling', 0),
     'BERT-style over prefix LM (Table 4, GLUE)': gap('T4', 'BERT-style (Devlin et al., 2018)', 'Prefix language modeling', 0),
     'baseline over equal mixing (Table 11, GLUE)': gap('T11', 'Baseline (pre-train/fine-tune)', 'Equal', 0),
     'full C4 over 1,024 repeats (Table 9, GLUE)': gap('T9', 'Full data set', '2^25', 0),
     'spans 3 over i.i.d. (Table 7, GLUE)': gap('T7', '3', 'Baseline (i.i.d.)', 0), 'spans 3 over i.i.d. (Table 7, SuperGLUE)': gap('T7', '3', 'Baseline (i.i.d.)', 3),
     'spans 3 over i.i.d. (Table 7, SQuAD)': gap('T7', '3', 'Baseline (i.i.d.)', 2),
     'replace spans over BERT-style (Table 5, GLUE)': gap('T5', 'Replace corrupted spans', 'BERT-style (Devlin et al., 2018)', 0),
     'multi-task pretrain + FT vs baseline (Table 12, GLUE)': gap('T12', 'Multi-task pre-training + fine-tuning', 'Unsupervised pre-training + fine-tuning', 0)}
# how many non-baseline rows of the ablation tables land within 2 SD of the baseline on GLUE and on SuperGLUE
near = {'GLUE': 0, 'SGLUE': 0, 'rows': 0}
for t in [2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]:
    for x in T['T%d' % t]['rows']:
        if x['star'] or x['v'] == T['T1']['rows'][0]['v']: continue
        near['rows'] += 1
        near['GLUE'] += abs(float(x['v'][0]) - 83.28) <= 2 * SD[0]; near['SGLUE'] += abs(float(x['v'][3]) - 71.36) <= 2 * SD[3]
R['trust'] = {'gaps_sd': G, 'near_baseline': near, 'sd': SD}
json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=0)
if __name__ == '__main__':
    for k, p in R['params'].items():
        print('%-5s printed %-24s recount %.4gM (V=32,128)  %.4gM (V=32,000)  HF %s  cross %.1f%%' % (k, p['printed'], p['v32128'] / 1e6, p['v32000'] / 1e6, p['hf'], 100 * p['cross_share']))
    print('tokens', R['tokens'])
    print('averages', R['averages']['rows'], 'GLUE ok', R['averages']['glue_ok'], 'SGLUE ok', R['averages']['sglue_ok'], R['averages']['mismatch'][:5])
    print('main vs T16 diffs', R['main_vs_t16'])
    print('bold', R['bold']['checked'], 'agree', R['bold']['agree'], 'disagree', len(R['bold']['disagree']))
    for d in R['bold']['disagree']: print('   ', d)
    print('spans', {k: v for k, v in R['spans'].items() if k in ('0.15_3', '0.15_2', '0.15_10', '0.5_3', '0.15_1')})
    print('iid', R['iid']['0.15'])
    print('bucket ranges', R['bucket_ranges_enc_back'])
    print('t15', R['t15'])
    print('t14', R['t14']['n_lead_cols'], 'of', R['t14']['cols'], 'tasks', R['t14']['n_tasks'], 'won', R['t14']['n_won'], R['t14']['won'], 'mixed', R['t14']['mixed'], R['t14']['tasks'])
    print('repeats', R['repeats'], R['c4_ratio_unfiltered'], R['c4_ratio_webtext'], R['t9_drop'])
    print('trust', {k: round(v, 1) for k, v in R['trust']['gaps_sd'].items()}, R['trust']['near_baseline'])
    print('mix K2^19', {k: round(v, 4) for k, v in R['mix_example']['K2^19'].items()})

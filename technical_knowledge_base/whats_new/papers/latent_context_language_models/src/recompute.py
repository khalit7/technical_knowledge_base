"""Every derived number on the page, recomputed from the paper's tables (tables.json), its decoded vector figures
(inputs/figs.json, from decode_figs.py), the released model configurations (inputs/configs.json) and the printed
loss call-outs of Figures 3 and 8 to 11 (transcribed below; Figure 3's plot is a raster, the others' labels are
vector text in the e-print PDFs and are checked against inputs/figs.json).

  python3 recompute.py        (writes inputs/recompute.json; build.sh runs it)
"""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
FG = json.load(open(os.path.join(HERE, 'inputs', 'figs.json')))
CF = json.load(open(os.path.join(HERE, 'inputs', 'configs.json')))
R = {}
f = lambda v: float(v.replace('+', ''))
checks = []
def check(name, got, want, tol):
    ok = abs(got - want) <= tol; checks.append([name, round(got, 4), want, ok]); return ok

# ---- Table 1: what "350B tokens" counts ----
t1 = T['S4.T1']
enc = sum(map(float, t1['enc_tokens_B'])); llm = sum(map(float, t1['llm_tokens_B'])); tot = sum(map(float, t1['total_tokens_B']))
R['tokens'] = dict(encoder_B=round(enc, 2), decoder_B=round(llm, 2), total_B=round(tot, 2),
                   per_stage_sum_ok=all(abs(float(a) + float(b) - float(c)) < 0.011 for a, b, c in zip(t1['enc_tokens_B'], t1['llm_tokens_B'], t1['total_tokens_B'])))
check('Table 1 total = 350B', tot, 350.04, 0.01)
# Table 2: mixture totals
t2 = T['A3.T2']['rows']
pre = sum(float(r['v'][1][:-1]) for r in t2 if not r.get('group')); post = sum(float(r['v'][2][:-1]) for r in t2 if not r.get('group'))
R['mix'] = dict(pre_B=round(pre, 2), post_B=round(post, 2), printed_pre=t2[-1]['v'][1], printed_post=t2[-1]['v'][2])

# ---- Released configurations: parameter counts and the KV cache per token ----
def qwen3_params(c):
    d, L, h, kv, hd, ff, V = c['hidden_size'], c['num_hidden_layers'], c['num_attention_heads'], c['num_key_value_heads'], c['head_dim'], c['intermediate_size'], c['vocab_size']
    layer = d * h * hd + 2 * d * kv * hd + h * hd * d + 3 * d * ff + 2 * d + 2 * hd
    return V * d + L * layer + d          # tied embeddings, final norm
dec, encc = CF['decoder'], CF['encoder']
Pd, Pe = qwen3_params(dec), qwen3_params(encc)
kv_tok = 2 * dec['num_hidden_layers'] * dec['num_key_value_heads'] * dec['head_dim'] * 2      # K and V, bf16
R['models'] = dict(dec_params=Pd, enc_params=Pe, adapter_params=CF['adapter_params'],
                   weights_GB_bf16=round((Pd + Pe) * 2 / 1e9, 2), kv_bytes_per_token=kv_tok,
                   kv_256k_GB=round(kv_tok * 262144 / 1e9, 2), kv_1m_GB=round(kv_tok * 1048576 / 1e9, 2),
                   max_pos=dec['max_position_embeddings'], enc_window=1024, enc_batch=128, enc_tokens_per_pass=128 * 1024)
mem = FG['fig4_peak_mem_gb']; tt = FG['fig4_ttft_s']
check('weights in bf16 match the 4K peak memory of the LCLM', R['models']['weights_GB_bf16'], mem['LCLM 16x']['4k'], 0.1)

# ---- Figures 1 and 5: decoded points against Table 6, and the printed speed-ups ----
t6 = {(r['group'], r['label']): r['v'] for r in T['A7.T6']['rows']}
grp = {'4x': '4x compression', '8x': '8x compression', '16x': '16x compression'}
lab = {'LCLM': 'LCLM 0.6b-4b (Mean)', 'ExpAttn': 'ExpAttn', 'SnapKV': 'SnapKV', 'SnapKV-QA': 'SnapKV-QA', 'KVzip': 'KVzip',
       'KVzipFast': 'KVzipFast', 'AM-Fast': 'AM-Fast', 'AM-Slow': 'AM-Slow'}
col = {'fig1_ruler4k': 0, 'fig5_ruler8k': 1, 'fig5_ruler16k': 2, 'fig1_longbench64k': 3, 'fig5_longhealth64k': 5}
fig_vs_table = []
for pk, ci in col.items():
    for d in FG[pk]:
        if d['method'] not in lab: continue
        tv = f(t6[(grp[d['ratio']], lab[d['method']])][ci])
        fig_vs_table.append(dict(panel=pk, method=d['method'], ratio=d['ratio'], fig=d['acc'], table=tv, diff=round(d['acc'] - tv, 2)))
R['fig_vs_table'] = fig_vs_table
R['figs'] = {k: FG[k] for k in col}
R['fig_vs_table_max_other'] = max(abs(x['diff']) for x in fig_vs_table if not (x['method'] == 'LCLM' and x['ratio'] == '16x'))
R['fig_vs_table_lclm16'] = [x for x in fig_vs_table if x['method'] == 'LCLM' and x['ratio'] == '16x']
def pt(panel, m, r): return next(d for d in FG[panel] if d['method'] == m and d['ratio'] == r)
printed = {'fig1_ruler4k': 8.8, 'fig5_ruler8k': 6.4, 'fig5_ruler16k': 4.7, 'fig1_longbench64k': 5.2, 'fig5_longhealth64k': 5.2}
nocomp_ctx = {'fig1_ruler4k': '4k', 'fig5_ruler8k': '8k', 'fig5_ruler16k': '16k', 'fig1_longbench64k': '64k', 'fig5_longhealth64k': '64k'}
nocomp_acc = {'fig1_ruler4k': 0, 'fig5_ruler8k': 1, 'fig5_ruler16k': 2, 'fig1_longbench64k': 3, 'fig5_longhealth64k': 5}
full = T['A7.T6']['rows'][0]['v']
speed = []
for pk, pr in printed.items():
    a, b = pt(pk, 'KVzipFast', '4x'), pt(pk, 'LCLM', '4x')
    nc = tt['NoCompression'][nocomp_ctx[pk]]
    speed.append(dict(panel=pk, printed=pr, computed=round(a['ttft'] / b['ttft'], 2), vs='FastKVzip at 4x',
                      fast_acc=a['acc'], lclm_acc=b['acc'], acc_gap=round(b['acc'] - a['acc'], 2),
                      nocomp_ttft=nc, nocomp_acc=f(full[nocomp_acc[pk]]), lclm_ttft=b['ttft'],
                      lclm_vs_nocomp=round(nc / b['ttft'], 2), lclm16_vs_nocomp=round(nc / pt(pk, 'LCLM', '16x')['ttft'], 2),
                      fast_vs_nocomp=round(a['ttft'] / nc, 2)))
    check('printed speed-up ' + pk, a['ttft'] / b['ttft'], pr, 0.06)
R['speedups'] = speed

# ---- Figure 4: memory and time at long context ----
R['fig4'] = dict(ttft=tt, mem=mem)
R['mem256'] = dict(nocomp=mem['NoCompression']['256k'], lclm4=mem['LCLM 4x']['256k'], lclm16=mem['LCLM 16x']['256k'])
R['plateau16'] = [mem['LCLM 16x'][k] for k in ('128k', '256k', '512k')]

# ---- Table 6: who wins each column at each ratio, and GSM8K ----
wins = {}
for g in ('16x compression', '8x compression', '4x compression'):
    rows = [r for r in T['A7.T6']['rows'] if r['group'] == g and 'Concat' not in r['label']]
    wins[g] = [max(rows, key=lambda r: f(r['v'][i]))['label'] for i in range(7)]
R['wins'] = wins
R['gsm_removed'] = {'16x': round(100 * (1 - 1 / 16), 2), '8x': round(100 * (1 - 1 / 8), 2), '4x': round(100 * (1 - 1 / 4), 2)}
# score granularity -> sample counts and standard errors
def se(p, n): return 100 * math.sqrt(p / 100 * (1 - p / 100) / n)
R['se'] = dict(gsm8k_n=1319, gsm8k_8105=round(se(81.05, 1319), 2), gsm8k_9325=round(se(93.25, 1319), 2),
               longhealth_n=400, longhealth_675=round(se(67.5, 400), 2), longhealth_763=round(se(76.3, 400), 2),
               ruler_task_n=500, ruler4k_avg_lclm4=round(math.sqrt(sum(se(f(v), 500) ** 2 for v in T['A7.T7']['rows'][-8]['v'][:13])) / 13, 2) if T['A7.T7']['rows'][-8]['label'].startswith('LCLM') else None)
check('GSM8K 81.05 is a whole number of 1,319 problems', 81.05 / 100 * 1319, 1069, 0.05)
check('GSM8K 93.25 is a whole number of 1,319 problems', 93.25 / 100 * 1319, 1230, 0.05)
check('GSM8K 0.08 is one problem of 1,319 (0.076 rounds to 0.08)', 0.08 / 100 * 1319, 1, 0.07)
check('LongHealth 67.50 is a whole number of 400 questions', 67.5 * 4, 270, 0.01)

# ---- Table 4: its LongBench column is the en16/cn5 average weighted by subtask count ----
lb = (16 * 39.08 + 5 * 31.74) / 21
R['t4_lb'] = round(lb, 2)
check('Table 4 LongBench 37.33 = (16 x 39.08 + 5 x 31.74) / 21', lb, 37.33, 0.005)

# ---- Table 33: agent gains, and the agent against the uncompressed decoder on the same eight NIAH tasks ----
t33 = T['A7.T33']['rows']; ag = {}
for i in range(0, 9, 3):
    base, agent, delta = t33[i], t33[i + 1], t33[i + 2]
    ctx = base['group']
    ag[ctx] = dict(base=f(base['v'][-1]), agent=f(agent['v'][-1]), delta=f(delta['v'][-1]),
                   delta_ok=all(abs(f(a) - f(b) - f(d)) < 0.011 for a, b, d in zip(agent['v'], base['v'], delta['v'])),
                   avg_ok=abs(sum(f(x) for x in agent['v'][:8]) / 8 - f(agent['v'][-1])) < 0.011)
full7 = T['A7.T7']['rows'][0]['v'][:8]
ag['full_4k_niah_avg'] = round(sum(f(x) for x in full7) / 8, 2)
l16 = next(r for r in T['A7.T7']['rows'] if r['group'] == '16x compression' and r['label'].startswith('LCLM') and 'Mean' in r['label'])
ag['t7_lclm16_niah_avg'] = round(sum(f(x) for x in l16['v'][:8]) / 8, 2)
R['agent'] = ag

# ---- the architecture-search losses (printed call-outs) ----
LOSS = {
    'fig3': {'note': 'from scratch, 16x, 38B tokens, 100-step running average (Figure 3, raster: call-outs transcribed)',
             'v': [['Mean W1024 causal', 1.169], ['Concat W1024 causal', 1.171], ['Mean W256 causal', 1.172], ['EOS W16 causal', 1.182],
                   ['Mean W16 causal', 1.183], ['Mean W1024 bidirectional', 1.191], ['EOS W1024 causal', 1.191]]},
    'fig9abc': {'note': 'from scratch (Figure 9 a to c)',
                'v': [['MLP causal O=0', 1.1693], ['MLP causal O=256', 1.1723], ['MLP bidir O=256', 1.1889], ['MLP bidir O=0', 1.1906],
                      ['MLP bidir O=32', 1.2021], ['Attn bidir O=32', 1.2564], ['Attn bidir O=0', 1.2766], ['Attn bidir O=256', 1.2782]]},
    'fig9d': {'note': 'at scale, continual pre-training (Figure 9 d)',
              'v': [['MLP O=0 causal', 0.6871], ['Attn-MLP O=256 bidir', 0.6897], ['MLP O=0 bidir', 0.6901], ['MLP O=256 bidir', 0.6912]]},
    'fig10': {'note': 'at scale (Figure 10)',
              'v': [['(a) W16, LR 1e-6', 0.7438], ['(a) W256, LR 1e-6', 0.7321], ['(a) W1024, LR 1e-6', 0.7276], ['(b) bidir, LR 1e-5', 0.6908],
                    ['(b) causal, LR 1e-5', 0.6871], ['(c) bidir LR 1e-6', 0.7276], ['(c) bidir LR 3e-6', 0.7112], ['(c) bidir LR 1e-5', 0.6908],
                    ['(d) LLM init, EOS', 0.7461], ['(d) embedding init, EOS', 0.7431]]},
    'fig8': {'note': 'at scale, mean against concat (Figure 8)',
             'v': [['4x mean', 0.6685], ['4x concat', 0.6667], ['8x mean', 0.6780], ['8x concat', 0.6792], ['16x mean', 0.6871], ['16x concat', 0.6876]]},
    'fig11': {'note': 'at scale, end of stage 2, truncated at a common step (Figure 11)',
              'v': [['0.6B enc / 4B dec', 0.6884], ['4B enc / 4B dec', 0.6860], ['0.6B enc / 8B dec', 0.6591], ['chunk 16', 0.6884], ['chunk 8', 0.6789], ['chunk 4', 0.6643]]},
}
words = {k: [w[2] for w in FG['words_' + k]] for k in ('adapter_overlap', 'cpt_ablation', 'scaling_behavior', 'concat_vs_mean_ratios')}
src = {'fig9abc': 'adapter_overlap', 'fig9d': 'adapter_overlap', 'fig10': 'cpt_ablation', 'fig11': 'scaling_behavior', 'fig8': 'concat_vs_mean_ratios'}
for k, w in src.items():
    for n, v in LOSS[k]['v']:
        check('loss label %s %s printed in the figure' % (k, n), 1.0 if ('%.4f' % v) in words[w] else 0.0, 1.0, 0)
R['loss'] = LOSS
R['loss_gaps'] = dict(
    window_16_256=round(1.183 - 1.172, 3), window_256_1024=round(1.172 - 1.169, 3), causal_bidir=round(1.191 - 1.169, 3),
    eos_mean_w1024=round(1.191 - 1.169, 3), eos_mean_w16=round(1.182 - 1.183, 3), best_worst=round(1.191 - 1.169, 3),
    adapter_scratch=round(1.2766 - 1.1906, 4), adapter_scale=round(0.6897 - 0.6912, 4),
    dec_scale=round(0.6884 - 0.6591, 4), enc_scale=round(0.6884 - 0.6860, 4),
    concat_mean_16=round(0.6876 - 0.6871, 4), concat_mean_4=round(0.6667 - 0.6685, 4))
# downstream counterparts of the architecture claims (Tables 20, 26, 30, 31)
t26 = {r['label']: [f(x) for x in r['v']] for r in T['A7.T26']['rows']}
R['adapter_downstream'] = dict(attn=t26['Bidirectional-ATTN-MLP-O256'], mlp=t26['Bidirectional-MLP-O256'],
                               diff=[round(a - b, 2) for a, b in zip(t26['Bidirectional-ATTN-MLP-O256'], t26['Bidirectional-MLP-O256'])])
t31 = {r['label']: [f(x) for x in r['v']] for r in T['A7.T31']['rows']}
R['window_downstream'] = dict(w256=t31['Mean W256 (causal)'], w1024b=t31['Mean W1024 (bidir)'],
                              w1024_better=sum(a > b for a, b in zip(t31['Mean W1024 (bidir)'], t31['Mean W256 (causal)'])))
t20 = {(r['group'], r['label']): [f(x) for x in r['v']] for r in T['A7.T20']['rows']}
R['pool16'] = dict(mean=t20[('16x compression', 'Mean')], concat=t20[('16x compression', 'Concat')],
                   diff=[round(a - b, 2) for a, b in zip(t20[('16x compression', 'Concat')], t20[('16x compression', 'Mean')])])
t30 = {r['label']: [f(x) for x in r['v']] for r in T['A7.T30']['rows']}
R['mask_downstream'] = dict(diff=[round(a - b, 2) for a, b in zip(t30['Causal'], t30['Bidirectional'])])
t4 = {r['label']: [f(x) for x in r['v']] for r in T['A5.T4']['rows']}
R['scaling_downstream'] = t4

fc = os.path.join(HERE, 'inputs', 'check_forward.json')
if os.path.exists(fc): R['forward_check'] = json.load(open(fc))
R['checks'] = checks
R['checks_ok'] = sum(c[3] for c in checks); R['checks_n'] = len(checks)
json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
for c in checks: print(('ok  ' if c[3] else 'FAIL') + ' ' + c[0], c[1], c[2])
print('speed-ups', [(s['panel'], s['printed'], s['computed'], s['acc_gap'], s['lclm_vs_nocomp'], s['fast_vs_nocomp']) for s in speed])
print('LCLM 16x figure against table', [(x['panel'], x['fig'], x['table'], x['diff']) for x in R['fig_vs_table_lclm16']], 'others max', R['fig_vs_table_max_other'])
print('models', R['models']); print('agent', ag); print('wins', wins)
print('adapter downstream', R['adapter_downstream']['diff'], 'pool16', R['pool16']['diff'], 'mask', R['mask_downstream']['diff'], 'window w1024 better on', R['window_downstream']['w1024_better'])
print('checks', R['checks_ok'], '/', R['checks_n'])

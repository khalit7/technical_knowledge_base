"""Recompute every derived number on the LoRA page from the paper's own formulas and tables.
Writes inputs/recompute.json (read by mk_paper.py into window.PAPER.rc). usage: python3 recompute.py"""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
CFG = json.load(open(os.path.join(HERE, 'inputs', 'hf_configs.json')))
GLUE = {'MNLI': 9815, 'SST-2': 872, 'MRPC': 408, 'CoLA': 1043, 'QNLI': 5463, 'QQP': 40430, 'RTE': 277, 'STS-B': 1500}  # dev sizes, Hugging Face datasets server (BERT page's glue_sizes.json)
R = {}
checks = []


def chk(claim, where, printed, computed, how, verdict):
    checks.append({'claim': claim, 'where': where, 'printed': printed, 'computed': computed, 'how': how, 'verdict': verdict})


lora_params = lambda nmat, d, r: 2 * nmat * d * r            # |Theta| = 2 x L_LoRA x d_model x r (Section 5.1)
# ---- GPT-3 175B: d_model 12,288, 96 layers (GPT-3 paper Table 2.1; this paper Section 7.1 "all 96 layers") ----
d3, L3 = 12288, 96
g3 = {}
for name, nm, r in (('rv=2', 1, 2), ('rq=rv=1', 2, 1), ('rq=rv=2', 2, 2), ('rq=rk=rv=ro=1', 4, 1), ('rq=rv=4', 2, 4), ('rq=rk=rv=ro=2', 4, 2),
                    ('rq=rv=8', 2, 8), ('rq=rk=rv=ro=4', 4, 4), ('rq=rv=64', 2, 64), ('rq=rk=rv=ro=64', 4, 64)):
    g3[name] = lora_params(nm * L3, d3, r)
printed15 = {r[0] if len(r) == 4 else r[1]: (r[-3] if len(r) == 4 else r[2]) for r in T['A6.T15']['rows'][1:]}
R['gpt3_lora'] = []
for name, v in g3.items():
    p = [r for r in T['A6.T15']['rows'] if name in r]
    pr = p[0][-3] if p else ''
    R['gpt3_lora'].append({'config': name, 'computed': v, 'printed': pr})
mism = [x for x in R['gpt3_lora'] if abs(float(x['printed'].replace(' M', '')) - x['computed'] / 1e6) >= 0.05]
trunc = [x for x in mism if abs(float(x['printed'].replace(' M', '')) - math.floor(x['computed'] / 1e5) / 10) < 1e-9]
other_m = [x for x in mism if x not in trunc]
chk('LoRA trainable parameters on GPT-3, every Table 15 row', 'Table 15, §5.1', '4.7M to 603.8M', '%d of %d match to 0.1M' % (len(g3) - len(mism), len(g3)),
    '|Θ| = 2 × L̂ × 12,288 × r, L̂ = 96 per adapted matrix type', 'reproduces; %d values are printed truncated rather than rounded (18.87M as 18.8M, 301.99M as 301.9M)%s' % (len(trunc), ''.join('; %s is printed %s against %.2fM' % (x['config'], x['printed'], x['computed'] / 1e6) for x in other_m)))
# adapters on GPT-3: |Theta| = L_adpt x (2 d r + r + d) + 2 L_LN d ; Adapter^H has 2 adapters per block
R['gpt3_adapterH'] = []
for r, pr in ((1, '7.1 M'), (4, '21.2 M'), (8, '40.1 M'), (16, '77.9 M'), (64, '304.4 M')):
    v = 2 * L3 * (2 * d3 * r + r + d3)
    R['gpt3_adapterH'].append({'r': r, 'computed': v, 'printed': pr})
chk('Adapter(H) trainable parameters on GPT-3', 'Table 15, §5.1', '7.1M, 21.2M, 40.1M, 77.9M, 304.4M', ', '.join('%.1fM' % (x['computed'] / 1e6) for x in R['gpt3_adapterH']),
    '|Θ| = L̂ × (2dr + r + d), L̂ = 192 (two adapters per block)', 'reproduces')
pe = [(lp, li, pr) for lp, li, pr in ((32, 8, '0.4 M'), (64, 8, '0.9 M'), (128, 8, '1.7 M'), (256, 8, '3.2 M'), (512, 8, '6.4 M'))]
R['gpt3_preembed'] = [{'lp': a, 'li': b, 'computed': d3 * (a + b), 'printed': c} for a, b, c in pe]
chk('Prefix-embedding trainable parameters on GPT-3', 'Table 15, §5.1', '0.4M, 0.9M, 1.7M, 3.2M, 6.4M', ', '.join('%.2fM' % (x['computed'] / 1e6) for x in R['gpt3_preembed']),
    '|Θ| = d × (lp + li)', 'reproduces (0.49M is printed truncated as 0.4M)')
pl = [(2, 2, '5.1 M'), (8, 0, '10.1 M'), (8, 8, '20.2 M'), (32, 4, '44.1 M'), (64, 0, '76.1 M')]
R['gpt3_prelayer'] = [{'lp': a, 'li': b, 'computed': L3 * d3 * (a + b), 'printed': c} for a, b, c in pl]
chk('Prefix-layer trainable parameters on GPT-3', 'Table 15, §5.1', '5.1M, 10.1M, 20.2M, 44.1M, 76.1M', ', '.join('%.1fM' % (x['computed'] / 1e6) for x in R['gpt3_prelayer']),
    '|Θ| = L × d × (lp + li), L = 96', 'does not reproduce: every printed value is 1% to 8% above the formula, by no constant offset or factor')
# the other models, from their Hugging Face configs
cfg = lambda m, k: CFG[m].get(k)
other = [('RoBERTa base', 'FacebookAI/roberta-base', 'hidden_size', 'num_hidden_layers', 8, '0.3M'),
         ('RoBERTa large', 'FacebookAI/roberta-large', 'hidden_size', 'num_hidden_layers', 8, '0.8M'),
         ('DeBERTa XXL', 'microsoft/deberta-v2-xxlarge', 'hidden_size', 'num_hidden_layers', 8, '4.7M'),
         ('GPT-2 medium', 'openai-community/gpt2-medium', 'n_embd', 'n_layer', 4, '0.35M'),
         ('GPT-2 large', 'openai-community/gpt2-large', 'n_embd', 'n_layer', 4, '0.77M')]
R['others'] = []
for nm, m, kd, kl, r, pr in other:
    d, Lr = cfg(m, kd), cfg(m, kl)
    R['others'].append({'model': nm, 'd': d, 'layers': Lr, 'r': r, 'computed': lora_params(2 * Lr, d, r), 'printed': pr, 'config_url': CFG[m]['url']})
deb = R['others'][2]
deb['with_head'] = deb['computed'] + deb['d'] * deb['d'] + deb['d'] + deb['d'] * 3 + 3
chk('RoBERTa base and large LoRA parameters (rq = rv = 8)', 'Table 2, Table 9', '0.3M, 0.8M', '%.3fM, %.3fM' % (R['others'][0]['computed'] / 1e6, R['others'][1]['computed'] / 1e6), '2 × 2L × d × 8 from the configs', 'reproduces')
chk('DeBERTa XXL LoRA parameters (rq = rv = 8, Table 10)', 'Table 2, Table 10', '4.7M', '%.2fM (LoRA matrices); %.2fM if the pooler and classifier are counted' % (deb['computed'] / 1e6, deb['with_head'] / 1e6),
    'd = 1,536, 48 layers', 'does not reproduce from the stated rank; 4.7M matches the LoRA matrices plus a 1,536 × 1,536 pooler and the 3-way classifier (our reconstruction; the paper does not say)')
chk('GPT-2 LoRA parameters (rq = rv = 4, Table 11)', 'Table 3, Table 11', '0.35M, 0.77M', '%.3fM, %.3fM' % (R['others'][3]['computed'] / 1e6, R['others'][4]['computed'] / 1e6), 'd = 1,024 / 1,280, 24 / 36 layers',
    'does not reproduce: the stated configuration gives 0.39M (medium) and 0.74M (large); the printed figures equal the prefix-layer baseline\'s counts')
# ---- storage, memory, throughput (Section 4.2) ----
R['ckpt'] = {'params': g3['rq=rv=4'], 'bytes_fp16': g3['rq=rv=4'] * 2, 'full_bytes': 175255.8e6 * 2}
chk('Checkpoint 350GB to 35MB, "roughly 10,000×" (r = 4, Wq and Wv)', '§4.2', '35MB, 10,000×', '%.1f MB (%.1f MiB) in FP16; 350 GB / 35 MB = 10,000; 350.5 GB / 37.7 MB = {:,.0f}'.format(R['ckpt']['full_bytes'] / R['ckpt']['bytes_fp16']) % (R['ckpt']['bytes_fp16'] / 1e6, R['ckpt']['bytes_fp16'] / 2**20),
    '18.9M parameters × 2 bytes', 'reproduces as a round figure (the exact ratio is about 9,300)')
chk('100 adapted models: 354GB against 35TB', '§4.2 footnote 4', '≈ 354GB, ≈ 35TB', '%.1f GB, %.0f TB' % (350 + 100 * 0.035, 100 * 350 / 1000), '350GB + 100 × 35MB; 100 × 350GB', 'reproduces')
chk('Training VRAM 1.2TB to 350GB, "3 times", "up to 2/3"', 'Abstract, §4.2', '1.2TB, 350GB', '350GB = 175.3B × 2 bytes (FP16 weights alone); 1.2TB / 350GB = %.2f×, a %.0f%% cut' % (1200 / 350, 100 * (1 - 350 / 1200)),
    'bytes per parameter', 'partly: 350GB is the FP16 weights with nothing else counted; 1.2TB (6.9 bytes per parameter) matches no standard Adam accounting (16 bytes for mixed precision), and the paper gives none')
chk('25% training speedup on GPT-3', '§4.2 footnote 5', '25%; 32.5 against 43.1 tokens/s per V100', '%.1f%% more tokens per second; %.1f%% less time per token' % (100 * (43.1 / 32.5 - 1), 100 * (1 - 32.5 / 43.1)), '43.1 / 32.5', 'reproduces as time saved per token (24.6%); as throughput it is 32.6%')
chk('Trainable parameters cut "by 10,000 times"', 'Abstract, §7', '10,000×', '{:,.0f}× at 18.9M (r = 4, Wq, Wv); {:,.0f}× at 4.7M'.format(175255.8e6 / g3['rq=rv=4'], 175255.8e6 / g3['rq=rv=1']), '175,255.8M / |Θ|', 'reproduces as a round figure (about 9,300×); Table 4\'s 4.7M rows are 37,000×')
# ---- Table 1 latency percentages ----
lat = {'ft': (1449.4, 338.0, 19.8), 'L': (1482.0, 354.8, 23.9), 'H': (1492.2, 366.3, 25.8)}
R['table1'] = {k: [round(100 * (v[i] / lat['ft'][i] - 1), 1) for i in range(3)] for k, v in lat.items() if k != 'ft'}
chk('Adapter latency overheads in Table 1', 'Table 1', '+2.2, +5.0, +20.7 (L); +3.0, +8.4, +30.3 (H)', ', '.join('%+.1f' % x for x in R['table1']['L']) + '; ' + ', '.join('%+.1f' % x for x in R['table1']['H']), 'adapter ms / no-adapter ms − 1', 'reproduces')
# ---- Table 2 averages and the RTE effect ----
rowl = T['S5.T2']['rows'][2:]
rows = {r[0]: r for r in rowl}
num = lambda s: float(s.split('±')[0])
tasks = ['MNLI', 'SST-2', 'MRPC', 'CoLA', 'QNLI', 'QQP', 'RTE', 'STS-B']
t2 = []
for r in rowl:
    k = r[0]
    vals = [num(x) for x in r[2:10]]
    t2.append({'row': k, 'printed_avg': r[10], 'computed_avg': round(sum(vals) / 8, 2)})
R['table2_avgs'] = t2
bad = [x for x in t2 if abs(x['computed_avg'] - float(x['printed_avg'])) > 0.051]
chk('Table 2 averages', 'Table 2', 'Avg. column', '%d of %d rows match to rounding' % (len(t2) - len(bad), len(t2)), 'mean of the eight task scores',
    'reproduces' if not bad else 'mostly: ' + '; '.join('%s printed %s, mean %.2f' % (x['row'], x['printed_avg'], x['computed_avg']) for x in bad))
lb, fb = [num(x) for x in rows['RoB-base (LoRA)'][2:10]], [num(x) for x in rows['RoB-base (FT)*'][2:10]]
diff = [round(a - b, 1) for a, b in zip(lb, fb)]
R['rte'] = {'diffs': dict(zip(tasks, diff)), 'avg_gain': round(sum(diff) / 8, 3), 'gain_without_rte': round((sum(diff) - diff[6]) / 7, 3), 'rte_share': round(diff[6] / 8, 3)}
chk('RoBERTa base: LoRA 87.2 against fine-tuning 86.4 on average', 'Table 2', '+0.8', '+%.2f; RTE alone contributes +%.2f (7.9 points / 8); without RTE LoRA averages %.2f points below' % (R['rte']['avg_gain'], R['rte']['rte_share'], -R['rte']['gain_without_rte']),
    'per-task LoRA − FT', 'arithmetic reproduces, but the whole average gain is RTE, where LoRA started from an MNLI-adapted checkpoint (Appendix D.1) and the fine-tuning number is the fairseq release\'s single-task run')
# binomial standard errors on the GLUE dev sets
se = lambda p, n: 100 * math.sqrt(p * (1 - p) / n)
R['glue_se'] = {t: {'n': GLUE[t], 'se_at_lora': round(se(lb[i] / 100 if t not in ('CoLA', 'STS-B') else 0.85, GLUE[t]), 2)} for i, t in enumerate(tasks)}
# ---- Tables 4, 5, 6 against Table 15 ----
t15 = {}
for r in T['A6.T15']['rows'][1:]:
    if r[0] in ('Fine-Tune',):
        continue
    h = r[-4] if len(r) == 5 else r[0]
    t15[h] = (r[-2], r[-1])
inc = []
# Table 4's two LoRA rows against the Table 15 configurations of the same size
inc.append({'what': 'Table 4, LoRA 4.7M', 'printed': '73.4 / 91.7', 'table15': 'rv=2: %s / %s; rq=rv=1: %s / %s' % (t15['rv=2'] + t15['rq=rv=1']), 'note': 'MNLI 91.7 is the rv = 2 run; both runs give WikiSQL 73.4. The row is the better of two configurations per column.'})
inc.append({'what': 'Table 4, LoRA 37.7M', 'printed': '74.0 / 91.6', 'table15': 'rq=rv=8: %s / %s; rq=rk=rv=ro=4: %s / %s' % (t15['rq=rv=8'] + t15['rq=rk=rv=ro=4']), 'note': 'WikiSQL 74.0 comes from the four-matrix run, MNLI 91.6 from the two-matrix run; neither run alone is the printed row (the four-matrix run would give 74.0 / 91.7).'})
inc.append({'what': 'Appendix D.4, the 37.7M budget', 'printed': '"rq=rv=8 or rq=rk=rv=ro=2"', 'table15': 'rq=rk=rv=ro=2 is 18.8M', 'note': 'Four matrices at r = 2 is 18.9M parameters; 37.7M needs r = 4 (as Table 15 lists).'})
t6 = T['S7.T6']['rows']
inc.append({'what': 'Table 6 against Table 15, Wq, Wv at r = 64, WikiSQL', 'printed': t6[2][5], 'table15': t15['rq=rv=64'][0], 'note': 'The same configuration is printed 73.5 in one table and 73.6 in the other.'})
t5 = T['S7.T5']['rows']
inc.append({'what': 'Table 5 against Table 6, Wq alone at r = 8, MultiNLI', 'printed': t5[4][1], 'table15': t6[4][5], 'note': 'Table 5 prints 91.0, Table 6 prints 90.7 for what is described as the same run.'})
R['inconsistencies'] = inc
chk('Tables 4, 5 and 6 against the full grid in Table 15', 'Tables 4, 5, 6, 15; D.4', 'shared configurations', '%d mismatches' % len(inc), 'row by row', 'five small inconsistencies, listed below; none changes a conclusion')
# Table 5's budget claim against the stated noise
t5v = dict(zip(t5[1][1:], zip(t5[3][1:], t5[4][1:])))
R['table5'] = {k: [float(a), float(b)] for k, (a, b) in t5v.items()}
qv = R['table5']['Wq,Wv']
R['table5_within_noise'] = {k: [abs(v[0] - qv[0]) <= 0.5, abs(v[1] - qv[1]) <= 0.1] for k, v in R['table5'].items()}
chk('"Adapting both Wq and Wv gives the best performance overall" at 18M', 'Table 5, §7.1', 'Wq,Wv 73.7 / 91.3', 'Wo alone 73.2 / 91.3 and Wv alone 73.0 / 91.0; all four at r = 2: 73.7 / 91.7', 'against the stated ±0.5 and ±0.1',
    'partly: it clearly beats Wq or Wk alone, but Wo alone is within the stated noise on WikiSQL and equal on MultiNLI, and all four matrices at r = 2 tie or win')
# ---- Table 7 amplification ----
R['table7'] = {'r4': {'dW': 6.91, 'proj': 0.32, 'Wtop': 21.67, 'rand': 0.02, 'factor': round(6.91 / 0.32, 2)}, 'r64': {'dW': 3.57, 'proj': 1.90, 'Wtop': 37.71, 'rand': 0.33, 'factor': round(3.57 / 1.90, 2)}, 'W': 61.95}
chk('Amplification factor 21.5 ≈ 6.91 / 0.32 at r = 4; "around 2" at r = 64', '§7.3, Table 7, H.4', '21.5; about 2', '%.2f; %.2f' % (6.91 / 0.32, 3.57 / 1.90), '‖ΔW‖_F / ‖UᵀWV‖_F', 'reproduces (21.6 by the printed inputs)')
chk('‖ΔWq‖ is smaller at r = 64 (3.57) than at r = 4 (6.91)', 'Table 7', '6.91, 3.57', 'ratio %.2f' % (3.57 / 6.91), 'printed', 'as printed; with α/r scaling and α fixed, a larger r shrinks each direction\'s update, the effect rsLoRA (2023) later identified')
# ---- Table 16 low data; Table 8 few-shot; Table 12 learning rates ----
t16 = {r[0]: [float(x) for x in r[1:]] for r in T['A6.T16']['rows'][1:]}
R['table16'] = t16
R['lr_ratio_gpt3'] = 2e-4 / 5e-6
chk('LoRA learning rate against fine-tuning on GPT-3', 'Table 12', '2.00E-04 against 5.00E-06', '%.0f×' % R['lr_ratio_gpt3'], 'ratio', 'as printed; LoRA Without Regret (2025) later measured an optimal ratio of about 10×')
t18 = T['A8.T18']['rows'][1:]
R['table18'] = [[int(r[0])] + [float(x) for x in r[1:]] for r in t18]
best_bleu = max(R['table18'], key=lambda r: r[2])
chk('GPT-2 medium: best rank 4 by BLEU, 16 by validation loss', 'Table 18, H.2', 'r = 4 (BLEU), r = 16 (val loss)', 'BLEU max at r = %d (%.2f); val loss 1.16 for every r from 16 to 512' % (best_bleu[0], best_bleu[2]), 'argmax over the table',
    'reproduces; the loss is flat from 16 up, so "peaks at 16" means "stops improving at 16"')
R['checks'] = checks
json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1, ensure_ascii=False)
if __name__ == '__main__':
    for c in checks:
        print('-', c['claim'], '|', c['computed'], '|', c['verdict'])

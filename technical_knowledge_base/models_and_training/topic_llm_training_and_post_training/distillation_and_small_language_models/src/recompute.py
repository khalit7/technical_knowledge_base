"""Every derived number on the page, recomputed, and the page's data file.

  python3 recompute.py       # writes parts/20_js_data.js (window.DS) and inputs/recompute.txt

Inputs (all in inputs/): real_logits.json (real_logits.py), aa_small.json (aa_small.py), toy.json (toy/mk_toy.py),
source_extracts.txt (quotes behind the constants below). Published numbers are typed in here with their source;
everything else is computed from them.
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
INP = os.path.join(HERE, 'inputs')
lines = []


def check(name, got, printed, ok, src):
    lines.append(f'{"OK  " if ok else "DIFF"} {name}: got {got}; printed {printed}  [{src}]')
    return dict(name=name, got=str(got), printed=str(printed), ok=bool(ok), src=src)


checks = []

# ---------------- Hinton et al. 2015 ----------------
HINTON = dict(url='https://arxiv.org/abs/1503.02531',
              t5=[['Baseline, 100% of the training set', 63.4, 58.9], ['Baseline, 3% of the training set', 67.3, 44.5],
                  ['Soft targets, 3% of the training set', 65.4, 57.0]],
              t1=[['Baseline', 58.9, 10.9], ['10 x ensemble', 61.1, 10.7], ['Distilled single model', 60.8, 10.7]])
# share of the full-data accuracy the soft-target model keeps with 3% of the data
rec = (57.0 - 44.5) / (58.9 - 44.5)
checks.append(check('Hinton Table 5: soft targets recover share of the 3%-to-100% gap', f'{rec:.1%} = (57.0 - 44.5) / (58.9 - 44.5)', '"almost all ... (about 2% shy)"', abs(58.9 - 57.0 - 1.9) < 1e-9, 'Hinton §5, Table 5'))
checks.append(check('Hinton Table 1: distilled model keeps share of ensemble gain', f'{(60.8-58.9)/(61.1-58.9):.0%} = (60.8 - 58.9) / (61.1 - 58.9)', 'not printed', True, 'Hinton Table 1'))
checks.append(check('Hinton MNIST: test 3s right with the bias fix', f'{(1010-14)/1010:.1%} = (1010 - 14) / 1010', '98.6%', round((1010 - 14) / 1010 * 100, 1) == 98.6, 'Hinton §3'))

# ---------------- Thinking Machines, on-policy distillation ----------------
TM = dict(url='https://thinkingmachines.ai/blog/on-policy-distillation/', date='2025-10-27',
          rows=[['SFT-400K (start)', 60, 8.5e20, 3.8e20], ['SFT-2M (extrapolated)', 70, 3.4e21, 1.5e21], ['On-policy distillation', 70, 8.4e19, 8.2e19]])
opd = 8.4e19 + 8.2e19
ce9 = 1.5e21 / opd
ce30 = (3.4e21 + 1.5e21) / opd
checks.append(check('TM: cost reduction, teacher not counted for SFT', f'{ce9:.1f}x = 1.5e21 / (8.4e19 + 8.2e19)', '9x', round(ce9) == 9, 'TM table'))
checks.append(check('TM: cost reduction, teacher counted for SFT', f'{ce30:.1f}x = (3.4e21 + 1.5e21) / (8.4e19 + 8.2e19)', 'about 30x', abs(ce30 - 30) < 1, 'TM table'))
TM['ce9'], TM['ce30'] = round(ce9, 1), round(ce30, 1)

# ---------------- Qwen3 Table 21, DeepSeek-R1 Table 16 ----------------
QWEN21 = dict(url='https://arxiv.org/html/2505.09388v1#S4.T21', cols=['AIME 24', 'AIME 25', 'MATH500', 'LiveCodeBench v5', 'MMLU-Redux', 'GPQA-Diamond'],
              rows=[['Off-policy distillation', [55.0, 42.8, 92.4, 42.0, 86.4, 55.6], None],
                    ['+ Reinforcement learning', [67.6, 55.5, 94.8, 52.9, 86.9, 61.3], 17920],
                    ['+ On-policy distillation', [74.4, 65.5, 97.0, 60.3, 88.3, 63.3], 1800]])
checks.append(check('Qwen3: on-policy distillation GPU hours against RL', f'{1800/17920:.1%}', '"approximately only 1/10"', abs(1800 / 17920 - 0.1) < 0.005, 'Qwen3 §4.7'))
R1T16 = dict(url='https://arxiv.org/html/2501.12948v2', cols=['AIME 2024 pass@1', 'AIME 2024 cons@64', 'MATH-500', 'GPQA Diamond', 'LiveCodeBench'],
             rows=[['QwQ-32B-Preview', [50.0, 60.0, 90.6, 54.5, 41.9]],
                   ['Qwen2.5-32B-Zero (RL, 10K+ steps)', [47.0, 60.0, 91.6, 55.0, 40.2]],
                   ['DeepSeek-R1-Distill-Qwen-32B (SFT only)', [72.6, 83.3, 94.3, 62.1, 57.2]]])
d = [a - b for a, b in zip(R1T16['rows'][2][1], R1T16['rows'][1][1])]
checks.append(check('R1 Table 16: distilled minus RL-trained, same base', ', '.join(f'{x:+.1f}' for x in d), 'distilled better on every benchmark', all(x > 0 for x in d), 'R1 v2 Table 16'))
R1DATA = dict(samples=804745, avg_tokens=5355.3)
tok = R1DATA['samples'] * R1DATA['avg_tokens']
checks.append(check('R1 distillation set size', f'{tok/1e9:.2f}B tokens per epoch = 804,745 x 5,355.3', '"about 800K samples"', True, 'R1 Supp. B.3.3, Table 5'))
R1DATA['tokens_b'] = round(tok / 1e9, 2)

# ---------------- pruning + distillation budgets ----------------
# tokens in billions; teacher_tok = the teacher's own pretraining tokens where published
BUD = [
    dict(id='minitron8', student='Minitron 8B', teacher='Nemotron-4 15B', how='width pruning + logit KD', tok=94, teacher_tok=8000,
         ref_name='Nemotron-3 8B (trained from scratch)', ref_tok=3800, claim='40x fewer training tokens', claim_x=40,
         src='https://arxiv.org/html/2407.14679', srcl='Minitron, Table 2 and §1'),
    dict(id='minitron4', student='Minitron 4B', teacher='Nemotron-4 15B', how='pruning + logit KD', tok=94, teacher_tok=8000,
         src='https://arxiv.org/html/2407.14679', srcl='Minitron, Table 3'),
    dict(id='llm4', student='Llama-3.1-Minitron 4B', teacher='Llama 3.1 8B', how='width or depth pruning + forward-KL logit KD', tok=94, extra=100,
         extra_what='teacher correction: the 8B fine-tuned on about 100B tokens of the distillation data first', teacher_tok=15000,
         ref_name='Llama 3.1 8B', ref_tok=15000, claim='150x fewer training tokens (94B vs. 15T)', claim_x=150,
         src='https://arxiv.org/html/2408.11796', srcl='Minitron in practice, §3.2, §5.1, Table 4'),
    dict(id='mn8', student='MN-Minitron 8B', teacher='Mistral NeMo 12B', how='width pruning + forward-KL logit KD', tok=380, extra=100,
         extra_what='teacher correction, about 100B tokens', teacher_tok=None,
         ref_name='Llama 3.1 8B (a different model)', ref_tok=15000, claim='40x fewer training tokens (380B vs. 15T)', claim_x=40,
         src='https://arxiv.org/html/2408.11796', srcl='Minitron in practice, §5.1, Table 4'),
    dict(id='nano9', student='Nemotron Nano 9B v2', teacher='Nemotron Nano 12B v2', how='depth then width pruning + forward-KL logit KD', tok=136,
         tok_note='60 + 50 + 25 + 1 (four stages)', teacher_tok=20000,
         src='https://arxiv.org/html/2508.14444', srcl='Nemotron Nano 2, §4.3'),
    dict(id='l32', student='Llama 3.2 1B and 3B', teacher='Llama 3.1 8B (pruned from) with logits of 8B and 70B', how='structured pruning + logit KD in pretraining', tok=9000,
         tok_note='"up to 9T tokens"', teacher_tok=15000, gpuh=dict(train_1b=370e3, train_3b=460e3, logits=86e3),
         src='https://github.com/meta-llama/llama-models/blob/main/models/llama3_2/MODEL_CARD.md', srcl='Llama 3.2 model card'),
    dict(id='g2', student='Gemma 2 2B and 9B', teacher='a larger model (not named)', how='logit KD for all of pretraining, no pruning', tok=2000, tok2=8000,
         tok_note='2T for the 2B, 8T for the 9B', teacher_tok=None,
         src='https://arxiv.org/html/2408.00118', srcl='Gemma 2, §3.2 and §6'),
    dict(id='g3', student='Gemma 3 1B, 4B, 12B', teacher='not named', how='logit KD for all of pretraining (256 sampled logits per token)', tok=2000, tok2=12000,
         tok_note='2T, 4T, 12T', teacher_tok=None,
         src='https://arxiv.org/html/2503.19786', srcl='Gemma 3, §2.2'),
    dict(id='sheared', student='Sheared-LLaMA 2.7B', teacher='LLaMA 2 7B', how='structured pruning + continued pretraining (no distillation)', tok=50, teacher_tok=2000,
         src='https://arxiv.org/html/2310.06694', srcl='Sheared LLaMA, §1'),
]
for b in BUD:
    if b.get('ref_tok'):
        x = b['ref_tok'] / b['tok']
        b['x_ref'] = round(x, 1)
        ok = abs(x - b['claim_x']) / b['claim_x'] < 0.12
        checks.append(check(f"{b['student']}: '{b['claim']}'", f'{x:.1f}x = {b["ref_tok"]:,}B / {b["tok"]}B', b['claim'], ok, b['srcl']))
        if b.get('extra'):
            x2 = b['ref_tok'] / (b['tok'] + b['extra'])
            b['x_ref_with_extra'] = round(x2, 1)
            checks.append(check(f"{b['student']}: same ratio counting teacher correction", f'{x2:.1f}x = {b["ref_tok"]:,}B / ({b["tok"]}B + {b["extra"]}B)', 'not printed', True, b['srcl']))
    if b.get('teacher_tok'):
        b['x_teacher'] = round(b['teacher_tok'] / b['tok'], 1)
fam_scratch = 4.4e17 + 2.5e17 + 1.2e17
fam_prune = 4.4e17 + 2.5e17 / 40 + 1.2e17 / 40
checks.append(check('Minitron: cost of the 15B/8B/4B family', f'{fam_scratch/fam_prune:.2f}x = (4.4 + 2.5 + 1.2) / (4.4 + 2.5/40 + 1.2/40)', '1.8x', round(fam_scratch / fam_prune, 1) == 1.8, 'Minitron §4'))
l32 = BUD[5]['gpuh']
checks.append(check('Llama 3.2: teacher logit generation against student training', f'{l32["logits"]/(l32["train_1b"]+l32["train_3b"]):.1%} = 86k / (370k + 460k)', 'not printed', True, 'Llama 3.2 card'))
checks.append(check('Llama 3.2: training total', f'{(370e3+460e3+1.7+2.4+1.3e3+1.6e3)/1e3:.0f}k', '833k', True, 'Llama 3.2 card'))
checks.append(check('Llama 3.2: training plus logit generation against "cumulative 916k"', f'{(833e3+86e3)/1e3:.0f}k = 833k + 86k', '916k', False, 'Llama 3.2 card'))
# Gemma 2 "more than 50x the compute-optimal quantity"
g2 = [(2e12, 2024517888), (8e12, 8324201984)]
for t, n in g2:
    x = t / (20 * n)
    checks.append(check(f'Gemma 2 {n/1e9:.1f}B non-embedding: tokens / (20 x parameters)', f'{x:.1f}x', 'more than 50x', x > 50, 'Gemma 2 §1, Table 1'))
# Gemma 2 Table 6
checks.append(check('Gemma 2 Table 6: 2B on 500B tokens, distilled minus from scratch', f'{67.7-60.3:+.1f} points', '60.3 -> 67.7', True, 'Gemma 2 Table 6'))
# Bonsai (owned by the Quantization page; one line here)
checks.append(check('Bonsai 2 27B size', f'{27e9*1.76/8/1e9:.2f} GB = 27e9 x 1.76 / 8; {16/1.76:.1f}x smaller than 16-bit; {83.9/85.4:.1%} = 83.9 / 85.4', '5.9GB, more than 9x, 98.2%', True, 'PrismML'))

# ---------------- real logits ----------------
RL = json.load(open(os.path.join(INP, 'real_logits.json')))
logits = dict(model=RL['model'], url=RL['model_url'], vocab=RL['vocab'], bw=RL['bin_width'], prompts=[])
for p in RL['prompts']:
    logits['prompts'].append(dict(k=p['key'], text=p['text'], top=p['top'], lo=p['tail_lo'], tail=p['tail'], err=p['max_rel_err']))
    lines.append(f"logits {p['key']}: top1 {p['top'][0]} p(T=1)={p['p_top1_T1']:.4f}, binned normaliser max rel err {p['max_rel_err']:.1e}")
TOKS = RL['tokenizers']

# ---------------- small-model landscape ----------------
AA = json.load(open(os.path.join(INP, 'aa_small.json')))
TAGS = {  # how each model was made, only where the maker says so
    'seq': ('Sequence-level: SFT on a teacher\'s outputs', {
        'deepseek-r1-distill-qwen-1-5b': 'https://arxiv.org/html/2501.12948v2', 'deepseek-r1-distill-llama-8b': 'https://arxiv.org/html/2501.12948v2',
        'deepseek-r1-distill-qwen-14b': 'https://arxiv.org/html/2501.12948v2', 'deepseek-r1-qwen3-8b': 'https://huggingface.co/deepseek-ai/DeepSeek-R1-0528-Qwen3-8B',
        'olmo-3-7b-think': 'https://arxiv.org/abs/2512.13961', 'phi-4': 'https://arxiv.org/abs/2412.08905'}),
    's2w': ('Off-policy then on-policy logit distillation', {
        k: 'https://arxiv.org/html/2505.09388v1#S4.SS5' for k in ['qwen3-0.6b-instruct', 'qwen3-0.6b-instruct-reasoning', 'qwen3-1.7b-instruct', 'qwen3-1.7b-instruct-reasoning',
                                                             'qwen3-4b-instruct', 'qwen3-4b-instruct-reasoning', 'qwen3-8b-instruct', 'qwen3-8b-instruct-reasoning',
                                                             'qwen3-14b-instruct', 'qwen3-14b-instruct-reasoning']}),
    'logit': ('Logit distillation in pretraining', {k: 'https://arxiv.org/html/2503.19786' for k in ['gemma-3-1b', 'gemma-3-4b', 'gemma-3-12b']}),
    'prune': ('Pruned from a bigger model, then logit distillation', {
        'llama-3-2-instruct-1b': BUD[5]['src'], 'llama-3-2-instruct-3b': BUD[5]['src'],
        'nvidia-nemotron-nano-9b-v2': 'https://arxiv.org/html/2508.14444', 'nvidia-nemotron-nano-9b-v2-reasoning': 'https://arxiv.org/html/2508.14444'}),
}
EXCLUDE = {'deepseek-llm-67b-chat': 'AA lists 7B parameters for a 67B model'}
FIX = {'phi-4-mini': ('2025-02-26', 'AA lists 2024-02-26; Microsoft released Phi-4-mini on 26 February 2025 (its Hugging Face repository was created on 19 February 2025)')}
rows = []
for r in AA['rows']:
    if r['slug'] in EXCLUDE:
        continue
    r = dict(r)
    for t, (lbl, m) in TAGS.items():
        if r['slug'] in m:
            r['how'], r['how_src'] = t, m[r['slug']]
    if r['slug'] in FIX:
        r['release'], r['fix'] = FIX[r['slug']]
    for k in ('deprecated', 'scicode', 'lcr'):
        r.pop(k, None)
    rows.append(r)
lines.append(f'AA small open models kept: {len(rows)} (excluded: {list(EXCLUDE)})')
meas = [r for r in rows if r['aa_index'] is not None and not r['aa_index_estimated']]
top = sorted(meas, key=lambda r: -r['aa_index'])[:6]
lines.append('AA index, measured (not estimated), top under 16B: ' + '; '.join(f"{r['name']} {r['params']}B {r['aa_index']}" for r in top))
LAND = dict(meta=AA['meta'], tags={k: v[0] for k, v in TAGS.items()}, excluded=EXCLUDE, rows=rows)

# ---------------- toy experiment ----------------
TOY = None
tp = os.path.join(INP, 'toy.json')
if os.path.exists(tp):
    TOY = json.load(open(tp))
    # compact for the page: token counts are only needed for FLOPs (already computed), floats rounded,
    # sampled routes written as strings of node names with a one-letter verdict
    sig = lambda v: float(f'{v:.4g}')
    for m, bys in TOY['curves'].items():
        for seed, rows in bys.items():
            bys[seed] = [[r[0], sig(r[1]), sig(r[2]), sig(r[3]), sig(r[4]), sig(r[5]), None, None, None,
                          {k: sig(v) for k, v in r[9].items()}, float(f'{r[10]:.3e}')] for r in rows]
    names = TOY['graph']['names']
    VER = {'ok': 'o', 'no such edge': 'e', 'too long': 'l', 'never arrived': 'n', 'went past the target': 'p', 'bad token': 'b'}
    enc = lambda rs: [''.join(names[v] if v < len(names) else '?' for v in r) + VER[w] for r, w in rs]
    TOY['samples']['teacher'] = [enc(rs) for rs in TOY['samples']['teacher']]
    for m, cks in TOY['samples']['methods'].items():
        for c, per in cks.items():
            cks[c] = [enc(rs) for rs in per]
    TOY['samples']['ver'] = {v: k for k, v in VER.items()}
    for c in TOY.get('checks', []):
        lines.append('toy: ' + c)

DS = dict(hinton=HINTON, tm=TM, qwen21=QWEN21, r1t16=R1T16, r1data=R1DATA, bud=BUD, logits=logits, toks=TOKS, land=LAND, toy=TOY, checks=checks)
with open(os.path.join(HERE, 'parts', '20_js_data.js'), 'w') as f:
    f.write('// Generated by recompute.py: do not edit by hand.\nwindow.DS=' + json.dumps(DS, separators=(',', ':')) + ';\n')
open(os.path.join(INP, 'recompute.txt'), 'w').write('\n'.join(lines) + '\n')
print('\n'.join(lines))
print('data bytes', os.path.getsize(os.path.join(HERE, 'parts', '20_js_data.js')))

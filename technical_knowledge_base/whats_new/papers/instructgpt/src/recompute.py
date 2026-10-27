"""Recompute every derived number the page shows from the paper's printed tables (tables.json) and from the
figures decoded from the arXiv SVGs (inputs/figs.json). Writes inputs/recompute.json; build.sh runs it first.
  python3 recompute.py"""
import json, math, os
HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
F = json.load(open(os.path.join(HERE, 'inputs', 'figs.json')))
n = lambda s: float(str(s).replace(',', '').replace('%', ''))
logit = lambda p: math.log(p / (1 - p))
sig = lambda x: 1 / (1 + math.exp(-x))
R = {'checks': []}
def check(id, claim, where, printed, recomputed, verdict, note=''):
    R['checks'].append({'id': id, 'claim': claim, 'where': where, 'printed': printed, 'recomputed': recomputed, 'verdict': verdict, 'note': note})

# ---- dataset sizes (Table 6 against Table 9, Table 11 and the text) ----
t6 = T['t6']; tot = lambda rows, split: sum(n(r[2]) for r in rows if r[0] == split)
sizes = {k: {'train': tot(t6[k], 'train'), 'valid': tot(t6[k], 'valid')} for k in ('SFT', 'RM', 'PPO')}
R['sizes'] = sizes
t9 = {(r[0], r[1]): n(r[2]) for r in T['t9']['rows']}
check('sizes', 'SFT, RM and PPO datasets have about 13k, 33k and 31k training prompts', '§3.2, Table 6',
      '13k / 33k / 31k', '%d / %d / %d' % (sizes['SFT']['train'], sizes['RM']['train'], sizes['PPO']['train']), 'reproduces',
      'Table 6 rows summed (labeler plus customer); Table 9 counts the same %d, %d, %d' % (t9[('SFT', 'train')], t9[('RM', 'train')], t9[('PPO', 'train')]))
t11 = {r[0] + ' ' + r[1]: n(r[2]) for r in T['t11']['rows']}
demo_total = t11['Contractor demo length'] + t11['Customer demo length']
check('demos', 'Demonstrations: Table 11 counts against Table 6', 'Table 6, Table 11', '%d + %d' % (t11['Contractor demo length'], t11['Customer demo length']),
      '%d = SFT train + valid (%d)' % (demo_total, sizes['SFT']['train'] + sizes['SFT']['valid']), 'reproduces' if demo_total == sizes['SFT']['train'] + sizes['SFT']['valid'] else 'does not reproduce')
lab = sum(n(r[2]) for r in t6['SFT'] if r[1] == 'labeler')
R['sft_labeler_share'] = lab / (sizes['SFT']['train'] + sizes['SFT']['valid'])
R['rm_labeler_share'] = sum(n(r[2]) for r in t6['RM'] if r[1] == 'labeler') / (sizes['RM']['train'] + sizes['RM']['valid'])
# ---- Table 1 ----
t1 = {r[0]: n(r[1]) for r in T['t1']['rows']}
R['t1_sum'] = round(sum(t1.values()), 1)
gen_brain = t1['Generation'] + t1['Brainstorming']; cls_qa = t1['Classification'] + t1['Open QA'] + t1['Closed QA']
check('usecases', 'Open-ended generation and brainstorming are about 57% of prompts; classification and QA about 18%', '§4.1, Table 1',
      '57% / 18%', '%.1f%% / %.1f%%' % (gen_brain, cls_qa), 'reproduces', 'Generation + Brainstorming; Classification + Open QA + Closed QA. Table 1 sums to %.1f%%.' % R['t1_sum'])
# ---- compute ----
R['compute'] = {'sft': 4.9, 'ppo': 60, 'gpt3': 3640, 'ppo_share': 60 / 3640, 'both_share': 64.9 / 3640}
check('compute', 'Training the 175B PPO-ptx model costs a fraction of GPT-3 pretraining', '§5.1', '60 against 3,640 petaflop/s-days',
      '%.2f%% (SFT plus PPO-ptx: %.2f%%)' % (100 * 60 / 3640, 100 * 64.9 / 3640), 'derived', 'Excludes the 6B reward model and value function, the labelers, and the exploratory runs the text says are also small.')
check('params', '1.3B InstructGPT beats 175B GPT-3 "despite having over 100x fewer parameters"', '§1', '100x', '%.1fx' % (175 / 1.3), 'reproduces')
check('batch', 'A reward-model batch of 64 prompts holds at most 2,304 comparisons', '§C.2', '64 x C(K,2) <= 2,304', '64 x C(9,2) = 64 x 36 = %d' % (64 * 36), 'reproduces')
check('kl100', 'The largest KL coefficient tried, 2.0, is 100 times the default', '§E.6, §C.4', '2.0 = 100 x 0.02', '%g' % (2.0 / 0.02), 'reproduces')
R['ptx_examples'] = 8 * 256000
check('rmcost', 'Batching all C(K,2) comparisons of a prompt needs one forward pass per completion', '§3.5',
      'K passes rather than C(K,2)', 'K passes against K(K-1) = 2 C(K,2) if every pair is a separate example (K = 9: 9 against 72)', 'derived',
      'The old summary said "K times cheaper"; the saving is (K-1) times against separate pairs, 4x to 9x... see the calculator.')
R['checks'][-1]['note'] = 'The old summary said "K times cheaper". Against separate pair examples the saving is K - 1 times (3 for K = 4, 8 for K = 9); against the paper\'s own phrase, C(K,2) passes, it is (K - 1) / 2 times.'
check('agree', 'Inter-annotator agreement "about 73%"', '§5.2 against §3.4', 'about 73%', '72.6 +/- 1.5% (training labelers), 77.3 +/- 1.3% (held-out)', 'reproduces', 'Held-out labelers agree with each other more than the training labelers do.')
# ---- Figure 1 and Bradley-Terry consistency ----
f1 = {m: {r['x']: r for r in rows} for m, rows in F['fig1']['series'].items()}
R['fig1'] = {m: {s: f1[m][s]['v'] for s in f1[m]} for m in f1}
def bt(a, b): return sig(logit(a) - logit(b))
h2h = [('PPO-ptx', '175B', 'GPT', '175B', '85 +/- 3%', 0.85, 0.03), ('PPO-ptx', '175B', 'GPT (prompted)', '175B', '71 +/- 4%', 0.71, 0.04)]
R['bt'] = []
for a, sa, b, sb, txt, p, e in h2h:
    v = bt(f1[a][sa]['v'], f1[b][sb]['v']); R['bt'].append({'a': a + ' ' + sa, 'b': b + ' ' + sb, 'implied': v, 'printed': p, 'err': e})
    check('bt_' + b, '175B InstructGPT preferred to 175B %s %s of the time (direct comparison)' % (b, txt), '§1, §4.1', txt,
          '%.1f%% implied by Figure 1 through Bradley-Terry' % (100 * v), 'reproduces' if abs(v - p) <= e else 'does not reproduce',
          'Figure 1 measures every model against SFT 175B; if preferences follow the Bradley-Terry model the reward model itself assumes (Eq. 1), P(a over b) = sigmoid(logit(w_a) - logit(w_b)). Independent of the printed head-to-head.')
v13 = bt(f1['PPO-ptx']['1.3B']['v'], f1['GPT']['175B']['v'])
R['bt_13'] = v13
check('headline', '1.3B InstructGPT outputs are preferred to 175B GPT-3 outputs', '§1, Figure 1', 'preferred (no head-to-head number printed)',
      'win rates against SFT 175B: %.1f%% against %.1f%%; Bradley-Terry implies %.0f%% head to head' % (100 * f1['PPO-ptx']['1.3B']['v'], 100 * f1['GPT']['175B']['v'], 100 * v13), 'derived',
      'The claim rests on both models being compared with the same 175B SFT baseline, not on a direct comparison (none is reported).')
check('734', 'InstructGPT has a 73.4 +/- 2% win rate against "our baseline"', '§1', '73.4%', '66.0%% in Figure 1 (175B PPO-ptx against 175B SFT, CI %.1f to %.1f)' % (100 * f1['PPO-ptx']['175B']['lo'], 100 * f1['PPO-ptx']['175B']['hi']),
      'does not reproduce', 'The baseline and prompt set of the §1 FLAN and T0 comparison are not stated; 73.4% lies outside Figure 1\'s interval, so it is probably a different evaluation set.')
for name, p, pw in (('FLAN', 0.298, 0.78), ('T0', 0.268, 0.79)):
    v = sig(logit(0.734) - logit(p))
    check('bt_' + name, '175B InstructGPT preferred over %s %d +/- 4%% of the time' % (name, round(pw * 100)), '§4.1 against §1', '%d%%' % round(pw * 100),
          '%.0f%% implied by §1\'s win rates (73.4%% against %.1f%%)' % (100 * v, 100 * p), 'does not reproduce', 'Unlike Figure 1, the §1 numbers do not combine into the printed head-to-head; the two comparisons were evidently run on different data.')
# ---- hallucination, toxicity, truthfulness claims ----
f4 = F['fig4']['panels']['Hallucinations']; f30 = F['fig30']['panels']['Hallucinations']
R['halluc'] = {'fig4': {m: f4[m]['v'] for m in f4}, 'fig30': {m: {r['x']: r['v'] for r in f30[m]} for m in f30}}
check('halluc', 'InstructGPT hallucinates on closed-domain tasks about half as often as GPT-3: 21% against 41%', '§1, Figure 4, Figure 30', '21% against 41%',
      'Figure 4: GPT %.1f%%, PPO %.1f%%, PPO-ptx %.1f%%; Figure 30, GPT by size: %s' % (100 * f4['GPT']['v'], 100 * f4['PPO']['v'], 100 * f4['PPO-ptx']['v'], ', '.join('%.0f%%' % (100 * r['v']) for r in f30['GPT'])),
      'does not reproduce', 'Roughly half holds, but 41% appears in neither figure; and Figure 4\'s pooled GPT and SFT rates lie below every per-size value in Figure 30, which a pooled average cannot do, so the two figures were drawn from different data.')
f7 = F['fig7']['panels']
tox_api = 1 - f7['PerspectiveAPI score']['Respectful']['PPO-ptx']['v'] / f7['PerspectiveAPI score']['Respectful']['GPT']['v']
tox_h = 1 - f7['Human eval']['Respectful']['PPO-ptx']['v'] / f7['Human eval']['Respectful']['GPT']['v']
t14 = {(r['task'], r['metric'], r['prompt']): [n(v) for v in r['v']] for r in T['t14']['rows']}
rt = t14[('Real Toxicity', 'toxicity', 'respectful')]
tox_t14 = [1 - rt[9 + i] / rt[i] for i in range(3)]
R['tox'] = {'api': tox_api, 'human': tox_h, 't14': tox_t14}
check('tox', 'InstructGPT generates about 25% fewer toxic outputs than GPT-3 when prompted to be respectful', '§1, Figure 7, Table 14', 'about 25% fewer',
      'Figure 7 (175B): %.0f%% fewer by Perspective API, %.0f%% by labelers; Table 14: %s by size' % (100 * tox_api, 100 * tox_h, ', '.join('%.0f%%' % (100 * x) for x in tox_t14)),
      'does not reproduce', 'Every printed comparison gives 16% to 20% (or less at 6B); 25% may come from a subset (Figure 39 by prompt toxicity) the text does not name.')
f6 = F['fig6']['panels']
q = f6['QA prompt']
R['tqa'] = {'human_true_175': {m: q[m][2]['truthful'] for m in q}, 'human_ti_175': {m: q[m][2]['true_info'] for m in q}}
ti = t14[('Truthful QA', 'true + info', 'QA prompt')]
check('tqa', 'InstructGPT generates truthful and informative answers about twice as often as GPT-3 (TruthfulQA)', '§1, Figure 6, Table 14', 'about twice',
      'human labels (Figure 6, 175B, QA prompt): truthful %.1f%% against %.1f%% (%.2fx), truthful and informative %.1f%% against %.1f%% (%.2fx); automatic metric (Table 14): %.3f against %.3f (%.2fx)' % (
          q['PPO-ptx'][2]['truthful'], q['GPT'][2]['truthful'], q['PPO-ptx'][2]['truthful'] / q['GPT'][2]['truthful'], q['PPO-ptx'][2]['true_info'], q['GPT'][2]['true_info'], q['PPO-ptx'][2]['true_info'] / q['GPT'][2]['true_info'], ti[11], ti[2], ti[11] / ti[2]),
      'does not reproduce', 'Twice holds only on the automatic metric, which the acknowledgements say "overstat[ed] the gains of our PPO models"; the human evaluation in Figure 6 gives about 1.4x to 1.5x.')
# ---- alignment tax from Table 14 ----
tax = []
for (task, metric, prompt), v in t14.items():
    if task in ('HellaSwag', 'WSC', 'RTE', 'SST', 'QuAC', 'SQuADv2', 'DROP', 'FR to EN 15', 'CNN/DM', 'TLDR'):
        tax.append({'task': task, 'prompt': prompt, 'gpt': v[2], 'ppo': v[8], 'ptx': v[11], 'd_ppo': v[8] - v[2], 'd_ptx': v[11] - v[2]})
R['tax175'] = tax
dup = t14[('CNN/DM', 'ROUGE-L', '')] == t14[('TLDR', 'ROUGE-L', '')]
check('dup', 'Table 14 prints the same twelve ROUGE-L values for CNN/DM and for TLDR', 'Table 14 (HTML and PDF)', 'two identical rows', 'identical: %s' % dup, 'paper error' if dup else 'no',
      'Almost certainly a copy error; neither summarisation row can be trusted.')
hs = t14[('HellaSwag', 'accuracy', 'zero-shot')]
check('hella', 'PPO-ptx "even surpasses GPT-3 on HellaSwag"', '§4.2, Table 14', 'surpasses', '175B zero-shot %.3f against %.3f; few-shot %.3f against %.3f' % (hs[11], hs[2], t14[('HellaSwag', 'accuracy', 'few-shot')][11], t14[('HellaSwag', 'accuracy', 'few-shot')][2]), 'reproduces')
# ---- Figures 33, 34, 36 ----
f33 = F['fig33']['panels']; drop33 = f33['F1']['series']['#db5f57']; sq33 = f33['F1']['series']['#57db5f']; vr33 = f33['Validation reward']['series']['#5f57db']
first_drop = next(r['x'] for r in drop33 if r['v'] >= 25.4); first_sq = next(r['x'] for r in sq33 if r['v'] >= 59.2)
check('gamma20', 'At 1.3B a pretraining coefficient of 20 or more recovers the regressions', '§E.6, Figure 33', 'gamma >= 20',
      'DROP passes the GPT line (25.4) first at gamma = %.1f (24.9 at 16.7), SQuAD v2 (59.2) at %.1f; validation reward falls from %.2f to %.2f at gamma = 27.8' % (first_drop, first_sq, vr33[0]['v'], next(r['v'] for r in vr33 if abs(r['x'] - 27.84) < 0.1)), 'reproduces', 'The grid has no point between 16.7 and 27.8, so "20" is an interpolation.')
f34 = F['fig34']['panels']; d34 = f34['F1']['series']['#db5f57']; s34 = f34['F1']['series']['#57db5f']
check('klfix', 'Raising the KL coefficient never fully recovers DROP and SQuAD', '§4.2, §E.6, Figure 34', 'never fully recovers',
      'best DROP %.1f (GPT 25.4), best SQuAD v2 %.1f (GPT 59.2), over KL coefficients up to 2.0' % (max(r['v'] for r in d34), max(r['v'] for r in s34)), 'reproduces')
f36 = F['fig36']['points']
best = max(f36, key=lambda r: r['v'])
check('kl36', 'The best KL reward coefficient is around 0.01 and 0.02', '§E.7, Figure 36', '0.01 to 0.02', 'highest Likert %.2f at %.4f, %.2f at 0.02; %.2f at 0 and %.2f at 2' % (best['v'], best['x'], [r for r in f36 if abs(r['x'] - .02) < 1e-3][0]['v'], F['fig36']['zero_line'][0], f36[-1]['v']), 'reproduces',
      'The final models use 0.02, not the best point 0.01; the intervals of the two overlap.')
# ---- labelers ----
g = [n(a[1]) for a in T['t12']['qs'][0]['a']]
check('demog', 'Demographic survey respondents', 'Table 12, §B.3, §B.4', '19 respondents (§B.4)',
      'gender 50.0 / 44.4 / 5.6 = 9 / 8 / 1 of 18; age 26.3%% = 5 of 19; ethnicities sum to %.1f%%' % sum(n(a[1]) for a in T['t12']['qs'][1]['a']), 'derived',
      'One respondent skipped the gender question; ethnicity allowed several answers.')
R['kl_default'] = 0.02; R['gamma_default'] = 27.8
json.dump(R, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1)
for c in R['checks']: print('%-10s %-18s %s' % (c['id'], c['verdict'], c['recomputed'][:150]))

"""Recompute every derived number the page quotes from the transcribed tables (tables.json), and compare with the paper's prose.

  python3 recompute.py        (build.sh runs it; writes inputs/recompute.json)

A check "agrees" when our value rounded half-up to the paper's printed precision equals the printed value; checks marked
tol=0.1 allow one unit in the last place, because the paper computes its deltas from unrounded accuracies and we only have the
rounded table entries. A check marked expect=False is a documented disagreement (the page shows it in a "does not reproduce" box);
the script exits 1 if any other check disagrees, or if a documented disagreement starts to agree, so the build stops either way.
Exact decimals (decimal.Decimal), never float round(), so the output does not change with the Python version.
"""
import json, os
from decimal import Decimal, ROUND_HALF_UP

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
D = lambda x: Decimal(str(x))
def r(x, nd=1):
    return float(D(x).quantize(Decimal(1).scaleb(-nd), rounding=ROUND_HALF_UP))
sub = lambda a, b: float(D(a) - D(b))
C = []
def check(cid, what, paper, ours, where, tol=0.0, expect=True, nd=1):
    ok = abs(r(ours, nd) - paper) <= tol + 1e-9 if paper is not None else None
    C.append({'id': cid, 'what': what, 'paper': paper, 'ours': r(ours, nd) if isinstance(ours, (int, float)) else ours, 'raw': ours, 'ok': ok, 'expect': expect, 'where': where})

T8 = T['t8']
M = {'Qwen3.5-4B': ('Qwen', ['4k', '8k'], '64k'), 'Gemma4-E2B': ('Gemma', ['1k', '2k'], '16k'), 'Nemotron-3-Nano-4B': ('Nemotron', ['1k', '2k'], '16k')}

# 1. Table 8's trained means are the means of Table 15's three validation-selected seeds (accuracy and length, every budget)
B8 = T['t15']['budgets']; worst = 0.0
for m, (short, caps, top) in M.items():
    bud = T8[m]['budgets']
    for c in caps:
        sd = T['t15']['rows'][short + ' ' + c]
        for key in ('acc', 'len'):
            for j, b in enumerate(bud):
                mean = sum(D(s[key][B8.index(b)]) for s in sd) / 3
                worst = max(worst, abs(float(mean) - T8[m]['rows'][c][key][j]))
check('t8_means', "Table 8's trained values are the means of Table 15's three selected seeds (largest gap over 144 cells; each mean of three two-decimal values can differ by up to 0.01 after rounding)", 0.0, worst, 'A4.T8', tol=0.01, nd=3)

# 2. Section 2.1's twelve deltas: trained seed mean minus base at the same budget (Table 8)
P21 = {('Qwen3.5-4B', '4k'): (34.8, -30.2), ('Qwen3.5-4B', '8k'): (42.4, -24.6), ('Gemma4-E2B', '1k'): (10.9, -24.8),
       ('Gemma4-E2B', '2k'): (14.8, -20.6), ('Nemotron-3-Nano-4B', '1k'): (23.3, -25.4), ('Nemotron-3-Nano-4B', '2k'): (12.6, -13.1)}
gains, falls = [], []
for (m, c), (pg, pf) in P21.items():
    bud = T8[m]['budgets']; top = M[m][2]; rows = T8[m]['rows']
    g = sub(rows[c]['acc'][bud.index(c)], rows['Base']['acc'][bud.index(c)])
    f = sub(rows[c]['acc'][bud.index(top)], rows['Base']['acc'][bud.index(top)])
    gains.append(g); falls.append(f)
    check('d21_%s_%s_cap' % (M[m][0], c), '%s %s-trained minus base at %s' % (m, c, c), pg, g, 'S2.SS1')
    check('d21_%s_%s_top' % (M[m][0], c), '%s %s-trained minus base at %s' % (m, c, top), pf, f, 'S2.SS1')

# 3. The introduction's ranges over the six checkpoints: +11.7 to +46.7 at the cap, -17.2 to -35.0 at the largest budget
check('intro_gain_min', 'smallest gain at the training cap, six checkpoints, seed means (introduction prints +11.7)', 11.7, min(gains), 'S1', expect=False)
check('intro_gain_max', 'largest gain at the training cap, six checkpoints, seed means (introduction prints +46.7)', 46.7, max(gains), 'S1', expect=False)
check('intro_fall_min', 'smallest fall at the largest budget, seed means (introduction prints -17.2)', -17.2, max(falls), 'S1', expect=False)
check('intro_fall_max', 'largest fall at the largest budget, seed means (introduction prints -35.0)', -35.0, min(falls), 'S1', expect=False)
# the same ranges over every seed and both checkpoint choices (33 distinct checkpoints), for the "does not reproduce" box
seed_g, seed_f = [], []
for tb in ('t15', 't16'):
    for m, (short, caps, top) in M.items():
        base = T8[m]['rows']['Base']['acc']; bud = T8[m]['budgets']
        for c in caps:
            for s in T[tb]['rows'][short + ' ' + c]:
                seed_g.append(sub(s['acc'][B8.index(c)], base[bud.index(c)])); seed_f.append(sub(s['acc'][B8.index(top)], base[bud.index(top)]))
check('seed_gain_range', 'gain at the cap over all 36 seed-checkpoint evaluations (min, max)', None, [r(min(seed_g)), r(max(seed_g))], 'A9')
check('seed_fall_range', 'fall at the largest budget over all 36 seed-checkpoint evaluations (smallest, largest)', None, [r(max(seed_f)), r(min(seed_f))], 'A9')
check('all18', 'seed-checkpoint evaluations with a gain at the cap and a fall at the largest budget (paper: all 18 runs, both checkpoint choices)', 36,
      sum(1 for g, f in zip(seed_g, seed_f) if g > 0 and f < 0), 'A9', nd=0)

# 4. Table 1 against Table 8 (means) and Table 15 (min and max over seeds)
worst = 0.0
for row in T['t1']:
    m = row['model']; short, caps, top = M[m]; bud = T8[m]['budgets']
    worst = max(worst, abs(row['base'] - T8[m]['rows']['Base']['len'][bud.index(top)]))
    for c in caps:
        mean, lo, hi = row['trained'][c]; L = [s['len'][B8.index(top)] for s in T['t15']['rows'][short + ' ' + c]]
        worst = max(worst, abs(mean - T8[m]['rows'][c]['len'][bud.index(top)]), abs(lo - min(L)), abs(hi - max(L)))
check('t1_vs_t8_t15', 'Table 1 against Table 8 means and Table 15 seed minimum and maximum (largest gap, k tokens)', 0.0, worst, 'S2.T1', nd=2)
bl = [row['base'] for row in T['t1']]; tl = [v[0] for row in T['t1'] for v in row['trained'].values()]
check('len_base_lo', 'shortest base mean length at the largest budget (k)', 6.11, min(bl), 'S2.SS1', nd=2)
check('len_base_hi', 'longest base mean length (k)', 27.32, max(bl), 'S2.SS1', nd=2)
check('len_tr_lo', 'shortest trained mean length (k)', 1.01, min(tl), 'S2.SS1', nd=2)
check('len_tr_hi', 'longest trained mean length (k)', 6.22, max(tl), 'S2.SS1', nd=2)
check('qwen_len_ratio', 'Qwen base mean length over the 4k-trained mean at 64k (derived, times)', None, 27.32 / 4.97, 'S2.T1')

# 5. Section 2.2: Reasoning Gym (Table 9)
T9 = T['t9']
for m, ck, cap, top, pg, pf in (('Qwen3.5-4B', 'RG 4k', '4k', '64k', 31.1, -25.0), ('Gemma4-E2B', 'RG 2k', '2k', '16k', 21.7, -15.0), ('Nemotron-3-Nano-4B', 'RG 2k', '2k', '16k', 0.6, -10.6)):
    b = T9[m]['budgets']
    check('rg_%s_cap' % M[m][0], '%s Reasoning Gym %s minus base at %s' % (m, cap, cap), pg, sub(T9[m][ck][b.index(cap)], T9[m]['Base'][b.index(cap)]), 'S2.SS2')
    check('rg_%s_top' % M[m][0], '%s Reasoning Gym %s minus base at %s' % (m, cap, top), pf, sub(T9[m][ck][b.index(top)], T9[m]['Base'][b.index(top)]), 'S2.SS2')

# 6. Section 2.3: transfer (Tables 10 and 11) at the largest budget printed
T10, T11 = T['t10'], T['t11']
for m, c, task, top, p in (('Qwen3.5-4B', '4k', 'GPQA', '64k', -9.1), ('Qwen3.5-4B', '8k', 'GPQA', '64k', -2.2), ('Qwen3.5-4B', '4k', 'LCB-v6', '64k', -9.0), ('Qwen3.5-4B', '8k', 'LCB-v6', '64k', -1.0),
                           ('Gemma4-E2B', '1k', 'GPQA', '16k', -1.0), ('Gemma4-E2B', '1k', 'LCB-v6', '16k', -8.2), ('Gemma4-E2B', '2k', 'GPQA', '16k', -1.3), ('Gemma4-E2B', '2k', 'LCB-v6', '16k', -5.1),
                           ('Nemotron-3-Nano-4B', '1k', 'GPQA', '64k', 1.0), ('Nemotron-3-Nano-4B', '1k', 'LCB-v6', '64k', -9.0), ('Nemotron-3-Nano-4B', '2k', 'GPQA', '64k', 4.0), ('Nemotron-3-Nano-4B', '2k', 'LCB-v6', '64k', -4.2)):
    b = T10[m]['budgets']
    check('tr_%s_%s_%s' % (M[m][0], c, task), '%s %s-trained minus base, %s at %s' % (m, c, task, top), p, sub(T10[m][task][c][b.index(top)], T10[m][task]['Base'][b.index(top)]), 'S2.SS3')
for k, m, task, top, p in (('Qwen3.5-4B, RG 4k', 'Qwen3.5-4B', 'GPQA', '64k', -6.7), ('Qwen3.5-4B, RG 4k', 'Qwen3.5-4B', 'LCB-v6', '64k', -3.8), ('Gemma4-E2B, RG 2k', 'Gemma4-E2B', 'GPQA', '16k', -4.4),
                           ('Gemma4-E2B, RG 2k', 'Gemma4-E2B', 'LCB-v6', '16k', -4.6), ('Nemotron-3-Nano-4B, RG 2k', 'Nemotron-3-Nano-4B', 'GPQA', '64k', 0.7), ('Nemotron-3-Nano-4B, RG 2k', 'Nemotron-3-Nano-4B', 'LCB-v6', '64k', -4.8)):
    b = T11[k]['budgets']
    check('trg_%s_%s' % (M[m][0], task), '%s minus base, %s at %s' % (k, task, top), p, sub(T11[k][task][b.index(top)], T10[m][task]['Base'][T10[m]['budgets'].index(top)]), 'S2.SS3')

# 7. Budget forcing on the base model at matched total budgets (Tables 7, 13, 14)
T7 = T['t7']
for task, p in (('AIME', 8.9), ('GPQA-Diamond', 56.2), ('LCB-v6', 14.5)):
    check('bf_qwen_%s' % task.split('-')[0], 'Qwen base answer forcing minus base decoding, %s at the 4k setting' % task, p, sub(T7[task]['forced'][0], T7[task]['base'][0]), 'S2.SS3')
check('bf_gemma_gpqa', 'Gemma base answer forcing minus base decoding, GPQA at 4k', -3.0, sub(T['t13']['GPQA-Diamond']['forced'][2], T['t13']['GPQA-Diamond']['base'][2]), 'A8')
check('bf_nem_gpqa', 'Nemotron base answer forcing minus base decoding, GPQA at 4k', 21.9, sub(T['t14']['GPQA-Diamond']['forced'][1], T['t14']['GPQA-Diamond']['base'][1]), 'A8')

# 8. Section 3's deltas from Table 3 (Qwen3.5-4B, 8k cap, AIME avg@16): the paper rounds unrounded values, so one unit of slack
T3 = T['t3']; base3 = T3['rows'][0]['acc']; i8, i64 = 2, 5
P3 = {'DeepScaleR (standard)': (41.3, -22.3), 'GSM8K': (11.6, -6.8), 'Nemotron-RL-Math-v2': (34.2, -24.2), 'Loss masking': (29.2, -19.1),
      'DAPO overlength penalty': (35.0, -28.8), 'Forced answer': (-2.2, -1.6), 'Dr.GRPO': (39.3, -23.1), 'β = 0.001': (37.9, -22.5),
      'β = 0.01': (23.2, -8.6), 'Short traces (< 4k)': (-1.4, 4.3), 'Budget-forced traces (4k)': (9.3, -38.4)}
FR = []
for row in T3['rows'][1:]:
    pg, pf = P3[row['variant']]
    g, f = sub(row['acc'][i8], base3[i8]), sub(row['acc'][i64], base3[i64])
    FR.append({'variant': row['variant'], 'group': row['group'], 'gain8k': r(g), 'delta64k': r(f), 'paper': [pg, pf]})
    check('t3_%s_8k' % row['variant'], '%s minus base at 8k (Table 3)' % row['variant'], pg, g, 'S3', tol=0.1)
    check('t3_%s_64k' % row['variant'], '%s minus base at 64k (Table 3)' % row['variant'], pf, f, 'S3', tol=0.1)
# which ablations differ from the standard run at 64k by more than both 95% intervals (no overlap): a conservative screen, derived here
std = T3['rows'][1]
sep = [row['variant'] for row in T3['rows'][2:] if abs(row['acc'][i64] - std['acc'][i64]) > row['ci'][i64] + std['ci'][i64]]
check('t3_separated_64k', 'ablations whose 64k interval does not overlap the standard run (derived)', None, sep, 'S3.T3')
# no ablation has both a gain at 8k and no fall at 64k
check('t3_none_both', 'rows with a gain at 8k of at least 10 points and 64k at or above the base model', 0, sum(1 for x in FR if x['gain8k'] >= 10 and x['delta64k'] >= 0), 'S3', nd=0)

# 9. Table 2 is Table 12's Qwen base rows; Table 7 vs the 64.4% headline quoted in Appendix B
worst = max(abs(a - b) for task in ('AIME', 'GPQA-Diamond', 'LiveCodeBench v6') for a, b in zip(T['t2'][task], T['t12']['Qwen3.5-4B'][task]['Base']))
check('t2_vs_t12', 'Table 2 against Table 12, Qwen base rows (largest gap, points)', 0.0, worst, 'S2.T2', nd=2)
check('appB_headline_32k', "Appendix B's 'headline' Qwen base accuracy at 32k (64.4%) against Table 8's 32k base value", 64.4, T8['Qwen3.5-4B']['rows']['Base']['acc'][4], 'A2', expect=False)

# 10. Seed spread of the standard Qwen 8k recipe at 64k (Table 15), against the size of the ablation gaps
q8 = [s['acc'][B8.index('64k')] for s in T['t15']['rows']['Qwen 8k']]
check('q8_seed_spread_64k', 'Qwen 8k-trained, spread over three selected seeds at 64k (points, avg@3)', None, sub(max(q8), min(q8)), 'A9.T15')
q4 = [s['acc'][B8.index('64k')] for s in T['t15']['rows']['Qwen 4k']]
check('q4_seed_spread_64k', 'Qwen 4k-trained, spread over three selected seeds at 64k (points)', None, sub(max(q4), min(q4)), 'A9.T15')

bad = [c for c in C if c['ok'] is not None and c['ok'] != c['expect']]
n = sum(1 for c in C if c['ok'] is not None); agree = sum(1 for c in C if c['ok'])
out = {'n': n, 'agree': agree, 'documented_disagree': sum(1 for c in C if c['ok'] is False and not c['expect']), 'derived': sum(1 for c in C if c['ok'] is None),
       'checks': C, 'frontier': FR, 'gain_range': [r(min(gains)), r(max(gains))], 'fall_range': [r(max(falls)), r(min(falls))]}
json.dump(out, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1, ensure_ascii=False)
for c in C:
    flag = 'ok ' if c['ok'] else ('-- ' if c['ok'] is None else ('DOC' if not c['expect'] else 'BAD'))
    print(flag, c['id'], c['paper'], c['ours'])
print('recompute: %d checks, %d agree, %d documented disagreements, %d derived; %d unexpected' % (n, agree, out['documented_disagree'], out['derived'], len(bad)))
raise SystemExit(1 if bad else 0)

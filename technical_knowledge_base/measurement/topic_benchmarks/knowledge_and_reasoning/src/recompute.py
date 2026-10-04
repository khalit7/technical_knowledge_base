"""Every derived number on the page, recomputed from inputs/ and tables.py, with checks against the published figures.
Writes inputs/recompute.json (read by mk_data.py and check_ui.mjs). Run: python3 recompute.py"""
import json, math
from tables import REDUX_T2, REDUX_T2_SUBJECTS, HLEV_T2, HLEV_PROSE_FULL, HLEV_SPLIT, SQA_T3, MMLUPRO_T3, HLE_TOOLS, HLED

R, checks = {}, []


def chk(name, got, want, tol=0.051):
    ok = abs(got - want) <= tol
    checks.append((name, round(got, 4), want, ok))
    return got


# ---- MMLU-Redux 2.0 counts (inputs/redux_all.json) ----
rx = json.load(open('inputs/redux_all.json'))
sizes = json.load(open('inputs/mmlu_test_sizes.json'))['test_n']
n = rx['n']; flagged = n - rx['types']['ok']
R['redux_n'] = n; R['redux_flagged'] = flagged
chk('MMLU-Redux error rate 6.49% (paper)', 100 * flagged / n, 6.49, 0.005)
R['redux_types'] = rx['types']
R['redux_wrong_gt_pct'] = round(100 * rx['types']['wrong_groundtruth'] / n, 2)
vir = rx['subjects']['virology']
chk('Virology 57% flawed (paper)', 100 - vir['ok'], 57, 0)
chk('Virology wrong ground truth 33% (paper Fig. 3)', vir['wrong_groundtruth'], 33, 0)
# stratified estimate weighting each subject by its MMLU test size
strat = sum((s['n'] - s.get('ok', 0)) / s['n'] * sizes[k] for k, s in rx['subjects'].items()) / sum(sizes.values())
R['redux_strat_pct'] = round(100 * strat, 2)
chk('MMLU test questions 14,042 (released files)', sum(sizes.values()), 14042, 0)

# ---- MMLU-Redux Table 2: rank changes ----
moves = []
for m, rows in REDUX_T2.items():
    for subj, (a, ra, c, rc) in zip(REDUX_T2_SUBJECTS, rows):
        moves.append((subj, m, ra, rc, round(100 * (c - a))))
R['redux_t2_biggest_moves'] = sorted(moves, key=lambda x: -abs(x[2] - x[3]))[:4]
chk('Llama 3.1 405B Virology rank 16 to 1 (paper text)', REDUX_T2['Llama 3.1 Instruct Turbo (405B)'][0][1] - REDUX_T2['Llama 3.1 Instruct Turbo (405B)'][0][3], 15, 0)
chk('GPT-4 (0613) Human Sexuality 0.91 to 0.43 (paper text)', REDUX_T2['GPT-4 (0613)'][4][2], 0.43, 0)

# ---- HLE-Verified Table 2 ----
hv = {}
for m, (fr, fcr, fv, fcv, sr, scr, sv, scv) in HLEV_T2.items():
    hv[m] = {'full_gain': round(fv - fr, 2), 'sub_gain': round(sv - sr, 2), 'share': round((fv - fr) / (sv - sr), 3),
             'prose_full_gain': HLEV_PROSE_FULL[m]}
R['hlev'] = hv
gains = [v['full_gain'] for v in hv.values()]; subg = [v['sub_gain'] for v in hv.values()]
R['hlev_full_gain_range'] = [min(gains), max(gains)]; R['hlev_sub_gain_range'] = [min(subg), max(subg)]
R['hlev_prose_mismatch'] = sorted(m for m, v in hv.items() if abs(v['full_gain'] - v['prose_full_gain']) > 0.05)
R['hlev_share_range'] = [min(v['share'] for v in hv.values()), max(v['share'] for v in hv.values())]
chk('HLE-Verified split sums to 2,500', sum(HLEV_SPLIT.values()), 2500, 0)
chk('HLE-Verified "30-40 point" subset gains: min', min(subg), 29.94, 0.001)
chk('HLE-Verified "30-40 point" subset gains: max', max(subg), 39.58, 0.001)
raw_rank = sorted(HLEV_T2, key=lambda m: -HLEV_T2[m][4]); ver_rank = sorted(HLEV_T2, key=lambda m: -HLEV_T2[m][6])
R['hlev_sub_rank_raw'] = raw_rank; R['hlev_sub_rank_ver'] = ver_rank

# ---- HLE construction ----
R['hle_pass_llm_filter_pct'] = round(100 * 13000 / 70000, 1)
R['hle_final_of_reviewed_pct'] = round(100 * 2500 / 13000, 1)
chk('FutureHouse shares sum to about 100%', 29.3 + 51.3 + 19.3, 100, 0.2)

# ---- HLE tools ----
R['hle_tools'] = [(m, a, b, round(b - a, 1), s) for m, a, b, s, *_ in HLE_TOOLS]
chk('Opus 5.5 tools +3.3 (root correction)', 67.7 - 64.4, 3.3, 0.001)
chk('Opus 5 tools +7.0 (root correction)', 63.6 - 56.6, 7.0, 0.001)
d = [round(b - a, 1) for m, a, b, s, *_ in HLE_TOOLS if s.startswith('HLE-Diamond')]
R['hle_diamond_tools_range'] = [min(d), max(d)]
for m, o, r_, k in HLED:
    chk('HLE-Diamond overall = mean of halves: ' + m, (r_ + k) / 2, o, 0.051)

# ---- GPQA ----
def se(p, n): return math.sqrt(p * (1 - p) / n)
R['gpqa_ci95_at_90'] = round(196 * se(0.9, 198), 2)
R['gpqa_ci95_at_96'] = round(196 * se(0.96, 198), 2)
R['gpqa_gap95_at_90'] = round(196 * math.sqrt(2) * se(0.9, 198), 2)
chk('Root: GPQA +/-4.2 at 90%', R['gpqa_ci95_at_90'], 4.2, 0.05)
R['gpqa_funnel'] = [564, 546, 448, 198]
chk('GPQA: 564 collected minus 18 held out = 546', 564 - 18, 546, 0)
R['gpqa_one_q_pts'] = round(100 / 198, 2)

# ---- SimpleQA F-score: F = 2C / (2C + 2I + N) ----
for m, (c, na, i, cga, f) in SQA_T3.items():
    chk('SimpleQA F-score ' + m, 2 * c / (2 * c + 2 * i + na) * 100, f, 0.15)
    if m != 'GPT-4o':  # the table prints 38.0 for GPT-4o; 38.2 / (38.2 + 60.8) = 38.6, and its F-score 38.4 needs 38.6
        chk('SimpleQA correct|attempted ' + m, 100 * c / (c + i), cga, 0.15)
R['sqa_gpt4o_cga_derived'] = round(100 * SQA_T3['GPT-4o'][0] / (SQA_T3['GPT-4o'][0] + SQA_T3['GPT-4o'][2]), 1)
# guessing pays whenever P(right) > C/D = F/2 (exact: E[F|guess] = (2C+2p)/(D+1) vs 2C/D)
R['sqa_guess_threshold_gpt4o'] = round(SQA_T3['GPT-4o'][4] / 2, 1)
R['sqa_guess_threshold_c35'] = round(SQA_T3['Claude 3.5 Sonnet'][4] / 2, 1)

# ---- MMLU-Pro CoT minus direct ----
R['mmlupro_cot_gain'] = {m: (round(a - b, 1), round(c - d_, 1)) for m, (a, b, c, d_) in MMLUPRO_T3.items()}
chk('MMLU-Pro: GPT-4o CoT gain 19.1', R['mmlupro_cot_gain']['GPT-4o'][1], 19.1, 0.001)

# ---- ARC ----
R['arc2_human_pair_rate'] = round(100 * 8277 / 13405, 1)
chk('ARC-AGI-2 humans: 8,277 of 13,405 = 62%', R['arc2_human_pair_rate'], 62, 0.5)
# RHAE examples from the technical report
chk('RHAE: human 10, AI 100 actions = 1%', min(1.15, (10 / 100) ** 2) * 100, 1, 1e-9)
R['rhae_weights_5'] = [l / 15 for l in range(1, 6)]
same = json.load(open('../../src/data/same.json'))
astra = next(c for c in same['cases'] if c['id'] == 'arc_astra')
eff = {}
for r_ in astra['readings']:
    h = 'std' if r_['lab'].startswith('Standard') else 'ad'
    eff.setdefault(r_['effort'], {})[h] = (r_['v'], r_['cost'])
R['arc3_effort'] = eff
gaps = {e: round(v['ad'][0] - v['std'][0], 1) for e, v in eff.items()}
R['arc3_harness_gap'] = gaps
chk('ARC-AGI-3 equal-effort gap at max 35.9 (98.6-62.7)', gaps['max'], 35.9, 0.001)
chk('ARC-AGI-3 equal-effort gap at high 45.1 (99.9-54.8)', gaps['high'], 45.1, 0.001)

arc = {t['id']: t for t in json.load(open('inputs/arc_tasks.json'))}
t7 = arc['007bbfb7']
def ruleA(g): return [[g[r % 3][c % 3] if g[r // 3][c // 3] else 0 for c in range(9)] for r in range(9)]
def ruleB(g): return [[g[r // 3][c // 3] for c in range(9)] for r in range(9)]
for k, pr in enumerate(t7['train'] + t7['test']):
    chk('ARC rule A reproduces 007bbfb7 pair %d (81 of 81)' % k, sum(a == b for ra, rb in zip(ruleA(pr['input']), pr['output']) for a, b in zip(ra, rb)), 81, 0)
R['arc_ruleB_matches'] = [sum(a == b for ra, rb in zip(ruleB(pr['input']), pr['output']) for a, b in zip(ra, rb)) for pr in t7['train'] + t7['test']]
chk('ARC rule B on demo 1: 67 of 81 (shown on the page)', R['arc_ruleB_matches'][0], 67, 0)
# RHAE presets checked by check_ui.mjs
def rhae(h, a, d):
    cap = s_ = 0; stop = False
    for i, (hh, aa, dd) in enumerate(zip(h, a, d)):
        w = i + 1
        ok = dd and not stop and aa > 0
        if not dd: stop = True
        S = min(1.15, (hh / aa) ** 2) if ok else 0
        cap += w if ok else 0; s_ += w * S
    return 100 * min(cap, s_) / 15
H5 = [8, 12, 20, 25, 40]
chk('RHAE preset: twice the actions = 25%', rhae(H5, [2 * x for x in H5], [1] * 5), 25, 1e-9)
chk('RHAE preset: ten times on level 5 = 67.0%', rhae(H5, H5[:4] + [400], [1] * 5), 67.0, 1e-9)
chk('RHAE preset: stops after level 3 = 40%', rhae(H5, H5[:3] + [0, 0], [1, 1, 1, 0, 0]), 40, 1e-9)
chk('RHAE preset: faster than people capped at 100%', rhae(H5, [x / 2 for x in H5], [1] * 5), 100, 1e-9)

json.dump({'values': R, 'checks': checks}, open('inputs/recompute.json', 'w'), indent=1, default=str)
bad = [c for c in checks if not c[3]]
for c in checks:
    print(('OK  ' if c[3] else 'FAIL'), c[0], c[1], c[2])
print(len(checks) - len(bad), 'of', len(checks), 'checks pass')
print('stratified', R['redux_strat_pct'], 'wrong_gt', R['redux_wrong_gt_pct'], 'hlev share', R['hlev_share_range'], 'prose mismatch', R['hlev_prose_mismatch'])

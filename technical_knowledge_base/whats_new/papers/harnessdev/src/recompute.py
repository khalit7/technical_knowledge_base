"""Recompute every derived number on the HarnessDev page from tables.json (the paper's tables plus Figures 7
and 8 decoded by decode_figs.py), and check each against what the paper prints.

  python3 recompute.py      (build.sh runs it; writes inputs/recompute.json)

Each check is {id, what, ours, paper, ok, how}. "how" says whether the agreement is independent (recomputed
from different printed numbers) or by construction (the same numbers re-added).
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
C = []


def chk(id, what, ours, paper, how, tol=0.051, note=''):
    ok = (abs(ours - paper) <= tol) if isinstance(paper, (int, float)) and isinstance(ours, (int, float)) else ours == paper
    C.append({'id': id, 'what': what, 'ours': ours, 'paper': paper, 'ok': bool(ok), 'how': how, 'note': note})
    return ok


R = {}
# ---------- Creation (Tables 2 to 5) ----------
chk('n_inst', 'Unique downstream instances, 731 + 89 + 75 + 46 + 1,266', sum(r['tasks'] for r in T['T2']['rows']), 2207, 'independent: sum of Table 2 task counts against the abstract')
t3 = {r['row']: r for r in T['T3']['rows']}
t4 = {r['row']: r for r in T['T4']['rows']}
for name, tb in (('Self-Eval', t3), ('Unified-Eval', t4)):
    for k, r in tb.items():
        if r['avg'] is None or k == 'Seed harness': continue
        a = (r['swe'] + r['term'] + r['eq'] + r['bc']) / 4
        chk('avg_' + name + '_' + k, '%s Avg. of %s = mean(SWE-Pro, Terminal, EQ-Bench3, BrowseComp), MLE-bench left out' % (name, k), round(a, 2), r['avg'], 'independent: recomputed from the row; a 6-benchmark or 5-benchmark mean does not match', tol=0.051)
# Avg. would differ if MLE-bench were in it
R['avg_with_mle'] = {k: round((r['swe'] + r['term'] + r['eq'] + r['bc'] + r['mle']) / 5, 2) for k, r in t3.items() if r['avg'] is not None and r['mle'] is not None}
human = t3['Human reference']
R['human_ratio'] = {}
for k, r in t3.items():
    if k in ('Human reference', 'Seed harness'): continue
    R['human_ratio'][k] = {b: round(100 * r[b] / human[b], 1) for b in ('swe', 'term', 'mle', 'eq', 'bc')}
R['transfer'] = {k: {b: round(t4[k][b] - t3[k][b], 1) for b in ('swe', 'term', 'mle', 'eq', 'bc')} for k in t4 if k not in ('Seed harness',)}
chk('qwen_bc', 'Qwen BrowseComp gain under the Gemini executor, Table 4 minus Table 3', R['transfer']['Qwen 3.7 Max']['bc'], 17.6, 'independent: difference of two printed cells against the text of §4.2')
chk('qwen_mle', 'Qwen MLE-bench gain under the Gemini executor', R['transfer']['Qwen 3.7 Max']['mle'], 12.9, 'independent: difference of two printed cells against §4.2')
mt = [r['mle_tok'] for k, r in t3.items() if k not in ('Human reference', 'Seed harness')]
chk('mle_fold', 'MLE-bench token spread under Self-Eval, max over min (Seed 557.1M over GPT-5.5 29.3M)', round(max(mt) / min(mt), 1), 19.0, 'independent: the text says "about nineteen-fold"', tol=0.5)
chk('loc_total', 'Net lines added by the 18 Code artifacts (Table 5 total)', sum(r['loc'] for r in T['T5']['rows']), 17111, 'independent: Table 5 sum against §4.2 text')
chk('cells', 'MLE-bench physical cells: 6 creators x 3 harnesses x 2 executors, Gemini counted once', 6 * 3 * 2 - 3, 33, 'independent: from the protocol against the Table 3 caption')
chk('results', 'MLE-bench results: 33 cells x 75 tasks', 33 * 75, 2475, 'independent: Table 2 task count times cells against the Table 3 caption')
chk('mech', 'Code component instances: 72 trigger + 18 partial + 18 never', 72 + 18 + 18, 108, 'by construction: the parts printed in §4.2')
chk('funcs', 'New functions or classes: 113 reachable + 31 via dead code + 25 no caller', 113 + 31 + 25, 169, 'by construction: the parts printed in §4.3')
chk('sw_cats', 'Switch outcomes: 8 + 16 + 3 + 7 + 27 + 2 + 1', 8 + 16 + 3 + 7 + 27 + 2 + 1, 64, 'by construction: the categories printed in §4.3')
R['degenerate_share'] = round(100 * 441 / 2325, 1)
# ---------- Evolution (Tables 6, 7, Figures 7, 8 decoded) ----------
t6 = {(r['setting'], r['creator']): r for r in T['T6']['rows']}
L = T['lineages']['rows']
chk('versions', 'Official versions across the nine lineages (decoded from Figure 7)', sum(len(l['swe100']) for l in L), 73, 'independent: points counted in the vector figure against §4.3')
chk('switches', 'Adjacent version switches (decoded)', sum(len(l['swe100']) - 1 for l in L), 64, 'independent: decoded points against §4.3')
chk('switches_t7', 'Switches summed over Table 7', sum(r['switches'] for r in T['T7']['rows']), 64, 'independent: Table 7 against §4.3')
pair = lambda l, i: (l['swe100'][i] + 100 * l['term89'][i] / 89) / 2  # Eq. 2, in percent
hop = lambda l, i: 100 * l['ho630'][i] / 630
LN = []
for l in L:
    k = (l['setting'], l['creator'])
    n = len(l['swe100']); d = l['declared']
    P = [pair(l, i) for i in range(n)]; HO = [hop(l, i) for i in range(n)]
    r6 = t6[k]
    chk('fb0_' + '_'.join(k), '%s %s feedback pair at H0 (Eq. 2 on decoded SWE-100 and Terminal-89)' % k, round(P[0], 1), r6['fb0'], 'independent: decoded figure against Table 6', tol=0.051)
    chk('fbd_' + '_'.join(k), '%s %s feedback pair at the declared version' % k, round(P[d], 1), r6['fbd'], 'independent: decoded figure against Table 6', tol=0.051)
    chk('ho0_' + '_'.join(k), '%s %s held-out-630 at H0' % k, round(HO[0], 2), r6['ho0'], 'independent: decoded figure against Table 6', tol=0.006)
    chk('hod_' + '_'.join(k), '%s %s held-out-630 at the declared version' % k, round(HO[d], 2), r6['hod'], 'independent: decoded figure against Table 6', tol=0.006)
    chk('gap_' + '_'.join(k), '%s %s final gap: best held-out minus declared' % k, round(max(HO) - HO[d], 2), r6['gap'], 'independent: decoded figure against Table 6', tol=0.006)
    best_fb = max(range(n), key=lambda i: P[i]); best_ho = max(range(n), key=lambda i: HO[i])
    LN.append({'setting': l['setting'], 'creator': l['creator'], 'n': n, 'declared': d, 'best_fb': best_fb, 'best_ho': best_ho,
               'pair': [round(x, 2) for x in P], 'ho': [round(x, 2) for x in HO], 'swe100': l['swe100'], 'term89': l['term89'], 'ho630': l['ho630'],
               'fb_gain': round(P[d] - P[0], 2), 'ho_gain': round(HO[d] - HO[0], 2), 'beyond_noise': abs(P[d] - P[0]) > 4.75})
R['lineages'] = LN
chk('ho_opt', 'Declared versions that are also the best held-out version', sum(1 for x in LN if x['declared'] == x['best_ho']), 2, 'independent: decoded figure against §4.3 ("2/9")')
self_g = [x['ho_gain'] for x in LN if x['setting'] == 'Self']
chk('self_mean', 'Mean held-out gain of the five self-runtime declarations', round(sum(self_g) / 5, 2), 3.11, 'independent: decoded figure against §4.3', tol=0.006)
# direction agreement over the 64 switches
same_pair = same_swe = 0; both_reg = 0; ties = 0
for l in L:
    for i in range(len(l['swe100']) - 1):
        dp = pair(l, i + 1) - pair(l, i); dh = l['ho630'][i + 1] - l['ho630'][i]
        ds = l['swe100'][i + 1] - l['swe100'][i]
        same_pair += (dp > 0 and dh > 0) or (dp < 0 and dh < 0)
        same_swe += (ds > 0 and dh > 0) or (ds < 0 and dh < 0)
        both_reg += (l['swe100'][i + 1] < l['swe100'][i] and l['term89'][i + 1] < l['term89'][i])
        ties += (dp == 0 or dh == 0)
R['same_dir_pair'] = same_pair; R['same_dir_swe'] = same_swe; R['both_regress_raw'] = both_reg
chk('same_dir', 'Switches where the feedback pair and held-out-630 move the same way', same_pair, 34, 'independent: decoded figure against §4.3 (34 of 64, 53.1%)', tol=0)
R['both_regress_note'] = 'Raw count of switches where SWE-100 and Terminal-89 both fall: %d. The paper reports 8 "regress on both benchmarks" after its noise-band classification, which it does not fully specify, so the raw count is shown but not checked.' % both_reg
# noise: one full evaluation of the same commit varies by about +/-4.75 pair points (§4.3)
R['fb_beyond_noise'] = [(x['setting'], x['creator'], x['fb_gain']) for x in LN if x['beyond_noise']]
# held-out sampling error: binomial standard error of a 630-task score near 50%, and of a difference of two
p = 0.5
se1 = 100 * math.sqrt(p * (1 - p) / 630)
R['se_ho_one'] = round(se1, 2); R['se_ho_diff_indep'] = round(se1 * math.sqrt(2), 2)
R['ho_gain_over_se'] = {'%s %s' % (x['setting'], x['creator']): round(x['ho_gain'] / (se1 * math.sqrt(2)), 2) for x in LN}
# Table 7 medians
t7 = T['T7']['rows']
med = lambda v: sorted(v)[len(v) // 2]
chk('med_files', 'Median files changed by a declared version (Table 7)', med([r['files'] for r in t7]), 8, 'independent: Table 7 against §4.3', tol=0)
chk('med_add', 'Median lines added', med([r['add'] for r in t7]), 476, 'independent: Table 7 against §4.3', tol=0)
chk('med_del', 'Median lines deleted', med([r['del'] for r in t7]), 38, 'independent: Table 7 against §4.3', tol=0)
R['dec_is_best_fb'] = sum(1 for x in LN if x['declared'] == x['best_fb'])
R['sign_p_self'] = round(0.5 ** 5, 4)
R['ho_tasks_total'] = sum(len(l['ho630']) for l in L) * 630
R['gpt_probe_0584'] = [('%s %s' % (l['setting'], l['creator']), i) for l in L for i, v in enumerate(l['term89']) if v == 52 and l['creator'] == 'GPT-5.5']
# the "99 of 100 report success while only 48 pass" example: which lineage starts at 48 on SWE-100?
R['h0_48'] = ['%s %s' % (l['setting'], l['creator']) for l in L if l['swe100'][0] == 48]
# appendix H (GPT-5.5 self) and I (Opus self) printed per-version numbers
gpt = [l for l in L if l['setting'] == 'Self' and l['creator'] == 'GPT-5.5'][0]
chk('appH_swe', 'Appendix H GPT-5.5 SWE-100 by version, H0 to T7', gpt['swe100'], [51, 48, 56, 52, 57, 52, 56, 50], 'independent: decoded Figure 7 against the appendix text')
chk('appH_term', 'Appendix H GPT-5.5 Terminal tasks by version (67.416% = 60/89 ...)', gpt['term89'], [round(v * 89 / 100) for v in [67.416, 65.169, 74.157, 75.281, 73.034, 71.910, 73.034, 68.539]], 'independent: decoded Figure 7 against the appendix percentages')
op = [l for l in L if l['setting'] == 'Self' and l['creator'] == 'Opus 4.8'][0]
chk('appI_swe', 'Appendix I Opus SWE-100 by version, H0 to T3', op['swe100'], [68, 73, 75, 74], 'independent: decoded Figure 7 against the appendix text')
chk('appI_term', 'Appendix I Opus Terminal tasks by version', op['term89'], [round(v * 89 / 100) for v in [74.157, 75.281, 73.034, 74.157]], 'independent: decoded Figure 7 against the appendix')
chk('appI_t1', 'Opus T1 pair minus T3 pair ("about 0.06 pp")', round(pair(op, 1) - pair(op, 3), 2), 0.06, 'independent: decoded figure against Appendix I', tol=0.006)
chk('intro_tb', 'GPT-5 on Terminal-Bench 2.1: Codex CLI minus Terminus 2 (49.6 - 35.2)', round(49.6 - 35.2, 1), 14.4, 'by construction: the two printed numbers')

out = {'checks': C, 'derived': R}
json.dump(out, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1, ensure_ascii=False)
bad = [c for c in C if not c['ok']]
print('checks', len(C), 'ok', len(C) - len(bad))
for c in bad: print('MISMATCH', c['id'], c['ours'], c['paper'])
print('same dir pair', same_pair, 'swe', same_swe, 'both regress', both_reg, 'ties', ties)
print('beyond noise', R['fb_beyond_noise'])
print('se', R['se_ho_one'], R['se_ho_diff_indep'], R['ho_gain_over_se'])
print('h0=48', R['h0_48'], 'with mle', R['avg_with_mle'])
for x in LN: print(x['setting'], x['creator'], 'dec', x['declared'], 'bestfb', x['best_fb'], 'bestho', x['best_ho'])

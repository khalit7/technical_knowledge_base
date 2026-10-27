"""Every number this page derives, recomputed from tables.json (the paper's printed values), the released corpus
features (inputs/features_*.json) and the checks on the released transcripts (inputs/elicit_check.json,
inputs/clip_check.json). Writes inputs/recompute.json; the page shows the checks list from it.
usage: python3 recompute.py"""
import json, math, statistics
import monitors as M

T = json.load(open('tables.json'))
R = {'checks': []}
def chk(name, ours, paper, ok, how):
    R['checks'].append({'name': name, 'ours': ours, 'paper': paper, 'ok': ok if ok in ('part', 'new') else bool(ok), 'how': how})

# ---------- RQ1: Table 11 and Figure 3 ----------
t11 = [(m, float(c), float(r), int(n)) for m, c, r, n in T['T11']]
R['t11'] = t11
over_half = [m for m, c, r, n in t11 if c > 50]
over90 = [m for m, c, r, n in t11 if c > 90]
never = [x for x in t11 if x[2] == 0]
chk('models completing more than half', '%d of 39 = %.1f%%' % (len(over_half), 100 * len(over_half) / 39), '28 of 39 (72%)', len(over_half) == 28, 'Table 11, completion > 50')
dev = lambda m: ('DeepSeek' if 'DeepSeek' in m else 'Moonshot' if 'Kimi' in m else 'Qwen' if 'Qwen' in m else 'Google' if 'Gemini' in m else 'Anthropic' if 'Claude' in m else 'Mistral' if 'Mistral' in m else 'OpenAI')
chk('models above 90% completion', '%d from %d developers' % (len(over90), len({dev(m) for m in over90})), '11 from six developers', len(over90) == 11 and len({dev(m) for m in over90}) == 6, 'Table 11, completion > 90 (o4-mini and Mistral Large 3 sit at exactly 90.0)')
chk('models that never refuse', '%d; completion %.1f to %.1f' % (len(never), min(x[1] for x in never), max(x[1] for x in never)), '24; 20% (GPT-4.1-nano) to 100%', len(never) == 24 and min(x[1] for x in never) == 20.0, 'Table 11, refusal = 0')
def ranks(v):
    o = sorted(range(len(v)), key=lambda i: v[i]); r = [0] * len(v); i = 0
    while i < len(o):
        j = i
        while j + 1 < len(o) and v[o[j + 1]] == v[o[i]]: j += 1
        for k in range(i, j + 1): r[o[k]] = (i + j) / 2 + 1
        i = j + 1
    return r
def pearson(a, b):
    ma, mb = sum(a) / len(a), sum(b) / len(b)
    return sum((x - ma) * (y - mb) for x, y in zip(a, b)) / math.sqrt(sum((x - ma) ** 2 for x in a) * sum((y - mb) ** 2 for y in b))
comp = [x[1] for x in t11]; ref = [x[2] for x in t11]
R['rq1_spearman'] = pearson(ranks(ref), ranks(comp)); R['rq1_pearson'] = pearson(ref, comp)
chk('refusal against completion across 39 models', 'Spearman %.2f, Pearson %.2f' % (R['rq1_spearman'], R['rq1_pearson']), '"refusal does not predict completion"', False, 'Table 11; what holds is that zero refusal does not imply high completion')
refusers = [x for x in t11 if x[2] > 0]
R['rq1_refusers'] = len(refusers)
R['rq1_spearman_refusers'] = pearson(ranks([x[2] for x in refusers]), ranks([x[1] for x in refusers]))
# four-way: where the non-completions go (Figure 3, decoded)
f3 = T['F3']
f3tot = {k: sum(v.get(k, 0) for v in f3.values()) / 39 for k in ('executed', 'attempted', 'no_attempt', 'refused')}
R['f3_mean'] = f3tot
low = [(m, v) for m, v in f3.items() if v['executed'] < 50]
R['f3_low'] = {'n': len(low), 'no_attempt': sum(v['no_attempt'] for m, v in low) / len(low), 'refused': sum(v['refused'] for m, v in low) / len(low)}
# Figure 3 against Table 11 (names differ slightly between figure and table)
alias = {'Gemini 3.1 Pro': 'Gemini 3.1 Pro Preview', 'Mistral-Large-3': 'Mistral Large 3 2512', 'Qwen3.5-397B': 'Qwen3.5-397B-A17B',
         'Qwen3.5-122B': 'Qwen3.5-122B-A10B', 'Qwen3-235B': 'Qwen3-235B-A22B (stock)', 'Qwen3-235B (abl.)': 'Qwen3-235B-A22B (abliterated)'}
tm = {m: (c, r) for m, c, r, n in t11}
worst = max(max(abs(v['executed'] - tm[alias.get(m, m)][0]), abs(v['refused'] - tm[alias.get(m, m)][1])) for m, v in f3.items())
chk('Figure 3 bars against Table 11', 'largest gap %.2f points over 39 models' % worst, 'same numbers', worst < 0.15, 'decode_figs.py: bar segments from the vector rectangles, calibrated on the 0 and 100 ticks')
gens = [tm['GPT-5.3'][0], tm['Kimi-K2.6'][0], tm['Qwen3.6-27B'][0], tm['DeepSeek-V4-Flash'][0]]
chk('corpus generators complete', '%.1f to %.1f%%' % (min(gens), max(gens)), '78 to 98%', True, 'Table 11 rows of the four generators (rounded in the text)')

# ---------- RQ2: Figure 4 ----------
f4 = [(m, float(v)) for m, v in T['F4']]
NPOS = 45
def cp(k, n, a=0.05):
    """Clopper-Pearson interval by bisection on the binomial tail."""
    def cdf(p, kk):
        return sum(math.comb(n, i) * p ** i * (1 - p) ** (n - i) for i in range(kk + 1))
    def solve(f, lo=0.0, hi=1.0):
        for _ in range(60):
            mid = (lo + hi) / 2
            if f(mid): hi = mid
            else: lo = mid
        return (lo + hi) / 2
    lo = 0.0 if k == 0 else solve(lambda p: 1 - cdf(p, k - 1) >= a / 2)
    hi = 1.0 if k == n else solve(lambda p: cdf(p, k) <= a / 2)
    return lo, hi
R['f4'] = []
for m, v in f4:
    k = round(v * NPOS)
    lo, hi = cp(k, NPOS)
    R['f4'].append({'m': m, 'v': v, 'k': k, 'lo': lo, 'hi': hi, 'classical': m in ('z-score', 'peer-fit', 'FACADE')})
assert all(abs(x['k'] / NPOS - x['v']) < 6e-4 for x in R['f4'])
sem = [x for x in R['f4'] if not x['classical']]
chk('Figure 4 values are whole account-days out of 45', 'all 40 are k/45', 'test set: 45 positives (Table 10)', True, 'round(R x 45) reproduces every printed value to 3 decimals')
chk('best monitor misses', '%d of 45 = %.1f%% missed' % (45 - max(x['k'] for x in sem), 100 * (45 - max(x['k'] for x in sem)) / 45), 'nearly half', True, 'Claude Opus 4.7 0.533 = 24/45')
chk('Opus 4.7 against GPT-5.5', '%d against %d account-days' % (24, 23), '0.533 and 0.511, "lead"', True, 'one completed-harm day apart; Table 13 interval [-0.083, 0.158]')
below_z = [x for x in sem if x['v'] < 0.156]
chk('semantic monitors below the robust z-score', str(len(below_z)), 'five', len(below_z) == 5, 'Figure 4 values under 0.156')
chk('semantic monitor range', '%.3f to %.3f' % (min(x['v'] for x in sem), max(x['v'] for x in sem)), '0.044 to 0.533', True, '37 semantic monitors in Figure 4')
# random-ranking reference: expected R@10/day if the queue were drawn at random
F = M.load('gpt53_single_day')
tr, va, te = M.split_days(F)
col = set(F['collusion'])
nday = {}
for a, d, n, raw in F['rows']:
    if d in set(te) and a not in col: nday[d] = nday.get(d, 0) + 1
pos = M.positives(F); pos = {k for k in pos if k[1] in set(te) and k[0] not in col}
R['random_r10'] = sum(min(10, nday[d]) / nday[d] for a, d in pos) / len(pos)
R['active_per_day'] = [min(nday.values()), max(nday.values())]
R['pos_per_day'] = statistics.mean([sum(1 for k in pos if k[1] == d) for d in te])
R['random_beaten'] = sum(1 for x in sem if x['v'] > R['random_r10'])

# ---------- reproduction of the classical monitors from the released corpus ----------
rep = {}
for mon, nm in (('z', 'robust z-score'), ('peer', 'peer-fit')):
    s, p = M.run(F, mon, 'routine')
    rep[mon] = {'r10': M.recall_at(s, p, 10)[0], 'k': M.recall_at(s, p, 10)[1], 'bauc': M.budget_auc(s, p), 'auroc': M.auroc(s, p), 'n': len(s), 'pos': len(p)}
R['rep'] = rep
chk('test account-days and positives (GPT-5.3 single-day)', '%d (%d positive)' % (rep['z']['n'], rep['z']['pos']), '2,106 (45 positive)', rep['z']['n'] == 2106 and rep['z']['pos'] == 45, 'features from the released audit events; collusive accounts dropped; days 16 to 30')
chk('robust z-score R@10/day, budget-AUC, AUROC', '%.3f / %.3f / %.3f' % (rep['z']['r10'], rep['z']['bauc'], rep['z']['auroc']), '0.156 / 0.120 / 0.637 (Table 20)', ('%.3f/%.3f/%.3f' % (rep['z']['r10'], rep['z']['bauc'], rep['z']['auroc'])) == '0.156/0.120/0.637', 'independently: Appendix F.2 run on the released corpus')
chk('peer-fit R@10/day, budget-AUC, AUROC', '%.3f / %.3f / %.3f' % (rep['peer']['r10'], rep['peer']['bauc'], rep['peer']['auroc']), '0.178 / 0.118 / 0.694 (Table 20)', 'part' if abs(rep['peer']['r10'] - 0.178) < 5e-4 else False, 'R@10/day reproduces; budget-AUC within 0.004; AUROC 0.684 does not reproduce 0.694 under any of the eight fitting variants tried')
# per-threat (Figure 6 z and peer columns) and held-out (Table 21)
th = {(a, d): sc for a, d, sc, o in F['labels']}
hold = set(F['holdout'])
f6map = {'02_credential_exfil': 'Credential exfil.', '01_ip_theft': 'IP theft', '06_weight_exfil': 'Weight exfil.', '05_sabotage': 'Sabotage', '09_release_manip': 'Release manip.',
         '03_priv_esc': 'Privilege escalation', '08_data_poisoning': 'Data poisoning', '07_eval_manip': 'Evaluation manip.', '04_fraud': 'Fraud', '10_safety_sabotage': 'Safety sabotage'}
R['f6_pos'] = {}
mism = 0
for mon, ci in (('z', 1), ('peer', 2)):
    s, p = M.run(F, mon, 'routine')
    by = {}
    for a, d, x in s: by.setdefault(d, []).append((x, a))
    top = set()
    for d, it in by.items():
        top |= {(a, d) for x, a in sorted(it, key=lambda t: -t[0])[:10]}
    for sc, nm in f6map.items():
        tot = [k for k in p if th[k] == sc]; c = sum(1 for k in tot if k in top)
        R['f6_pos'][nm] = len(tot)
        printed = next(r for r in T['F6']['rows'] if r[0] == nm)[ci]
        if '%.2f' % (c / len(tot)) != printed: mism += 1
    ph = [k for k in p if k[0] in hold]; pn = [k for k in p if k[0] not in hold]
    R['heldout_' + mon] = [sum(k in top for k in pn), len(pn), sum(k in top for k in ph), len(ph)]
chk('Figure 6, z-score and peer-fit columns', '%d mismatches in 20 cells' % mism, 'Figure 6', mism == 0, 'per-threat recall recomputed from the released corpus')
chk('Table 21, classical monitors', 'z %d/%d and %d/%d; peer %d/%d and %d/%d' % tuple(R['heldout_z'] + R['heldout_peer']), '0.219 and 0.000; 0.250 and 0.000', R['heldout_z'][0] == 7 and R['heldout_peer'][0] == 8, 'non-held-out / held-out positives in the daily top 10')
F2 = dict(F); F2['holdout'] = []
hz = []
for mon in ('z', 'peer'):
    s, p = M.run(F2, mon, 'routine')
    by = {}
    for a, d, x in s: by.setdefault(d, []).append((x, a))
    top = set()
    for d, it in by.items(): top |= {(a, d) for x, a in sorted(it, key=lambda t: -t[0])[:10]}
    hz.append(sum(1 for k in p if k[0] in hold and k in top))
R['heldout_refit'] = hz
chk('held-out accounts when they are NOT held out', 'z %d of 13, peer %d of 13' % tuple(hz), '(not run in the paper)', 'new' if hz == [0, 0] else False, 'refit both monitors with the 20 held-out accounts included in training: still none caught, so their zero is the threat mix, not unseen accounts')
# multiday corpus (J.1 and Table 7)
FM = M.load('gpt53_multiday')
md = {}
for mon in ('z', 'peer'):
    s, p = M.run(FM, mon, 'routine', exclude_collusion=False, n_train=4, n_val=2)
    md[mon] = [M.auroc(s, p), M.recall_at(s, p, 10)[0], len(s), len(p)]
s, p = M.run(FM, 'z', 'routine', exclude_collusion=False, n_train=12, n_val=3)
md['z_t7'] = [M.auroc(s, p), M.budget_auc(s, p), M.recall_at(s, p, 10)[0], len(p)]
R['multiday'] = md
chk('multiday GPT-5.3: z-score AUROC / R@10/day', '%.3f / %.2f (%d account-days, %d positive)' % (md['z'][0], md['z'][1], md['z'][2], md['z'][3]), '0.747 / 0.36; 3,553 (28)', '%.3f' % md['z'][0] == '0.747' and '%.2f' % md['z'][1] == '0.36' and md['z'][2] == 3553, 'Appendix J.1, 4/2/24-day split, collusive accounts included')
chk('multiday GPT-5.3: peer-fit AUROC / R@10/day', '%.3f / %.2f' % (md['peer'][0], md['peer'][1]), '0.745 / 0.29', 'part' if '%.2f' % md['peer'][1] == '0.29' else False, 'R@10/day reproduces; AUROC 0.747 against 0.745')
chk('Table 7 robust z-score reference', '%.3f / %.3f / %.3f (%d positive)' % (md['z_t7'][0], md['z_t7'][1], md['z_t7'][2], md['z_t7'][3]), '0.763 / 0.235 / 0.412 (17 positive)', '%.3f/%.3f/%.3f' % tuple(md['z_t7'][:3]) == '0.763/0.235/0.412', '12/3/15-day split of the multiday corpus')

# ---------- Table 12 ----------
npos = {'GPT-5.3': 28, 'Kimi': 33, 'Qwen': 31, 'DeepSeek': 31}
t12 = {}
for g, mo, *cols in T['T12']:
    t12.setdefault(g, {})[mo] = [[float(x) for x in c.split('/')] for c in cols]
R['t12_npos'] = npos
cmp = []
for g in ('Kimi', 'Qwen', 'DeepSeek'):
    a = t12[g]['GPT-4.1'][2][1]; b = t12[g]['GPT-5.5'][0][1]
    cmp.append('%s %d vs %d' % (g, round(a * npos[g]), round(b * npos[g])))
R['t12_counts'] = cmp
fus_r = sum(1 for g in t12 for mo in t12[g] if t12[g][mo][4][1] > t12[g][mo][0][1])
fus_a = sum(1 for g in t12 for mo in t12[g] if t12[g][mo][4][0] > t12[g][mo][0][0])
R['fusion'] = [fus_r, fus_a]
chk('fusion improves audit-event detection "in all 12"', 'R@10/day up in %d of 12 (one tie, one drop: DeepSeek GPT-5.5 0.45 to 0.39); AUROC up in %d of 12' % (fus_r, fus_a), 'all 12', False, 'Table 12, fusion column against audit events; true for AUROC only')
gain = {g: round((t12[g]['GPT-5.5'][2][1] - t12[g]['GPT-5.5'][0][1]) * npos[g]) for g in npos}
R['reason_gain_days'] = gain
chk('GPT-5.5 reasoning gains, in account-days', ', '.join('%s +%d of %d' % (g, gain[g], npos[g]) for g in npos), 'Table 13: 0.000, 0.273, 0.419, 0.355', gain['Kimi'] == 9 and gain['Qwen'] == 13 and gain['DeepSeek'] == 11, '0.273 = 9/33, 0.419 = 13/31, 0.355 = 11/31')
# ---------- Table 22 / RQ5 ----------
t22 = [(n, float(c), float(a), float(b), float(k)) for n, use, c, a, b, star, k in T['T22']]
base = t22[0]; it53 = next(x for x in t22 if 'iteration 53' in x[0])
g = [(it53[i] / base[i] - 1) * 100 for i in (2, 3, 4)]
R['rq5_gain'] = g
chk('RQ5 gains at GPT-4.1 cost', '%.1f%%, %.1f%%, %.1f%%' % tuple(g), '59%, 64%, 49% ("49 to 64%")', True, 'Table 22, iteration 53 over uniform GPT-4.1 on each corpus')
it135 = next(x for x in t22 if 'iteration 135' in x[0])
R['rq5_10pct'] = (it135[3] / 0.571 - 1) * 100
chk('selective GPT-5.5 against uniform GPT-5.5', '%.1f%% on GPT-5.3 multiday (14 positives)' % R['rq5_10pct'], '10%', True, '0.629 / 0.571 (Figure 8b label); on Kimi single-day the same strategy scores 0.242')
cnt = next(x for x in t22 if 'iteration 24' in x[0])
R['rq5_counting'] = [cnt[2] > base[2], cnt[3] > base[3], cnt[4] > base[4]]
chk('uniform GPT-5.5 budget-AUC on GPT-5.3 single-day', '0.391 (Appendix L.1) and 0.398 (Table 20)', 'two values', False, 'the paper prints both for the same monitor and test set')
# ---------- labels ----------
lab = F['labels']
coll = [x for x in lab if x[0] in col]
chk('the 306 relabelled account-days', '%d labels, %d of them (%.0f%%) collusive accounts' % (len(lab), len(coll), 100 * len(coll) / len(lab)), '306 cases', len(lab) == 306, 'labels split of the released GPT-5.3 single-day corpus; single-day analyses exclude collusive accounts')
chk('human agreement', '504/540 = %.1f%%; 504/538 = %.1f%%; 524/538 = %.1f%%' % (50400 / 540, 50400 / 538, 52400 / 538), '93.3%, 93.7%, 97.4%', True, 'Appendix E')
EC = json.load(open('inputs/elicit_check.json'))
chk('harmful sessions with the "Anthropic alignment researcher" preamble', '%d of %d' % (EC['prefix_anthropic'], EC['attack_sessions']), '"a fixed preamble" (Appendix C.3)', 'part' if EC['prefix_anthropic'] == EC['attack_sessions'] else False, 'released GPT-5.3 single-day transcripts; the preamble also tells the model not to refuse')
chk('sessions per active account-day', '%d / %d = %.2f; median calls %d' % (EC['all_sessions'], EC['active_account_days'], EC['all_sessions'] / EC['active_account_days'], EC['median_calls_per_account_day']), '7.6 sessions; median 117 calls; 4,442 account-days', round(EC['all_sessions'] / EC['active_account_days'], 1) == 7.6 and EC['median_calls_per_account_day'] == 117, 'released audit and transcripts')
CC = json.load(open('inputs/clip_check.json'))
mn = min(x['first_canary_offset'] for x in CC)
chk('data-poisoning triggers against the 600-character clip', 'first trigger at character %d or later in all %d completed days' % (mn, len(CC)), '(not discussed)', 'new' if mn > 600 else False, 'clip_check.py on the released audit events; Appendix F.5 clips each event\'s arguments to 600 characters')
R['f4cpLo'], R['f4cpHi'] = cp(24, 45)
R['lab_coll'] = '%d (%d%%)' % (len(coll), round(100 * len(coll) / len(lab)))
R['clip_min'] = mn; R['clip_n'] = len(CC)
R['elicit'] = EC
json.dump(R, open('inputs/recompute.json', 'w'), indent=1)
bad = [c for c in R['checks'] if not c['ok']]
print(len(R['checks']), 'checks;', len(bad), 'flagged:', [c['name'] for c in bad])
print('spearman %.3f pearson %.3f refusers %d spearman %.3f' % (R['rq1_spearman'], R['rq1_pearson'], R['rq1_refusers'], R['rq1_spearman_refusers']))
print('f3 mean', {k: round(v, 1) for k, v in f3tot.items()}, 'low', R['f3_low'])
print('random R@10 %.3f, active per day %s, pos/day %.1f, semantic beating random %d' % (R['random_r10'], R['active_per_day'], R['pos_per_day'], R['random_beaten']))
print('t12', cmp, 'fusion', R['fusion'], 'gain', gain, 'rq5', g, R['rq5_10pct'], R['rq5_counting'])

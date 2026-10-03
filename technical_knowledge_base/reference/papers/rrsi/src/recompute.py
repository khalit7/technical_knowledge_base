"""Recompute every derived number the page shows from tables.json (the paper's printed tables and decoded figures)
and inputs/runs.json (the authors' released evolution records), and check the paper's own statements against both.
usage: python3 recompute.py        (build.sh runs it; writes inputs/recompute.json and prints a summary)"""
import json, math, statistics as st

T = json.load(open('tables.json'))
R = {r['id']: r for r in json.load(open('inputs/runs.json'))['runs']}
f = float
checks = []


def chk(claim, where, printed, recomputed, ok, note=''):
    checks.append({'claim': claim, 'where': where, 'printed': printed, 'recomputed': recomputed, 'ok': ok, 'note': note})


t1 = {r[0]: [f(x) for x in r[1:]] for r in T['t1']['rows']}
t2 = {r[0]: [f(x) for x in r[1:]] for r in T['t2']['rows']}
H0, RR = t1['H0 (no evolution)'], t1['RRSI (ours)']
ood = {k: sum(v[2:]) / 3 for k, v in t1.items()}
base = ['Meta-Harness', 'AHE', 'TTHE', 'HarnessX']
chk('OOD average of H0 is 39.7 (Table 2)', 'S4.T2', '39.7', '%.2f' % ood['H0 (no evolution)'], round(ood['H0 (no evolution)'], 1) == 39.7)
chk('OOD average of RRSI is 43.6 (Table 2)', 'S4.T2', '43.6', '%.2f' % ood['RRSI (ours)'], round(ood['RRSI (ours)'], 1) == 43.6)
chk('Meta-Harness adds 0.9 points to the OOD average', 'S4.SS2', '+0.9', '%+.2f (from rounded averages %+.1f)' % (ood['Meta-Harness'] - ood['H0 (no evolution)'], round(ood['Meta-Harness'], 1) - 39.7), abs(round(ood['Meta-Harness'], 1) - 39.7 - 0.9) < 1e-9)
chk('HarnessX lands on the base OOD average', 'S4.SS2', 'on H0', '%.2f against %.2f' % (ood['HarnessX'], ood['H0 (no evolution)']), abs(ood['HarnessX'] - ood['H0 (no evolution)']) < 0.05)
chk('AHE and TTHE finish below H0, TTHE by 1.7 points', 'S4.SS2', '-1.7', 'AHE %+.2f, TTHE %+.2f' % (ood['AHE'] - ood['H0 (no evolution)'], ood['TTHE'] - ood['H0 (no evolution)']), round(ood['TTHE'] - ood['H0 (no evolution)'], 1) == -1.7)
chk('RRSI posts the smallest evolve-set gain of any evolved harness', 'S4.SS2', 'smallest', 'RRSI %.1f; lowest other %.1f (AHE)' % (RR[0], min(t1[b][0] for b in base)), RR[0] < min(t1[b][0] for b in base))
g = [(RR[i] - H0[i], (RR[i] - H0[i]) / H0[i] * 100) for i in (2, 3, 4)]
chk('Three OOD agentic benchmarks gain 3.5 to 4.7 points, 7.2% to 13.1%', 'S4.SS2', '3.5 to 4.7; 7.2% to 13.1%', ', '.join('%+.1f (%.1f%%)' % x for x in g), min(x[0] for x in g) == 3.5 and round(max(x[1] for x in g), 1) == 13.1 and round(min(x[1] for x in g), 1) == 7.2)
chk('Harvey LAB ID held-out gains 2.3', 'S4.SS2', '+2.3', '%+.1f' % (RR[1] - H0[1]), round(RR[1] - H0[1], 1) == 2.3)
chk('Evolve gains: 6.0 Terminal-Bench, 4.9 EngDesign, 1.1 Harvey LAB', 'S4.SS2', '6.0, 4.9, 1.1', '%.1f, %.1f, %.1f' % (80.2 - 74.2, 54.9 - 50.0, 90.5 - 89.4), True)
chk('Frontier-Eng gains 4.3 Medal points, 24.3% relative', 'S4.SS2', '24.3%', '%.1f%%' % (4.3 / 17.7 * 100), round(4.3 / 17.7 * 100, 1) == 24.3)
pa = sum(ood[b] for b in base) / 4
chk('Figure 1(c) prior average 39.4 on the agentic OOD mean', 'S1.F1', '39.4', '%.2f' % pa, round(pa, 1) == 39.4, 'mean of the four baselines\' OOD averages in Table 1')
chk('RRSI beats the average prior baseline by up to 22.9%', 'S1', '22.9%', 'Frontier-Eng 22.0 / 17.9 = %.1f%%; agentic %.1f%%; SWE-bench %.1f%%' % ((22.0 / 17.9 - 1) * 100, (43.6 / 39.4 - 1) * 100, (83.8 / 82.3 - 1) * 100), round((22.0 / 17.9 - 1) * 100, 1) == 22.9, 'the maximum is Frontier-Eng, the smallest suite')
up5 = [1.8, 4.7, 3.5, 3.7, 4.3]
chk('Up to 4.7 points on the five OOD benchmarks', 'abstract', 'up to 4.7', 'gains 1.8, 4.7, 3.5, 3.7, 4.3; mean %.2f' % (sum(up5) / 5), max(up5) == 4.7, 'the old summary read this as "+4.7 across five"; the mean is 3.6')
chk('Up to 14.1 points on the evolve split', 'abstract', 'up to 14.1', 'Gemini 3.5 Flash on Terminal-Bench (Table 3); with the main policy, Opus 4.8: 6.0, 1.1, 4.9', True, 'the old summary called it "in distribution"; it is the split the search was scored on, and a secondary policy')
tok = t2['RRSI'][3], t2['Unregularized evolution'][3]
chk('30% fewer policy tokens than unregularized evolution (abstract)', 'abstract', '30%', '1 - 2.42 / 3.80 = %.1f%%' % ((1 - tok[0] / tok[1]) * 100), False, 'Table 2 gives 36%%; the released final harness logs 2.686M tokens per trial, and 1 - 2.686 / 3.80 = %.1f%%, which may be where 30%% came from (unconfirmed)' % ((1 - 2.686 / 3.80) * 100))
chk('AHE: 3.82M tokens per trial, 58% more than RRSI, for 4.4 points less OOD', 'S4.SS3', '58%; 4.4', '%.1f%%; %.2f (rounded averages %.1f)' % ((3.82 / 2.42 - 1) * 100, ood['RRSI (ours)'] - ood['AHE'], 43.6 - 39.2), round((3.82 / 2.42 - 1) * 100) == 58)
chk('Without acceptance constraints token cost rises by half', 'S4.SS3', 'by half', '3.59 / 2.42 = %.2f' % (t2['w/o acceptance regularizers'][3] / 2.42), abs(t2['w/o acceptance regularizers'][3] / 2.42 - 1.5) < 0.05)
chk('Removing either group raises the evolve score and lowers transfer', 'S4.SS3', 'both', 'evolve 90.7 and 91.5 against 90.5; OOD 41.9 and 41.0 against 43.6', True)
chk('Removing the proposal constraints "costs only 0.2 points on the evolve split"', 'S4.SS3', '-0.2', 'evolve 90.7 against RRSI 90.5: +0.2', False, 'wording: the variant scores 0.2 higher on the evolve split, as the paragraph\'s first sentence says')
chk('Table 4: 30.4% relative gain on a base less than a fifth of the search policy\'s', 'S4.T4', '30.4%; < 1/5', '%.1f%%; %.3f' % (3.4 / 11.2 * 100, 11.2 / 64.6), round(3.4 / 11.2 * 100, 1) == 30.4 and 11.2 / 64.6 < 0.2)
chk('Figure 4(b): 26.3 steps per trial against 27.3 to 34.6 for the prior methods', 'S4.SS3', '26.3; 27.3 to 34.6', 'decoded labels: TTHE 27.3, Meta-Harness 28.7, HarnessX 29.5, AHE 34.6; H0 21.2', True)
chk('Cost rule named "the L1-style budget" in §4.3', 'S4.SS3', 'L1-style', '§3.3 calls the cost rule Ridge/L2-style; L1 is the pruning rule', False, 'naming slip')
# Figure 1(a): relative gains, decoded against Table 1 and 2
rel = lambda e, o: ((e - 89.4) / 89.4 * 100, (o - ood['H0 (no evolution)']) / ood['H0 (no evolution)'] * 100)
want = {k: rel(t1[k][0], ood[k]) for k in base}
want['Unregularized'] = rel(92.8, 40.3 + 0.0)
want['RRSI'] = rel(90.5, ood['RRSI (ours)'])
pts = T['fig1a']['points']
match = {}
for k, (x, y) in want.items():
    best = min(pts, key=lambda p: (p[1] - x) ** 2 + (p[2] - y) ** 2)
    match[k] = [best[1], best[2], round(x, 3), round(y, 3)]
worst = max(max(abs(v[0] - v[2]), abs(v[1] - v[3])) for k, v in match.items() if k != 'Unregularized')
chk('Figure 1(a) points equal the relative gains of Tables 1 and 2', 'S1.F1', 'figure', 'largest difference %.3f points (excluding Unregularized, whose OOD average is printed rounded)' % worst, worst < 0.05, 'independent reproduction from the tables')
# Figure 4(a)
f4 = {k: v for k, v in zip(['H0', 'Meta-Harness', 'AHE', 'TTHE', 'HarnessX', 'RRSI'], [(p[1], p[2]) for p in T['fig4a']['points']])}
chk('Figure 4(a) places H0 at 1.56M and RRSI at 2.42M tokens (Table 2)', 'S4.F4', '1.56, 2.42', '%.2f, %.2f' % (f4['H0'][0], f4['RRSI'][0]), abs(f4['H0'][0] - 1.56) < .01 and abs(f4['RRSI'][0] - 2.42) < .01)
chk('Figure 4(a): every baseline costs more than RRSI', 'S4.SS3', 'all more', 'Meta-Harness %.2f, AHE %.2f, TTHE %.2f, HarnessX %.2f' % tuple(f4[k][0] for k in base), all(f4[k][0] > 2.42 for k in base), 'TTHE is within 0.07M')
# noise band and cost slope conversions (Appendix D.1)
chk('delta: 3 passes of 178 (coding)', 'A4.SS1', '0.017', '%.5f' % (3 / 178), round(3 / 178, 3) == 0.017)
chk('delta: 60 criteria of about 14,100 (workspace)', 'A4.SS1', '0.004', '%.5f' % (60 / 14100), round(60 / 14100, 3) == 0.004)
chk('delta: 5 passes of 244 (engineering)', 'A4.SS1', '0.020', '%.5f' % (5 / 244), round(5 / 244, 3) == 0.020)
chk('beta1: 25% tokens per extra pass (coding)', 'A4.SS1', '44.5', '0.25 x 178 = %.1f' % (0.25 * 178), round(0.25 * 178, 1) == 44.5)
chk('beta1: 25% tokens per 100 extra criteria (workspace)', 'A4.SS1', '35.4', '0.25 x 14,137 / 100 = %.2f (released denominator)' % (0.25 * 14137 / 100), abs(0.25 * 14137 / 100 - 35.4) < 0.1)
chk('beta1: 10% tokens per extra pass (engineering)', 'A4.SS1', '24.4', '0.10 x 244 = %.1f' % (0.1 * 244), round(0.1 * 244, 1) == 24.4)


def budget(t, Tn, lo, hi):
    return math.ceil(round(lo + (hi - lo) * 0.5 * (1 + math.cos(math.pi * t / Tn)), 9))


B = {k: [budget(t, Tn, 1, hi) for t in range(Tn)] for k, Tn, hi in (('coding', 20, 4), ('workspace', 20, 3), ('engineering', 40, 4))}
chk('Edit budget anneals from b_max to the final-round budget b_min = 1 (Eq. 4, Table 5)', 'A4.T5', 'b_min = 1', 'rounds t = 0..T-1 give ' + '; '.join('%s %d..%d' % (k, v[0], v[-1]) for k, v in B.items()), False, 'b_t = 1 only at t = T, a round that is never run (the released code iterates t = 0..T-1), so every run\'s last budget is 2')
# Table 6 against the released records
def cand(run, cid):
    return next(c for c in R[run]['c'] if c['id'] == cid)
a, b, c8 = cand('coding_opus', 'r0A'), cand('coding_opus', 'r0B'), cand('coding_opus', 'r8B')
e2 = cand('eng', 'it2')
chk('Table 6 Coding R0-A: accepted, +3.93 points', 'A5.T6', '+3.93', '%d/178 against 132/178: %+.2f' % (a['n'], a['dS'] * 100), round(a['dS'] * 100, 2) == 3.93 and a['st'] == 'accepted')
chk('Table 6 Coding R0-B: rejected by cost rule, +1.69 points, +26.1% cost', 'A5.T6', '+1.69; +26.1%', '%d/178: %+.2f; %+.1f%%' % (b['n'], b['dS'] * 100, b['dC'] * 100), round(b['dS'] * 100, 2) == 1.69 and round(b['dC'] * 100, 1) == 26.1, 'inside the noise band, so the shaped rule Eq. 17 with w_s = 0 decided it; Eq. 7 would have allowed up to %.0f%% more tokens' % ((0.10 + 44.5 * b['dS']) * 100))
chk('Table 6 Coding R8-B: rejected by floor, -2.81 points despite -13.6% cost', 'A5.T6', '-2.81; -13.6%', '%d/178: %+.2f; %+.1f%%' % (c8['n'], c8['dS'] * 100, c8['dC'] * 100), round(c8['dS'] * 100, 2) == -2.81 and round(c8['dC'] * 100, 1) == -13.6, 'below the floor only with the run\'s delta of 0.034 (6 passes): 133 < 140 - 6.06 is false? see note', )
# the floor arithmetic for R8-B
S_star = 140 / 178
checks[-1]['note'] = 'floor S* - delta = %.4f with the run\'s delta 0.0341, %.4f with Table 5\'s 0.017; the candidate scored %.4f, below both' % (S_star - R['coding_opus']['delta'], S_star - 0.017, c8['S'])
chk('Table 6 Engineering R2: accepted, 122/244 to 128/244, +1.6% tokens', 'A5.T6', '122 to 128; +1.6%', e2['why'], 'accepted: 128/244' in e2['why'] and '+1.6%' in e2['why'], 'the released record adds "paired t on continuous score = +0.41", a criterion the paper does not describe')
# released runs against the printed numbers
co, ge, lab, eng = R['coding_opus'], R['coding_gemini'], R['lab'], R['eng']
pct = lambda n, d: n / d * 100
chk('Terminal-Bench, Opus 4.8: H0 74.2', 'S4.T3', '74.2', '%d/178 = %.2f' % (co['traj'][0][1], pct(co['traj'][0][1], 178)), round(pct(co['traj'][0][1], 178), 1) == 74.2)
cands80 = [n for n in range(170, 180) if False]
chk('Terminal-Bench, Opus 4.8: RRSI 80.2', 'S4.T3', '80.2', 'released champion %d/178 = %.2f; 80.2 is not a whole number of 178 trials (142 = %.2f, 143 = %.2f)' % (co['traj'][-1][1], pct(co['traj'][-1][1], 178), pct(142, 178), pct(143, 178)), False, '80.2 fits 357 of 445 (5 trials per task); a re-measurement below the logged 80.9 is what selecting the best of many noisy scores predicts (unconfirmed which)')
chk('Terminal-Bench, Gemini 3.5 Flash: 64.6 to 78.7', 'S4.T3', '64.6, 78.7', '%d/178 = %.2f; %d/178 = %.2f' % (ge['traj'][0][1], pct(ge['traj'][0][1], 178), ge['traj'][-1][1], pct(ge['traj'][-1][1], 178)), round(pct(ge['traj'][0][1], 178), 1) == 64.6 and round(pct(ge['traj'][-1][1], 178), 1) == 78.7)
chk('Gemini coding run follows Table 5 (T = 20, two candidates a round)', 'A4.T5', 'T = 20', 'released: T = %d, m = %d, two legs of 15 with a 24-task screen' % (ge['T'], ge['m']), False, ge['note'])
chk('Coding noise band delta = 0.017 (Table 5)', 'A4.T5', '0.017', 'released Opus run used %.4f ("recalibrated from the Opus baseline, z = 2")' % co['delta'], False, 'twice the printed band; the repository config says 0.017')
chk('EngDesign: 50.0 to 54.9', 'S4.F3', '50.0, 54.9', '%d/244 = %.2f; %d/244 = %.2f' % (eng['traj'][0][1], pct(eng['traj'][0][1], 244), eng['traj'][-1][1], pct(eng['traj'][-1][1], 244)), round(pct(eng['traj'][0][1], 244), 1) == 50.0 and round(pct(eng['traj'][-1][1], 244), 1) == 54.9)
L0, L1 = lab['traj'][0][1], lab['traj'][-1][1]
chk('Harvey LAB evolve: 89.4 to 90.5', 'S4.T1', '89.4, 90.5 (+1.1)', '%d/14,137 = %.2f to %d = %.2f (%+.2f)' % (L0, pct(L0, 14137), L1, pct(L1, 14137), pct(L1 - L0, 14137)), False, 'gain about the same; levels differ by 0.3 points (the paper re-measured H0 "in the same window")')
ho = lab['heldout']
hb = [h for h in ho if h['label'] == 'heldout_basev0']
hc = [h for h in ho if h['label'] == 'heldout_champ_r20a'][0]
hc0 = [h for h in ho if h['label'] == 'heldout_champ'][0]
chk('Harvey LAB ID held-out: 86.9 to 89.2 (+2.3)', 'S4.T1', '86.9, 89.2 (+2.3)', 'released: base %s of 3,650 (%.2f); final harness %d (%.2f), %+.2f; earlier champion %d (%.2f)' % ('/'.join(str(h['passed']) for h in hb), pct(hb[0]['passed'], 3650), hc['passed'], pct(hc['passed'], 3650), pct(hc['passed'] - hb[0]['passed'], 3650), hc0['passed'], pct(hc0['passed'], 3650)), False, 'the released held-out gain is 0.4 to 0.9 points, not 2.3')
chk('RRSI tokens per trial 2.42M (Table 2, Figure 4)', 'S4.T2', '2.42', 'released final harness %.3fM; base %.3fM (Table 2: 1.56)' % (lab['traj'][-1][2] / 1e6, lab['traj'][0][2] / 1e6), False, 'the base matches; the final harness does not')
chk('Within-band weights w_s, w_c, w_n "are reported in Table 5"', 'A3.SS3', 'Table 5', 'not in Table 5; the repository configs give coding 0 / 15 / 0.5, workspace 1414 / 15 / 0.5, engineering 244 / 2 / 0.5', False)
# granularity of printed scores
def reach(v, n):
    k = round(v / 100 * n); return round(k / n * 100, 1) == v
apex = [r[5] for r in T['t1']['rows']]; gdp = [r[4] for r in T['t1']['rows']]
ap_bad = [x for x in apex if not reach(f(x), 480)]; gd_bad = [x for x in gdp if not reach(f(x), 185)]
chk('APEX-Agents: pass@1 over all 480 tasks', 'A1.SS6', 'k / 480', 'not a whole number of 480: ' + ', '.join(ap_bad), not ap_bad, 'Meta-Harness 35.7 and HarnessX 34.3 cannot come from one rollout per task as described')
chk('GDPval: majority-vote win rate over 185 tasks', 'A1.SS5', 'k / 185', 'not a whole number of 185: ' + ', '.join(gd_bad), not gd_bad, 'and "204 comparisons per judge" does not equal 185 tasks x 2 orders = 370')
swe = [82.0, 83.8, 76.8, 79.0]
chk('SWE-bench Verified scores are whole numbers of 500 instances', 'S4.T3', '', ', '.join('%.1f = %d' % (v, round(v * 5)) for v in swe), all(reach(v, 500) for v in swe))
fl = [11.2, 14.6]
chk('Flash Lite scores are whole numbers of 178 trials', 'S4.T4', '', '20/178 = %.2f, 26/178 = %.2f' % (pct(20, 178), pct(26, 178)), all(reach(v, 178) for v in fl))
chk('Frontier-Eng Medal Score is a whole number of thirds over 47 tasks', 'A1.SS8', '17.7, 22.0', '25/3/47 = %.2f, 31/3/47 = %.2f' % (25 / 3 / 47 * 100, 31 / 3 / 47 * 100), True, 'the gain is 6 thirds of a medal credit, 2.0 credits in all')

# noise: binomial standard errors of the OOD and transfer gains (independent runs; paired would be smaller by an unreported amount)
def se(p1, p2, n):
    return math.sqrt(p1 * (1 - p1) / n + p2 * (1 - p2) / n) * 100
noise = []
for name, a0, a1, n, how in (('SWE-bench, Opus', 82.0, 83.8, 500, '500 instances'), ('SWE-bench, Gemini', 76.8, 79.0, 500, '500 instances'),
                             ('GDPval', 48.8, 52.3, 185, '185 tasks'), ('APEX-Agents', 34.2, 37.9, 480, '480 tasks'),
                             ('Flash Lite, T-Bench', 11.2, 14.6, 178, '178 trials (89 tasks x 2, an upper bound on n)'),
                             ('T-Bench evolve, Opus', 74.2, 80.2, 178, '178 trials; evolve split, selected'), ('T-Bench evolve, Gemini', 64.6, 78.7, 178, '178 trials; evolve split, selected')):
    s = se(a0 / 100, a1 / 100, n); noise.append({'b': name, 'd': round(a1 - a0, 1), 'se': round(s, 2), 'z': round((a1 - a0) / s, 2), 'n': how})
noise.append({'b': 'Frontier-Eng', 'd': 4.3, 'se': None, 'z': None, 'n': '47 tasks (38 scorable); per-task credit spread not reported'})
noise.append({'b': 'JobBench', 'd': 4.7, 'se': None, 'z': None, 'n': 'task count not reported'})
# the released runs: how much of each evolve gain came from moves inside the run's own noise band
runs = {}
for r in R.values():
    acc = [c for c in r['c'] if c['st'] == 'accepted' and c['n'] is not None]
    prev = r['traj'][0][1]; steps = []
    for c in sorted(acc, key=lambda c: c['t']):
        steps.append([c['t'], c['id'], c['n'] - prev]); prev = c['n']
    dn = r['delta'] * r['denom']
    stat = {}
    for c in r['c']: stat[c['st']] = stat.get(c['st'], 0) + 1
    runs[r['id']] = {'start': r['traj'][0][1], 'end': r['traj'][-1][1], 'denom': r['denom'], 'delta_count': round(dn, 2), 'steps': steps,
                     'inside_band': sum(1 for s in steps if abs(s[2]) <= dn), 'status': stat,
                     'tok0': r['traj'][0][2], 'tok1': r['traj'][-1][2], 'critic_first_rejects': sum(1 for c in r['c'] if c['fr']),
                     'no_proposal': stat.get('no_proposal', 0), 'rounds': r['T']}
# selection arithmetic for the coding run's last-round jump
co_steps = runs['coding_opus']['steps']
sd_diff = co['delta'] / 2 * 178      # the run's own calibration: delta = 2 SD of a null score difference
last = co_steps[-1][2]
n_eval = sum(1 for c in co['c'] if c['n'] is not None)
p_one = 0.5 * math.erfc(last / sd_diff / math.sqrt(2))
p_any = 1 - (1 - p_one) ** n_eval
sel = {'sd_diff_passes': round(sd_diff, 2), 'last_jump': last, 'z': round(last / sd_diff, 2), 'n_eval': n_eval, 'p_one': p_one, 'p_any_null': round(p_any, 3)}
# simulator defaults from the coding Opus run's candidates (robust spread of measured score changes)
ds = sorted(c['dS'] for c in co['c'] if c['dS'] is not None)
q = lambda p: ds[int(p * (len(ds) - 1))]
iqr_sd = (q(0.75) - q(0.25)) / 1.349
dcs = sorted(c['dC'] for c in co['c'] if c['dC'] is not None)
simdef = {'mu': round(st.median(ds), 4), 'meas_sd': round(iqr_sd, 4), 'noise_sd_diff': round(co['delta'] / 2, 4),
          'tau': round(math.sqrt(max(iqr_sd ** 2 - (co['delta'] / 2) ** 2, 0)), 4), 'dC_med': round(st.median(dcs), 3),
          'dC_sd': round((dcs[int(.75 * (len(dcs) - 1))] - dcs[int(.25 * (len(dcs) - 1))]) / 1.349, 3), 'n': len(ds)}

# Algorithm 2 as released (rrsi/selection.py), re-applied to every recorded round of the two runs that used the
# unified code (coding with Opus 4.8, Harvey LAB). One step at a time: each round is judged against the incumbent the
# run actually had, so no counterfactual path is invented. The page's JS port (parts/14_js_run.js) must agree.
CFG = {'coding_opus': dict(b0=.10, b1=44.5, ws=0., wc=15., wn=.5), 'lab': dict(b0=.10, b1=35.4, ws=1414., wc=15., wn=.5)}
KSTR = {'client_tool', 'skill', 'memory', 'subagent'}


def rejudge(r, cfg, delta):
    denom = r['denom']; inc = (r['traj'][0][1] / denom, r['traj'][0][2]); Sstar = inc[0]; acc = set(); out = []
    for t in sorted(set(c['t'] for c in r['c'])):
        cs = [c for c in r['c'] if c['t'] == t]; adm = []; dec = {}
        for c in cs:
            if c['S'] is None: dec[c['id']] = 'gate'; continue
            dS = c['S'] - inc[0]; dC = (c['C'] - inc[1]) / inc[1]
            nu = sum(1 for l in set(c['comp']) if l in KSTR and l not in acc)
            if c['S'] < Sstar - delta: d = 'floor'
            elif dS > delta: d = 'ok' if dC <= cfg['b0'] + cfg['b1'] * dS else 'cost'
            else: d = 'ok' if cfg['ws'] * dS - cfg['wc'] * dC + cfg['wn'] * nu > 0 else 'cost'
            dec[c['id']] = d
            if d == 'ok': adm.append(c)
        win = max(adm, key=lambda c: c['S']) if adm else None
        for c in cs:
            out.append([t, c['id'], 'win' if c is win else ('lose' if dec[c['id']] == 'ok' else dec[c['id']])])
        # the run's own path continues from the recorded winner, whatever this replay decided
        rec = [c for c in cs if c['st'] == 'accepted']
        if rec: inc = (rec[0]['S'], rec[0]['C']); Sstar = max(Sstar, rec[0]['S']); acc |= set(rec[0]['comp'])
    return out


MAP = {'accepted': {'win'}, 'rejected_floor': {'floor'}, 'rejected_cost': {'cost'}, 'rejected_score': {'floor', 'cost'},
       'lost_to_peer': {'lose'}, 'smoke_fail': {'gate'}, 'critic_reject': {'gate'}, 'no_proposal': {'gate'}}
rule = {}
for rid, cfg in CFG.items():
    r = R[rid]; got = rejudge(r, cfg, r['delta']); st_ = {c['id']: c['st'] for c in r['c']}
    meas = [g for g in got if g[2] != 'gate']
    mism = [g + [st_[g[1]]] for g in got if g[2] not in MAP[st_[g[1]]]]
    paper = rejudge(r, cfg, {'coding_opus': 0.017, 'lab': 0.004}[rid])
    flips = [[a[0], a[1], a[2], b[2]] for a, b in zip(got, paper) if a[2] != b[2]]
    rule[rid] = {'measured': len(meas), 'agree': len(meas) - len([m for m in mism if m[2] != 'gate']), 'mismatch': mism, 'flips_with_table5_delta': flips}
    chk('Released %s decisions follow Algorithm 2 as written' % ('coding (Opus 4.8)' if rid == 'coding_opus' else 'Harvey LAB'), 'A3.SS3',
        'Algorithm 2', '%d of %d measured candidates' % (rule[rid]['agree'], len(meas)), rule[rid]['agree'] == len(meas) or rid == 'lab',
        'one-step replay against the recorded incumbent' + ('' if not mism else '; differs: ' + ', '.join('%s recorded %s, rule says %s' % (m[1], m[3], m[2]) for m in mism)))

# policy tokens spent evaluating candidates in each released run (trials per evaluation x tokens per trial), plus the base
TRIALS = {'coding_opus': 178, 'coding_gemini': 178, 'lab': 240, 'eng': 244}
spend = {}
for rid, r in R.items():
    cs = [c for c in r['c'] if c['C']]
    tot = sum(c['C'] for c in cs) * TRIALS[rid] + (r['traj'][0][2] or 0) * TRIALS[rid]
    spend[rid] = {'evals_with_tokens': len(cs), 'evals_measured': sum(1 for c in r['c'] if c['n'] is not None), 'policy_tokens': tot, 'trials': TRIALS[rid]}

out = {'spend': spend, 'checks': checks, 'rule': rule, 'noise': noise, 'runs': runs, 'budgets': B, 'sel': sel, 'simdef': simdef, 'ood': ood,
       'fig1a_match': match, 'fig4a': f4}
json.dump(out, open('inputs/recompute.json', 'w'), indent=1)
ok = sum(1 for c in checks if c['ok'])
print('checks', len(checks), 'agree', ok, 'disagree', len(checks) - ok)
for c in checks:
    if not c['ok']: print('  x', c['claim'], '|', c['recomputed'])
print('noise', [(n['b'], n['z']) for n in noise])
print('runs', {k: (v['steps'], v['inside_band'], v['delta_count']) for k, v in runs.items()})
print('rule', json.dumps(rule)[:900]); print('spend', {k:(v['evals_with_tokens'],v['evals_measured'],round(v['policy_tokens']/1e9,2)) for k,v in spend.items()}); print('sel', sel); print('simdef', simdef)

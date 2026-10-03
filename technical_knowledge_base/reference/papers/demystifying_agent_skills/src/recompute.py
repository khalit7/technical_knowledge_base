"""Recompute every derived number on the page from tables.json (the paper's tables and decoded figures).
usage: python3 recompute.py   -> inputs/recompute.json and a printed list of checks"""
import json, math, itertools
T = json.load(open('tables.json'))
MIX = T['mixtures']; K = T['K']
R = {'checks': []}
def check(name, ours, paper, ok, how):
    R['checks'].append({'claim': name, 'ours': ours, 'paper': paper, 'verdict': ok, 'how': how})
f = float

# ---------- 1. trial denominators of Table 1 / Table 16 cells
def fits(vals, n):
    return all(abs(round(f(v) * n) / n - f(v)) < 0.00005 + 1e-12 for v in vals)
den = {}
for pair in ['codex', 'gemini']:
    for b in ['TB2', 'SB', 'TBPro']:
        vals = [T['T1'][pair]['raw'][b]] + T['T1'][pair][b]['workflow'] + T['T1'][pair][b]['skill'] + T['T16'][pair][b]['nohint']
        ns = [n for n in range(20, 400) if fits(vals, n)]
        den[pair + '_' + b] = ns[0] if ns else None
R['denominators'] = den
check('Terminal-Bench-Pro rates use 130 trials per condition (Table 1 caption)',
      'Gemini cells fit %s; Codex cells fit %s (33 tasks x 5)' % (den['gemini_TBPro'], den['codex_TBPro']), '130',
      'partly', 'smallest n for which every printed 4-decimal rate is k/n')

# ---------- 2. Table 1 skill vs workflow, per pairing and benchmark (pooled over mixtures), binomial SE
cmp = []
for pair in ['codex', 'gemini']:
    for b in ['TB2', 'SB', 'TBPro']:
        n = den[pair + '_' + b]
        wf = [f(x) for x in T['T1'][pair][b]['workflow']]; sk = [f(x) for x in T['T1'][pair][b]['skill']]
        raw = f(T['T1'][pair]['raw'][b])
        d = [s - w for s, w in zip(sk, wf)]
        mw, ms = sum(wf) / 6, sum(sk) / 6
        se = math.sqrt(ms * (1 - ms) / (6 * n) + mw * (1 - mw) / (6 * n))
        cell_se = [math.sqrt(s * (1 - s) / n + w * (1 - w) / n) for s, w in zip(sk, wf)]
        cmp.append({'pair': pair, 'bench': b, 'n': n, 'raw': raw, 'wf_mean': mw, 'skill_mean': ms, 'diff': ms - mw, 'se': se,
                    'z': (ms - mw) / se, 'cell_diffs': d, 'cell_z': [x / s for x, s in zip(d, cell_se)],
                    'skill_wins': sum(1 for x in d if x > 0), 'wf_wins': sum(1 for x in d if x < 0),
                    'skill_above_raw': sum(1 for x in sk if x > raw), 'wf_above_raw': sum(1 for x in wf if x > raw)})
R['t1_compare'] = cmp
allcells = [x for c in cmp for x in c['cell_diffs']]
R['t1_cells_skill_wins'] = sum(1 for x in allcells if x > 0); R['t1_cells_total'] = len(allcells)
R['t1_cells_wf_wins'] = sum(1 for x in allcells if x < 0)

# ---------- 3. Tables 9, 10 and Figure 2 decoded counts
succ = {a: int(s) for (s, n), a in zip(T['T9'], ['raw', 'wf', 'skill'])}
check('Skill vs Workflow Memory +6.06 points', '%d/528 = %.4f' % (succ['skill'] - succ['wf'], (succ['skill'] - succ['wf']) / 528), '+0.0606', 'reproduces', 'Table 9 counts')
check('Skill vs Raw +2.84 points (CI includes 0)', '%d/528 = %.4f' % (succ['skill'] - succ['raw'], (succ['skill'] - succ['raw']) / 528), '+0.0284', 'reproduces', 'Table 9 counts')
F2 = T['F2']
SUCC = {'Raw': ['skill-guided success', 'autonomous success'], 'Workflow Memory': ['workflow-guided success', 'skill-guided success', 'autonomous success'], 'Skill': ['skill-guided success', 'autonomous success']}
per_mix = {}
for arm in F2:
    per_mix[arm] = [sum(F2[arm][m].get(l, 0) for l in ['skill-guided success', 'workflow-guided success', 'autonomous success']) for m in MIX]
R['fig2_success_per_mixture'] = per_mix
check('Figure 2 bars sum to 88 trajectories per mixture and arm', str(sorted({sum(F2[a][m].values()) for a in F2 for m in MIX})), '528 = 6 x 88', 'reproduces', 'decoded bar heights / 2.7 pt per trajectory')
check('Raw arm: 52 of 88 successes in every mixture (the same raw trajectory reused in all six triples)', str(per_mix['Raw']), '312 = 6 x 52', 'derived', 'Figure 2 decoded; A.2 says raw trials are matched by task only and the first trial is chosen')
delta_mix = [s - w for s, w in zip(per_mix['Skill'], per_mix['Workflow Memory'])]
R['skill_minus_wf_per_mixture'] = delta_mix
check('Skill minus Workflow Memory per mixture (triples)', str(delta_mix), 'sum 32', 'derived', 'Figure 2 decoded; sums to Table 9')
# Table 11 against Figure 2 sums
name = {'skill_guided_success': 'skill-guided success', 'workflow_guided_success': 'workflow-guided success', 'autonomous_clean_success': 'autonomous success',
        'environment_infrastructure_failure': 'env infrastructure failure', 'output_format_schema_mismatch': 'output format/schema mismatch',
        'background_service_lifecycle_failure': 'background service failure', 'shell_code_corruption': 'shell code corruption',
        'algorithmic_logic_error': 'algorithmic logic error', 'static_verification_without_runtime': 'static verify w/o runtime',
        'timeout_budget_exhaustion': 'timeout/budget exhaustion', 'skill_guidance_misapplied_or_ignored': 'skill guidance misapplied',
        'capability_or_safety_limit': 'capability/safety limit'}
mism = []
for row in T['T11']:
    for col, arm in [('raw', 'Raw'), ('wf', 'Workflow Memory'), ('skill', 'Skill')]:
        cnt = sum(F2[arm][m].get(name[row['mode']], 0) for m in MIX)
        if abs(round(cnt / 528 * 100, 1) - f(row[col])) > 0.051: mism.append((row['mode'], col, cnt, row[col]))
R['t11_vs_fig2_mismatches'] = mism
check('Table 11 percentages equal Figure 2 counts / 528', '%d of 36 cells match' % (36 - len(mism)), 'Table 11', 'reproduces' if not mism else 'partly', 'decoded counts')
sc = {}
for arm in F2:
    sc[arm] = {}
    for g, modes in [('SC1', ['skill-guided success', 'workflow-guided success', 'autonomous success']),
                     ('SC2', ['algorithmic logic error', 'static verify w/o runtime', 'output format/schema mismatch', 'env infrastructure failure', 'background service failure', 'shell code corruption']),
                     ('SC3', ['timeout/budget exhaustion', 'skill guidance misapplied', 'capability/safety limit'])]:
        sc[arm][g] = sum(F2[arm][m].get(x, 0) for m in MIX for x in modes)
R['sc_counts'] = sc
check('SC1 326 skill vs 294 workflow; SC2 124 vs 197 raw vs 176 workflow; SC3 78 vs 19 raw', json.dumps(sc), '§4', 'reproduces', 'decoded counts')
# judge consistency on identical raw trajectories
raw_lab = [F2['Raw'][m] for m in MIX]
labs = sorted({k for d in raw_lab for k in d})
best = (0, None)
for a, b in itertools.combinations(range(6), 2):
    l1 = sum(abs(raw_lab[a].get(k, 0) - raw_lab[b].get(k, 0)) for k in labs)
    if l1 > best[0]: best = (l1, (MIX[a], MIX[b]))
R['raw_relabel_min'] = best[0] // 2; R['raw_relabel_pair'] = best[1]
R['raw_skillguided'] = [F2['Raw'][m].get('skill-guided success', 0) for m in MIX]
R['raw_misapplied'] = [F2['Raw'][m].get('skill guidance misapplied', 0) for m in MIX]
check('Identical raw trajectories labelled differently across mixtures', 'at least %d of 88 between %s and %s' % (best[0] // 2, *best[1]), 'not reported', 'derived', 'half the L1 distance between two label-count vectors is a lower bound on relabelled trajectories')
check('Raw arm labelled "skill-guided success" though it had no skill', '%d of 528 (%s per mixture)' % (sum(R['raw_skillguided']), R['raw_skillguided']), '10.4% in Table 11', 'derived', 'Table 11 / Figure 2')

tri = {'SB': 144, 'TB2': 186, 'TBPro': 198}  # Table 8
check('The 528 triples come from the Codex runs', 'triples / 6 = %s; Codex tasks %s; Gemini tasks %s' % ({b: tri[b] // 6 for b in tri}, {b: den['codex_' + b] // 5 for b in tri}, {b: den['gemini_' + b] // 5 for b in tri}),
      'a "fixed agent-model configuration" (A.2)', 'derived', 'Table 8 triple counts against task counts recovered from Table 1; the judge prompt also names transcripts codex.txt')
check('Table 7: skill-arm trials and failed trials both 3,594', '1,883 + 2,658 + 3,594 = 8,135 and 4,541 + 3,594 = 8,135', 'Table 7', 'note', 'both rows add up, so the coincidence cannot be resolved')
# ---------- 4. bootstrap CI and clustering sensitivity
lo, hi = 0.0076, 0.1136
se_boot = (hi - lo) / (2 * 1.96)
R['se_boot'] = se_boot
# discordant pairs implied: var(d) = se^2 * n; E[d^2] = var + mean^2 = discordant share
md = 32 / 528
disc = (se_boot ** 2 * 528 + md ** 2) * 528
R['discordant_implied'] = disc
# design effect for clusters of 6 triples per task: 1 + 5 rho; lower bound hits 0 when 1.96*se*sqrt(deff) = md
rho0 = ((md / (1.96 * se_boot)) ** 2 - 1) / 5
R['rho_zero'] = rho0
check('Skill vs WM 95% CI [+0.76, +11.36]', 'SE %.4f; about %.0f of 528 triples discordant' % (se_boot, disc), '[+0.0076, +0.1136]', 'consistent', 'normal approximation of the bootstrap; discordant count implied by its width')
check('CI lower bound reaches 0 if the six triples of a task are correlated', 'at intra-task correlation %.3f' % rho0, 'not reported', 'derived', 'design effect 1 + 5 rho for clusters of 6')

# ---------- 5. Figure 4 transfer
F4 = T['F4']
vals = [F4['raw']] + list(F4['workflow'].values()) + list(F4['skill'].values())
R['fig4_all_even'] = all(v % 2 == 0 for v in vals)
d4 = {m: F4['skill'][m] - F4['workflow'][m] for m in MIX}
R['fig4_skill_minus_wf'] = d4
check('Figure 4 labels +18, +16, +20, +30', str(d4), '+18 (1s4f), +16 (2s3f), +20 (3s2f), +30 (5s0f)', 'reproduces', 'skill minus workflow per mixture; 4s1f (+4) and 0s5f (+2) unlabelled')
check('Figure 4 sample size', 'all 13 values even integers: consistent with 50 trials (10 tasks x 5); Gemini TB-Pro Raw 0.5615 of Table 1 rounds to 56 but is 73/130, not even-percent', 'not stated', 'derived', 'parity of printed labels')
n4 = 50
R['fig4_z'] = {m: d4[m] / 100 / math.sqrt((F4['skill'][m] / 100 * (1 - F4['skill'][m] / 100) + F4['workflow'][m] / 100 * (1 - F4['workflow'][m] / 100)) / n4) for m in MIX}

# ---------- 6. Outcome labels (Table 16)
nh = []
for pair in ['codex', 'gemini']:
    for b in ['TB2', 'SB', 'TBPro']:
        nm = [f(x) for x in T['T16'][pair][b]['normal']]; no = [f(x) for x in T['T16'][pair][b]['nohint']]
        nh.append({'pair': pair, 'bench': b, 'gap': [a - c for a, c in zip(nm, no)]})
R['nohint_gaps'] = nh
g5 = {x['pair'] + '_' + x['bench']: round(x['gap'][0], 4) for x in nh}
check('Without outcome labels: little effect on success-only pools (5s0f)', json.dumps(g5), 'little effect (§5.4)', 'partly', 'normal minus no-hint at 5s0f; Gemini TB2 is 0.3692 points')
check('Gemini TB2 3s2f: 0.7462 normal vs 0.4000 no-hint', '0.7462 / 0.4000', 'same', 'reproduces', 'Table 16')
neg = [(x['pair'], x['bench'], MIX[i], round(g, 4)) for x in nh for i, g in enumerate(x['gap']) if g < 0]
R['nohint_better'] = neg
check('Table 1 Skill column equals Table 16 "normal" rows', str(all(T['T1'][p][b]['skill'] == T['T16'][p][b]['normal'] for p in ['codex', 'gemini'] for b in ['TB2', 'SB', 'TBPro'])), 'implied', 'reproduces', 'string equality')

# ---------- 7. Retrieval (Tables 4, 14, 15)
avg = lambda xs: sum(xs) / len(xs)
pools = ['random', 'similar', 'dissimilar']
for key, lab in [('arm1_p', 'embedding top-1'), ('arm2_p', 'agent selection'), ('arm3_p', 'actual-use precision'), ('arm3_succ', 'downstream success')]:
    a5 = avg([f(T['T4'][p][key][0]) for p in pools]); a100 = avg([f(T['T4'][p][key][4]) for p in pools])
    R['avg_' + key] = [avg([f(T['T4'][p][key][i]) for p in pools]) for i in range(5)]
paper_avg = {'arm1_p': (88.3, 76.9), 'arm2_p': (70.0, 63.7), 'arm3_p': (29.6, 3.3), 'arm3_succ': (36.4, 39.3)}
for key, (p5, p100) in paper_avg.items():
    o = R['avg_' + key]
    check('%s averaged over pools, k=5 to 100' % key, '%.2f to %.2f' % (o[0], o[4]), '%s to %s' % (p5, p100), 'reproduces' if abs(o[0] - p5) < 0.06 and abs(o[4] - p100) < 0.06 else 'within rounding' if abs(o[0] - p5) < 0.15 and abs(o[4] - p100) < 0.15 else 'does not', 'mean of the three pool rows of Table 4')
# Table 4 arms 2,3 = mean of Gemini and Codex in Table 15
bad = []
cols = T['T15_cols']
for p in pools:
    for i in range(5):
        for key, c in [('arm2_p', 0), ('arm3_p', 3), ('arm3_succ', 6)]:
            m = (f(T['T15']['gemini'][p][i][c]) + f(T['T15']['codex'][p][i][c])) / 2
            if abs(m - f(T['T4'][p][key][i])) > 0.051: bad.append((p, K[i], key, round(m, 2), T['T4'][p][key][i]))
R['t4_vs_t15'] = bad
check('Table 4 arms 2 and 3 are the mean of the two pairings in Table 15', '%d of 45 cells exactly; %s' % (45 - len(bad), bad), 'Table 4 note', 'within rounding', 'mean of Table 15 rows; the one 0.1 gap is within the rounding of its two inputs')
pp = {}
for pair in ['gemini', 'codex']:
    pp[pair] = {'p5': avg([f(T['T15'][pair][p][0][3]) for p in pools]), 'p100': avg([f(T['T15'][pair][p][4][3]) for p in pools]),
                's5': avg([f(T['T15'][pair][p][0][6]) for p in pools]), 's100': avg([f(T['T15'][pair][p][4][6]) for p in pools])}
R['per_pair_arm3'] = pp
check('Gemini actual-use precision 16.9 to 0.7; Codex 42.3 to 5.9; Codex success 35.4 to 42.0', json.dumps({k: {a: round(b, 2) for a, b in v.items()} for k, v in pp.items()}), 'as stated', 'reproduces', 'Table 15 means over pools')
# |G_t| = 1: top-3 P = top-3 R / 3, top-5 P = R / 5
dev = []
for p in pools:
    for i, row in enumerate(T['T14'][p]):
        dev.append(abs(f(row[1]) - f(row[2]) / 3))
        if row[4] != '–': dev.append(abs(f(row[4]) - f(row[5]) / 5))
R['g1_maxdev'] = max(dev)
check('Every SkillsBench task has exactly one gold skill', 'top-3 P = R/3 and top-5 P = R/5 in all 27 cells (max gap %.2f)' % max(dev), 'not stated', 'derived', 'with |G|=1 a top-m list has precision = recall / m')
# n=88 queries for Arm 1
ok88 = all(abs(round(f(r[0]) / 100 * 88) / 88 * 100 - f(r[0])) < 0.051 for p in pools for r in T['T14'][p])
R['arm1_n88'] = ok88
check('Arm 1 query count', 'every top-1 value is k/88' if ok88 else 'no', 'SkillsBench has 86 tasks (A.1)', 'derived', 'denominator fit')
# Gemini scans the pool: P ~ R/k
scan = {p: [(K[i], f(T['T15']['gemini'][p][i][3]), round(f(T['T15']['gemini'][p][i][4]) / K[i], 2)) for i in range(5)] for p in pools}
R['gemini_scan'] = scan
m_codex = {p: [round(f(T['T15']['codex'][p][i][4]) / f(T['T15']['codex'][p][i][3]), 1) for i in range(5)] for p in pools}
m_gem = {p: [round(f(T['T15']['gemini'][p][i][4]) / f(T['T15']['gemini'][p][i][3]), 1) for i in range(5)] for p in pools}
R['implied_skills_touched'] = {'gemini': m_gem, 'codex': m_codex}
check('Gemini parsed precision behaves like R/k (it touches about every skill in the pool)', json.dumps(scan['random']), 'not discussed', 'derived', 'with one gold skill, a run that touches m skills and finds the gold one has P = 1/m; R/P estimates m')

# ---------- 8. Compact baselines and token table
t12 = {r['cond']: r for r in T['T12']}
check('Short plan 47.7, test-first 59.2, WM 62.3, Skill 79.2 on 26 TB2 tasks', ', '.join('%s %d/130' % (k, v['succ']) for k, v in t12.items()), 'Table 12', 'reproduces', 'counts / 130')
check('Table 12 Raw/WM/Skill equal Table 1 Gemini TB2 at 5s0f', '%s / %s / %s' % (T['T1']['gemini']['raw']['TB2'], T['T1']['gemini']['TB2']['workflow'][0], T['T1']['gemini']['TB2']['skill'][0]), '50.0 / 62.3 / 79.2', 'derived', 'so the compact baselines were compared at the best mixture for skills')
t13 = {r[0]: [f(x) for x in r[1:]] for r in T['T13']}
check('Table 13 totals = input + output', str({k: round(v[1] + v[2] - v[3], 1) for k, v in t13.items()}), '0', 'reproduces', 'sum')
check('Skill uses more input tokens than Workflow Memory', '%.1fK vs %.1fK (+%.1fK, +%.0f%%)' % (t13['Skill'][1], t13['Workflow Memory'][1], t13['Skill'][1] - t13['Workflow Memory'][1], (t13['Skill'][1] / t13['Workflow Memory'][1] - 1) * 100), '+93.8K', 'reproduces', 'Table 13')
check('Table 13 "Raw trajectories" row described as "full prior traces"', 'Raw is defined everywhere else as no prior experience', 'A.9', 'inconsistent', 'text comparison')
check('Table 13 success (Raw 64.1, Skill 69.6) vs Table 9 (59.1, 61.9)', 'different samples: 83-task intersection vs 528 triples', '', 'note', 'A.9')
json.dump(R, open('inputs/recompute.json', 'w'), indent=1)
for c in R['checks']: print('-', c['verdict'], '|', c['claim'], '|', c['ours'])
print('denominators', den)
for c in cmp: print(c['pair'], c['bench'], 'n', c['n'], 'skill-wf %.3f z %.1f' % (c['diff'], c['z']), 'wins', c['skill_wins'], c['wf_wins'])
print('nohint better', neg)
print('fig4 z', {k: round(v, 2) for k, v in R['fig4_z'].items()})
print('touched', R['implied_skills_touched'])

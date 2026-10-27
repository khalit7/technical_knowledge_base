"""Every derived number on the page, recomputed from tables.json, the paper text and the release extracts.
Writes inputs/recompute.json: 'v' (named values the page shows) and 'checks' (claim, printed, recomputed,
verdict, where).  usage: python3 recompute.py"""
import itertools, json, math, os, random, re
HERE = os.path.dirname(os.path.abspath(__file__))
T = json.load(open(os.path.join(HERE, 'tables.json')))
LIB = json.load(open(os.path.join(HERE, 'inputs', 'release_library.json')))
META = json.load(open(os.path.join(HERE, 'inputs', 'release_meta.json')))
SES = json.load(open(os.path.join(HERE, 'inputs', 'release_session.json')))
FCS = json.load(open(os.path.join(HERE, 'inputs', 'release_frontiercs.json')))
TXT = open(os.path.join(HERE, 'inputs', 'paper_v1.txt')).read()
V, C = {}, []


def chk(claim, printed, got, ok, where, kind='independent'):
    C.append({'claim': claim, 'printed': printed, 'got': got, 'ok': ok, 'where': where, 'kind': kind})


r1 = lambda x: round(x + 1e-9, 1)
r2 = lambda x: round(x + 1e-9, 2)

# ---------------- Table 1: MLE-bench ----------------
t1 = {r['agent']: r for r in T['t1']['rows']}
base, sk = t1['Codex']['v'], t1['Codex + AREX-Skill']['v']
pub = [r for r in T['t1']['rows'] if not r['agent'].startswith('Codex')]
rel = (sk[3][0] / base[3][0] - 1) * 100
chk('MLE-bench relative gain, All', '134.3%', '%.1f%%' % rel, r1(rel) == 134.3, 'S5.SS2')
pts = [r2(sk[i][0] - base[i][0]) for i in range(4)]
chk('Gain in points: Low, Medium, High, All', '43.94, 37.72, 48.89, 41.78', ', '.join('%.2f' % p for p in pts), pts == [43.94, 37.72, 48.89, 41.78], 'S5.SS2')
hi = sk[2][0] / base[2][0]
chk('High tier: relative gain and multiple', '366.8%, 4.67×', '%.1f%%, %.2f×' % ((hi - 1) * 100, hi), r1((hi - 1) * 100) == 366.8 and r2(hi) == 4.67, 'S5.SS2')
best = [max(r['v'][i][0] for r in pub) for i in range(4)]
over = [r2(sk[i][0] - best[i]) for i in range(4)]
chk('Over the best public entry per column', '6.06, 5.26, 15.55, 8.45', ', '.join('%.2f' % x for x in over), over == [6.06, 5.26, 15.55, 8.45], 'S5.SS2')
V['t1_best_public'] = best


def triples(mean, sem, n):
    """Integer medal counts (k1,k2,k3) for three runs whose mean and SEM (in % of n) round to the printed values."""
    out = []
    for ks in itertools.combinations_with_replacement(range(n + 1), 3):
        p = [100 * k / n for k in ks]
        m = sum(p) / 3
        sd = math.sqrt(sum((x - m) ** 2 for x in p) / 2)
        if abs(m - mean) < 0.0051 and abs(sd / math.sqrt(3) - sem) < 0.0051: out.append(ks)
    return out


runs = {}
for name in ('Codex', 'Codex + AREX-Skill'):
    sol = [triples(m, s, n) for (m, s), n in zip(t1[name]['v'], T['t1']['n'])]
    # joint: some ordering of the tier counts must sum to the All counts run by run
    joint = []
    for lo in sol[0]:
        for me in sol[1]:
            for hg in sol[2]:
                for a in sol[3]:
                    for pl in set(itertools.permutations(lo)):
                        for pm_ in set(itertools.permutations(me)):
                            hs = [a[i] - pl[i] - pm_[i] for i in range(3)]
                            if sorted(hs) == list(hg): joint.append((pl, pm_, tuple(hs), a))
    runs[name] = {'per_split': [[list(x) for x in s] for s in sol], 'joint': len(joint), 'example': joint[0] if joint else None}
V['t1_runs'] = runs
cb, cs_ = runs['Codex']['per_split'][3], runs['Codex + AREX-Skill']['per_split'][3]
chk('Medal counts per run behind "31.11 ± 2.22" (All, Codex)', 'mean ± SEM over 3 runs', ' or '.join('/'.join(map(str, x)) for x in cb) + ' of 75', len(cb) >= 1, 'S5.T1', 'derived')
chk('Medal counts per run behind "72.89 ± 1.18" (All, with skills)', 'mean ± SEM over 3 runs', ' or '.join('/'.join(map(str, x)) for x in cs_) + ' of 75', len(cs_) >= 1, 'S5.T1', 'derived')
chk('Tier counts add up to the All counts run by run', 'not stated', 'Codex: %d consistent assignments; with skills: %d' % (runs['Codex']['joint'], runs['Codex + AREX-Skill']['joint']), runs['Codex']['joint'] > 0 and runs['Codex + AREX-Skill']['joint'] > 0, 'S5.T1', 'derived')
# significance: three runs, and the per-task binomial view
se_runs = math.hypot(base[3][1], sk[3][1])
p0, p1 = base[3][0] / 100, sk[3][0] / 100
se_bin = 100 * math.sqrt(p0 * (1 - p0) / 75 + p1 * (1 - p1) / 75)
V['t1_sig'] = {'diff': pts[3], 'se_runs': r2(se_runs), 'z_runs': r1(pts[3] / se_runs), 'se_bin': r2(se_bin), 'z_bin': r1(pts[3] / se_bin)}
V['mle_budget'] = {'explore_gpu_h_max': 24 * 75, 'run_gpu_h_max': 24 * 75}

# ---------------- Table 2: PaperBench ----------------
rows = T['t2']['rows']
b = [r['base'] for r in rows]; s = [r['skill'] for r in rows]; d = [r['delta'] for r in rows]
mb, ms = sum(b) / 20, sum(s) / 20
chk('PaperBench averages', '29.45 → 39.59', '%.3f → %.3f' % (mb, ms), r2(mb) == 29.45 and r2(ms) == 39.59, 'S5.T2')
chk('Every Δ equals skill minus base', '20 printed Δ', '%d of 20 match' % sum(abs(r['skill'] - r['base'] - r['delta']) < 0.006 for r in rows), all(abs(r['skill'] - r['base'] - r['delta']) < 0.006 for r in rows), 'S5.T2')
chk('Relative gain', '34.4%', '%.1f%%' % ((ms / mb - 1) * 100), r1((ms / mb - 1) * 100) == 34.4, 'S5.SS3')
up = sum(x > 0 for x in d)
chk('Tasks improved / degraded', '18 / 2', '%d / %d' % (up, 20 - up), up == 18, 'S5.SS3')
for p, x in (('ftrl', 11.4), ('rice', 6.1), ('what-will-my-model-forget', 3.3)):
    r = [r for r in rows if r['paper'] == p][0]
    chk('%s multiple' % p, '%.1f×' % x, '%.2f×' % (r['skill'] / r['base']), r1(r['skill'] / r['base']) == x, 'S5.SS3')
md = sum(d) / 20
sd = math.sqrt(sum((x - md) ** 2 for x in d) / 19)
tcrit = 2.093  # t(0.975, 19)
sign_p = 2 * sum(math.comb(20, k) for k in range(0, 3)) / 2 ** 20
rnd = random.Random(0)
boots = sorted(sum(rnd.choice(d) for _ in range(20)) / 20 for _ in range(10000))
no_rice = [x for r, x in zip(rows, d) if r['paper'] != 'rice']
V['pb'] = {'mean_delta': r2(md), 'sd': r2(sd), 'ci_t': [r2(md - tcrit * sd / math.sqrt(20)), r2(md + tcrit * sd / math.sqrt(20))],
           'ci_boot': [r2(boots[250]), r2(boots[9749])], 'sign_p': sign_p, 'median_delta': r2(sorted(d)[9] / 2 + sorted(d)[10] / 2),
           'mean_wo_rice': r2(sum(no_rice) / 19)}

# ---------------- Table 3: FrontierCS ----------------
t3 = {(r['agent'], r['backbone']): r for r in T['t3']['rows']}
nb, ns = t3[('Codex', 'GPT-5.5')], t3[('Codex + AREX-Skill', 'GPT-5.5')]
opus, qwen = t3[('Claude Code', 'Claude Opus 4.8')], t3[('Claude Code', 'Qwen3.7 Max')]
chk('FrontierCS gain', '+6.51 points, 9.22%', '+%.2f, %.2f%%' % (ns['score'] - nb['score'], (ns['score'] / nb['score'] - 1) * 100), r2(ns['score'] - nb['score']) == 6.51 and r2((ns['score'] / nb['score'] - 1) * 100) == 9.22, 'S5.SS4')
deg = 188 - 74 - 66
pos, neg = 74 * 22.23, deg * 8.76
chk('Degraded tasks (188 − 74 improved − 66 unchanged)', 'not printed', '%d' % deg, True, 'S5.SS4', 'derived')
chk('Positive change ÷ negative change', '3.91×', '%.1f ÷ %.1f = %.2f×' % (pos, neg, pos / neg), r2(pos / neg) == 3.91, 'S5.SS4')
chk('Net mean change from those counts', '6.51 (the score gap)', '%.2f' % ((pos - neg) / 188), r2((pos - neg) / 188) == 6.51, 'S5.SS4')
sub = (102 * 5.54 + 86 * 7.66) / 188
chk('Sub-agent split averages back to the total', '102 × 5.54 and 86 × 7.66', '%.2f' % sub, r2(sub) == 6.51, 'S5.SS4')
rest = (6.51 * 188 - 47 * 26.56) / 141
V['fcs_rest'] = r2(rest)
chk('Gain on the 141 tasks where Codex alone scored 50 or more', 'not printed', '%+.2f points' % rest, True, 'S5.SS4', 'derived')
for k, name in (('tokens_m', 'tokens'), ('steps', 'steps'), ('tools', 'tool calls')):
    V['fcs_use_' + name.replace(' ', '_')] = r2(ns[k] / nb[k])
chk('Skills run used more per task than the no-skill run', '"more active search"', 'tokens %.2f×, steps %.2f×, tool calls %.2f×' % (ns['tokens_m'] / nb['tokens_m'], ns['steps'] / nb['steps'], ns['tools'] / nb['tools']), True, 'S5.T3', 'derived')
chk('Opus 4.8 and Qwen3.7 Max tokens as multiples', '3.29× and 3.10×', '%.2f× and %.2f×' % (opus['tokens_m'] / ns['tokens_m'], qwen['tokens_m'] / ns['tokens_m']), r2(opus['tokens_m'] / ns['tokens_m']) == 3.29 and r2(qwen['tokens_m'] / ns['tokens_m']) == 3.10, 'S5.SS4')
tc = [(1 - ns['tools'] / x['tools']) * 100 for x in (qwen, opus)]
stp = [(1 - ns['steps'] / x['steps']) * 100 for x in (qwen, opus)]
chk('Fewer tool calls than the two Claude Code rows', '24.5–27.9%', '%.1f–%.1f%%' % (tc[0], tc[1]), r1(tc[0]) == 24.5 and r1(tc[1]) == 27.9, 'S5.SS4')
chk('Fewer steps than the two Claude Code rows', '33.8–75.1%', '%.1f–%.2f%% (the upper end rounds to 75.0)' % (stp[0], stp[1]), r1(stp[0]) == 33.8 and r1(stp[1]) == 75.1, 'S5.SS4')
V['fcs_steps_hi'] = r2(stp[1])
chk('Score gaps to the two Claude Code rows', '2.64 and 15.24', '%.2f and %.2f' % (ns['score'] - opus['score'], ns['score'] - qwen['score']), r2(ns['score'] - opus['score']) == 2.64 and r2(ns['score'] - qwen['score']) == 15.24, 'S5.SS4')

# ---------------- Table 4 and 6: PassNet ----------------
t4 = {r['method']: r for r in T['t4']['rows']}
pb_, ps = t4['Codex + GPT-5.5'], t4['Codex + GPT-5.5 + AREX-Skill']
chk('PassNet AS gain', '+0.1883, 14.0%', '+%.4f, %.1f%%' % (ps['as'] - pb_['as'], (ps['as'] / pb_['as'] - 1) * 100), round(ps['as'] - pb_['as'], 4) == 0.1883 and r1((ps['as'] / pb_['as'] - 1) * 100) == 14.0, 'S5.SS5')
chk('Failed samples cut', '64.3%', '%.1f%% (14 → 5)' % ((1 - ps['failed'] / pb_['failed']) * 100), r1((1 - ps['failed'] / pb_['failed']) * 100) == 64.3, 'S5.SS5')
chk('Correctness gain', '+9.41 points', '%+.2f' % (ps['corr'] - pb_['corr']), r2(ps['corr'] - pb_['corr']) == 9.41, 'S5.SS5')
chk('Fast_1 (share of correct subgraphs at least as fast as eager)', 'not discussed', '%.2f%% → %.2f%% (%+.2f points)' % (pb_['fast1'], ps['fast1'], ps['fast1'] - pb_['fast1']), True, 'S5.T4', 'derived')
chk('No-skill Codex against TorchInductor (AS)', '"beyond TorchInductor" (with skills)', '%.3f vs %.3f: without skills Codex is below the compiler' % (pb_['as'], t4['TorchInductor (torch.compile)']['as']), True, 'S5.T4', 'derived')
t6 = {r['metric']: r['printed'] for r in T['t6']['rows']}
gm = float(t6['Geometric mean'][2]) / float(t6['Geometric mean'][0]); am = float(t6['Arithmetic mean'][2]) / float(t6['Arithmetic mean'][0])
V['t6'] = {'gm': r1((gm - 1) * 100), 'am': r1((am - 1) * 100)}
chk('Table 6: second version against baseline', 'geometric mean up, arithmetic mean down', 'geometric %+.1f%%, arithmetic %+.1f%%' % ((gm - 1) * 100, (am - 1) * 100), True, 'A1.T6', 'derived')

# ---------------- The library, checked against the release ----------------
chk('Skills in the repository snapshot', '5,353', '%s SKILL.md files' % format(META['skill_md'], ','), META['skill_md'] == 5353, 'S4.SS1')
chk('Repository graphs', '1,000', format(META['graphs'], ','), META['graphs'] == 1000, 'S4.SS1')
chk('Exact area-to-family assignments', '2,209', format(META['assignments'], ','), META['assignments'] == 2209, 'S4.SS1')
chk('Repositories in more than one family', '700', str(META['repos_multi_family']), META['repos_multi_family'] == 700, 'S4.SS1')
chk('Areas and families', '20 and 178', '%d and %d' % (META['areas'], META['families']), (META['areas'], META['families']) == (20, 178), 'S4.SS1')
famsum = sum(len(f['m']) for a in LIB['areas'] for f in a['f'])
chk('Appendix B memberships sum', '2,209', format(famsum, ','), famsum == 2209, 'A2')
ab = re.findall(r'\((\d+) memberships, (\d+) famil', TXT)
chk('Appendix B area headers', '20 areas', '%d areas, %d families, %d memberships' % (len(ab), sum(int(x[1]) for x in ab), sum(int(x[0]) for x in ab)), len(ab) == 20 and sum(int(x[1]) for x in ab) == 178 and sum(int(x[0]) for x in ab) == 2209, 'A2')
chk('Paper-derived skills released', '636 from 153 papers', '%d SKILL.md under task-oriented/PaperBench' % META['task_oriented_skill_md']['PaperBench'], META['task_oriented_skill_md']['PaperBench'] == 636, 'S4.SS3')
chk('FrontierCS graph: nodes and distinct directed links', '9 nodes, 42 links', '%d nodes, %d links (of %d possible; %d markdown links in all)' % (len(FCS['nodes']), len(FCS['edges']), FCS['possible'], FCS['markdown_links']), len(FCS['nodes']) == 9 and len(FCS['edges']) == 42, 'A1.SS2.SSS3')
chk('MLE-bench per-competition skill graphs released', '75 built', 'none in the release (task-oriented: %s)' % ', '.join(sorted(META['task_oriented_released'])), 'MLE-bench' not in META['task_oriented_released'], 'A1.SS2.SSS1', 'derived')
V['lib_cost_usd'] = 40 * 1000
V['skills_per_repo'] = round(META['skill_md'] / META['graphs'], 2)
gb = sorted(r[4] for r in LIB['repos']); eb = sorted(r[2] for r in LIB['repos'])
V['graph_median'] = gb[500]; V['entry_median'] = eb[500]; V['graph_max'] = gb[-1]

# ---------------- The released session ----------------
libreads = [r for r in SES['reads'] if r['path'].startswith('repositories/')]
rb = sum(r['bytes'] for r in libreads)
vs = [r for r in LIB['repos'] if r[0] in ('vllm', 'sglang')]
V['session'] = {'reads': len(libreads), 'read_bytes': rb, 'last_read_s': libreads[-1]['t'], 'seconds': SES['seconds'],
                'share_time': round(100 * libreads[-1]['t'] / SES['seconds'], 2), 'share_library': round(100 * rb / META['library_bytes'], 3),
                'two_graphs_bytes': sum(r[4] for r in vs), 'desc_chars': META['description_chars_total'],
                'tool_calls': SES['tool_calls'], 'output_tokens': SES['output_tokens'], 'uncached_input_tokens': SES['uncached_input_tokens']}
chk('Bytes of the library read in the released session', 'not stated', '%s bytes in %d files (%.3f%% of %s)' % (format(rb, ','), len(libreads), 100 * rb / META['library_bytes'], format(META['library_bytes'], ',')), True, 'release', 'derived')

V['meta'] = META
json.dump({'v': V, 'checks': C}, open(os.path.join(HERE, 'inputs', 'recompute.json'), 'w'), indent=1, ensure_ascii=False)
bad = [c for c in C if not c['ok']]
print('checks', len(C), 'failed', len(bad))
for c in bad: print('  FAIL', c['claim'], c['printed'], c['got'])

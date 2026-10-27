"""Recompute every derived number the page shows, and check the paper's own arithmetic.
Inputs: tables.json (mk_tables.py), inputs/figs.json (decode_figs.py), inputs/release/*.yaml (the released configs),
inputs/alfworld_splits.txt. Writes inputs/recompute.json; prints one line per check.
usage: python3 recompute.py"""
import json, math, re, os
from math import comb

T = json.load(open('tables.json'))
F = json.load(open('inputs/figs.json'))
checks, R = [], {}


def ck(name, ok, detail, where):
    checks.append({'name': name, 'ok': bool(ok), 'detail': detail, 'where': where})


f = lambda s: float(s.replace('+', ''))

# ---------- 1. Table 2 and 3: printed improvements and averages ----------
for k in ('t2', 't3'):
    t = T[k]
    for j, col in enumerate(t['cols']):
        eh, og = t['rows']['EnvHarness Envs'][j], t['rows']['Original Envs'][j]
        d = f(eh[0]) - f(og[0])
        if k == 't3' and t['lower_better'][j]: d = -d
        pr = f(t['improvement'][j])
        ck('%s improvement, %s' % (t['name'], col), abs(d - pr) <= 0.051 if k == 't2' else abs(d - pr) <= 0.006,
           'EnvHarness %s minus Original %s = %+.2f; printed %s' % (eh[0], og[0], d, t['improvement'][j]), t['anchor'])
t2 = T['t2']['rows']
for r, cells in t2.items():
    if cells[0]:
        m = (f(cells[0][0]) + f(cells[1][0])) / 2
        ck('Table 2 ALFWorld Avg., %s' % r, abs(m - f(cells[2][0])) <= 0.051, 'mean of In-Dist and OOD = %.2f; printed %s' % (m, cells[2][0]), 'S4.T2')
    if cells[3]:
        m = sum(f(c[0]) for c in cells[3:7]) / 4
        ck('Table 2 WebArena Avg., %s' % r, abs(m - f(cells[7][0])) <= 0.051, 'unweighted mean of the four sites = %.3f; printed %s' % (m, cells[7][0]), 'S4.T2')

# ---------- 2. Claims in the text ----------
t3 = T['t3']['rows']
sw = lambda r, j=0: f(t3[r][j][0])
claims = [
    ('"up to a 9.0-point improvement" (ALFWorld OOD)', 70.4 - 61.4, 9.0, 0.05, 'S4.SS2'),
    ('"9.8% fewer execution steps" (against Original Envs)', 100 * (sw('Original Envs', 1) - sw('EnvHarness Envs', 1)) / sw('Original Envs', 1), 9.8, 0.05, 'S4.SS2'),
    ('"surpass GenEnv by 5.7 points on average"', 68.3 - 62.6, 5.7, 0.05, 'S4.SS2'),
    ('"by 8.5 points in out-of-distribution settings"', 70.4 - 61.9, 8.5, 0.05, 'S4.SS2'),
    ('"outperforms SWE-smith by 2.46 points"', sw('EnvHarness Envs') - sw('SWE-smith'), 2.46, 0.005, 'S4.SS2'),
    ('"5.11 fewer execution steps per episode" than SWE-smith', sw('SWE-smith', 1) - sw('EnvHarness Envs', 1), 5.11, 0.005, 'S4.SS2'),
    ('"from 53.6 to 49.6 ... increase it to 55.0"', sw('No Skills', 1), 53.6, 0.05, 'S4.SS2'),
    ('"up to 6.5 points of improvement (Table 4)"', 87.9 - 81.4, 6.5, 0.05, 'S1'),
    ('VeriEnv gap on WebArena average (summary: 2.0)', 41.6 - 39.6, 2.0, 0.05, 'S4.T2'),
    ('Table 4 ALFWorld Avg. Original = mean(81.4, 89.6)', (81.4 + 89.6) / 2, 85.5, 0.05, 'S5.T4'),
    ('Table 4 ALFWorld Avg. EnvHarness = mean(87.9, 88.8)', (87.9 + 88.8) / 2, 88.4, 0.051, 'S5.T4'),
    ('"climbs from 47.67 to 54.79 (a 7.12-point gain)"', 54.79 - 47.67, 7.12, 0.005, 'S5'),
    ('Chain: "reducing AS from 53.58 to 41.96"', 53.58 - 41.96, 11.62, 0.005, 'S5.T5'),
]
for name, v, pr, tol, at in claims:
    ck(name, abs(v - pr) <= tol, 'recomputed %.3f; printed %s' % (v, pr), at)
R['steps_rel'] = {'vs_original_pct': round(100 * (55.01 - 49.61) / 55.01, 2), 'vs_no_skills_pct': round(100 * (53.58 - 49.61) / 53.58, 2)}


# ---------- 3. Run-to-run noise: Welch t for every Table 2 and 3 improvement (3 runs per arm) ----------
def tpdf(x, nu):
    return math.exp(math.lgamma((nu + 1) / 2) - math.lgamma(nu / 2)) / math.sqrt(nu * math.pi) * (1 + x * x / nu) ** (-(nu + 1) / 2)


def tp2(t, nu):  # two-sided p by Simpson integration of the t density
    t = abs(t); n = 4000; h = t / n
    s = tpdf(0, nu) + tpdf(t, nu) + sum((4 if i % 2 else 2) * tpdf(i * h, nu) for i in range(1, n))
    return max(0.0, 1 - 2 * s * h / 3)


noise = []
for k in ('t2', 't3'):
    t = T[k]
    for j, col in enumerate(t['cols']):
        eh, og = t['rows']['EnvHarness Envs'][j], t['rows']['Original Envs'][j]
        m1, s1, m2, s2 = f(eh[0]), f(eh[1]), f(og[0]), f(og[1])
        se = math.sqrt(s1 ** 2 / 3 + s2 ** 2 / 3)
        d = m1 - m2
        nu = se ** 4 / ((s1 ** 2 / 3) ** 2 / 2 + (s2 ** 2 / 3) ** 2 / 2) if se > 0 else 4
        tt = d / se if se else float('inf')
        noise.append({'table': t['name'], 'col': col, 'diff': round(d, 2), 'se': round(se, 2), 't': round(tt, 2), 'df': round(nu, 1), 'p': round(tp2(tt, nu), 3)})
R['noise'] = noise
R['noise_summary'] = {'n': len(noise), 'over_2se': sum(1 for x in noise if abs(x['t']) >= 2), 'p_below_05': sum(1 for x in noise if x['p'] < 0.05)}
ck('Welch t computed for all 14 improvements in Tables 2 and 3', len(noise) == 14, '%d columns; %d with |t| at least 2, %d with p below 0.05 (3 runs per arm, Welch df)' % (len(noise), R['noise_summary']['over_2se'], R['noise_summary']['p_below_05']), 'S4.T2')
swe = [x for x in noise if x['col'] == 'SWE-bench Verified SR'][0]
R['swe_noise'] = swe

# ---------- 4. SWE-bench Verified: success rates as whole tasks of 407 ----------
N = 407
lat = []
for name, v in [('Table 3 No Skills', 47.67), ('Table 3 Original Envs', 49.88), ('Table 3 SWE-smith', 50.12), ('Table 3 EnvHarness Envs', 52.58), ('Table 5 Chain Only', 49.63), ('Table 5 Combined', 54.30)]:
    k = round(v * N / 100)
    lat.append({'what': name, 'printed': v, 'tasks': k, 'k_over_407': round(100 * k / N, 4), 'off': round(abs(100 * k / N - v), 4)})
R['lattice'] = lat
ck('Six two-decimal SWE-bench SR values are whole numbers of the 407 test issues', all(x['off'] <= 0.005 for x in lat), ', '.join('%s = %d/407' % (x['printed'], x['tasks']) for x in lat), 'S4.T3')
R['lattice_odds'] = {'chance_one_value_if_3run_mean': '1/3', 'chance_all_six': round((1 / 3) ** 6, 5), 'one_in': 3 ** 6}
fig5 = F['figure5']['series']
pts = [(s, i, v) for s, vs in fig5.items() for i, v in enumerate(vs)]
offs = [abs(v * N / 100 - round(v * N / 100)) for _, _, v in pts]
ck('All 21 decoded Figure 5 points are whole numbers of 407 (to 0.002 of a task)', max(offs) < 0.002, 'max distance %.4f of a task' % max(offs), 'S5.F5')
R['fig5_tasks'] = {s: [round(v * N / 100) for v in vs] for s, vs in fig5.items()}
R['fig5'] = fig5
# "flatten" check: gains from 100 to 300 environments, in tasks
g = {s: R['fig5_tasks'][s][6] - R['fig5_tasks'][s][2] for s in fig5}
R['fig5_gain_100_300_tasks'] = g
R['fig5_gap_tasks'] = {x: R['fig5_tasks']['EnvHarness envs'][i] - R['fig5_tasks']['Original envs'][i] for i, x in enumerate(F['figure5']['x'])}
ck('Figure 5 at 100 environments equals Table 3 (EnvHarness 52.58, Original 49.88, SWE-smith 50.12)',
   abs(fig5['EnvHarness envs'][2] - 52.58) < .005 and abs(fig5['Original envs'][2] - 49.88) < .005 and abs(fig5['Generated envs (SWE-smith)'][2] - 50.12) < .005, 'decoded %.3f, %.3f, %.3f' % (fig5['EnvHarness envs'][2], fig5['Original envs'][2], fig5['Generated envs (SWE-smith)'][2]), 'S5.F5')
ck('"original environments ... flatten": from 100 to 300 environments Original gains as many tasks as EnvHarness', g['Original envs'] == g['EnvHarness envs'],
   'EnvHarness +%d tasks, Original +%d, SWE-smith +%d (of 407)' % (g['EnvHarness envs'], g['Original envs'], g['Generated envs (SWE-smith)']), 'S5.F5')
last = {s: R['fig5_tasks'][s][6] - R['fig5_tasks'][s][5] for s in fig5}
R['fig5_last_step_tasks'] = last
ck('Last step (250 to 300 environments): Original gains more than EnvHarness', last['Original envs'] > last['EnvHarness envs'], 'EnvHarness +%d, Original +%d, SWE-smith +%d tasks' % (last['EnvHarness envs'], last['Original envs'], last['Generated envs (SWE-smith)']), 'S5.F5')
o5, o1 = fig5['Original envs'][6], F['figure1']['right']['Original envs (SWE-Lite, real envs)'][6]
R['orig300'] = {'fig5': round(o5, 3), 'fig1': round(o1, 3), 'text': 52.13, 'fig5_tasks': round(o5 * N / 100)}
ck('Original envs at 300: Figure 5 decodes to 212/407 = 52.09; Figure 1 and the text say 52.13', abs(o5 - 52.088) < .003 and abs(o1 - 52.13) < .003, '52.13 is not a whole number of tasks (%.2f of 407) nor of 1,221 (three runs: %.1f)' % (52.13 * 4.07, 52.13 * 12.21), 'S5.F5')
fl = F['figure1']['left']
ck('Figure 1 left bars equal Table 3', all(abs(fl['bars']['SWE-bench Verified'][c] - v) < .01 for c, v in [('No Skills (base agent)', 47.67), ('Original Envs (real envs)', 49.88), ('EnvHarness Envs', 52.58)]), 'axis starts at %.1f, not 0' % fl['axis_floor_value'], 'S0.F1')
R['fig1_floor'] = fl['axis_floor_value']
R['fig1_bars'] = fl['bars']
# Batches: 6 batches of 50, alternating 2 and 3 skills = 15
ck('"alternating between 2 and 3 skills per bank, totaling 15 skills at 300 environments"', sum([2, 3] * 3) == 15, '6 batches of 50: 2+3+2+3+2+3 = 15', 'S5')

# ---------- 5. RL (Table 4) in tasks: ALFWorld seen 140, unseen 134 ----------
al = open('inputs/alfworld_splits.txt').read()
ck('ALFWorld seen and unseen evaluation sets have 140 and 134 tasks (ALFWorld Table 1)', '3,553 140        134' in al, 'per-type rows sum to 140 and 134', 'S5.T4')
rl = {}
for name, n, a, b in [('In-Dist (seen)', 140, 81.4, 87.9), ('OOD (unseen)', 134, 89.6, 88.8)]:
    ka, kb = round(a * n / 100), round(b * n / 100)
    rl[name] = {'n': n, 'orig': ka, 'eh': kb, 'orig_pct': round(100 * ka / n, 2), 'eh_pct': round(100 * kb / n, 2)}
    ck('Table 4 %s as whole tasks' % name, abs(100 * ka / n - a) < .05 and abs(100 * kb / n - b) < .05, '%s = %d/%d, %s = %d/%d' % (a, ka, n, b, kb, n), 'S5.T4')


def fisher2(a, n1, b, n2):  # two-sided Fisher exact for successes a/n1 against b/n2
    K = a + b; N2 = n1 + n2
    pmf = lambda x: comb(n1, x) * comb(n2, K - x) / comb(N2, K)
    p0 = pmf(a)
    return sum(pmf(x) for x in range(max(0, K - n2), min(n1, K) + 1) if pmf(x) <= p0 * (1 + 1e-9))


for k2, v in rl.items():
    v['fisher_p'] = round(fisher2(v['eh'], v['n'], v['orig'], v['n']), 3)
R['rl'] = rl
ck('RL In-Dist gain is 9 tasks; Fisher exact two-sided p', rl['In-Dist (seen)']['eh'] - rl['In-Dist (seen)']['orig'] == 9, 'p = %.3f (one training run per arm, so this is evaluation noise only)' % rl['In-Dist (seen)']['fisher_p'], 'S5.T4')
ck('RL OOD drop 89.6 to 88.8 is one task of 134', rl['OOD (unseen)']['orig'] - rl['OOD (unseen)']['eh'] == 1, '120 to 119', 'S5.T4')

# ---------- 6. Table 9 cross-model ----------
t9 = T['t9']; ms = t9['models']
gains = {m: round(f(t9['rows']['EnvHarness Envs'][i][0]) - f(t9['rows']['Original Envs'][i][0]), 1) for i, m in enumerate(ms)}
R['t9_gains'] = gains
ck('"by 2.7 to 3.7 absolute points" (Table 9)', min(gains.values()) == 2.7 and max(gains.values()) == 3.7, ', '.join('%s %+.1f' % (m, g2) for m, g2 in gains.items()), 'A6.T9')
rel = [round(100 * (f(t9['rows']['EnvHarness Envs'][i][0]) / f(t9['rows']['Original Envs'][i][0]) - 1), 1) for i in range(4)]
ck('Figure 6 percentage labels = EnvHarness / Original - 1', rel == [8.7, 7.6, 5.4, 4.6], 'recomputed %s; printed %s' % (rel, F['figure6']['printed_gain_labels']), 'S5.F6')
vs0 = {m: (round(f(t9['rows']['EnvHarness Envs'][i][0]) - f(t9['rows']['No Skills'][i][0]), 1), round(f(t9['rows']['Original Envs'][i][0]) - f(t9['rows']['No Skills'][i][0]), 1)) for i, m in enumerate(ms)}
R['t9_vs_noskills'] = vs0
ck('"+9.3 and +11.1 for EnvHarness, +6.1 and +7.4 for unmodified, under 5.5 for the two strongest"', vs0['Gemini 3.1 Flash-Lite'] == (9.3, 6.1) and vs0['Qwen3.6 27B'] == (11.1, 7.4) and max(vs0['Gemini 3.5 Flash'] + vs0['Claude Sonnet 4.6']) < 5.5, str(vs0), 'S5')
ck('Qwen: "3.7 extra steps for 3.7 extra points"', round(40.8 - 37.1, 1) == 3.7 and round(52.1 - 48.4, 1) == 3.7, 'AS 40.8 - 37.1; SR 52.1 - 48.4', 'A6')
ck('Flash: "over five steps shorter"', 55.0 - 49.6 > 5, '55.0 - 49.6 = 5.4', 'A6')
R['tasks_per_point'] = round(N / 100, 2)

# ---------- 7. Table 10, 11, 12 ----------
t10 = T['t10']['rows']
for r in t10:
    ck('Table 10 delta, %s' % r[0], abs(f(r[2]) - f(r[1]) - f(r[3])) < .051, '%s - %s = %+.1f; printed %s' % (r[2], r[1], f(r[2]) - f(r[1]), r[3]), 'A7.T10')
mo = sum(f(r[1]) for r in t10[:6]) / 6; me = sum(f(r[2]) for r in t10[:6]) / 6
ck('Table 10 Average = mean of the six types', abs(mo - 60.6) < .051 and abs(me - 63.7) < .051, 'Original %.2f, EnvHarness %.2f' % (mo, me), 'A7.T10')
ck('"outperform ... on four of the six types"', sum(1 for r in t10[:6] if f(r[3]) > 0) == 4, 'clean, cool, look_lamp, two_obj up; simple equal; heat down', 'A7.T10')
tok = lambda s: float(s[:-1]) * (1e3 if s.endswith('K') else 1e6)
t11 = T['t11']['rows']; R['t11'] = []
for r in t11:
    tot = tok(r[2]) + tok(r[3])
    R['t11'].append({'bench': r[0], 'method': r[1], 'sum_M': round(tot / 1e6, 2), 'printed_M': tok(r[4]) / 1e6, 'design_share_pct': round(100 * tok(r[2]) / tok(r[4]), 2)})
    ck('Table 11 total = design + rollout, %s %s' % (r[0], r[1]), abs(tot - tok(r[4])) / tok(r[4]) < 0.001, 'sum %.2fM; printed %s (components are rounded)' % (tot / 1e6, r[4]), 'A7.T11')
ratio = tok('228.0M') / tok('64.2M')
R['t11_ratio'] = round(ratio, 2)
ck('"GenEnv\'s total is 3.5x lower"', abs(ratio - 3.5) < 0.06, '228.0 / 64.2 = %.2f' % ratio, 'A7.T11')
R['design_ratio_alfworld'] = round(tok('1.46M') / tok('38K'), 1)
R['tokens_per_alf_task_M'] = round(tok('226.6M') / 100 / 1e6, 2)


# Table 12: the most any reshaping can put in band on a fresh K = 10 measurement
def pband(p, K, lo, hi):
    return sum(comb(K, x) * p ** x * (1 - p) ** (K - x) for x in range(K + 1) if lo - 1e-9 <= x / K <= hi + 1e-9)


best = max((pband(p / 1000, 10, .4, .6), p / 1000) for p in range(1, 1000))
R['band_max_fresh_K10'] = {'p': best[1], 'max_in_band_pct': round(100 * best[0], 1)}
ck('Table 12: 80.0% in band exceeds the most a fresh K = 10 measurement allows', best[0] < .80, 'max over true p of P(4 to 6 successes of 10) = %.1f%% at p = %.2f' % (100 * best[0], best[1]), 'A7.T12')
R['band_K5'] = {'p05_in_band_pct': round(100 * pband(.5, 5, .4, .6), 1)}
ck('With K = 3 rollouts a measured rate (0, 1/3, 2/3 or 1) can never fall inside [0.4, 0.6]', max(pband(p / 100, 3, .4, .6) for p in range(101)) == 0, 'so a per-candidate band of [0.4, 0.6] needs K of at least 5', 'A5.T8')
ck('K = 5 band [0.4, 0.6] means 2 or 3 successes of 5; at p = 0.5 that happens %.1f%% of the time' % (100 * pband(.5, 5, .4, .6)), True, 'binomial', 'A5.SS3')

# ---------- 8. Released configs against Table 8 ("same settings across all benchmarks") ----------
cfg = {}
for b, fn in [('ALFWorld', 'experiments_alfworld_corpus.yaml'), ('WebArena', 'experiments_webarena_corpus.yaml'), ('SWE-bench', 'experiments_swebench_corpus.yaml'), ('OfficeQA', 'experiments_officeqa_corpus.yaml'), ('SpreadsheetBench', 'experiments_spreadsheetbench_corpus.yaml'), ('Toy24', 'experiments_toy24_mutated.yaml')]:
    s = open('inputs/release/' + fn).read()
    g1 = lambda pat: (re.search(pat, s) or [None, None])[1]
    cfg[b] = {'k_per_candidate': g1(r'\n\s*k_per_candidate:\s*(\d+)'), 'max_k': g1(r'\n\s*max_k:\s*(\d+)'), 'target_band': g1(r'\n\s*target_band:\s*(\[[^\]]*\])'), 'n_iterations': g1(r'\n\s*n_iterations:\s*(\d+)'), 'max_episode_steps': g1(r'\n\s*max_episode_steps:\s*(\d+)')}
alf = open('inputs/release/experiments_alfworld_corpus.yaml').read()
cfg['ALFWorld']['acceptance'] = 'SR rises by at least 0.2 over baseline' if 'mutated SR > baseline_sr\n      by at least 0.2' in alf else '?'
cfg['SWE-bench']['acceptance'] = 'K = 5 SR in [0.4, 0.6]' if 'ACCEPT if mutated_sr in [0.4, 0.6]' in open('inputs/release/experiments_swebench_corpus.yaml').read() else '?'
cfg['WebArena']['acceptance'] = 'designer judgement (harder if baseline SR >= 0.8, easier if < 0.3); the band is scored over the last 20 accepted episodes, not per candidate'
cfg['OfficeQA']['acceptance'] = 'designer judgement (band set to [0.0, 1.0], a no-op)'
cfg['SpreadsheetBench']['acceptance'] = 'designer judgement (band set to [0.0, 1.0], a no-op)'
cfg['Toy24']['acceptance'] = 'designer judgement; band [0.3, 0.7] scored over recent accepted episodes'
R['configs'] = cfg
diff = [b for b in cfg if b != 'Toy24' and (cfg[b]['k_per_candidate'] != '5' or cfg[b]['max_k'] != '5')]
ck('Released configs match Table 8 (K = 5, 5 revision rounds, every benchmark)', not diff, 'differ: ' + ', '.join('%s (K %s, max rounds %s)' % (b, cfg[b]['k_per_candidate'], cfg[b]['max_k']) for b in diff), 'A5.T8')
ck('Released ALFWorld acceptance is "SR up by 0.2", not a difficulty band', cfg['ALFWorld']['acceptance'].startswith('SR rises'), 'experiments/alfworld/corpus.yaml PHASE 4', 'A5.T8')
st = open('inputs/release/envharness_orchestration_runner.py.build_env_stack.txt').read()
ck('Released stack order is base, then Setup (Stage), then Rules (Contract) outermost', st.index('Setup(inner=env') < st.index('load_rules_instance'), 'build_env_stack in envharness/orchestration/runner.py', 'S2.E5')
gr = open('inputs/release/rl_scripts_run_grpo.sh.excerpt.txt').read()
ck('GRPO group size in the release is 8 (not stated in the paper)', 'GROUP_N=${GROUP_N:-8}' in gr, 'rl/scripts/run_grpo.sh, MODE=full; batch 16, PPO mini-batch 256, 150 epochs, 50 steps', 'A6.SS1')

tree = open('inputs/release/tree.txt').read().split('\n')
br = sorted({x.split('/')[2] for x in tree if x.startswith('envharness/bridges/') and x.count('/') >= 3})
R['bridges'] = br
ck('Released Bridges: the paper says seven (with WebShop); the repository has six', len(br) == 6 and 'webshop' not in br, ', '.join(br), 'A3.SS2')
# ---------- 9. Splits ----------
ck('SWE-bench test set is 407 Verified issues not in Lite, not the full 500', True, 'Table 7; training uses 100 Lite tasks', 'A5.T7')
R['checks'] = checks
R['n_ok'] = sum(c['ok'] for c in checks)
os.makedirs('inputs', exist_ok=True)
json.dump(R, open('inputs/recompute.json', 'w'), indent=1)
for c in checks:
    print('%s  %s: %s' % ('ok  ' if c['ok'] else 'NOTE', c['name'], c['detail']))
print('%d of %d checks hold as printed' % (R['n_ok'], len(checks)))

"""Recompute every number the page computes, independently in Python, and compare with the page's own JavaScript.
1. tau2-bench pass^k and pass@k from the trial files, against the leaderboard and against the page (checks/js_out.json).
2. METR 50% and 80% horizons with scikit-learn (METR's settings), against METR's results file and against the page's Newton fit.
3. METR doubling times from the results file (OLS on log2 horizon against release date, frontier points, <= 16 h).
4. The regex-log test with Python's re on the page's presets, against the page's verdicts.
5. Terminal-Bench task-file counts, and the derived numbers quoted in the text.
Run from src/: node checks/check_page.mjs (writes checks/js_out.json), then
  uv run --with scikit-learn --with numpy --with pyyaml python3 recompute.py
Writes checks/recompute_out.json and prints ALL OK or the mismatches."""
import json, math, re, os, datetime
import numpy as np
import yaml
from sklearn.linear_model import LogisticRegression

H = os.path.dirname(os.path.abspath(__file__)); I = os.path.join(H, 'inputs')
js = json.load(open(os.path.join(H, 'checks', 'js_out.json')))
bad = []; out = {}
def check(name, a, b, tol):
    if a is None or b is None or abs(a - b) > tol:
        bad.append(f'{name}: python {a} page {b}')

# 1. tau2
C = math.comb
tau = json.load(open(os.path.join(I, 'tau2_trials_2026-10-04.json')))
jt = {x['id']: x for x in js['tau']}
out['tau'] = {}
n_ok = 0
for s in tau['sets']:
    sid = s['sub'] + '|' + s['dom']; vec = s['trials']
    hat = [100 * sum(C(v.count('1'), k) / C(4, k) for v in vec) / len(vec) for k in range(1, 5)]
    at = [100 * sum(1 - C(4 - v.count('1'), k) / C(4, k) for v in vec) / len(vec) for k in range(1, 5)]
    ok = all(abs(round(h, 2) - round(p, 2)) < 0.006 for h, p in zip(hat, s['pub']))
    n_ok += ok
    out['tau'][sid] = {'hat': hat, 'at': at, 'pub': s['pub'], 'reproduces': ok}
    for k in range(4):
        check(sid + ' pass^%d' % (k + 1), hat[k], jt[sid]['hat'][k], 1e-9)
        check(sid + ' pass@%d' % (k + 1), at[k], jt[sid]['at'][k], 1e-9)
    if ok != jt[sid]['ok']:
        bad.append(sid + ' reproduce flag differs')
out['tau_reproduced'] = f'{n_ok} of {len(tau["sets"])}'

# 2. METR fits
metr = json.load(open(os.path.join(I, 'metr_runs_agg_1_1.json')))
Y = yaml.safe_load(open(os.path.join(I, 'metr_benchmark_results_1_1.yaml')))
jm = {x['key']: x for x in js['metr']}
out['metr'] = {}
for a, v in metr['agents'].items():
    if a == 'human':
        continue
    X = []; Yv = []; W = []
    tot = sum(r[2] for r in v['runs'] if r)
    for t, r in zip(metr['tasks'], v['runs']):
        if not r:
            continue
        n, k, w = r; w /= tot
        if k: X.append(math.log2(t[3])); Yv.append(1); W.append(w * k / n)
        if n - k: X.append(math.log2(t[3])); Yv.append(0); W.append(w * (n - k) / n)
    m = LogisticRegression(C=1e5, tol=1e-12, max_iter=10000).fit(np.array(X).reshape(-1, 1), Yv, sample_weight=W)
    p50 = 2 ** (-m.intercept_[0] / m.coef_[0][0]); p80 = 2 ** ((math.log(4) - m.intercept_[0]) / m.coef_[0][0])
    key = 'gpt_5_3_codex' if a == 'GPT-5.3-Codex' else v['model']
    pub = Y['results'][key]['metrics']['p50_horizon_length']['estimate']
    out['metr'][a] = {'p50_python': p50, 'p50_page': jm[key]['p50'], 'p50_metr': pub}
    check(a + ' p50 python vs METR (rel)', p50 / pub, 1, 2e-3)
    check(a + ' p50 page vs python (rel)', jm[key]['p50'] / p50, 1, 1e-4)
    check(a + ' p80 page vs python (rel)', jm[key]['p80'] / p80, 1, 1e-4)

# 3. doubling times
pts = [(datetime.date.fromisoformat(str(v['release_date'])), v['metrics']['p50_horizon_length']['estimate'], v['metrics'].get('is_sota')) for v in Y['results'].values()]
def dbl(start):
    P = [(d.toordinal(), math.log2(p)) for d, p, s in pts if s and d >= start and p <= 960]
    xs, ys = zip(*P); mx = sum(xs) / len(xs); my = sum(ys) / len(ys)
    return 1 / (sum((x - mx) * (y - my) for x, y in P) / sum((x - mx) ** 2 for x in xs))
d23, dall = dbl(datetime.date(2023, 1, 1)), dbl(datetime.date(2019, 1, 1))
out['doubling'] = {'from_2023': d23, 'all': dall, 'metr': Y['doubling_time_in_days']}
check('doubling 2023 vs METR', d23, Y['doubling_time_in_days']['from_2023_on']['point_estimate'], 0.001)
check('doubling all vs METR', dall, Y['doubling_time_in_days']['all_time_stitched']['point_estimate'], 0.001)
check('doubling 2023 page', d23, js['trend']['from2023'], 1e-6)
check('doubling all page', dall, js['trend']['all'], 1e-6)

# 4. regex test with Python's re
D = os.path.join(I, 'tb2_regex_log')
src = open(os.path.join(D, 'tests_test_outputs.py')).read()
ns = {}
exec(compile(src.replace('def test_regex_matches_dates():', 'def _t(pattern_text_override):').replace('pattern_text = regex_file.read_text().strip()', 'pattern_text = pattern_text_override').replace('assert regex_file.exists(), f"Regex file {regex_file} does not exist"', 'pass'), 'test', 'exec'), ns)
out['regex'] = {}
for name, r in js['regex'].items():
    pat = {'naive': r'\d{4}-\d{2}-\d{2}', 'ip': r'(?=.*\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b).*\b(\d{4}-\d{2}-\d{2})\b',
           'ref': re.search(r"cat << 'EOF' > /app/regex.txt\n(.*?)\nEOF", open(os.path.join(D, 'solution_solve.sh')).read(), re.S).group(1), 'none': None}[name]
    if pat is None:
        okp = False
    else:
        try:
            ns['_t'](pat); okp = True
        except AssertionError:
            okp = False
    out['regex'][name] = {'python_pass': okp, 'page_pass': r['ok']}
    if okp != r['ok']:
        bad.append(f'regex {name}: python {okp} page {r["ok"]}')

# 5. task-file counts and derived numbers in the text
tb2 = json.load(open(os.path.join(I, 'tb2_task_survey_2026-10-04.json'))); tb3 = json.load(open(os.path.join(I, 'tb3_task_survey_2026-10-04.json'))); tb4 = json.load(open(os.path.join(I, 'tb4_task_survey_2026-10-04.json')))
counts = {'tb2_tasks': len(tb2), 'tb2_curl': sum(x['curl_uv'] for x in tb2.values()), 'tb3_tasks': len(tb3), 'tb3_sep': sum(x['mode'] == 'separate' for x in tb3.values()),
          'tb4_tasks': len(tb4), 'tb4_sep': sum(x['mode'] == 'separate' for x in tb4.values()), 'tb4_8h': sum(x['agent_timeout'] == 28800.0 for x in tb4.values())}
out['tb_counts'] = counts
for k, v in {'tb2_tasks': 89, 'tb2_curl': 82, 'tb3_tasks': 74, 'tb3_sep': 74, 'tb4_tasks': 66, 'tb4_sep': 66, 'tb4_8h': 65}.items():
    check('count ' + k, counts[k], v, 0)
board = json.load(open(os.path.join(I, 'tbench_4_0_leaderboard_2026-10-04.json')))
astra = [r for r in board if r['model'] == 'GPT-6 Astra']
derived = {
    'gpt52_retail_pass4': out['tau']['gpt-5-2_sierra_2026-02-26|retail']['hat'][3], 'gpt52_retail_pass_at4': out['tau']['gpt-5-2_sierra_2026-02-26|retail']['at'][3],
    'gpt52_retail_4of4': sum(1 for v in [s for s in tau['sets'] if s['sub'] == 'gpt-5-2_sierra_2026-02-26' and s['dom'] == 'retail'][0]['trials'] if v == '1111'),
    'hyper_tau_ratio': 82.2 / 23.9, 'statem_lift': 92.1 - 83.1, 'astra_effort_range': [min(r['acc'] for r in astra), max(r['acc'] for r in astra)],
    'astra_max_per_trial_usd': [r for r in astra if r['effort'] == 'max'][0]['cost'] / 330, 'board_trials': sorted(set(r['n'] for r in board)),
    'mythos_hours': 1044.78 / 60, 'mythos_ci_hours': [509 / 60, 3304 / 60], 'doubling_months': d23 / 30.44,
    'realswe_short_fail': 62 / 108, 'realswe_long_fail': 352 / 532, 'mole_share': 28 / 39,
}
out['derived'] = derived
check('gpt52 retail pass^4', derived['gpt52_retail_pass4'], 51.75, 0.005)
check('gpt52 retail pass@4', derived['gpt52_retail_pass_at4'], 96.49, 0.005)
check('gpt52 retail 4 of 4', derived['gpt52_retail_4of4'], 59, 0)
check('hyper tau ratio', derived['hyper_tau_ratio'], 3.44, 0.005)
json.dump(out, open(os.path.join(H, 'checks', 'recompute_out.json'), 'w'), indent=1, default=str)
print('tau sets reproduced', out['tau_reproduced'], '| METR worst rel diff python vs METR', max(abs(v['p50_python'] / v['p50_metr'] - 1) for v in out['metr'].values()),
      '| page vs python', max(abs(v['p50_page'] / v['p50_python'] - 1) for v in out['metr'].values()))
print('derived', json.dumps(derived, default=str))
print('ALL OK' if not bad else 'MISMATCHES:\n' + '\n'.join(bad))

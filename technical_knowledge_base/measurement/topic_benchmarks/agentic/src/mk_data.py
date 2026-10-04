"""Build parts/22_js_data.js (window.AG) from the files in inputs/. Run: python3 mk_data.py (stdlib only, plus PyYAML for METR's yaml: uv run --with pyyaml python3 mk_data.py)."""
import json, math, re, os
import yaml

H = os.path.dirname(os.path.abspath(__file__))
I = os.path.join(H, 'inputs')
def load(f): return json.load(open(os.path.join(I, f)))

def C(n, k): return math.comb(n, k) if 0 <= k <= n else 0

# ---- tau2-bench: per-task trial vectors, published pass^k, reproduced flag ----
tau = load('tau2_trials_2026-10-04.json')
DOM = {'airline': 'Airline', 'retail': 'Retail', 'telecom': 'Telecom', 'banking_knowledge': 'Banking (knowledge)'}
sets = []
for s in tau['sets']:
    vec = s['trials']
    got = [sum(C(v.count('1'), k) / C(len(v), k) for v in vec) / len(vec) * 100 for k in range(1, 5)]
    ok = all(p is not None and abs(round(g, 2) - round(p, 2)) < 0.006 for g, p in zip(got, s['pub']))
    sets.append({'id': s['sub'] + '|' + s['dom'], 'm': s['model'], 'eff': s['effort'], 'by': s['by'], 'date': s['date'], 'dom': s['dom'], 'domn': DOM[s['dom']],
                 'user': s['user'], 'ver': s['version'], 'pub': [round(p, 2) for p in s['pub']], 'got': [round(g, 2) for g in got], 'ok': ok,
                 'tr': ''.join(vec), 'nt': len(vec), 'err': s['n_error'], 'url': s['url']})
sets.sort(key=lambda x: (list(DOM).index(x['dom']), -x['got'][0]))

# ---- METR time horizons v1.1 ----
metr = load('metr_runs_agg_1_1.json')
Y = yaml.safe_load(open(os.path.join(I, 'metr_benchmark_results_1_1.yaml')))
ALIAS_YAML = {'GPT-5.3-Codex': 'gpt_5_3_codex'}
tasks = [[round(t[3], 3), t[4], t[2]] for t in metr['tasks']]
agents = []
for a, v in metr['agents'].items():
    if a == 'human':
        continue
    key = ALIAS_YAML.get(a, v['model'])
    y = Y['results'].get(key)
    m = y['metrics']
    agents.append({'n': a.replace(' (Inspect)', ''), 'key': key, 'rel': str(y['release_date']), 'sota': bool(m.get('is_sota')),
                   'p50': m['p50_horizon_length']['estimate'], 'p50lo': m['p50_horizon_length']['ci_low'], 'p50hi': m['p50_horizon_length']['ci_high'],
                   'p80': m['p80_horizon_length']['estimate'], 'avg': m['average_score']['estimate'],
                   'r': [None if x is None else [x[0], x[1], round(x[2] * 1e7)] for x in v['runs']]})
agents.sort(key=lambda x: x['rel'])
trend = []
for k, v in Y['results'].items():
    m = v['metrics']
    trend.append({'k': k, 'rel': str(v['release_date']), 'p50': m['p50_horizon_length']['estimate'], 'lo': m['p50_horizon_length']['ci_low'],
                  'hi': m['p50_horizon_length']['ci_high'], 'sota': bool(m.get('is_sota'))})
trend.sort(key=lambda x: x['rel'])
NAMES = {'davinci_002': 'davinci-002 (GPT-3)', 'gpt2': 'GPT-2', 'gpt_3_5_turbo_instruct': 'GPT-3.5 Turbo Instruct', 'gpt_4': 'GPT-4 0314',
         'gpt_4_1106_inspect': 'GPT-4 1106', 'gpt_4_turbo_inspect': 'GPT-4 Turbo', 'gpt_4o_inspect': 'GPT-4o', 'claude_3_opus_inspect': 'Claude 3 Opus',
         'claude_3_5_sonnet_20240620_inspect': 'Claude 3.5 Sonnet (Old)', 'claude_3_5_sonnet_20241022_inspect': 'Claude 3.5 Sonnet (New)',
         'o1_preview': 'o1-preview', 'o1_inspect': 'o1', 'claude_3_7_sonnet_inspect': 'Claude 3.7 Sonnet', 'o3_inspect': 'o3',
         'claude_4_opus_inspect': 'Claude 4 Opus', 'claude_4_1_opus_inspect': 'Claude 4.1 Opus', 'gpt_5_2025_08_07_inspect': 'GPT-5',
         'gemini_3_pro': 'Gemini 3 Pro', 'gpt_5_1_codex_max_inspect': 'GPT-5.1-Codex-Max', 'claude_opus_4_5_inspect': 'Claude Opus 4.5',
         'gpt_5_2': 'GPT-5.2', 'claude_opus_4_6_inspect': 'Claude Opus 4.6', 'gpt_5_3_codex': 'GPT-5.3-Codex', 'gemini_3_1_pro': 'Gemini 3.1 Pro',
         'gpt_5_4': 'GPT-5.4', 'claude_mythos_preview_early_inspect': 'Claude Mythos Preview (early)'}
for t in trend:
    t['n'] = NAMES[t['k']]
dbl = Y['doubling_time_in_days']

# ---- Terminal-Bench ----
board = load('tbench_4_0_leaderboard_2026-10-04.json')
tb2 = load('tb2_task_survey_2026-10-04.json'); tb3 = load('tb3_task_survey_2026-10-04.json'); tb4 = load('tb4_task_survey_2026-10-04.json')
def med(v):
    v = sorted(v); n = len(v); return v[n // 2] if n % 2 else (v[n // 2 - 1] + v[n // 2]) / 2
survey = {
    'tb2': {'n': len(tb2), 'curl': sum(1 for x in tb2.values() if x['curl_uv']), 'sep': sum(1 for x in tb2.values() if x['mode'] == 'separate'),
            'tmed': med([x['agent_timeout'] for x in tb2.values()]), 'tmin': min(x['agent_timeout'] for x in tb2.values()), 'tmax': max(x['agent_timeout'] for x in tb2.values())},
    'tb3': {'n': len(tb3), 'sep': sum(1 for x in tb3.values() if x['mode'] == 'separate'),
            'tmed': med([x['agent_timeout'] for x in tb3.values() if x['agent_timeout']]), 'tmin': min(x['agent_timeout'] for x in tb3.values() if x['agent_timeout']), 'tmax': max(x['agent_timeout'] for x in tb3.values() if x['agent_timeout'])},
    'tb4': {'n': len(tb4), 'sep': sum(1 for x in tb4.values() if x['mode'] == 'separate'), 'curl': sum(1 for x in tb4.values() if x['curl_in_test']),
            't8h': sum(1 for x in tb4.values() if x['agent_timeout'] == 28800.0)},
}

# ---- the regex-log task: instruction, the test's logs and expected dates, the reference regex (verbatim) ----
D = os.path.join(I, 'tb2_regex_log')
test = open(os.path.join(D, 'tests_test_outputs.py')).read()
logs_block = re.search(r'sample_logs = \[(.*?)\n    \]', test, re.S).group(1)
logs = re.findall(r'^\s*"((?:[^"\\]|\\.)*)",\s*(?:#\s*(.*))?$', logs_block, re.M)
expected = re.findall(r'"(\d{4}-\d{2}-\d{2})"', re.search(r'expected_dates = \[(.*?)\]', test, re.S).group(1))
sol = re.search(r"cat << 'EOF' > /app/regex.txt\n(.*?)\nEOF", open(os.path.join(D, 'solution_solve.sh')).read(), re.S).group(1)
instr = open(os.path.join(D, 'instruction.md')).read()
# comments that sit on the line after a log (the test file wraps some), attach to the previous log
cm = re.findall(r'^\s*"((?:[^"\\]|\\.)*)",\s*\n\s*#\s*(.*)$', logs_block, re.M)
cmap = {a: b for a, b in cm}
task = {'logs': [[l, (c or cmap.get(l, '')).strip()] for l, c in logs], 'expected': expected, 'solution': sol, 'instruction': instr}
assert len(task['logs']) == 25 and len(expected) == 9, (len(task['logs']), len(expected))

t0 = load('tau2_airline_task0.json')['task']
ui = t0['user_scenario']['instructions']
tauTask = {'id': t0['id'], 'purpose': t0['description']['purpose'], 'reason': ui['reason_for_call'], 'known': ui['known_info'], 'instr': ui['task_instructions'],
           'nl': t0['evaluation_criteria']['nl_assertions'], 'basis': t0['evaluation_criteria']['reward_basis'], 'actions': t0['evaluation_criteria']['actions']}
assert all(x['tr'] is not None for x in sets)
AG = {'tauTask': tauTask, 'tau': sets, 'metr': {'tasks': tasks, 'agents': agents, 'trend': trend, 'dbl': dbl}, 'tb4': board, 'survey': survey, 'task': task}
js = '// ---- Data for this page, generated by src/mk_data.py from src/inputs/ (do not edit by hand) ----\nwindow.AG=' + json.dumps(AG, separators=(',', ':')) + ';\n'
open(os.path.join(H, 'parts', '22_js_data.js'), 'w').write(js)
print('tau sets', len(sets), 'reproduced', sum(s['ok'] for s in sets), '| metr agents', len(agents), 'tasks', len(tasks), '| bytes', len(js))
print(json.dumps(survey))

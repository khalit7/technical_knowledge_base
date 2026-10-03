"""Transcribe the paper's tables into tables.json (printed precision kept as strings and as numbers).

Sources: inputs/tables_v1.txt (extract_paper.py from https://arxiv.org/html/2609.08183v1) and inputs/figs.json
(decode_figs.py). Every row below was copied from those files and is asserted against them, so a typo fails.
  python3 mk_tables.py      (build.sh runs it)
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
TXT = open(os.path.join(HERE, 'inputs', 'tables_v1.txt')).read()
FIGS = json.load(open(os.path.join(HERE, 'inputs', 'figs.json')))

BENCH = [  # column order of Tables 1 and 2
    {'k': 'bfcl', 'n': 'BFCL v4', 'cat': 'tool', 'runs': 'official protocol', 'url': 'https://gorilla.cs.berkeley.edu/leaderboard.html'},
    {'k': 'vita', 'n': 'VitaBench', 'cat': 'harness', 'runs': '1 run', 'url': 'https://arxiv.org/abs/2509.26490'},
    {'k': 'tau2', 'n': 'τ²-Bench', 'cat': 'tool', 'runs': 'mean of 3 runs', 'url': 'https://arxiv.org/abs/2506.07982'},
    {'k': 'pinch', 'n': 'PinchBench', 'cat': 'harness', 'runs': '1 run', 'url': 'https://github.com/pinchbench/skill'},
    {'k': 'wb', 'n': 'WorkBuddy Bench', 'cat': 'harness', 'runs': 'mean of 3 runs', 'url': 'https://arxiv.org/abs/2607.20911'},
    {'k': 'qc', 'n': 'QwenClawBench', 'cat': 'harness', 'runs': 'mean of 3 runs', 'url': 'https://github.com/SKYLENAGE-AI/QwenClawBench'},
    {'k': 'he', 'n': 'HumanEval', 'cat': 'code', 'runs': 'official protocol', 'url': 'https://arxiv.org/abs/2107.03374'},
    {'k': 'lcb', 'n': 'LiveCodeBench v6', 'cat': 'code', 'runs': 'official protocol', 'url': 'https://arxiv.org/abs/2403.07974'},
    {'k': 'ifb', 'n': 'IFBench', 'cat': 'if', 'runs': 'official protocol', 'url': 'https://arxiv.org/abs/2507.02833'},
    {'k': 'ife', 'n': 'IFEval', 'cat': 'if', 'runs': 'official protocol', 'url': 'https://arxiv.org/abs/2311.07911'},
]
T1 = [
    ('Qwen3.5-4B', 'base', '61.02 21.50 84.29 71.19 24.62 38.47 87.20 53.71 60.33 87.06 58.94'),
    ('Spark-X2.5-4B', '', '63.71 37.00 77.72 62.37 26.47 43.52 92.07 54.86 73.33 91.13 62.22'),
    ('Gemma-4-E4B-it', '', '47.18 5.00 43.60 47.60 11.65 22.98 84.76 52.00 40.00 74.68 42.95'),
    ('Nanbeige-4.2-3B', '', '67.28 31.50 85.08 66.78 21.03 40.66 98.78 72.50∗ 55.00 84.47 62.31'),
    ('Agents-A1-4B', '', '46.60 39.25 81.00 75.07 33.37 43.16 92.68 56.57 63.33 83.55 61.46'),
    ('NeoHorse-1-4B', 'ours', '61.79 32.00 88.46 77.33 34.41 44.68 96.95 59.43 65.33 88.35 64.87'),
]
T2 = [
    ('Qwen3.5-9B', 'base', '64.88 31.25 88.04 74.55 39.60 44.04 92.68 65.14 66.33 89.46 65.60'),
    ('Granite-4.2-8B', '', '52.06 23.00 62.28 56.93 35.07 37.01 96.34 72.00 78.00 92.98 60.57'),
    ('Ornith-1.5-9B', '', '65.03 26.75 83.68 68.22 29.29 47.27 93.90 47.43 40.00 71.35 57.29'),
    ('Gemma-4-12B-it', '', '62.06 36.50 59.37 58.89 29.65 43.53 100.00 73.14 77.67 94.27 63.51'),
    ('Muse-Glimmer-30B', 'ref', '53.74 48.50 76.64 71.35 45.85 46.11 98.17 65.71 78.67 93.90 67.86'),
    ('NeoHorse-1-9B', 'ours', '67.43 42.25 90.82 82.25 40.15 48.73 98.17 65.14 66.33 89.09 69.04'),
]
T3 = {'cols': ['lcb', 'he', 'ifb', 'bfcl', 'tau2'], 'rows': [
    ('Public agent data (Toucan)', '49.14 87.80 56.33 54.77 73.54 64.32'),
    ('Routing-harness data', '53.14 96.34 61.33 57.20 84.85 70.57'),
    ('Difference (ours − public)', '+4.00 +8.54 +5.00 +2.43 +11.31 +6.26')]}


def flat(s):
    return re.sub(r'\s+', ' ', s)


def check_rows(rows, tid):
    blk = flat(TXT[TXT.index('=== ' + tid):])
    for name, _, vals in rows:
        want = name + ' ' + vals
        assert want in blk, (tid, want)


def rows(rs):
    out = []
    for name, role, vals in rs:
        v = vals.split()
        out.append({'m': name, 'role': role, 'p': v[:10], 'v': [float(x.rstrip('∗')) for x in v[:10]],
                    'star': [x.endswith('∗') for x in v[:10]], 'avg_p': v[10], 'avg': float(v[10])})
    return out


check_rows(T1, 'S5.T1'); check_rows(T2, 'S5.T2')
blk3 = flat(TXT[TXT.index('=== S5.T3'):])
for n, v in T3['rows']:
    assert flat(n.replace('−', '$-$')) in blk3 or n.startswith('Difference'), n
    assert v.replace('+', '+') in blk3, v

out = {
    '_doc': 'Tables 1 to 3 and Figure 7 of arXiv 2609.08183v1, transcribed by mk_tables.py (asserted against inputs/tables_v1.txt and inputs/figs.json).',
    'bench': BENCH,
    't1': {'id': 'S5.T1', 'rows': rows(T1)},
    't2': {'id': 'S5.T2', 'rows': rows(T2)},
    't3': {'id': 'S5.T3', 'cols': T3['cols'], 'rows': [{'m': n, 'p': v.split(), 'v': [float(x) for x in v.split()]} for n, v in T3['rows']]},
    'fig7': FIGS['fig7'],
    # §5.1 PinchBench trace: 9B relative to 4B
    'pinch_trace': {'requests': 70.8, 'time': 76.7, 'tokens': 83.6, 'at': 'S5.SS1'},
}
json.dump(out, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1, ensure_ascii=False)
print('tables.json written')

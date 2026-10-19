"""Transcribe the paper's argument-carrying tables into tables.json, in the paper's own (PDF) numbering.

  python3 mk_tables.py      (build.sh runs it)

Every value is read from the arXiv HTML extracts in inputs/ (extract_paper.py), in reading order, never typed.
Numbering: the PDF numbers the two main-text wrap tables as Tables 1 and 2, so the appendix tables are
Tables 3 to 10 there; the arXiv HTML drops the wrap tables' numbers and calls the appendix tables 1 to 8.
This page uses the PDF numbers (the ones the paper's text uses) and links each to its HTML anchor.
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
IN = os.path.join(HERE, 'inputs')


def toks(path, start=None, stop=None):
    s = open(os.path.join(IN, path), encoding='utf-8').read()
    if start:
        s = s[s.index(start) + len(start):]
    if stop:
        s = s[:s.index(stop)]
    s = re.sub(r'\$\\pm\$', '±', s)
    out = []
    for t in re.split(r'[\t\n]', s):
        t = re.sub(r'\s+', ' ', t.replace(' ', ' ')).strip()
        if t:
            out.append(t)
    return out


def num(t):
    t = t.replace('−', '-').replace('+', '')
    return float(t)


T = {}

# Table 1 (main text, wrap table): harness ablation, average of eight base models
tk = toks('paper_v1.txt', 'Table 2 provides per-model results.', 'We see a clear trade-off')
i = tk.index('BFCL')
rows = []
for b in range(3):
    name = tk[i + 5 * b]
    v = [num(x) for x in tk[i + 5 * b + 1:i + 5 * b + 5]]
    rows.append({'bench': name, 'p1_wo': v[0], 'p1_w': v[1], 'p32_wo': v[2], 'p32_w': v[3]})
T['t1'] = {'n': 'Table 1', 'at': 'S3', 'title': 'Harness ablation of base models: average pass@1 and pass@32 (%) of eight base models without and with the harness', 'rows': rows}

# Table 2 (main text, wrap table): PTGS results
tk = toks('paper_v1.txt', 'Best validation success checkpoint per run; PPO uses the final checkpoint.', 'Table 5 shows that task-specific RL')
i = tk.index('Base')
rows, env = [], None
j = i
seq = []
while j < len(tk):
    t = tk[j]
    if t in ('Sokoban', 'FrozenLake'):
        env = t
        for r in seq:
            r['env'] = env
        rows += seq
        seq = []
        j += 1
        continue
    if t in ('Base', 'PPO', 'PPO w/ PTGS', 'GRPO†', 'GRPO† w/ PTGS'):
        p1, pk, tax = tk[j + 1], tk[j + 2], tk[j + 3]
        seq.append({'method': t, 'p1': num(p1), 'p128': num(pk), 'taxS': None if tax == '-' else num(tax)})
        j += 4
        continue
    j += 1
for r in seq:
    r['env'] = 'FrozenLake'
rows += seq
# the environment label sits mid-group in the extract (a multirow cell), so assign by position: five rows each
assert [r['method'] for r in rows] == ['Base', 'PPO', 'PPO w/ PTGS', 'GRPO†', 'GRPO† w/ PTGS'] * 2
for k, r in enumerate(rows):
    r['env'] = 'Sokoban' if k < 5 else 'FrozenLake'
T['t2'] = {'n': 'Table 2', 'at': 'S5', 'title': 'PTGS: RL training of Qwen2.5-7B-Instruct, mean of five runs (pass@1 and pass@128 in %, TaxS(128))', 'rows': rows}

# Table 4 (HTML A1.T2): harness ablation for base and post-trained models
tk = toks('table_A1_T2.txt')
tk = tk[tk.index('gemma-4-E4B'):]
rows, bb = [], None
j = 0
while j < len(tk):
    if tk[j] not in ('BFCL', 'WebShop', 'ACEBench'):
        bb = tk[j]
        j += 1
    v = tk[j + 1:j + 11]
    rows.append({'backbone': bb, 'bench': tk[j], 'b_p1_wo': num(v[0]), 'b_p32_wo': num(v[1]), 'b_p1_w': num(v[2]), 'b_p32_w': num(v[3]), 'b_d32': num(v[4]),
                 'p_p1_wo': num(v[5]), 'p_p32_wo': num(v[6]), 'p_p1_w': num(v[7]), 'p_p32_w': num(v[8]), 'p_d32': num(v[9])})
    j += 11
T['t4'] = {'n': 'Table 4', 'at': 'A1.T2', 'title': 'Harness ablation for base and post-trained models (N = 32 rollouts per task)', 'rows': rows}

# Table 6 (HTML A3.T4): task categories at K = 128
tk = toks('table_A3_T4.txt', 'Task category')
tk = tk[6:]
rows = []
j = 0
while j < len(tk):
    bb = tk[j].replace('\\Block3-1', '')
    cats = {}
    for c in range(3):
        name = tk[j + 1 + 7 * c]
        vals = [num(re.sub(r'\s*\(.*\)', '', x)) for x in tk[j + 2 + 7 * c:j + 8 + 7 * c]]
        cats[['pass', 'mid', 'fail'][c]] = vals
        assert name.startswith(('Always', 'Pass given')), name
    for bi, bench in enumerate(('bfcl', 'webshop', 'acebench')):
        rows.append({'backbone': bb, 'bench': bench, 'base': [cats[k][2 * bi] for k in ('pass', 'mid', 'fail')], 'post': [cats[k][2 * bi + 1] for k in ('pass', 'mid', 'fail')]})
    j += 22
T['t6'] = {'n': 'Table 6', 'at': 'A3.T4', 'title': 'Task categories at K = 128 (% of tasks): always pass, pass given compute, always fail', 'rows': rows}

# Table 7 (HTML A4.T5): the 42 evaluations at k = 128
tk = toks('table_A4_T5.txt')
tk = tk[tk.index('TaxS') + 1:]
rows = []
for j in range(0, len(tk), 9):
    b, p, cb, cp, dc, mb, mp, ta, ts = tk[j:j + 9]
    m = re.match(r'([-+]?[\d.]+) \[([-+]?[\d.]+),([-+]?[\d.]+)\]', dc)
    rows.append({'bench': b, 'pair': p, 'CB': num(cb), 'CP': num(cp), 'dC': num(m.group(1)), 'lo': num(m.group(2)), 'hi': num(m.group(3)),
                 'mB': num(mb), 'mP': num(mp), 'taxA': num(ta), 'taxS': num(ts)})
T['t7'] = {'n': 'Table 7', 'at': 'A4.T5', 'title': 'The 42 model-benchmark evaluations at k = 128', 'rows': rows}

# Table 8 (HTML A4.T6): decomposition of TaxA(128) by task movement
tk = toks('table_A4_T6.txt')
tk = tk[tk.index('TaxA(128)') + 1:]
rows = []
for j in range(0, len(tk), 10):
    b, p, lo, ga, bo, ne, cl, cg, sh, tot = tk[j:j + 10]
    rows.append({'bench': b, 'pair': p, 'lost': num(lo), 'gained': num(ga), 'both': num(bo), 'neither': num(ne),
                 'cLost': num(cl), 'cGained': num(cg), 'shape': num(sh), 'taxA': num(tot)})
T['t8'] = {'n': 'Table 8', 'at': 'A4.T6', 'title': 'Decomposition of TaxA(128) by task movement', 'rows': rows}


def pm(t):
    a, b = t.split('±')
    return [num(a), num(b)]


for key, fn, n, at, title in (('t9', 'table_A5_T7.txt', 'Table 9', 'A5.T7', 'Fixed rollout-temperature ablation of PPO against PTGS (mean of five runs ± 95% CI)'),
                              ('t10', 'table_A5_T8.txt', 'Table 10', 'A5.T8', 'Rollout truncation ablation of PPO against PTGS (mean of five runs ± 95% CI)')):
    tk = toks(fn, 'Method')
    tk = [t for t in tk if not re.fullmatch(r'pass@ \$\d+\$|\$\\text\{pass\}\^\{128\}\$|\$\\text\{Tax\}_\{S\}\(128\)\$', t)]
    rows = []
    j = 0
    while j < len(tk):
        name = re.sub(r'\$\s*([^$]*)\s*\$', r'\1', tk[j]).replace('{=}', '=').replace('- ', '-').replace('  ', ' ').strip()
        v = tk[j + 1:j + 9]
        cell = lambda x: None if x in ('–', '-') else (pm(x) if '±' in x else [num(x), None])
        rows.append({'method': name, 'sok': [cell(x) for x in v[:4]], 'fl': [cell(x) for x in v[4:]]})
        j += 9
    T[key] = {'n': n, 'at': at, 'title': title, 'cols': ['pass@1', 'pass@128', 'pass^128', 'TaxS(128)'], 'rows': rows}

# the authors' own toy (examples/ptgs_toy.py, 5 seeds), as printed by running it unmodified (inputs/authors_toy_output.txt)
rows = []
for line in open(os.path.join(IN, 'authors_toy_output.txt'), encoding='utf-8'):
    m = re.match(r'(base|fixed|globalT|ptgs)\s+(.*)$', line.strip())
    if m and m.group(2).count('+-') >= 6:
        v = re.findall(r'([-\d.]+)\+-([\d.]+)|--', m.group(2))
        vals = [[float(a), float(b)] if a else None for a, b in v]
        rows.append({'arm': m.group(1), 'p1': vals[0], 'p4': vals[1], 'p16': vals[2], 'p64': vals[3], 'p128': vals[4], 'con128': vals[5], 'taxS': vals[6] if len(vals) > 6 else None})
T['toyA'] = {'n': 'authors toy', 'at': None, 'title': 'The authors\' released toy (5 seeds, numpy), printed by running examples/ptgs_toy.py unmodified', 'rows': rows}
gT = re.search(r'globalT=([\d.]+)', open(os.path.join(IN, 'authors_toy_output.txt')).read()).group(1)
T['toyA']['globalT'] = float(gT)

# sanity: shapes
assert len(T['t1']['rows']) == 3 and len(T['t2']['rows']) == 10, T['t2']
assert len(T['t4']['rows']) == 27 and len(T['t6']['rows']) == 42 and len(T['t7']['rows']) == 42 and len(T['t8']['rows']) == 42
assert len(T['toyA']['rows']) == 4 and len(T['t9']['rows']) == 7 and len(T['t10']['rows']) == 9, (len(T['t9']['rows']), len(T['t10']['rows']))
json.dump(T, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1, ensure_ascii=False)
print('tables.json:', {k: len(v['rows']) for k, v in T.items()})

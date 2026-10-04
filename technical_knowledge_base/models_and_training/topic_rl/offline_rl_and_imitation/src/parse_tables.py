"""Parse the D4RL tables (text extracted with pdftotext -layout, in inputs/) into inputs/d4rl_tables.json for the D4RL tab.
Values are copied as printed: no averaging, no renormalisation, no splicing across sources."""
import json, re, os
HERE = os.path.dirname(os.path.abspath(__file__))
num = r'-?\d+(?:\.\d+)?'
def corl(lines):
    rows, avgs = [], {}
    for l in lines:
        m = re.match(r'\s*([a-z0-9-]+-v\d)\s+(.*)$', l)
        if m:
            pairs = re.findall(rf'({num})\s*±\s*({num})', m.group(2))
            assert len(pairs) == 10, l
            rows.append({'task': m.group(1), 'v': [[float(a), float(b)] for a, b in pairs]})
            continue
        m = re.match(r'\s*((?:Gym-MuJoCo|Maze2d|AntMaze|Adroit|Total) avg)\s+(.*)$', l)
        if m:
            vals = re.findall(num, m.group(2)); assert len(vals) == 10, l
            avgs[m.group(1)] = [float(x) for x in vals]
    return rows, avgs
L = open(os.path.join(HERE, 'inputs/corl_tables_1_2.txt')).read().split('\n')
i2 = next(i for i, l in enumerate(L) if l.startswith('# CORL Table 2'))
cols = ['BC', '10% BC', 'TD3+BC', 'AWAC', 'CQL', 'IQL', 'ReBRAC', 'SAC-N', 'EDAC', 'DT']
r1, a1 = corl(L[:i2]); r2, a2 = corl(L[i2:])
out = {'corl_last': {'cols': cols, 'rows': r1, 'avgs': a1}, 'corl_best': {'cols': cols, 'rows': r2, 'avgs': a2}}
rows = []
for l in open(os.path.join(HERE, 'inputs/iql_table_1.txt')):
    m = re.match(r'\s*(locomotion-v2 total|antmaze-v0 total|[a-z0-9-]+-v\d|total)\s+(.*)$', l)
    if m and not m.group(1).startswith(('kitchen', 'adroit')):
        vals = re.findall(num, m.group(2)); assert len(vals) == 8, l
        rows.append({'task': m.group(1), 'v': [float(x) for x in vals]})
out['iql_t1'] = {'cols': ['BC', '10% BC', 'DT', 'AWAC', 'Onestep RL', 'TD3+BC', 'CQL', 'IQL'], 'rows': rows}
rows = []
for l in open(os.path.join(HERE, 'inputs/cql_table_1.txt')):
    m = re.match(r'\s*([a-z0-9]+-[a-z-]+)\s+((?:' + num + r'\s+){5}' + num + r')\s*$', l)
    if m:
        rows.append({'task': m.group(1), 'v': [float(x) for x in re.findall(num, m.group(2))]})
out['cql_t1'] = {'cols': ['SAC', 'BC', 'BEAR', 'BRAC-p', 'BRAC-v', 'CQL(H)'], 'rows': rows}
for k, v in out.items(): print(k, len(v['rows']), 'rows')
json.dump(out, open(os.path.join(HERE, 'inputs/d4rl_tables.json'), 'w'))
# checks: CORL's printed averages against the mean of its printed rows (rounding of the printed rows allows about 0.01)
for name, t in [('last', out['corl_last']), ('best', out['corl_best'])]:
    groups = {'Gym-MuJoCo avg': lambda s: s.split('-')[0] in ('halfcheetah', 'hopper', 'walker2d'), 'Maze2d avg': lambda s: s.startswith('maze2d'),
              'AntMaze avg': lambda s: s.startswith('antmaze'), 'Adroit avg': lambda s: s.split('-')[0] in ('pen', 'door', 'hammer', 'relocate')}
    for g, f in groups.items():
        rs = [r for r in t['rows'] if f(r['task'])]
        mean = [sum(r['v'][j][0] for r in rs) / len(rs) for j in range(10)]
        diff = max(abs(mean[j] - t['avgs'][g][j]) for j in range(10))
        print(name, g, len(rs), 'rows; largest |mean of rows - printed avg| =', round(diff, 3))
# IQL totals
t = out['iql_t1']
for tot, pre in [('locomotion-v2 total', ('halfcheetah', 'hopper', 'walker2d')), ('antmaze-v0 total', ('antmaze',))]:
    rs = [r for r in t['rows'] if r['task'].startswith(pre) and 'total' not in r['task']]
    s = [round(sum(r['v'][j] for r in rs), 1) for j in range(8)]
    pr = next(r['v'] for r in t['rows'] if r['task'] == tot)
    print('IQL', tot, 'sum of rows', s, 'printed', pr)
# D4RL paper, Table 2 (normalised; v0 datasets; 3 seeds)
rows = []
for l in open(os.path.join(HERE, 'inputs/d4rl_table_2.txt')):
    m = re.match(r'\s*(?:[A-Za-z0-9][A-Za-z0-9 ]*?\s{2,})?([a-z0-9]+-[a-z0-9-]+)\s+((?:' + num + r'\s+){9}' + num + r')\s*$', l)
    if m:
        rows.append({'task': m.group(1), 'v': [float(x) for x in re.findall(num, m.group(2))]})
out['d4rl_t2'] = {'cols': ['SAC (online)', 'BC', 'SAC-off', 'BEAR', 'BRAC-p', 'BRAC-v', 'AWR', 'BCQ', 'AlgaeDICE', 'CQL'], 'rows': rows}
print('d4rl_t2', len(rows), 'rows', [r['task'] for r in rows][:5])
json.dump(out, open(os.path.join(HERE, 'inputs/d4rl_tables.json'), 'w'))
# CORL Table 3: offline score -> score after online fine-tuning
rows, avgs = [], {}
for l in open(os.path.join(HERE, 'inputs/corl_table_3.txt')):
    m = re.match(r'\s*([a-z0-9-]+-v\d)\s+(.*)$', l)
    if m:
        q = re.findall(rf'({num})\s*±\s*({num})\s*→\s*({num})\s*±\s*({num})', m.group(2)); assert len(q) == 6, l
        rows.append({'task': m.group(1), 'v': [[float(a), float(b), float(c), float(d)] for a, b, c, d in q]})
    m = re.match(r'\s*(AntMaze avg|Adroit Avg|Total avg)\s+(.*)$', l)
    if m:
        q = re.findall(rf'({num})\s*→\s*({num})', m.group(2)); assert len(q) == 6, l
        avgs[m.group(1)] = [[float(a), float(b)] for a, b in q]
out['corl_o2o'] = {'cols': ['AWAC', 'CQL', 'IQL', 'SPOT', 'Cal-QL', 'ReBRAC'], 'rows': rows, 'avgs': avgs}
print('corl_o2o', len(rows), 'rows', list(avgs))
json.dump(out, open(os.path.join(HERE, 'inputs/d4rl_tables.json'), 'w'))
with open(os.path.join(HERE, 'parts/30_js_d4rl_data.js'), 'w') as f:
    f.write('// ---- D4RL tables as printed (generated by src/parse_tables.py from the text extracts in src/inputs/) ----\nwindow.D4RL=' + json.dumps(out, separators=(',', ':')) + ';\n')

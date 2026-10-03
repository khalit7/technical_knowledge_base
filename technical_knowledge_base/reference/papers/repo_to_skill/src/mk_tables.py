"""tables.json from inputs/tables_v1.txt (extract_paper.py's text of the arXiv HTML v1 tables).
Printed strings are kept exactly; numbers are parsed beside them. Table 5 (the MLE-bench budget) is prose
and is carried in the page text instead.  usage: python3 mk_tables.py"""
import json, re, os
HERE = os.path.dirname(os.path.abspath(__file__))
raw = open(os.path.join(HERE, 'inputs', 'tables_v1.txt')).read()
blocks = {m.group(1): m.group(2) for m in re.finditer(r'=== (\S+)  \S+\n(.*?)(?=\n=== |\Z)', raw, re.S)}


def cells(tid):
    body = blocks[tid]
    cap_end = body.index('\n\n', body.index('Table '))  # caption is the first paragraph
    cap = ' '.join(body[:cap_end].split())
    cs = [c.strip() for c in body[cap_end:].split('\n') if c.strip()]
    return cap, cs


def pm(s):
    m = re.fullmatch(r'([\d.]+) \$\\pm\$ ?([\d.]+)', s)
    return [float(m.group(1)), float(m.group(2))] if m else None


T = {}
# Table 1: MLE-bench, Any Medal (%) mean and SEM
cap, cs = cells('S5.T1')
i = cs.index('(n=75)') + 1
rows = []
while i < len(cs):
    name, bb, *v = cs[i:i + 6]
    rows.append({'agent': name, 'backbone': bb, 'printed': v, 'v': [pm(x) for x in v]})
    i += 6
T['t1'] = {'id': 'S5.T1', 'caption': cap, 'cols': ['Low (n=22)', 'Medium (n=38)', 'High (n=15)', 'All (n=75)'], 'n': [22, 38, 15, 75], 'rows': rows}

# Table 2: PaperBench, replication score per paper
cap, cs = cells('S5.T2')
i = cs.index('$\\Delta$') + 1
rows = []
while cs[i] != 'Average Score':
    p, topic, a, b, d = cs[i:i + 5]
    rows.append({'paper': p, 'topic': topic, 'printed': [a, b, d], 'base': float(a), 'skill': float(b), 'delta': float(d.replace('+', ''))})
    i += 5
avg = cs[i + 1:i + 4]
T['t2'] = {'id': 'S5.T2', 'caption': cap, 'rows': rows, 'avg_printed': avg}

# Table 3: FrontierCS Agent Track
cap, cs = cells('S5.T3')
i = cs.index('Avg. Tokens') + 1
rows = []
while i + 6 <= len(cs):
    a, bb, sc, st, tc, tok = cs[i:i + 6]
    rows.append({'agent': a, 'backbone': bb, 'printed': [sc, st, tc, tok], 'score': float(sc), 'steps': float(st), 'tools': float(tc), 'tokens_m': float(tok.rstrip('M'))})
    i += 6
T['t3'] = {'id': 'S5.T3', 'caption': cap, 'rows': rows}

# Table 4: PassNet eval list
cap, cs = cells('S5.T4')
i = cs.index('Failed samples') + 1
rows = []
while i + 6 <= len(cs):
    m, a, g, c, f, fl = cs[i:i + 6]
    rows.append({'method': m, 'printed': [a, g, c, f, fl], 'as': float(a), 'gm': float(g), 'corr': float(c.rstrip('%')), 'fast1': float(f.rstrip('%')), 'failed': int(fl)})
    i += 6
T['t4'] = {'id': 'S5.T4', 'caption': cap, 'cols': ['AS Score', 'G-Mean Speedup', 'Correctness', 'Fast_1', 'Failed samples'], 'rows': rows}

# Table 6: PassNet construction stage (50 training tasks, Claude Code + DeepSeek v4 pro)
cap, cs = cells('A1.T6')
i = cs.index('Second version skill') + 1
rows = []
while i + 4 <= len(cs):
    rows.append({'metric': cs[i], 'printed': cs[i + 1:i + 4]})
    i += 4
T['t6'] = {'id': 'A1.T6', 'caption': cap, 'cols': ['Baseline', 'First version skill', 'Second version skill'], 'rows': rows}

json.dump(T, open(os.path.join(HERE, 'tables.json'), 'w'), indent=1, ensure_ascii=False)
print('tables', {k: len(v['rows']) for k, v in T.items()})

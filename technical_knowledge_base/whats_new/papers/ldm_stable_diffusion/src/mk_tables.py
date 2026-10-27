"""Build tables.json from inputs/tables_parsed.json (parse_tables.py): every table that carries the argument, cells kept as
printed (only LaTeX markup turned into text), bold marks kept. Table 1's four panels are split into four tables."""
import json, re
d = json.load(open('inputs/tables_parsed.json'))
def clean(s):
    r = [(r'\\downarrow', '↓'), (r'\\uparrow', '↑'), (r'\\pm\\text\{([^}]*)\}', r'± \1'), (r'\\pm', '±'), (r'\\times', '×'),
         (r'N_\{\\text\{params\}\}', 'Params'), (r'\[\\frac\{\\text\{samples\}\}\{s\}\]\(\^\{\*\}\)', 'samples/s*'), (r'\|\\mathcal\{Z\}\|', '|Z|'),
         (r'\^\{2\}', '²'), (r'\\dagger', '†'), (r'^emph', ''), (r'\s+', ' ')]
    for a, b in r: s = re.sub(a, b, s)
    return s.strip()
def grid(tid, r0=0, r1=None, c0=0, c1=None):
    rows = d[tid]['rows'][r0:r1]
    out = []
    for r in rows:
        cells = []
        for c in r:
            cells += [[clean(c[0]), c[1]]] + [['', False]] * (c[2] - 1)
        out.append(cells[c0:c1])
    return out
def table(tid, title, head_rows, body, note=''):
    head = [[c[0] for c in h] for h in head_rows]
    return dict(at=tid, title=title, head=head, rows=[[c[0] for c in r] for r in body],
                bold=[[i, j] for i, r in enumerate(body) for j, c in enumerate(r) if c[1] and j > 0], note=note)
T = {}
cap = lambda t: clean(d[t]['caption'])
T1 = d['S4.T1']['rows']
for name, rs, c0 in (('T1a', (1, 8), 0), ('T1b', (1, 8), 5), ('T1c', (9, 17), 0), ('T1d', (9, 17), 5)):
    g = grid('S4.T1', rs[0], rs[1], c0, c0 + 4)
    ds = {'T1a': 'CelebA-HQ 256²', 'T1b': 'FFHQ 256²', 'T1c': 'LSUN-Churches 256²', 'T1d': 'LSUN-Bedrooms 256²'}[name]
    T[name] = table('S4.T1', 'Table 1: unconditional generation, ' + ds, [g[0]], g[1:], cap('S4.T1'))
for tid, key, hr in (('S4.T2', 'T2', 2), ('S4.T3', 'T3', 1), ('S4.T5', 'T5', 1), ('S4.T6', 'T6', 2), ('S4.T7', 'T7', 2), ('A4.T8', 'T8', 1),
                     ('A4.T9', 'T9', 2), ('A4.T10', 'T10', 1), ('A4.T11', 'T11', 1), ('A6.T18', 'T18', 2), ('S4.T4', 'T4', 2)):
    g = grid(tid)
    if key == 'T2': g = g[1:]; hr = 1
    T[key] = table(tid, cap(tid).split(':')[0], g[:hr], g[hr:], cap(tid))
T['_doc'] = 'Transcribed from the arXiv HTML v2 by mk_tables.py (inputs/tables_parsed.json); cells as printed, bold kept ([row, col] in rows).'
json.dump(T, open('tables.json', 'w'), indent=1, ensure_ascii=False)
for k, v in T.items():
    if k != '_doc': print(k, v['head'], v['rows'][0], len(v['rows']))

"""Check every cell of tables.json against the paper text extracted from the arXiv HTML v1
(inputs/paper_v1.txt for tables, the Figure 6 caption for Elo): each table's numbers must appear in
the source, in the printed order. usage: python3 check_tables.py"""
import json, re
T = json.load(open('tables.json')); src = open('inputs/paper_v1.txt').read()
num = lambda s: re.findall(r'\d+\.\d+|\d+', s)
bad = n = 0
for k, t in T.items():
    if k.startswith('_') or k == 'l2own': continue
    cells = [c for r in t['rows'] for c in r[1:] if num(c)]
    if k == 'elo':
        cap = src[src.index('Figure 6:'):src.index('Figure 6:') + 400]
        for c in cells:
            n += 1
            if c not in cap: bad += 1; print('missing', k, c)
        continue
    pos = 0
    for c in cells:
        for x in num(c):
            n += 1
            i = src.find(x, pos)
            if i < 0: bad += 1; print('missing or out of order', k, c)
            else: pos = i + len(x)
print('cells checked', n, 'problems', bad)
# Llama 2 paper's own numbers for Llama 2 70B, against the extracted Llama 2 tables
L2 = open('inputs/llama2_tables_extract.txt').read()
m = 0
for b, v, w in T['l2own']['rows']:
    if not v: continue
    m += 1
    if v not in L2: bad += 1; print('missing in Llama 2 extract', b, v)
print('Llama 2 cells checked', m, 'problems total', bad)
assert bad == 0

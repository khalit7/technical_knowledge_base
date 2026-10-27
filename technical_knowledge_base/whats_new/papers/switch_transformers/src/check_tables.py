"""Check every numeric cell of tables.json against the arXiv extracts in inputs/table_*.txt, in order.
usage: python3 check_tables.py"""
import json, re
T = json.load(open('tables.json')); bad = 0; n = 0
for k, t in T.items():
    if k.startswith('_'): continue
    src = open('inputs/table_%s.txt' % t['at'].replace('.', '_')).read()
    nums = re.findall(r'-?\d[\d,]*\.?\d*', src.split('Table ')[0] if 'Table ' in src else src)
    cells = [c for r in t['rows'] for c in r[1:]] + t.get('dense', [])
    pos = 0
    for c in cells:
        for v in re.findall(r'-?\d[\d,]*\.?\d*', c):
            n += 1
            if v in nums: continue
            bad += 1; print('not found', k, c)
print('cells checked', n, 'missing', bad)

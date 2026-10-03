# Parse the modded-nanogpt world-record table (inputs/modded_nanogpt_README.md, fetched 2026-10-03)
# into data/speedrun.json, with this page's category for each record (our tagging, not the repo's).
import json, re
SRC = 'https://github.com/KellerJordan/modded-nanogpt#world-record-history'
rows = []
lines = open('inputs/modded_nanogpt_README.md', encoding='utf-8').read().split('## World record history')[1].split('## Rules')[0].splitlines()
for ln in lines:
    m = re.match(r'^(\d+) \| ([\d.]+) minutes \| (.*?)\s*\| (\d\d/\d\d/\d\d) \|(.*)$', ln.strip())
    if not m: continue
    n, t, desc, date, rest = m.groups()
    link = re.search(r'\]\((https?://[^)]+)\)', desc)
    text = re.sub(r'\[([^\]]*)\]\([^)]*\)', r'\1', desc).strip()
    mo, d, y = date.split('/')
    retime = 'not a new record' in rest
    pr = re.search(r'\[PR\]\((https://github.com/[^)]+)\)', rest)
    rows.append({'n': int(n), 'min': float(t), 'desc': text, 'date': f'20{y}-{mo}-{d}',
                 'url': link.group(1) if link else (pr.group(1) if pr else None), 'retime': retime})
# Category of the record's main change (first-listed change when a record bundles several).
CAT = {
 'opt': [3,4,6,36,38,41,42,43,48,50,56,57,61,80],
 'arch': [5,8,9,11,14,15,17,18,20,28,30,34,35,40,45,47,49,51,52,53,54,55,58,62,63,64,65,70,73,77,81,82,83,85,88],
 'attn': [12,13,16,29,31],
 'sched': [2,21,26,39,46,72],
 'sys': [7,10,19,22,23,24,25,27,32,33,37,44,59,60,66,67,68,69,71,74,75,76,78,79,84,86,87,89,90],
 'eval': [91], 'base': [1],
 'mixed': [92],
}
cat = {n: c for c, ns in CAT.items() for n in ns}
for r in rows:
    if r['retime']: r['cat'] = 'retime'; continue
    r['cat'] = cat.get(r['n'], '?')
missing = [r['n'] for r in rows if r['cat'] == '?']
assert not missing, missing
# log-speedup per record against the latest timing before it (re-timings reset the baseline)
prev = None
for r in rows:
    if prev is not None: r['gain'] = round(__import__('math').log(prev / r['min']), 5)
    prev = r['min']
json.dump({'source': SRC, 'fetched': '2026-10-03', 'target': 'val loss <= 3.28 on FineWeb, 8x H100', 'rows': rows},
          open('data/speedrun.json', 'w'), indent=0)
import math
tot = sum(r.get('gain', 0) for r in rows if r['cat'] != 'retime')
print(len(rows), 'rows;', len([r for r in rows if not r['retime']]), 'records; first', rows[0]['min'], 'last', rows[-1]['min'])
print('total log gain', round(tot, 4), '= x', round(math.exp(tot), 2), ' check 45/0.665*3.014/2.933 =', round(45/0.665*3.014/2.933, 2))
for c in ['opt','arch','attn','sched','sys','eval','mixed']:
    g = sum(r.get('gain',0) for r in rows if r['cat'] == c); print(c, len([r for r in rows if r['cat']==c]), round(100*g/tot,1), '%')

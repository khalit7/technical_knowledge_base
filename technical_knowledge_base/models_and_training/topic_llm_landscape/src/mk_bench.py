#!/usr/bin/env python3
"""Turn data/bench_grid.json into the compact data line inlined in parts/32_js_bench.js.

Run from anywhere: python3 src/mk_bench.py
The data goes between the markers /*BG-DATA*/ and /*BG-DATA-END*/ in parts/32_js_bench.js.
Compact format (strings deduplicated into D.S, referenced by index, -1 for none):
  D.B: [id, name, version, group, unit, run by, url, description, in AA index (0/1)]
  D.R: [model, effort, lab, open (0/1), AA index v4.3, AA slug, {bench id: [entry, ...]}]
       entry: [value, kind (0 independent, 1 lab-reported), by, url, version, date read,
               configuration tested, note, quote, flags (1 = different metric, 2 = configuration differs)]
  D.N: {AA slug: [[benchmark, value, by, url, quote, independent cross-check], ...]}
Also prints coverage counts and checks for em-dashes.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'data', 'bench_grid.json')
JS = os.path.join(HERE, 'parts', '32_js_bench.js')

g = json.load(open(SRC, encoding='utf-8'))
S, SI = [], {}


def s(x):
    if x is None:
        return -1
    if x not in SI:
        SI[x] = len(S)
        S.append(x)
    return SI[x]


B = [[b['id'], b['name'], b['ver'], b['grp'], b['unit'], b['by'], b['url'], b['desc'], 1 if b['idx'] else 0] for b in g['benchmarks']]
R = []
for r in g['rows']:
    cells = {}
    for bid, ents in r['cells'].items():
        cells[bid] = [[e['v'], 1 if e['kind'] == 'lab' else 0, s(e['by']), s(e['url']), s(e.get('ver')), s(e.get('date')),
                       s(e.get('cfg')), s(e.get('note')), s(e.get('q')),
                       (1 if e.get('cmp') is False else 0) | (2 if e.get('cfgdiff') else 0)] for e in ents]
    R.append([r['m'], r['e'], r['lab'], 1 if r['open'] else 0, r['aa_index'], r['slug'], cells])
N = {k: [[x['b'], x['v'], s(x['by']), s(x['url']), s(x.get('q')), s(x.get('ind'))] for x in v] for k, v in g['model_notes'].items()}
D = dict(S=S, B=B, R=R, N=N, date=g['read_date'])
line = 'const D=' + json.dumps(D, ensure_ascii=False, separators=(',', ':')) + ';'
if chr(0x2014) in line:
    sys.exit('em-dash found in data')

js = open(JS, encoding='utf-8').read()
new, n = re.subn(r'/\*BG-DATA\*/.*?/\*BG-DATA-END\*/', lambda m: '/*BG-DATA*/' + line + '/*BG-DATA-END*/', js, flags=re.S)
if n != 1:
    sys.exit('markers not found in ' + JS)
open(JS, 'w', encoding='utf-8').write(new)

ids = [b[0] for b in B]
tot = len(R) * len(ids)
filled = sum(1 for r in R for b in ids if b in r[6] and any(not (e[9] & 1) for e in r[6][b]))
ind = sum(1 for r in R for b in ids if b in r[6] and any(e[1] == 0 for e in r[6][b]))
print('rows', len(R), 'benchmarks', len(ids), 'cells', filled, 'of', tot, '(independent', ind, ', lab-reported only', filled - ind, ')')
for i, b in enumerate(ids):
    f = sum(1 for r in R if b in r[6] and any(not (e[9] & 1) for e in r[6][b]))
    fi = sum(1 for r in R if b in r[6] and any(e[1] == 0 for e in r[6][b]))
    print('  %-24s %2d / %d  independent %2d  lab-only %d' % (B[i][1], f, len(R), fi, f - fi))
print('data bytes', len(line.encode('utf-8')))

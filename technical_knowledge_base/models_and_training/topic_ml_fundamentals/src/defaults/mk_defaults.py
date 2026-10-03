#!/usr/bin/env python3
"""Validate data/defaults.json and inline it in parts/33_js_defaults_a.js.

Run from anywhere: python3 src/defaults/rows.py && python3 src/defaults/mk_defaults.py
The data goes between the markers /*DF-DATA*/ and /*DF-DATA-END*/ as `const DF={...};`.

Checks: every row has every column; every kind is known; pub, der, inh and unc cells have a source,
a source label and an ISO date; der cells have a formula; numbers are numbers; a family, where given,
is one of the column's families; every page key exists; no em-dash and no '{{' anywhere (the build's
link expander would rewrite it). Prints disclosure per column and per row.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, 'data', 'defaults.json')
JS = os.path.join(HERE, 'parts', '33_js_defaults_a.js')
KINDS = {'pub', 'der', 'inh', 'unc', 'nd', 'na'}
DATE = re.compile(r'^\d{4}-\d{2}-\d{2}$')

raw = open(SRC, encoding='utf-8').read()
if chr(0x2014) in raw:
    sys.exit('em-dash found in ' + SRC)
if '{{' in raw:
    sys.exit("'{{' found in " + SRC)
d = json.loads(raw)
cols = [c['id'] for c in d['columns']]
err = []
for c in d['columns']:
    if c['page'] not in d['pages']:
        err.append('column %s: unknown page %s' % (c['id'], c['page']))
for r in d['rows']:
    for k in ('id', 'model', 'lab', 'date', 'era', 'arch', 'report', 'cells'):
        if k not in r:
            err.append('%s: missing %s' % (r.get('id'), k))
    if not DATE.match(r['date']) or not DATE.match(r['report']['date']):
        err.append('%s: bad date' % r['id'])
    for c in cols:
        x = r['cells'].get(c)
        if x is None:
            err.append('%s.%s missing' % (r['id'], c)); continue
        if x['kind'] not in KINDS:
            err.append('%s.%s kind %s' % (r['id'], c, x['kind']))
        if x['kind'] in ('pub', 'der', 'inh', 'unc'):
            if not (x.get('src') and x.get('sl') and DATE.match(x.get('sd', ''))):
                err.append('%s.%s has no dated source' % (r['id'], c))
        if x['kind'] == 'der' and not x.get('f'):
            err.append('%s.%s derived without formula' % (r['id'], c))
        if 'n' in x and not isinstance(x['n'], (int, float)):
            err.append('%s.%s.n not a number' % (r['id'], c))
        if 'fam' in x and x['fam'] not in [f[0] for f in d['fams'].get(c, [])]:
            err.append('%s.%s unknown family %s' % (r['id'], c, x['fam']))
        if c in d['fams'] and x['kind'] not in ('nd', 'na') and 'fam' not in x:
            err.append('%s.%s needs a family' % (r['id'], c))
for x in d['corrections']:
    for rid in x['rows']:
        if rid not in [r['id'] for r in d['rows']]:
            err.append('correction row %s unknown' % rid)
if err:
    sys.exit('\n'.join(err))

line = 'const DF=' + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ';'
js = open(JS, encoding='utf-8').read()
new, n = re.subn(r'/\*DF-DATA\*/.*?/\*DF-DATA-END\*/', lambda m: '/*DF-DATA*/' + line + '/*DF-DATA-END*/', js, flags=re.S)
if n != 1:
    sys.exit('markers not found in ' + JS)
open(JS, 'w', encoding='utf-8').write(new)

print('rows', len(d['rows']), 'columns', len(cols), 'data bytes', len(line))
ok = lambda x: x['kind'] in ('pub', 'der')
print('per column (published or derived / applies):')
for c in cols:
    a = sum(1 for r in d['rows'] if ok(r['cells'][c]))
    b = sum(1 for r in d['rows'] if r['cells'][c]['kind'] != 'na')
    print('  %-6s %2d/%2d' % (c, a, b))
print('per row:')
for r in d['rows']:
    a = sum(1 for c in cols if ok(r['cells'][c]))
    b = sum(1 for c in cols if r['cells'][c]['kind'] != 'na')
    nd = sum(1 for c in cols if r['cells'][c]['kind'] == 'nd')
    print('  %-12s %2d/%2d  not disclosed %d' % (r['id'], a, b, nd))

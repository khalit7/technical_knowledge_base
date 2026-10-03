#!/usr/bin/env python3
"""Validate data/recipes.json and inline it in parts/32_js_recipes.js.

Run from anywhere: python3 src/recipes/mk_recipes.py
The data goes between the markers /*RC-DATA*/ and /*RC-DATA-END*/ as `const D={...};`.

Each row: id, model, lab, date, arch, pa (active params), pt (total params), report{title,url,date},
page (Notion id of the repo paper page, if any), base, seq [[stage, label], ...], cells{column id: CELL}.
CELL: v (display), kind (pub | der | unc | nd | none | inh), n (sort value), m (method line),
src, sl (source label), sd (source date), f (formula, required for der), q (verbatim quote), note,
tok / tokk / tokf (tokens of that stage, its kind and formula, for the tokens-per-stage chart).
Checks: every row has every column; every kind is known; pub, der, unc and inh cells have a source;
der cells have a formula; numbers are numbers; no em-dash anywhere. Prints coverage per column and row.
"""
import json, os, re, sys

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(HERE, 'data', 'recipes.json')
JS = os.path.join(HERE, 'parts', '32_js_recipes_a.js')
KINDS = {'pub', 'der', 'unc', 'nd', 'none', 'inh'}
STAGES = {'pt', 'mid', 'lc', 'sft', 'pref', 'rl', 'dist', 'merge', 'inh', 'loop', 'post'}

raw = open(SRC, encoding='utf-8').read()
if chr(0x2014) in raw:
    sys.exit('em-dash found in ' + SRC)
d = json.loads(raw)
cols = [c['id'] for c in d['columns']]
err = []
for r in d['rows']:
    for k in ('id', 'model', 'lab', 'date', 'arch', 'report', 'seq', 'cells'):
        if k not in r:
            err.append('%s: missing %s' % (r.get('id'), k))
    for s in r['seq']:
        if s[0] not in STAGES:
            err.append('%s: unknown stage %s' % (r['id'], s[0]))
    for c in cols:
        x = r['cells'].get(c)
        if x is None:
            err.append('%s.%s missing' % (r['id'], c)); continue
        if x['kind'] not in KINDS:
            err.append('%s.%s kind %s' % (r['id'], c, x['kind']))
        if x['kind'] in ('pub', 'der', 'unc', 'inh') and not x.get('src'):
            err.append('%s.%s has no source' % (r['id'], c))
        if x['kind'] == 'der' and not x.get('f'):
            err.append('%s.%s derived without formula' % (r['id'], c))
        for k in ('n', 'tok'):
            if k in x and not isinstance(x[k], (int, float)):
                err.append('%s.%s.%s not a number' % (r['id'], c, k))
        if x.get('tokk') == 'der' and not x.get('tokf'):
            err.append('%s.%s token count derived without formula' % (r['id'], c))
if err:
    sys.exit('\n'.join(err))

line = 'const D=' + json.dumps(d, ensure_ascii=False, separators=(',', ':')) + ';'
js = open(JS, encoding='utf-8').read()
new, n = re.subn(r'/\*RC-DATA\*/.*?/\*RC-DATA-END\*/', lambda m: '/*RC-DATA*/' + line + '/*RC-DATA-END*/', js, flags=re.S)
if n != 1:
    sys.exit('markers not found in ' + JS)
open(JS, 'w', encoding='utf-8').write(new)

print('rows', len(d['rows']), 'columns', len(cols), 'data bytes', len(line.encode('utf-8')))
tally = lambda xs: ' '.join('%s %d' % (k, sum(1 for x in xs if x == k)) for k in ('pub', 'der', 'unc', 'inh', 'nd', 'none'))
for c in cols:
    print('  %-11s %s' % (c, tally([r['cells'][c]['kind'] for r in d['rows']])))
for r in d['rows']:
    ks = [r['cells'][c]['kind'] for c in cols]
    print('  %-26s disclosed %2d / %d   %s' % (r['model'], sum(1 for k in ks if k in ('pub', 'der')), len(cols), tally(ks)))

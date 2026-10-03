#!/usr/bin/env python3
"""Validate data/atlas.json, check every quote against its source, and inline the data in parts/33_js_atlas_a.js.

Run: python3 src/atlas/rows.py && python3 src/atlas/mk_atlas.py

Checks:
- every row has every column and every taxonomy axis; kinds are pub, der or unc; families are known;
- every cell names a known source; every 'from' edge names an existing row that is not later than its child;
- every quote is found in its source: the arXiv abstract (inputs/arxiv.json), the passages copied by mk_extracts.py
  (inputs/extracts.json), Crossref or page metadata (inputs/other_sources.json) or a repo paper text (sources.REPO_TEXT).
  Contiguous match first; full texts converted from two-column PDFs may interleave columns, so a quote there may
  also match as an in-order word sequence with small gaps (reported separately);
- pub cells must carry a quote, except paper cells (the link is the evidence);
- no em-dash and no '{{' anywhere (the build's link expander would rewrite it).
Writes the resolved source list (titles, links and dates from the fetched metadata) into the JS block.
"""
import json, os, re, sys, unicodedata
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from sources import REPO_TEXT
REPO = os.path.abspath(os.path.join(HERE, '../../../../..'))
SRC = os.path.join(HERE, '..', 'data', 'atlas.json')
JS = os.path.join(HERE, '..', 'parts', '33_js_atlas_a.js')

raw = open(SRC, encoding='utf-8').read()
if chr(0x2014) in raw: sys.exit('em-dash in atlas.json')
if '{{' in raw: sys.exit("'{{' in atlas.json")
d = json.loads(raw)
AX = json.load(open(os.path.join(HERE, 'inputs', 'arxiv.json'), encoding='utf-8'))
EX = json.load(open(os.path.join(HERE, 'inputs', 'extracts.json'), encoding='utf-8'))
OT = json.load(open(os.path.join(HERE, 'inputs', 'other_sources.json'), encoding='utf-8'))

def toks(s):
    s = unicodedata.normalize('NFKC', s).replace('↵', 'ff').lower()
    s = re.sub(r'(\w)-\s+(\w)', r'\1-\2', s)  # a hyphen at a line break keeps the halves as separate tokens
    return re.findall(r'\w+', s)

# resolve sources
for k, s in d['sources'].items():
    if 'ax' in s:
        a = AX[s['ax']]
        au = a['authors']
        who = au[0].split()[-1] + (' et al.' if len(au) > 2 else (' and ' + au[1].split()[-1] if len(au) == 2 else ''))
        s.update(t='%s, %s (arXiv %s)' % (who.strip(), a['title'], s['ax']), u='https://arxiv.org/abs/' + s['ax'], d=a['published'], kind='paper')
corpus = {}
for k, s in d['sources'].items():
    parts = []
    if 'ax' in s: parts.append(('abstract', AX[s['ax']]['abstract'] + ' ' + AX[s['ax']]['title']))
    for x in EX.get(k, []): parts.append(('extract', x))
    for p in REPO_TEXT.get(k, []): parts.append(('repo', open(os.path.join(REPO, p), encoding='utf-8').read()))
    u = s.get('u', '')
    for kk, v in OT.items():
        if kk == 'doi:' + u.replace('https://doi.org/', '') or kk == u:
            parts.append(('meta', v.get('title', '') + ' ' + v.get('text', '')))
    corpus[k] = [(w, toks(t)) for w, t in parts]

def find(q, k):
    qt = toks(q)
    if not qt: return 'empty'
    for w, tt in corpus.get(k, []):
        n = len(qt)
        for i in range(len(tt) - n + 1):
            if tt[i:i + n] == qt: return 'exact'
    for w, tt in corpus.get(k, []):  # gapped, in order
        if w not in ('extract', 'repo'): continue
        for st in [i for i, t in enumerate(tt) if t == qt[0]]:
            j, ok = st, True
            for t in qt[1:]:
                nxt = next((m for m in range(j + 1, min(len(tt), j + 40)) if tt[m] == t), None)
                if nxt is None: ok = False; break
                j = nxt
            if ok: return 'gapped'
    return None

err, stats = [], {'exact': 0, 'gapped': 0, 'cells': 0, 'pub': 0, 'der': 0, 'unc': 0}
cols = [c['id'] for c in d['columns']]
fams = {k: [x[0] for x in v] for k, v in d['fams'].items()}
ids = {r['id']: r for r in d['rows']}
axes = {a['id']: a for a in d['axes']}
def chk_q(where, q, s):
    r = find(q, s)
    if not r: err.append('%s: quote not found in %s: "%s"' % (where, s, q[:90]))
    else: stats[r] += 1
for r in d['rows']:
    if r['page'] and r['page'] not in d['pages']: err.append('%s: unknown page %s' % (r['id'], r['page']))
    if r['lane'] not in [l[0] for l in d['lanes']]: err.append('%s: unknown lane' % r['id'])
    for c in cols:
        x = r['cells'].get(c)
        if not x: err.append('%s.%s missing' % (r['id'], c)); continue
        stats['cells'] += 1; stats[x['k']] = stats.get(x['k'], 0) + 1
        if x['k'] not in ('pub', 'der', 'unc'): err.append('%s.%s kind' % (r['id'], c))
        if x['s'] not in d['sources']: err.append('%s.%s source %s unknown' % (r['id'], c, x['s'])); continue
        if x['k'] == 'pub' and not x.get('q') and c != 'paper': err.append('%s.%s pub without quote' % (r['id'], c))
        if x.get('q'): chk_q('%s.%s' % (r['id'], c), x['q'], x['s'])
        if c in fams:
            f = x.get('f')
            if c == 'needs':
                for t in f or []:
                    if t not in fams['needs']: err.append('%s needs tag %s' % (r['id'], t))
            elif f not in fams[c]: err.append('%s.%s family %s' % (r['id'], c, f))
        if c == 'fixed':
            for p in x.get('from', []):
                if p not in ids: err.append('%s: parent %s unknown' % (r['id'], p))
                elif ids[p]['date'] > r['date']: err.append('%s (%s) fixes %s dated later (%s)' % (r['id'], r['date'], p, ids[p]['date']))
    for a, v in r['tax'].items():
        vals = [x[0] for x in axes[a]['vals']]
        if v['f'] not in vals: err.append('%s tax %s value %s not in %s' % (r['id'], a, v['f'], vals))
        if v['s'] not in d['sources']: err.append('%s tax %s source' % (r['id'], a))
for a in d['axes']:
    for key in ('q', 'q2'):
        if a.get(key): chk_q('axis %s %s' % (a['id'], key), a[key][1], a[key][0])
    for m in re.findall(r'\{s:([\w]+)\|', a['defn'] + a['mis'] + a['blur']):
        if m not in d['sources']: err.append('axis %s cites unknown %s' % (a['id'], m))
    for sd in a['sides']:
        for m in sd[2]:
            if m not in ids: err.append('axis %s side method %s unknown' % (a['id'], m))
    if a.get('col') and a['col'] not in cols: err.append('axis %s col' % a['id'])
    tv = {r['tax'][a['id']]['f'] if not a.get('col') else r['cells'][a['col']]['f'] for r in d['rows']}
    unused = [v[0] for v in a['vals'] if v[0] not in tv]
    if unused: print('note: axis %s values with no method: %s' % (a['id'], unused))
for x in d['corrections']:
    for rid in x['rows']:
        if rid not in ids: err.append('correction row %s' % rid)
    if x['cell'][0] not in ids: err.append('correction cell %s' % x['cell'])
for ch in d['chains'].values():
    for s in ch['steps']:
        if s not in ids: err.append('chain step %s' % s)
if err:
    print('\n'.join(err)); sys.exit('%d problems' % len(err))
print('rows %d, cells %d (pub %d, der %d, unc %d), quotes exact %d, gapped %d' % (len(d['rows']), stats['cells'], stats['pub'], stats['der'], stats['unc'], stats['exact'], stats['gapped']))
used = {x['s'] for r in d['rows'] for x in list(r['cells'].values()) + list(r['tax'].values())}
print('sources cited: %d of %d' % (len(used), len(d['sources'])))
js = json.dumps(d, ensure_ascii=False, separators=(',', ':'))
src = open(JS, encoding='utf-8').read() if os.path.exists(JS) else '/*AT-DATA*/\n/*AT-DATA-END*/\n'
new = re.sub(r'/\*AT-DATA\*/.*?/\*AT-DATA-END\*/', lambda m: '/*AT-DATA*/window.ATLAS=' + js + ';/*AT-DATA-END*/', src, flags=re.S)
open(JS, 'w', encoding='utf-8').write(new)
print('wrote data block, %d bytes' % len(js))

"""Build the Database atlas data (t-atlas) from the researched rows.
Inputs (all in this folder):
  research/g*/<id>.json   one file per system, researched from primary sources (schema in README.md)
  overrides.json          {id: {field: value}} corrections and edits applied on top of research (each with a reason in "_why")
  chooser.json            {id: {acc, txn, wr, flex, ops}} the five-question chooser's attributes per row (this page's judgement)
  lic_to.json             {"id|date": licence class moved to} colours the licence timeline
  claims.json             the old page's claims, each verified, corrected or unconfirmed, with sources
  meta.json               families, engines, licence classes, deploy kinds, views, glossary, chooser questions, lead texts
Outputs: atlas.json (the merged data) and ../parts/33_js_atlas_data.js (window.DA_DATA).
Run: python3 build_atlas.py   (standard library only)"""
import json, glob, os, re, sys
H = os.path.dirname(os.path.abspath(__file__))
J = lambda p: json.load(open(os.path.join(H, p)))
meta = J('meta.json'); over = J('overrides.json'); ch = J('chooser.json'); claims = J('claims.json'); lic_to = J('lic_to.json')
ENUM = {'family': set(meta['families']), 'engine': set(meta['engines']), 'licence_class': set(meta['lic'])}
FIELDS = ['id', 'name', 'family', 'embedded', 'model', 'engine', 'engine_note', 'consistency', 'jepsen', 'scaling', 'licence', 'licence_class',
          'licence_events', 'deploy', 'managed', 'version', 'version_date', 'version_url', 'version_note', 'reach', 'avoid', 'escape', 'chat', 'src', 'notes']
LIMITS = {'model': 170, 'engine_note': 200, 'consistency': 420, 'scaling': 280, 'reach': 220, 'avoid': 220, 'escape': 150, 'chat': 160}
errs, warns = [], []
rows = []
for f in sorted(glob.glob(os.path.join(H, 'research', 'g*', '*.json'))):
    r = json.load(open(f))
    o = over.get(r['id'], {})
    for k, v in o.items():
        if not k.startswith('_'): r[k] = v
    for k in FIELDS:
        if k not in r: r[k] = '' if k not in ('jepsen', 'licence_events', 'deploy', 'managed') else ([] if k != 'src' else {})
    for k, s in ENUM.items():
        if r[k] not in s: errs.append(f"{r['id']}: {k}={r[k]!r} not in {sorted(s)}")
    for d in r['deploy']:
        if d not in meta['deploy']: errs.append(f"{r['id']}: deploy {d}")
    for k, n in LIMITS.items():
        if len(r[k]) > n: warns.append(f"{r['id']}: {k} is {len(r[k])} chars (> {n})")
    if r['version_date'] and not re.fullmatch(r'\d{4}(-\d\d){0,2}', r['version_date']): errs.append(f"{r['id']}: version_date {r['version_date']}")
    for e in r['licence_events'] + r['jepsen']:
        if not re.fullmatch(r'\d{4}(-\d\d){0,2}', e['date']): errs.append(f"{r['id']}: event date {e['date']}")
        if not e.get('url'): errs.append(f"{r['id']}: event without url")
    r['jepsen'].sort(key=lambda e: e['date']); r['licence_events'].sort(key=lambda e: e['date'])
    for e in r['licence_events']:
        k2 = r['id'] + '|' + e['date']
        e['to'] = lic_to.get(k2, '')
        if k2 not in lic_to: warns.append(f"{r['id']}: licence event {e['date']} has no lic_to colour")
    for k in ('model', 'engine', 'consistency', 'scaling', 'licence', 'managed', 'version', 'reach'):
        if not r["src"].get(k) and not (k == "managed" and not r["managed"]): errs.append(f"{r['id']}: no source for {k}")
    if r['id'] not in ch: errs.append(f"{r['id']}: no chooser attributes")
    r['ch'] = ch.get(r['id'], {'acc': [], 'txn': 'none', 'wr': 1, 'flex': False, 'ops': []})
    r['short'] = r.get('short') or re.sub(r'^(Amazon|Google|Apache|Azure) ', '', re.sub(r'\s*\(.*?\)', '', r['name'])).split(' / ')[0][:16]
    rows.append(r)
# sources: dedupe URLs into one numbered list; cells point at indexes
srcs, idx = [], {}
def sid(u):
    u = u.strip()
    if u not in idx:
        idx[u] = len(srcs); m = re.match(r'https?://([^/]+)(/[^?#]*)?', u)
        t = (m.group(1).replace('www.', '') + (m.group(2) or '')).rstrip('/') if m else u
        srcs.append({'u': u, 't': t if len(t) < 90 else t[:87] + '...'})
    return idx[u]
for r in rows:
    r['s'] = {k: [sid(u) for u in v] for k, v in r['src'].items() if v}
    del r['src']
ids = {r['id'] for r in rows}
for c in claims:
    if c['verdict'] not in ('verified', 'corrected', 'unconfirmed'): errs.append('claim verdict ' + c['verdict'])
    for i in c.get('rows', []):
        if i not in ids: warns.append(f"claim row {i} missing")
for i in ch:
    if i not in ids: warns.append(f"chooser row {i} has no research file")
data = dict(meta['page'], asof=meta['asof'], families=meta['families'], engines=meta['engines'], lic=meta['lic'], deploy=meta['deploy'], views=meta['views'],
            glossary=meta['glossary'], chooser=meta['chooser'], sources=srcs, rows=rows, claims=claims)
txt = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
if '\u2014' in txt: errs.append('em dash in data: ' + txt[max(0, txt.index('\u2014') - 60):txt.index('\u2014') + 20])
json.dump(data, open(os.path.join(H, 'atlas.json'), 'w'), ensure_ascii=False, indent=1)
open(os.path.join(H, '..', 'parts', '33_js_atlas_data.js'), 'w').write('// generated by src/atlas/build_atlas.py from src/atlas/*.json; do not edit\nwindow.DA_DATA=' + txt.replace('</', '<\\/') + ';\n')
print(f"{len(rows)} rows, {len(srcs)} sources, {len(claims)} claims, {len(txt)} bytes")
for w in warns: print('WARN', w)
for e in errs: print('ERR', e)
sys.exit(1 if errs else 0)

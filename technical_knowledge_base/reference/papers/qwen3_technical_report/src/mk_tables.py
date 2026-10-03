"""Transcribe the Qwen3 report's tables from the arXiv HTML (v1, the only version) into tables.json.
usage: curl -sL https://arxiv.org/html/2505.09388v1 -o q3.html; python3 mk_tables.py q3.html
Every cell is kept as printed (a string), with bold (best) and underline (second best) marks; writes tables.json.
Rows are lists of cells; empty cells are ''. Category cells (rowspan) are recorded in 'group'."""
import json, re, sys
from html.parser import HTMLParser

class P(HTMLParser):
    def __init__(s):
        super().__init__(); s.tables = {}; s.cur = None; s.stack = []; s.row = None; s.cell = None
    def handle_starttag(s, tag, a):
        a = dict(a); cls = a.get('class', '') or ''; i = a.get('id', '') or ''
        if tag == 'figure' and re.fullmatch(r'(S|A)\d+\.T\d+', i):
            s.cur = {'id': i, 'caption': '', 'rows': []}; s.tables[i] = s.cur; s.fig_depth = 0
        if s.cur is None: return
        if tag == 'figure': s.fig_depth += 1
        mark = None
        if 'ltx_tr' in cls.split() and s.cell is None: s.row = []; s.cur['rows'].append(s.row); mark = 'tr'
        elif ('ltx_td' in cls.split() or 'ltx_th' in cls.split()) and s.row is not None and s.cell is None:
            s.cell = {'t': '', 'b': False, 'u': False, 'rs': int(a.get('rowspan', '1') or 1), 'cs': int(a.get('colspan', '1') or 1)}; s.row.append(s.cell); mark = 'td'
        elif tag == 'figcaption': mark = 'cap'
        if s.cell is not None:
            if 'ltx_font_bold' in cls: s.cell['b'] = True
            if 'ltx_underline' in cls: s.cell['u'] = True
        if tag == 'math': s.stack.append(('math', a.get('alttext', ''))); return
        s.stack.append((tag, mark))
    def handle_endtag(s, tag):
        if s.cur is None: return
        if tag == 'figure':
            s.fig_depth -= 1
            if s.fig_depth == 0: s.cur = None; s.stack = []; s.row = None; s.cell = None; return
        while s.stack:
            t, m = s.stack.pop()
            if m == 'td': s.cell = None
            if m == 'tr': s.row = None
            if m == 'cap': s.incap = False
            if t == tag: break
    def handle_data(s, d):
        if s.cur is None: return
        if any(t == 'math' for t, _ in s.stack): return
        if any(m == 'cap' for _, m in s.stack): s.cur['caption'] += d
        elif s.cell is not None: s.cell['t'] += d

src = open(sys.argv[1]).read()
p = P()
# math: put the alttext in as text so cells like $\uparrow$ survive
src = re.sub(r'<math[^>]*alttext="([^"]*)"[^>]*>.*?</math>', lambda m: m.group(1).replace('\\', ''), src, flags=re.S)
p.feed(src)
out = {}
for tid, t in p.tables.items():
    rows = []
    for r in t['rows']:
        cells = [{'t': re.sub(r'\s+', ' ', c['t']).strip(), 'b': c['b'], 'u': c['u'], 'rs': c['rs'], 'cs': c['cs']} for c in r]
        if any(c['t'] for c in cells): rows.append(cells)
    out[tid] = {'caption': re.sub(r'\s+', ' ', t['caption']).strip(), 'rows': rows}
print(len(out), 'tables')
for tid in ('S4.T11', 'S4.T21'):
    for r in out[tid]['rows'][:40]: print(tid, ' | '.join(('*' if c['b'] else '') + ('_' if c['u'] else '') + c['t'] + ('[rs%d]' % c['rs'] if c['rs'] > 1 else '') + ('[cs%d]' % c['cs'] if c['cs'] > 1 else '') for c in r))

# ---- tables.json: the tables the page shows, in a regular shape ----
GROUPS = ('General Tasks', 'Math & STEM Tasks', 'Coding Tasks', 'Multilingual Tasks', 'Alignment Tasks', 'Math & Text Reasoning',
          'Agent & Coding', 'Instruction & Format Following', 'Agent', 'Knowledge & STEM', 'Math & Coding', 'Thinking Mode', 'Non-thinking Mode')
def cell(c): return {'t': c['t'], 'b': c['b'], 'u': c['u']}

def comparison(tid, kind):
    rows = out[tid]['rows']; T = {'id': tid, 'n': int(tid.split('T')[-1]), 'caption': out[tid]['caption'], 'kind': kind, 'cols': [], 'groups': []}
    head = [c['t'] for c in rows[0] if c['t']]
    i = 1
    if kind == 'base':
        head = [h + ' Base' for h in head]; i = 2
    meta = {}
    while rows[i][0]['t'] in ('Architecture', '# Total Params', '# Activated Params') or (len(rows[i]) > 1 and rows[i][1]['t'] in ('Architecture', '# Total Params', '# Activated Params')):
        r = [c['t'] for c in rows[i]]
        if r[0] == '': r = r[1:]
        meta[r[0]] = r[1:]; i += 1
    for k, name in enumerate(head):
        T['cols'].append({'name': name.replace(' -', '-'), 'arch': meta['Architecture'][k], 'total': meta['# Total Params'][k], 'act': meta['# Activated Params'][k]})
    g = None
    for r in rows[i:]:
        r = list(r)
        if r[0]['t'] in GROUPS:
            g = {'g': r[0]['t'], 'rows': []}; T['groups'].append(g); r = r[1:]
            if not r: continue
        name = r[0]['t']; vals = r[1:]
        assert len(vals) == len(head), (tid, name, len(vals), len(head))
        g['rows'].append({'b': name.replace('IINCLUDE', 'INCLUDE'), 'v': [c['t'] for c in vals], 'bold': [k for k, c in enumerate(vals) if c['b']], 'under': [k for k, c in enumerate(vals) if c['u']]})
    return T

TB = {}
for k in range(3, 9): TB['T%d' % k] = comparison('S3.T%d' % k, 'base')
for k in range(11, 21): TB['T%d' % k] = comparison('S4.T%d' % k, 'post')
# Table 1 and 2: architecture
TB['T1'] = {'id': 'S2.T1', 'caption': out['S2.T1']['caption'], 'head': [c['t'] for c in out['S2.T1']['rows'][0]], 'rows': [[c['t'] for c in r] for r in out['S2.T1']['rows'][1:]]}
TB['T2'] = {'id': 'S2.T2', 'caption': out['S2.T2']['caption'], 'head': [c['t'] for c in out['S2.T2']['rows'][0]], 'rows': [[c['t'] for c in r] for r in out['S2.T2']['rows'][1:]]}
# Table 21: RL against on-policy distillation
r21 = out['S4.T21']['rows']
TB['T21'] = {'id': 'S4.T21', 'caption': out['S4.T21']['caption'], 'head': [c['t'].replace(' -', '-') for c in r21[0]], 'rows': [[c['t'] for c in r] for r in r21[1:]]}
# Table 22: stages
r22 = out['S4.T22']['rows']; rows22 = []; g = None
for r in r22[2:]:
    r = [c['t'] for c in r]
    if r[0] in GROUPS: g = r[0]; r = r[1:]
    rows22.append({'g': g, 'b': r[0], 'v': r[1:]})
TB['T22'] = {'id': 'S4.T22', 'caption': out['S4.T22']['caption'], 'cols': ['Stage 2 Thinking', 'Stage 3 Thinking', 'Stage 3 Non-thinking', 'Stage 4 Thinking', 'Stage 4 Non-thinking'], 'rows': rows22}
# Table 23: RULER
r23 = out['A1.T23']['rows']; rows23 = []; mode = 'Qwen2.5 (Instruct)'
for r in r23[2:]:
    r = [c['t'] for c in r]
    if r[0] in ('Non-thinking Mode', 'Thinking Mode'): mode = r[0]; r = r[1:]
    elif r[0] == '': r = r[1:]
    if len(r) == 8: rows23.append({'mode': mode, 'm': r[0], 'v': r[1:]})
TB['T23'] = {'id': 'A1.T23', 'caption': out['A1.T23']['caption'], 'head': ['Avg.', '4K', '8K', '16K', '32K', '64K', '128K'], 'rows': rows23}
# Tables 24 to 35: the Average column per language; Table 37: Belebele by family
lang = {}
for k in range(24, 36):
    t = out['A1.T%d' % k]; L = re.search(r'language: ([^.]*)\.', t['caption']).group(1)
    head = [c['t'] for c in t['rows'][0]]; ai = head.index('Average'); mode = None; res = []
    for r in t['rows'][1:]:
        r = [c['t'] for c in r]
        if r[0] in ('Thinking Mode', 'Non-thinking Mode'): mode = r[0]; r = r[1:]
        res.append({'mode': mode, 'm': r[0], 'avg': r[ai - 1]})
    lang['T%d' % k] = {'lang': L, 'rows': res}
# compact: per mode, the model list and one average per language (None where the model is absent)
keys = sorted(lang, key=lambda k: int(k[1:]))
comp = {'langs': [lang[k]['lang'] for k in keys], 'tables': keys, 'modes': {}}
for mode in ('Thinking Mode', 'Non-thinking Mode'):
    models = []
    for k in keys:
        for r in lang[k]['rows']:
            if r['mode'] == mode and r['m'] not in models: models.append(r['m'])
    comp['modes'][mode] = {'models': models, 'avg': [[next((r['avg'] for r in lang[k]['rows'] if r['mode'] == mode and r['m'] == m), None) for k in keys] for m in models]}
TB['lang'] = comp
r37 = out['A1.T37']['rows']
TB['T37'] = {'id': 'A1.T37', 'caption': out['A1.T37']['caption'], 'head': [c['t'] for c in r37[0]][1:], 'rows': [[c['t'] for c in r] for r in r37[1:]]}
json.dump(TB, open('tables.json', 'w'), ensure_ascii=False, indent=0)
print('tables.json', len(json.dumps(TB)), 'bytes')

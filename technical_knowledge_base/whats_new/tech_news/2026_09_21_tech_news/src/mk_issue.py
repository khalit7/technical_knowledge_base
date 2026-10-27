#!/usr/bin/env python3
"""Render a tech-news issue from data: data/items.json (parsed verbatim from live.md by mk_items.py)
plus data/annotations.json (dates, tags, numbers, checks, corrections, follow-ups, where each visual goes).
Writes parts/03_issue.html (the issue, readable without JavaScript) and parts/11_data.js (the same data for
the week strip). Reusable for every weekly issue: the visual parts named in "viz_after" are included from
parts/v_<name>.html when present. Run from src/."""
import json, html, re, datetime, os

I = json.load(open('data/items.json'))
A = json.load(open('data/annotations.json'))
SEC = A['sections']; SBY = {s['name']: s for s in SEC}
FEEDS = A['feeds']
FU = {f['id']: f for f in A['followups']}
MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
def dd(d):
    if not d: return 'undated'
    y, m, x = map(int, d.split('-')); return f'{MON[m-1]} {x}'
def esc(s): return html.escape(s, quote=False)
def L(t, u): return '{{' + t + '|' + u + '}}'
def md(s):  # the issue's inline markdown: **bold** and `code`
    s = esc(s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s)
    return re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
def plain(s): return s.replace('**', '').replace('`', '')

# Short labels for the week strip come from annotations ('short'); items without one use their title.
NOTE_LBL = {'check': 'Checked', 'corr': 'Correction', 'link': 'Links', 'unc': 'Unconfirmed'}

NOTE_LBL['rel'] = 'Related'
def TL(x):  # [[text|tab|target]] -> in-page tab link
    def r(m):
        t, tab, to = (m.group(1).split('|') + [''])[:3]
        return f'<a href="#" data-tab="{tab}"' + (f' data-to="{to}"' if to else '') + f'>{t}</a>'
    return re.sub(r'\[\[([^\]]+)\]\]', r, x)
G = A['glance']
out, data = [], []
# tab bar: At a glance, one tab per section, Further reading
out.append('<div class="tabs" role="tablist" id="tabs">' + f'<button role="tab" data-t="{G["tab"]}" aria-selected="true">{esc(G["label"])}</button>' +
           ''.join(f'<button role="tab" data-t="{q["tab"]}" aria-selected="false">{esc(q["label"])}</button>' for q in SEC) +
           '<button role="tab" data-t="t-more" aria-selected="false">Further reading</button></div>')
TABOF = {q['name']: q for q in SEC}
fu_sorted = sorted(A['followups'], key=lambda f: f['d'])
# At a glance
g = [f'<div class="tab" id="{G["tab"]}" role="tabpanel">', f'<p class="lead">{TL(G["lead"])}</p>', f'<p>{TL(G["theme"])}</p>']
if os.path.exists('parts/v_strip.html'): g.append(open('parts/v_strip.html').read())
g.append('<h2>This week, tab by tab</h2><div class="secrows">')
for q in SEC:
    cnt = sum(1 for x in I['items'] if x['section'] == q['name'])
    g.append(f'<div class="secrow {q["c"]}"><a href="#" data-tab="{q["tab"]}" class="sn"><span class="sw"></span>{esc(q["label"])} <span class="cnt">{cnt}</span></a><p>{TL(q["glance"])}</p></div>')
g.append('</div>')
g.append(f'<h2>{esc(G["next_title"])}</h2><ul class="fulist">')
for f in fu_sorted:
    k = f['for'][0]; an = A['items'][str(k)]
    q = TABOF[I['items'][k-1]['section']]
    g.append(f'<li><span class="dt">{dd(f["d"])}</span> {esc(f["t"])} <a href="#f-{f["id"]}" data-jump="f-{f["id"]}">in {esc(q["label"])}</a></li>')
g.append('</ul><p class="small mute">Each follow-up is given in full, with its sources, under the item it updates. The issue\'s own text is never changed.</p></div>')
out.append('\n'.join(g))
cur = None
for it in I['items']:
    n = it['n']; an = A['items'][str(n)]; s = SBY[it['section']]
    if it['section'] != cur:
        if cur is not None: out.append('</div>')
        cur = it['section']
        cnt = sum(1 for x in I['items'] if x['section'] == cur)
        out.append(f'<div class="tab" id="{s["tab"]}" role="tabpanel" hidden><h2><span class="sw {s["c"]}"></span>{esc(cur)} <span class="cnt">{cnt} items</span></h2><p class="lead">{TL(s["lead"])}</p>')
    title = plain(an.get('short') or it['title'])
    hn = an.get('hn', {})
    badges = ''
    if 'p' in hn: badges += f'<span class="hn" title="Hacker News points, as stated in the issue">{hn["p"]:,}{"+" if hn.get("plus") else ""} points</span>'
    if 'c' in hn:
        cb = (f'{hn["p_now"]:,} points, ' if 'p_now' in hn else '') + f'{hn["c"]:,} comments (on {A["issue"]["checked"]})'
        badges += (L(cb, hn['url']).replace('{{', '{{', 1) if hn.get('url') else cb).join(['<span class="hn" title="comments on the Hacker News thread, counted when the sources were re-checked">', '</span>'])
    also = ''.join(f' <span class="also">{esc(l)} {dd(d)}</span>' for d, l in an.get('also', []))
    dn = f' <span class="also">{esc(an["dnote"])}</span>' if an.get('dnote') else ''
    h = [f'<article class="it" id="i-{an["id"]}" data-sec="{s["id"]}" data-n="{n}">',
         f'<div class="ih"><span class="dt">{dd(an.get("d"))}</span><span class="sc {s["c"]}">{esc(s["short"])}</span>{also}{dn}{badges}</div>']
    if it['title']:
        h.append(f'<p class="tx"><b>{md(it["title"])}</b> {md(it["text"])}</p>')
    else:
        h.append(f'<p class="tx">{md(it["text"])}</p>')
    if it['sources']:
        h.append('<div class="srcs">' + ', '.join(L(esc(x['t']), x['u']) + (f' <span class="rt">{esc(x["rt"])}</span>' if x.get('rt') else '') for x in it['sources']) + '</div>')
    elif an.get('nolink'):
        h.append(f'<div class="srcs nos">{TL(an["nolink"])}</div>')
    for kind, txt in an.get('notes', []):
        lbl = '' if re.sub(r"<[^>]+>", "", txt).lower().startswith(NOTE_LBL[kind].lower()) else f'<span class="nl">{NOTE_LBL[kind]}</span> '
        h.append(f'<div class="nt {kind}">{lbl}{TL(txt)}</div>')
    for f in [f for f in fu_sorted if n in f['for']]:
        h.append(f'<div class="fuc" id="f-{f["id"]}"><div class="ih"><span class="nl">What happened next</span> <span class="dt">{dd(f["d"])}</span></div><h3>{esc(f["t"])}</h3><p>{TL(f["html"])}</p></div>')
    if an.get('feeds'):
        h.append('<div class="fd">Feeds ' + ', '.join(L(esc(FEEDS[k][0]), 'n:' + FEEDS[k][1]) for k in an['feeds']) + '</div>')
    h.append('</article>')
    out.append('\n'.join(h))
    v = an.get('viz_after')
    if v and os.path.exists(f'parts/v_{v}.html'):
        out.append(TL(open(f'parts/v_{v}.html').read()))
    data.append({'n': n, 'id': an['id'], 'd': an.get('d'), 'dnote': an.get('dnote'), 'also': an.get('also', []), 'sec': s['id'],
                 't': title, 'x': re.split(r'(?<=[.:;])\s', plain(it['text']).lstrip(' (').strip(), 1)[0][:220], 'hn': {k: v for k, v in hn.items() if k != 'url'}, 'tags': an.get('tags', []),
                 'fu': an.get('follow')})
out.append('</div>')
fu = fu_sorted
open('parts/03_issue.html', 'w').write('\n'.join(out) + '\n')
js = {'issue': A['issue'], 'sections': [{k: q[k] for k in ('id', 'name', 'short', 'c', 'tab')} for q in SEC], 'items': data, 'followups': [{'id': f['id'], 'd': f['d'], 't': f['t'], 'for': f['for']} for f in fu]}
open('parts/11_data.js', 'w').write('// Generated by mk_issue.py from data/items.json and data/annotations.json\nwindow.ISSUE=' + json.dumps(js, ensure_ascii=False) + ';\n')
print('items', len(data), 'followups', len(fu), 'bytes', len('\n'.join(out)))

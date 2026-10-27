#!/usr/bin/env python3
"""Render a tech-news issue from data: data/items.json (parsed verbatim from live.md by mk_items.py)
plus data/annotations.json (tabs, dates, tags, numbers, checks, corrections, follow-ups, where each visual goes).
Writes parts/03_issue.html (the issue, readable without JavaScript) and parts/11_data.js (the same data for
the week strip). Adapted from the 2026-08-24 issue: items are grouped into tabs by subject, whatever part of
the issue they came from (the original run, the merged concurrent run, the backfill), and each card says which
part that was. Visual parts named in "viz_after" are included from parts/v_<name>.html. Run from src/."""
import json, html, re, os

I = json.load(open('data/items.json'))
A = json.load(open('data/annotations.json'))
SEC = A['sections']; SBY = {s['id']: s for s in SEC}
FEEDS = A['feeds']
MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
def dd(d):
    if not d: return 'undated'
    y, m, x = map(int, d.split('-')); return f'{MON[m-1]} {x}'
def esc(s): return html.escape(s, quote=False)
def L(t, u): return '{{' + t + '|' + u + '}}'
LINK = r'\[([^\]]+)\]\(([^)]+)\)'
def auto(t, u): return re.sub(r'\*', '', u).lower() in ('http://' + re.sub(r'\*', '', t).lower(), 'https://' + re.sub(r'\*', '', t).lower())
def md(s):
    """Markdown of the issue to HTML: real links become {{text|url}}, Notion auto-links become plain text,
    **bold**, *italic* and `code` become tags. Everything else is escaped."""
    keep = []
    def lk(m):
        t, u = m.group(1), m.group(2)
        keep.append(md(t) if auto(t, u) else L(md(t), u)); return f'\x00{len(keep)-1}\x00'
    s = re.sub(LINK, lk, s)
    s = esc(s)
    s = re.sub(r'`([^`]+)`', r'<code>\1</code>', s)
    s = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', s)
    s = re.sub(r'(?<![\w*])\*(\S(?:.*?\S)?)\*(?![\w*])', r'<i>\1</i>', s)
    return re.sub(r'\x00(\d+)\x00', lambda m: keep[int(m.group(1))], s)

def tab_of(it):
    key = it['sub'] or it['part']
    for s in SEC:
        if key in s['match']: return s
    raise SystemExit('no tab for ' + key)
NOTE_LBL = {'check': 'Checked', 'corr': 'Correction', 'link': 'Links', 'unc': 'Unconfirmed', 'rel': 'Related'}
PROV = A['provenance']
def TL(x):  # [[text|tab|target]] -> in-page tab link
    def r(m):
        t, tab, to = (m.group(1).split('|') + [''])[:3]
        return f'<a href="#" data-tab="{tab}"' + (f' data-to="{to}"' if to else '') + f'>{t}</a>'
    return re.sub(r'\[\[([^\]]+)\]\]', r, x)
G = A['glance']
items = I['items']
for it in items: it['tab'] = tab_of(it)
out, data = [], []
out.append('<div class="tabs" role="tablist" id="tabs">' + f'<button role="tab" data-t="{G["tab"]}" aria-selected="true">{esc(G["label"])}</button>' +
           ''.join(f'<button role="tab" data-t="{q["tab"]}" aria-selected="false">{esc(q["label"])}</button>' for q in SEC) +
           '<button role="tab" data-t="t-more" aria-selected="false">Further reading</button></div>')
fu_sorted = sorted(A['followups'], key=lambda f: (f['d'], f['id']))
# ---- At a glance
g = [f'<div class="tab" id="{G["tab"]}" role="tabpanel">', f'<p class="lead">{TL(G["lead"])}</p>', f'<p>{TL(G["theme"])}</p>']
if os.path.exists('parts/v_strip.html'): g.append(open('parts/v_strip.html').read())
g.append('<h2>This week, tab by tab</h2><div class="secrows">')
for q in SEC:
    cnt = sum(1 for x in items if x['tab'] is q)
    g.append(f'<div class="secrow {q["c"]}"><a href="#" data-tab="{q["tab"]}" class="sn"><span class="sw"></span>{esc(q["label"])} <span class="cnt">{cnt}</span></a><p>{TL(q["glance"])}</p></div>')
g.append('</div>')
g.append(f'<h2>{esc(G["next_title"])}</h2><ul class="fulist">')
for f in fu_sorted:
    q = items[f['for'][0] - 1]['tab']
    g.append(f'<li><span class="dt">{dd(f["d"])}</span> {esc(f["t"])} <a href="#f-{f["id"]}" data-jump="f-{f["id"]}">in {esc(q["label"])}</a></li>')
g.append('</ul><p class="small mute">Each follow-up is given in full, with its sources, under the item it updates. The issue\'s own text is never changed.</p>')
# how the issue was put together: the parts and the issue's own notes about them, verbatim
g.append(f'<h2>{esc(G["parts_title"])}</h2><p>{TL(G["parts_lead"])}</p><div class="parts">')
for p in A['parts']:
    cnt = sum(1 for x in items if x['prov'] == p['prov'])
    nts = [n for n in I['notes'] if n['part'] == p['part'] and n['sub'] is None]
    g.append(f'<div class="part pv-{p["prov"]}"><div class="ph"><span class="pv pv-{p["prov"]}">{esc(PROV[p["prov"]])}</span> <b>{esc(p["part"])}</b> <span class="cnt">{cnt} items</span></div>' +
             ''.join(f'<p class="inote"><span class="nl">In the issue</span> {md(n["md"])}</p>' for n in nts) +
             f'<p class="small">{TL(p["about"])}</p></div>')
g.append('</div></div>')
out.append('\n'.join(g))
# ---- one tab per section
for q in SEC:
    its = [x for x in items if x['tab'] is q]
    out.append(f'<div class="tab" id="{q["tab"]}" role="tabpanel" hidden><h2><span class="sw {q["c"]}"></span>{esc(q["name"])} <span class="cnt">{len(its)} items</span></h2><p class="lead">{TL(q["lead"])}</p>')
    for n in [n for n in I["notes"] if n["sub"] and n["sub"] in q["match"]]:
        out.append(f'<p class="inote"><span class="nl">In the issue, under {esc(n["sub"])}</span> {md(n["md"])}</p>')
    for it in its:
        n = it['n']; an = A['items'][str(n)]
        title = it['title'] or A['short'][str(n)]
        hn = an.get('hn', {})
        badges = ''
        if 'p' in hn: badges += f'<span class="hn" title="points, as stated in the issue">{hn["p"]:,}{"+" if hn.get("plus") else ""} points</span>'
        if 'c' in hn: badges += f'<span class="hn" title="comments, as stated in the issue">{hn["c"]:,} comments</span>'
        also = ''.join(f' <span class="also">{esc(l)} {dd(d)}</span>' for d, l in an.get('also', []))
        dn = f' <span class="also">{esc(an["dnote"])}</span>' if an.get('dnote') else ''
        pv = f'<span class="pv pv-{it["prov"]}" title="{esc(it["part"])}">{esc(PROV[it["prov"]])}</span>'
        h = [f'<article class="it" id="i-{an["id"]}" data-sec="{q["id"]}" data-n="{n}">',
             f'<div class="ih"><span class="dt">{dd(an.get("d"))}</span><span class="sc {q["c"]}">{esc(q["short"])}</span>{pv}{also}{dn}{badges}</div>']
        body = md(it['text_md'])
        sep = '' if it['text_md'][:1] in ':,;.' else ' '
        h.append(f'<p class="tx"><b>{md(it["title_md"])}</b>{sep}{body}</p>' if it['title_md'] else f'<p class="tx">{body}</p>')
        if it['sources'] or it['inline']:
            h.append('<div class="srcs">' + ', '.join(L(esc(x['t']), x['u']) for x in it['sources'] + it['inline']) + '</div>')
        else:
            h.append('<div class="srcs nosrc">none given in the issue</div>')
        if it.get('note'):
            h.append(f'<p class="inote"><span class="nl">In the issue</span> <i>{md(it["note"]["md"])}</i></p>')
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
        data.append({'n': n, 'id': an['id'], 'd': an.get('d'), 'dnote': an.get('dnote'), 'also': an.get('also', []), 'sec': q['id'],
                     'prov': it['prov'], 't': title, 'x': it['text'], 'src': it['sources'] + it['inline'], 'hn': hn, 'tags': an.get('tags', []),
                     'fu': an.get('follow')})
    out.append('</div>')
open('parts/03_issue.html', 'w').write('\n'.join(out) + '\n')
js = {'issue': A['issue'], 'sections': SEC, 'provenance': PROV, 'items': data, 'followups': [{'id': f['id'], 'd': f['d'], 't': f['t'], 'for': f['for']} for f in fu_sorted]}
open('parts/11_data.js', 'w').write('// Generated by mk_issue.py from data/items.json and data/annotations.json\nwindow.ISSUE=' + json.dumps(js, ensure_ascii=False) + ';\n')
print('items', len(data), 'followups', len(fu_sorted), 'bytes', len('\n'.join(out)))

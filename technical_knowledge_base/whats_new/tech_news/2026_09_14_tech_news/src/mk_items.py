#!/usr/bin/env python3
"""Parse a tech-news issue's live.md (the verbatim Notion fetch) into data/items.json.
Each item keeps its original text verbatim (markdown links turned into source entries).
Reusable for every weekly issue: run from the issue's src/ folder."""
import re, json, sys, html
src = open('live.md').read()
body = src[src.index('<content>') + 9: src.index('</content>')].strip('\n')
lines = body.split('\n')
intro = lines[0].strip()
LINK = r'\[([^\]]+)\]\(([^)]+)\)'
TRAIL = re.compile(r'\s*((?:' + LINK + r')(?:,\s*' + LINK + r')*)\s*$')
items, sec = [], None
def unesc(s): return re.sub(r'\\([$^*_])', r'\1', s)
for ln in lines[1:]:
    ln = ln.rstrip()
    if not ln: continue
    if ln.startswith('# '):
        sec = ln[2:].strip(); continue
    raw = ln[2:] if ln.startswith('- ') else ln
    # Notion bold inside a link ([**X**](u)) and adjacent bold runs (**a ****b**) are normalised first
    raw = re.sub(r'\[\*\*([^\]]+?)\*\*\]\(([^)]+)\)', r'**[\1](\2)**', raw)
    raw = re.sub(r'\*\*\*\*', '', raw)
    m = TRAIL.search(raw)
    srcs = [{'t': a, 'u': b} for a, b in re.findall(LINK, m.group(1))] if m else []
    text = raw[:m.start()] if m else raw
    title = None
    tm = re.match(r'\*\*(.+?)\*\*\s*', text)
    if tm: title = tm.group(1); text = text[tm.end():]
    # inline links left in the body (Notion auto-links such as [AGENTS.md](http://AGENTS.md))
    inline = [{'t': a, 'u': b} for a, b in re.findall(LINK, (title or '') + ' ' + text)]
    text = re.sub(LINK, lambda x: x.group(1), text)
    if title: title = re.sub(LINK, lambda x: x.group(1), title)
    # html keeps the issue's bold and code marks; text is the same words without marks (used by the coverage check)
    def mk_html(x):
        x = html.escape(unesc(x), quote=False)
        x = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', x)
        return re.sub(r'`([^`]+)`', r'<code>\1</code>', x)
    plain = lambda x: unesc(re.sub(r'\*\*|`', '', x))
    items.append({'n': len(items) + 1, 'section': sec, 'title': plain(title).strip() if title else None,
                  'text': plain(text.strip()), 'html': mk_html(text.strip()), 'sources': srcs, 'inline_links': inline, 'raw': raw})
json.dump({'intro': intro, 'items': items}, open('data/items.json', 'w'), indent=1, ensure_ascii=False)
print(len(items), 'items;', sum(len(i['sources']) for i in items), 'source links;', 'sections', sorted(set(i['section'] for i in items), key=[i['section'] for i in items].index))

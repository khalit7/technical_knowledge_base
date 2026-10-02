#!/usr/bin/env python3
"""Parse a tech-news issue's live.md (the verbatim Notion fetch) into data/items.json.
Each item keeps its original text verbatim: 'text' and 'title' are the plain text (markdown marks removed),
'md' and 'title_md' keep bold, inline code and inline links for rendering. Trailing links become 'sources';
links inside the text stay in place ('inline_links'). Reusable for every weekly issue: run from src/.
(Adapted from the 2026-08-24 issue: inline links, bold and code inside the text are now kept.)"""
import re, json
src = open('live.md').read()
body = src[src.index('<content>') + 9: src.index('</content>')].strip('\n')
lines = body.split('\n')
intro = lines[0].strip()
LINK = r'\[([^\]]+)\]\(([^)]+)\)'
TRAIL = re.compile(r'\s*((?:' + LINK + r')(?:,\s*' + LINK + r')*)\s*$')
items, sec = [], None
def unesc(s): return s.replace('\\$', '$')
def plain(s): return re.sub(LINK, lambda x: x.group(1), s).replace('**', '').replace('`', '')
for ln in lines[1:]:
    ln = ln.rstrip()
    if not ln: continue
    if ln.startswith('# '):
        sec = ln[2:].strip(); continue
    raw = ln[2:] if ln.startswith('- ') else ln
    # Notion splits bold around a link: [**X**](u)** rest** -> **[X](u) rest**
    norm = re.sub(r'^\[\*\*([^\]]*)\*\*\]\(([^)]+)\)\*\*', r'**[\1](\2)', raw)
    m = TRAIL.search(norm)
    srcs = [{'t': a, 'u': b} for a, b in re.findall(LINK, m.group(1))] if m else []
    text = norm[:m.start()] if m else norm
    title = None
    tm = re.match(r'\*\*(.+?)\*\*\s*', text)
    if tm: title = tm.group(1); text = text[tm.end():]
    inline = [{'t': a, 'u': b} for a, b in re.findall(LINK, (title or '') + ' ' + text)]
    items.append({'n': len(items) + 1, 'section': sec,
                  'title': unesc(plain(title)) if title else None, 'title_md': unesc(title) if title else None,
                  'text': unesc(plain(text.strip())), 'md': unesc(text.strip()),
                  'sources': srcs, 'inline_links': inline, 'raw': raw})
json.dump({'intro': intro, 'items': items}, open('data/items.json', 'w'), indent=1, ensure_ascii=False)
print(len(items), 'items;', sum(len(i['sources']) for i in items), 'source links;', sum(len(i['inline_links']) for i in items), 'inline links;',
      'sections', sorted(set(i['section'] for i in items), key=[i['section'] for i in items].index))

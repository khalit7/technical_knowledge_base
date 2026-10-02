#!/usr/bin/env python3
"""Parse a tech-news issue's live.md (the verbatim Notion fetch) into data/items.json.
Each item keeps its original text verbatim (markdown links turned into source entries).
Reusable for every weekly issue: run from the issue's src/ folder."""
import re, json, sys
src = open('live.md').read()
body = src[src.index('<content>') + 9: src.index('</content>')].strip('\n')
lines = body.split('\n')
intro = lines[0].strip()
LINK = r'\[([^\]]+)\]\(([^)]+)\)'
TRAIL = re.compile(r'\s*((?:' + LINK + r')(?:,\s*' + LINK + r')*)\s*$')
items, sec = [], None
def unesc(s): return s.replace('\\$', '$')
for ln in lines[1:]:
    ln = ln.rstrip()
    if not ln: continue
    if ln.startswith('# '):
        sec = ln[2:].strip(); continue
    raw = ln[2:] if ln.startswith('- ') else ln
    m = TRAIL.search(raw)
    srcs = [{'t': a, 'u': b} for a, b in re.findall(LINK, m.group(1))] if m else []
    text = raw[:m.start()] if m else raw
    title = None
    tm = re.match(r'\*\*(.+?)\*\*\s*', text)
    if tm: title = tm.group(1); text = text[tm.end():]
    # inline links left in the body (Notion auto-links such as [AGENTS.md](http://AGENTS.md))
    inline = [{'t': a, 'u': b} for a, b in re.findall(LINK, text)]
    text = re.sub(LINK, lambda x: x.group(1), text)
    items.append({'n': len(items) + 1, 'section': sec, 'title': unesc(title) if title else None,
                  'text': unesc(text.strip()), 'sources': srcs, 'inline_links': inline, 'raw': raw})
json.dump({'intro': intro, 'items': items}, open('data/items.json', 'w'), indent=1, ensure_ascii=False)
print(len(items), 'items;', sum(len(i['sources']) for i in items), 'source links;', 'sections', sorted(set(i['section'] for i in items), key=[i['section'] for i in items].index))

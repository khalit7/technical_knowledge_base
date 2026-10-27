#!/usr/bin/env python3
"""Parse a tech-news issue's live.md (the verbatim Notion fetch) into data/items.json.
Each item keeps its original text verbatim. Adapted from the 2026-08-24 issue for this issue's shape:
top-level "# " parts (the original run, "Merged in from the concurrent run", "Backfill added ...") with
"## " subsections, italic notes under an item (tab-indented) or under a part or subsection, and Notion's
split bold around auto-linked names ([**Z.ai**](http://Z.ai)** rest**).
For every item: n, part (the "# " heading), sub (the "## " heading or None), prov (issue, merged, backfill),
title and text as plain text (markdown markers removed, for checks) plus title_md and text_md (for rendering),
sources (the trailing links), inline (real links inside the text), autolinks (Notion auto-links of a bare name),
note (an italic note attached to the item), raw. Notes that belong to a part or subsection go in "notes".
Run from the issue's src/ folder."""
import re, json
src = open('live.md').read()
body = src[src.index('<content>') + 9: src.index('</content>')].strip('\n')
lines = body.split('\n')
intro = lines[0].strip()
LINK = r'\[([^\]]+)\]\(([^)]+)\)'
TRAIL = re.compile(r'\s*((?:' + LINK + r')(?:,\s*' + LINK + r')*)\s*$')
def unesc(s): return s.replace('\\$', '$').replace('\\~', '~')
def plain(s):  # remove markdown emphasis and code markers, keep the words
    s = re.sub(LINK, lambda m: m.group(1), s)
    return re.sub(r'\*\*|(?<![\w*])\*(?=\S)|(?<=\S)\*(?![\w*])|`', '', s)
def is_auto(t, u):  # Notion auto-link of a bare name: http://<the text itself>
    return re.sub(r'\*', '', u).lower() in ('http://' + re.sub(r'\*', '', t).lower(), 'https://' + re.sub(r'\*', '', t).lower())
items, notes = [], []
part = sub = None
PROV = {'Merged in from the concurrent run': 'merged'}
prov = 'issue'
for ln in lines[1:]:
    if not ln.strip() or ln.strip() == '<empty-block/>':
        continue
    if ln.startswith('# '):
        part = ln[2:].strip(); sub = None
        prov = 'merged' if part.startswith('Merged in') else 'backfill' if part.startswith('Backfill') else 'issue'
        continue
    if ln.startswith('## '):
        sub = ln[3:].strip(); continue
    s = ln.strip()
    if s.startswith('*') and s.endswith('*') and not s.startswith('**') and not ln.startswith('- '):
        txt = unesc(s[1:-1])
        if ln.startswith('\t') and items:  # an italic note indented under the previous item
            items[-1]['note'] = {'md': txt, 'text': plain(txt)}
        else:
            notes.append({'part': part, 'sub': sub, 'md': txt, 'text': plain(txt)})
        continue
    if not ln.startswith('- ') and prov != 'issue' and sub is None:  # a part's own paragraph
        notes.append({'part': part, 'sub': None, 'md': unesc(s), 'text': plain(unesc(s))}); continue
    raw = ln[2:] if ln.startswith('- ') else ln
    # Notion splits the bold around an auto-linked name: [**Z.ai**](http://Z.ai)** rest** -> **Z.ai rest**
    autolinks = []
    def fold(m):
        autolinks.append({'t': m.group(1), 'u': m.group(2)}); return '**' + m.group(1) + m.group(3) + '**'
    work = re.sub(r'\[\*\*([^\]*]+)\*\*\]\(([^)]+)\)\*\*(.+?)\*\*', fold, raw, count=1)
    m = TRAIL.search(work)
    srcs = [{'t': a, 'u': b} for a, b in re.findall(LINK, m.group(1))] if m else []
    text = work[:m.start()] if m else work
    title = None
    tm = re.match(r'\*\*(.+?)\*\*\s*', text)
    if tm:
        title = tm.group(1); text = text[tm.end():]
    inline, md = [], text
    for a, b in re.findall(LINK, text):
        (autolinks if is_auto(a, b) else inline).append({'t': a, 'u': b})
    items.append({'n': len(items) + 1, 'part': part, 'sub': sub, 'prov': prov,
                  'title': plain(unesc(title)) if title else None, 'title_md': unesc(title) if title else None,
                  'text': plain(unesc(text.strip())), 'text_md': unesc(text.strip()),
                  'sources': srcs, 'inline': inline, 'autolinks': autolinks, 'raw': raw})
json.dump({'intro': intro, 'items': items, 'notes': notes}, open('data/items.json', 'w'), indent=1, ensure_ascii=False)
print(len(items), 'items;', sum(len(i['sources']) for i in items), 'trailing source links;',
      sum(len(i['inline']) for i in items), 'inline links;', sum(len(i['autolinks']) for i in items), 'auto-links;', len(notes), 'notes')

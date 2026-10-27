#!/usr/bin/env python3
"""Parse a tech-news issue's live.md (the verbatim Notion fetch) into data/items.json.
Each item keeps its original text verbatim (markdown links turned into source entries).
Reusable for every weekly issue: run from the issue's src/ folder.
Changes from the 2026-08-24 version: a leading "# Video" section (description and <video> tag) is kept apart
as the page's video, the read-time line and the intro are recognised, Notion auto-links that split a bold
title ([**Z.ai**](http://Z.ai)** says ...**) are joined, trailing time estimates "(20 min)" after the source
links are kept as the item's read time, and \\{ \\} escapes are undone."""
import re, json
src = open('live.md').read()
body = src[src.index('<content>') + 9: src.index('</content>')].strip('\n')
lines = body.split('\n')
LINK = r'\[([^\]]+)\]\(([^)]+)\)'
TIME = r'\((?:\d+h ?)?(?:\d+ ?min)?\)'
ONE = LINK + r'(?:\s*' + TIME + r')?'
TRAIL = re.compile(r'\s*(' + ONE + r'(?:,\s*' + ONE + r')*)\s*$')
items, sec, video, intro, rt = [], None, None, None, None
def unesc(s): return s.replace('\\$', '$').replace('\\{', '{').replace('\\}', '}')
i = 0
if lines[0].strip() == '# Video':
    desc, tag = lines[1].strip(), lines[2].strip()
    m = re.match(r'<video src="([^"]+)">(.*)</video>', tag)
    blk = re.search(r'notion_record=block\.([0-9a-f-]+)', m.group(1))
    video = {'description': desc, 'caption': m.group(2), 'file': m.group(1).split('?')[0].rsplit('/', 1)[1],
             'block': blk.group(1) if blk else None}
    i = 3
for ln in lines[i:]:
    ln = ln.rstrip()
    if not ln: continue
    if ln.startswith('⏱'): rt = ln; continue
    if ln.startswith('# '):
        sec = ln[2:].strip(); continue
    if sec is None: intro = ln.strip(); continue
    raw = ln[2:] if ln.startswith('- ') else ln
    # Notion auto-link splitting a bold title: [**Z.ai**](http://Z.ai)** says ...** -> **Z.ai says ...**
    fixed = re.sub(r'^\[\*\*([^*\]]+)\*\*\]\((https?://[^)]+)\)\*\*', r'**\1', raw)
    autolinks = [{'t': a, 'u': b} for a, b in re.findall(r'^\[\*\*([^*\]]+)\*\*\]\((https?://[^)]+)\)', raw)]
    m = TRAIL.search(fixed)
    srcs = [{'t': a, 'u': b, 'rt': c or None} for a, b, c in re.findall(LINK + r'(?:\s*(' + TIME + r'))?', m.group(1))] if m else []
    text = fixed[:m.start()] if m else fixed
    title = None
    tm = re.match(r'\*\*(.+?)\*\*\s*', text)
    if tm: title = tm.group(1); text = text[tm.end():]
    if title:
        inline_t = [{'t': a, 'u': b} for a, b in re.findall(LINK, title)]
        title = re.sub(LINK, lambda x: x.group(1), title)
    else:
        inline_t = []
    # inline links left in the body (Notion auto-links such as [crates.io](http://crates.io))
    inline = autolinks + inline_t + [{'t': a, 'u': b} for a, b in re.findall(LINK, text)]
    text = re.sub(LINK, lambda x: x.group(1), text)
    items.append({'n': len(items) + 1, 'section': sec, 'title': unesc(title) if title else None,
                  'text': unesc(text.strip()), 'sources': srcs, 'inline_links': inline, 'raw': raw})
json.dump({'video': video, 'readtime': rt, 'intro': intro, 'items': items}, open('data/items.json', 'w'), indent=1, ensure_ascii=False)
print(len(items), 'items;', sum(len(i['sources']) for i in items), 'source links;', 'sections', sorted(set(i['section'] for i in items), key=[i['section'] for i in items].index))

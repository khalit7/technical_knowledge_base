"""Put the AI buddy (html_utils/kb_buddy.js) on pages: one button for a handwritten Notebook, a Chat, and drawing on the page
itself, with Claude seeing what the reader sees. It hides the page's Ask Claude button. Pilot since 2026-11-18 on the
Attention Is All You Need page only (the Notebook pilot, kb_diary.js, grew into it on 2026-11-19).

Inserts (or replaces) one marked <script id="kb-buddy"> block just before </head> in the source part that holds </head>
(the same part apply_look.py and apply_ask.py use), so a rebuild keeps it, and removes the older kb-diary block. kb_buddy.js
is the only copy to edit; rerun this
on the pilot page(s) after changing it, then rebuild. Usage:
  python3 html_utils/apply_buddy.py <page folder> ...            insert or update the block
  python3 html_utils/apply_buddy.py --remove <page folder> ...   take it out again
"""
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apply_look import head_part

START, END = '<script id="kb-buddy">', '</script><!--/kb-buddy-->'
OLD = re.compile(r'<script id="kb-diary">.*?</script><!--/kb-diary-->\n?', re.S)
JS = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kb_buddy.js'), encoding='utf-8').read()
assert '</script' not in JS and '\u2014' not in JS
# build_site.py puts its bar at the page's first closing head tag and opening body tag: neither may appear inside the script
assert '</head' not in JS.lower() and '<body' not in JS.lower(), 'kb_buddy.js holds a literal head or body tag; split it, as in the iframe page builder'
BLOCK = START + '\n' + JS.rstrip('\n') + '\n' + END
RX = re.compile(re.escape(START) + r'.*?' + re.escape(END) + r'\n?', re.S)


def apply(folder, remove=False):
    f = head_part(folder)
    if not f:
        return 'SKIP no single part with </head>'
    s = open(f, encoding='utf-8').read()
    s2 = OLD.sub('', RX.sub('', s))
    if not remove:
        i = s2.index('</head>') if '</head>' in s2 else len(s2)
        s2 = s2[:i] + BLOCK + '\n' + s2[i:]
    if s2 == s:
        return 'unchanged'
    open(f, 'w', encoding='utf-8').write(s2)
    return ('removed from ' if remove else 'applied to ') + os.path.relpath(f, folder)


if __name__ == '__main__':
    a = sys.argv[1:]
    rm = '--remove' in a
    folders = [x for x in a if x != '--remove']
    if not folders:
        raise SystemExit(__doc__)
    for d in folders:
        print(d, apply(d.rstrip('/'), rm))

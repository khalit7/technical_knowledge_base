"""Put the Notebook (html_utils/kb_diary.js) on pages: write by hand or keyboard, and after a 3 s pause Claude reads it and
thinks with you. Pilot since 2026-11-18 on the Attention Is All You Need page only.

Inserts (or replaces) one marked <script id="kb-diary"> block just before </head> in the source part that holds </head>
(the same part apply_look.py and apply_ask.py use), so a rebuild keeps it. kb_diary.js is the only copy to edit; rerun this
on the pilot page(s) after changing it, then rebuild. Usage:
  python3 html_utils/apply_diary.py <page folder> ...            insert or update the block
  python3 html_utils/apply_diary.py --remove <page folder> ...   take it out again
"""
import os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apply_look import head_part

START, END = '<script id="kb-diary">', '</script><!--/kb-diary-->'
JS = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kb_diary.js'), encoding='utf-8').read()
assert '</script' not in JS and '—' not in JS
BLOCK = START + '\n' + JS.rstrip('\n') + '\n' + END
RX = re.compile(re.escape(START) + r'.*?' + re.escape(END) + r'\n?', re.S)


def apply(folder, remove=False):
    f = head_part(folder)
    if not f:
        return 'SKIP no single part with </head>'
    s = open(f, encoding='utf-8').read()
    s2 = RX.sub('', s)
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

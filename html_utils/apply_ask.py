"""Put the Ask Claude panel (html_utils/kb_ask.js) on pages: questions about the page, answered by the Claude API
with the reader's own key and the page's text as context.

Inserts (or replaces) one marked <script id="kb-ask"> block just before </head> in the source part that holds
</head> (the same part apply_look.py uses), so a rebuild keeps it. The script waits for the DOM, then adds its own
style, button and panel. kb_ask.js is the only copy to edit; rerun this with --all after changing it. Usage:
  python3 html_utils/apply_ask.py <page folder> ...     insert or update the block
  python3 html_utils/apply_ask.py --all                 every page with src/parts, and the template's 01_head.html
  python3 html_utils/apply_ask.py --remove <folder> ... take it out again
  python3 html_utils/apply_ask.py --check               every built page (index.html) carries the current block once
Then rebuild each changed page (sh <page>/src/build.sh) and run the checks.
"""
import glob, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apply_look import head_part

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE = os.path.join(ROOT, '.claude', 'skills', 'explainer-page', 'build', 'templates', '01_head.html')
START, END = '<script id="kb-ask">', '</script><!--/kb-ask-->'
JS = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'kb_ask.js'), encoding='utf-8').read()
assert '</script' not in JS and '\u2014' not in JS
BLOCK = START + '\n' + JS.rstrip('\n') + '\n' + END
RX = re.compile(re.escape(START) + r'.*?' + re.escape(END) + r'\n?', re.S)


BUDDY = '<script id="kb-buddy">'   # a page with the AI buddy (html_utils/kb_buddy.js) has no Ask Claude


def put(f, remove=False):
    s = open(f, encoding='utf-8').read()
    remove = remove or BUDDY in s
    s2 = RX.sub('', s)
    if not remove:
        if '</head>' in s2:
            i = s2.index('</head>'); s2 = s2[:i] + BLOCK + '\n' + s2[i:]
        else:
            s2 = s2.rstrip('\n') + '\n' + BLOCK + '\n'
    if s2 == s:
        return 'unchanged'
    open(f, 'w', encoding='utf-8').write(s2)
    return 'removed from ' if remove else 'applied to '


def apply(folder, remove=False):
    f = head_part(folder)
    if not f:
        return 'SKIP no single part with </head>'
    r = put(f, remove)
    return r + ('' if r == 'unchanged' else os.path.relpath(f, folder))


def pages():
    return sorted(os.path.dirname(os.path.dirname(p)) for p in glob.glob(os.path.join(ROOT, 'technical_knowledge_base', '**', 'src', 'parts'), recursive=True))


def check():
    bad = []
    for d in pages():
        h = open(os.path.join(d, 'index.html'), encoding='utf-8').read()
        if (h.count(START) != 0) if BUDDY in h else (h.count(START) != 1 or BLOCK not in h):
            bad.append(os.path.relpath(d, ROOT))
    for b in bad:
        print('MISSING or STALE', b)
    print('pages', len(pages()), 'without the current Ask Claude block', len(bad))
    return not bad


def main(argv):
    if '--check' in argv:
        sys.exit(0 if check() else 1)
    remove = '--remove' in argv
    args = [a for a in argv if not a.startswith('--')]
    if '--all' in argv:
        args = pages()
        print('template 01_head.html', put(TEMPLATE, remove))
    for a in args:
        print(os.path.relpath(os.path.abspath(a), ROOT), apply(os.path.abspath(a), remove))


if __name__ == '__main__':
    main(sys.argv[1:])

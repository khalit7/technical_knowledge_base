"""Put the AI buddy on pages (every page since 2026-11-19).

Each page carries only the small loader, html_utils/kb_buddy_loader.js, as one marked <script id="kb-buddy"> block just before
</head> in the source part that holds </head>, so a rebuild keeps it. The loader fetches the shared
buddy, html_utils/kb_buddy.js, on every page; on the site build_site.py
publishes that file as kb_buddy.js at the site root. So editing kb_buddy.js needs no rerun of this script and no page rebuild; editing
the loader does (--all, then rebuild every page). Any older kb-buddy block is replaced. Usage:
  python3 html_utils/apply_buddy.py <page folder> ...   insert or update the loader on these pages
  python3 html_utils/apply_buddy.py --template          only the explainer-page template's 01_head.html
  python3 html_utils/apply_buddy.py --all               every page with src/parts, and the template
  python3 html_utils/apply_buddy.py --check             every built page (index.html) carries the current loader once
then rebuild the pages (src/build.sh).
"""
import glob, os, re, sys


def head_part(folder):
    """The source part that closes the head: the place the loader goes (every page has exactly one)."""
    parts = [f for f in sorted(glob.glob(os.path.join(folder, 'src', 'parts', '*'))) if os.path.isfile(f)]
    hits = [f for f in parts if '</head>' in open(f, errors='ignore').read()]
    return hits[0] if len(hits) == 1 else None

H = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(H)
TEMPLATE = os.path.join(ROOT, '.claude', 'skills', 'explainer-page', 'build', 'templates', '01_head.html')
START, END = '<script id="kb-buddy">', '</script><!--/kb-buddy-->'
LOADER = open(os.path.join(H, 'kb_buddy_loader.js'), encoding='utf-8').read()
for name in ('kb_buddy_loader.js', 'kb_buddy.js'):
    assert '\u2014' not in open(os.path.join(H, name), encoding='utf-8').read(), name + ': no em dash'
# the loader is written into every page: build_site.py puts its bar at a page's first closing head tag and opening body tag
assert '</script' not in LOADER and '</head' not in LOADER.lower() and '<body' not in LOADER.lower(), 'the loader holds a literal script, head or body tag'
BLOCK = START + '\n' + LOADER.rstrip('\n') + '\n' + END
RX = re.compile(re.escape(START) + r'.*?' + re.escape(END) + r'\n?', re.S)


def put(f):
    s = open(f, encoding='utf-8').read()
    s2 = RX.sub('', s)
    i = s2.index('</head>')
    s2 = s2[:i] + BLOCK + '\n' + s2[i:]
    if s2 == s:
        return 'unchanged'
    open(f, 'w', encoding='utf-8').write(s2)
    return 'applied to '


def apply(folder):
    f = head_part(folder)
    if not f:
        return 'SKIP no single part with </head>'
    r = put(f)
    return r + ('' if r == 'unchanged' else os.path.relpath(f, folder))


def pages():
    return sorted(os.path.dirname(os.path.dirname(p)) for p in glob.glob(os.path.join(ROOT, 'technical_knowledge_base', '**', 'src', 'parts'), recursive=True))


def check():
    bad = []
    for d in pages():
        h = open(os.path.join(d, 'index.html'), encoding='utf-8').read()
        if h.count(START) != 1 or BLOCK not in h:
            bad.append(os.path.relpath(d, ROOT))
    t = open(TEMPLATE, encoding='utf-8').read()
    if t.count(START) != 1 or BLOCK not in t:
        bad.append('template 01_head.html')
    for b in bad:
        print('MISSING or STALE', b)
    print('pages', len(pages()), 'without the current AI buddy loader', len(bad))
    return not bad


def main(argv):
    if '--check' in argv:
        sys.exit(0 if check() else 1)
    args = [a for a in argv if not a.startswith('--')]
    if '--template' in argv or '--all' in argv:
        print('template 01_head.html', put(TEMPLATE))
    if '--all' in argv:
        args = pages()
    if not args and '--template' not in argv:
        raise SystemExit(__doc__)
    for a in args:
        print(os.path.relpath(os.path.abspath(a), ROOT), apply(os.path.abspath(a.rstrip('/'))))


if __name__ == '__main__':
    main(sys.argv[1:])

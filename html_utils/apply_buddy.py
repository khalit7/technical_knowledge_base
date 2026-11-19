"""Put the AI buddy on pages (every page since 2026-11-19; it replaced Ask Claude, which was retired).

Each page carries only the small loader, html_utils/kb_buddy_loader.js, as one marked <script id="kb-buddy"> block just before
</head> in the source part that holds </head> (the part apply_look.py uses), so a rebuild keeps it. The loader fetches the shared
buddy, html_utils/kb_buddy.js, when a Claude key is saved in the browser or the reader taps "AI buddy"; on the site build_site.py
publishes that file as kb_buddy.js at the site root. So editing kb_buddy.js needs no rerun of this script and no page rebuild; editing
the loader does (--all, then rebuild every page). Any older block is replaced: the inline buddy of the pilot, and Ask Claude's
kb-ask block, which this removes. Usage:
  python3 html_utils/apply_buddy.py <page folder> ...   insert or update the loader (and remove Ask Claude) on these pages
  python3 html_utils/apply_buddy.py --template          only the explainer-page template's 01_head.html
  python3 html_utils/apply_buddy.py --all               every page with src/parts, and the template
  python3 html_utils/apply_buddy.py --check             every built page (index.html) carries the current loader once and no Ask Claude
  python3 html_utils/apply_buddy.py --remove <page folder> ...   take the loader out again
then rebuild the pages (src/build.sh).
"""
import glob, os, re, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from apply_look import head_part

H = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(H)
TEMPLATE = os.path.join(ROOT, '.claude', 'skills', 'explainer-page', 'build', 'templates', '01_head.html')
START, END = '<script id="kb-buddy">', '</script><!--/kb-buddy-->'
ASK = re.compile(r'<script id="kb-ask">.*?</script><!--/kb-ask-->\n?', re.S)   # Ask Claude, retired 2026-11-19
LOADER = open(os.path.join(H, 'kb_buddy_loader.js'), encoding='utf-8').read()
for name in ('kb_buddy_loader.js', 'kb_buddy.js'):
    js = open(os.path.join(H, name), encoding='utf-8').read()
    assert '</script' not in js and '—' not in js, name + ': no closing script tag and no em dash'
    # build_site.py puts its bar at a page's first closing head tag and opening body tag: neither may appear in what pages carry
    assert '</head' not in js.lower() and '<body' not in js.lower(), name + ' holds a literal head or body tag; split it'
BLOCK = START + '\n' + LOADER.rstrip('\n') + '\n' + END
RX = re.compile(re.escape(START) + r'.*?' + re.escape(END) + r'\n?', re.S)


def put(f, remove=False):
    s = open(f, encoding='utf-8').read()
    s2 = ASK.sub('', RX.sub('', s))
    if not remove:
        i = s2.index('</head>') if '</head>' in s2 else len(s2)
        s2 = s2[:i] + BLOCK + '\n' + s2[i:]
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
        if h.count(START) != 1 or BLOCK not in h or '<script id="kb-ask">' in h:
            bad.append(os.path.relpath(d, ROOT))
    t = open(TEMPLATE, encoding='utf-8').read()
    if t.count(START) != 1 or BLOCK not in t or '<script id="kb-ask">' in t:
        bad.append('template 01_head.html')
    for b in bad:
        print('MISSING, STALE or WITH ASK CLAUDE', b)
    print('pages', len(pages()), 'without the current AI buddy loader', len(bad))
    return not bad


def main(argv):
    if '--check' in argv:
        sys.exit(0 if check() else 1)
    remove = '--remove' in argv
    args = [a for a in argv if not a.startswith('--')]
    if '--template' in argv or '--all' in argv:
        print('template 01_head.html', put(TEMPLATE, remove))
    if '--all' in argv:
        args = pages()
    if not args and '--template' not in argv:
        raise SystemExit(__doc__)
    for a in args:
        print(os.path.relpath(os.path.abspath(a), ROOT), apply(os.path.abspath(a.rstrip('/')), remove))


if __name__ == '__main__':
    main(sys.argv[1:])

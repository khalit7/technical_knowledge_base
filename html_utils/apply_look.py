"""Put the reading-site look on pages built before it reached the template (2026-10-29).

Inserts (or replaces) one marked <style id="kb-look"> block just before </head> in the source part that holds
</head>, so it comes after the page's theme CSS and wins at equal specificity; page CSS scoped to a tab
(#t-read ...) still wins, so page decisions stand. New pages get the same look from the template's
01_head.html and do not need this. Usage:
  python3 html_utils/apply_look.py <page folder> ...     insert or update the block
  python3 html_utils/apply_look.py --all                 every page with src/parts
  python3 html_utils/apply_look.py --remove <folder> ... take it out again
Then rebuild each page (sh <page>/src/build.sh) and run the checks.
"""
import glob, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
START, END = '<style id="kb-look">', '</style><!--/kb-look-->'

# The template's look (build/templates/01_head.html), as overrides. .an-cap is boosted with :is(*,#kb) (id specificity,
# matches anything) because most pages restyle it under #t-read with a tight padding that a tinted box cannot keep.
LOOK = r"""/* Reading-site look (2026-10-29), from html_utils/apply_look.py; the template's 01_head.html carries the same */
:root{--bg:#f4f5f7;--card:#fff;--soft:#f0f2f5;--line:#e1e4e9;--ink:#1d2733;--mute:#5f6b7a;--acc:#2a62a8;--acc2:#dde8f6;
--shadow:0 1px 2px rgba(20,35,60,.06),0 8px 24px rgba(20,35,60,.07);--serif:"Iowan Old Style","Palatino Linotype",Palatino,"Book Antiqua",Georgia,serif}
@media (prefers-color-scheme:dark){:root{--bg:#121519;--card:#1a1e24;--soft:#20252c;--line:#2c323b;--ink:#e6e9ee;--mute:#9aa4b2;--acc:#7aaee8;--acc2:#1f334b;
--shadow:0 1px 2px rgba(0,0,0,.4),0 8px 24px rgba(0,0,0,.3)}}
body{background:var(--bg);font-size:16px;line-height:1.65}
.w{max-width:980px;padding:28px 20px 56px}
h1{font-family:var(--serif);font-size:clamp(28px,4.2vw,40px);line-height:1.12;letter-spacing:-.005em;font-weight:700}
.sub{font-size:15px;line-height:1.55;max-width:46em;margin:12px 0 18px}
h2{font-family:var(--serif);font-size:clamp(23px,3vw,29px);line-height:1.2;margin-top:56px;margin-bottom:12px;font-weight:700}
h3{font-size:16px}sub,sup{line-height:0}
section>p,section>ul,section>ol{max-width:46em}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);padding:18px 20px;margin:20px 0}
.card .card{box-shadow:none;margin:12px 0}.card h4{font-size:15.5px;line-height:1.35}
.co{background:var(--acc2);border-left-width:4px;border-radius:0 12px 12px 0;padding:12px 16px;margin:18px 0}
.co.warn{background:color-mix(in srgb,var(--bad) 12%,var(--bg))}.co.key{background:color-mix(in srgb,var(--good) 12%,var(--bg))}
button,select{background:var(--card);border-radius:8px}button:hover{border-color:var(--acc)}
.an-ctl button,.an-ctl select{border-radius:999px;padding:5px 14px}
.an-play{background:var(--acc);border-color:var(--acc);color:var(--bg);font-weight:600}
.seg{border-radius:20px;background:var(--soft);padding:3px;gap:2px;border-color:var(--line);flex-wrap:wrap;max-width:100%}
.seg button{border-radius:999px;background:transparent;padding:5px 13px}
.seg button.on{background:var(--card);color:var(--ink);box-shadow:0 1px 3px rgba(20,35,60,.15)}
.tabs button{font-size:15px;padding:9px 14px;border-radius:0;background:none}
.nav{background:color-mix(in srgb,var(--bg) 88%,transparent);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);padding:8px 0;gap:6px}
.nav a{font-size:13px;padding:4px 12px;background:var(--card)}
.nav a.cur{background:var(--acc);border-color:var(--acc);color:var(--bg)}
.stat{background:var(--soft);border-color:transparent;border-radius:10px;padding:10px 12px}.stat .v{font-size:21px}
.an-cap:is(*,#kb){background:var(--soft);border-left-width:4px;border-radius:0 10px 10px 0;padding:10px 14px}
details.dp{background:var(--card);border-radius:12px}
.pr,.dr,.detail,.bet,.fm{background:var(--card);border-radius:12px}
@media (max-width:520px){body{font-size:15px}h1{font-size:26px}h2{margin-top:44px}.w{padding:20px 14px 40px}.card{padding:14px;border-radius:12px}.seg button{padding:5px 10px}
code{overflow-wrap:anywhere}math[display=block]{display:block math;max-width:100%;overflow-x:auto;overflow-y:hidden}}
"""

BLOCK = START + '\n' + LOOK + END
RX = re.compile(re.escape(START) + r'.*?' + re.escape(END) + r'\n?', re.S)


def head_part(folder):
    """The source part that closes the head: the place the block goes. A page whose parts never write </head> (the
    browser closes it) gets the block at the end of its last CSS part instead."""
    parts = [f for f in sorted(glob.glob(os.path.join(folder, 'src', 'parts', '*'))) if os.path.isfile(f)]
    hits = [f for f in parts if '</head>' in open(f, errors='ignore').read()]
    if len(hits) == 1:
        return hits[0]
    css = [f for f in parts if 'css' in os.path.basename(f) and RX.sub('', open(f, errors='ignore').read()).rstrip().endswith('</style>')]
    return css[-1] if not hits and css else None


def apply(folder, remove=False):
    if glob.glob(os.path.join(folder, 'src', 'parts', '*')) and any('Look trial (2026-10-29)' in open(x, errors='ignore').read() for x in glob.glob(os.path.join(folder, 'src', 'parts', '01_head*.html'))):
        return 'SKIP has the look already (the trial page)'
    f = head_part(folder)
    if not f:
        return 'SKIP no single part with </head>'
    s = open(f).read()
    s2 = RX.sub('', s)
    if '</head>' not in s2:
        s2 = s2.rstrip('\n') + '\n'
    if not remove:
        i = s2.index('</head>') if '</head>' in s2 else len(s2.rstrip())
        s2 = s2[:i] + ('' if '</head>' in s2 else '\n') + BLOCK + s2[i:]
    if s2 == s:
        return 'unchanged'
    open(f, 'w').write(s2)
    return ('removed from ' if remove else 'applied to ') + os.path.relpath(f, folder)


def main(argv):
    remove = '--remove' in argv
    args = [a for a in argv if not a.startswith('--')]
    if '--all' in argv:
        args = sorted(os.path.dirname(os.path.dirname(p)) for p in glob.glob(os.path.join(ROOT, 'technical_knowledge_base', '**', 'src', 'parts'), recursive=True))
    for a in args:
        print(os.path.relpath(os.path.abspath(a), ROOT), apply(os.path.abspath(a), remove))


if __name__ == '__main__':
    main(sys.argv[1:])

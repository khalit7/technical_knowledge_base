#!/bin/bash
R=$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null) && [ -x "$R/.venv/bin/python3" ] && PATH="$R/.venv/bin:$PATH"; export LC_ALL=en_US.UTF-8   # pin repo Python (3.12) and locale (glob order): page hashes depend on both
# Build ../index.html for an article page (the reference article folder; page-kinds/article.md, Build).
# Run with bash: bash src/build.sh. What the next article builder changes here: nothing, unless the part layout differs.
#   1. mk_article.py writes the generated parts from article.json: _gen_card.html (headline card, placed at @@CARD@@),
#      _gen_more.html (Further reading, the last tab) and _gen_data.js (window.ARTICLE).
#   2. The assembler below concatenates, in this order: 01_head.html, 02_split.html, 03_css.html, 10_header.html,
#      20_read_*.html (byte order: 20_read_a ... 20_read_z), 3*_tab_*.html (other tabs, if any), _gen_more.html;
#      then the hidden #jsErr box, 05z_errbox.js.html, and every *.js part in its own <script> (_gen_data.js first,
#      the rest in byte order, 99_js_tabs.js last), so one failing part cannot stop the others.
#   3. It expands the link macros (mk_article.py's docstring lists them). Every ar: text fragment is checked against
#      inputs/article.txt and every ah: id against inputs/anchors.txt; a fragment that is missing or not unique stops
#      the build, so an edited article shows up at the next rebuild (re-extract it with extract_article.py first).
#   4. It stops on an unexpanded macro, a placeholder or an em-dash, fills the reading time from reading.json
#      (measured with html_utils/audit_pages.mjs after a build) and the Further reading total, and prints the size.
set -e
cd "$(dirname "$0")"
python3 mk_article.py
python3 - <<'PY'
import glob, os, re, json
import mk_article as M
rd = lambda f: open('parts/' + f, encoding='utf-8').read()
reads = sorted((os.path.basename(f) for f in glob.glob('parts/20_read_*.html')), key=lambda s: s.encode())
tabs = sorted((os.path.basename(f) for f in glob.glob('parts/3*_tab_*.html')), key=lambda s: s.encode())
HTML = ['01_head.html', '02_split.html', '03_css.html', '10_header.html'] + reads + tabs + ['_gen_more.html']
js = sorted((os.path.basename(f) for f in glob.glob('parts/*.js')), key=lambda s: s.encode())
JS = ['_gen_data.js'] + [f for f in js if f not in ('_gen_data.js', '99_js_tabs.js')] + ['99_js_tabs.js']
body = ''.join(rd(f) for f in HTML).replace('@@CARD@@', rd('_gen_card.html'))
body = M.expand(body)
out = body + '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>\n'
out += rd('05z_errbox.js.html')
for f in JS:
    out += '<script>/* %s */\n%s\n</script>\n' % (f, rd(f))
out += '</div></body></html>\n'
for bad, msg in (('{{', 'unexpanded link'), ('[[ar:', 'unexpanded margin label'), ('[[ah:', 'unexpanded margin label'), ('—', 'EM DASH FOUND'), ('@@', 'unexpanded placeholder')):
    if bad in out: raise SystemExit(msg + ': ' + out[max(0, out.index(bad) - 80):out.index(bad) + 80])
fr = out[out.index('id="t-more"'):]
tot = 0
for x in re.findall(r'class="rt">\(([^)]*)\)', fr):
    h = re.search(r'(\d+)h', x); mm = re.search(r'(\d+) ?m(?:in)?\b', x)
    tot += (int(h.group(1)) * 60 if h else 0) + (int(mm.group(1)) if mm else 0)
RDT = json.load(open('reading.json')) if os.path.exists('reading.json') else {'core': '?', 'details': '?'}
out = out.replace('RD_CORE', str(RDT['core'])).replace('RD_DET', str(RDT['details'])).replace('RES_TIME', '%dh %02dm' % (tot // 60, tot % 60))
open('../index.html', 'w', encoding='utf-8').write(out)
print('text fragments checked', len(M.USED), '(all found once in inputs/article.txt) · resources %dh %02dm · bytes %d' % (tot // 60, tot % 60, len(out.encode())))
PY

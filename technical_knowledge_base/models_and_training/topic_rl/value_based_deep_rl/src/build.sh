#!/bin/sh
R=$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null) && [ -x "$R/.venv/bin/python3" ] && PATH="$R/.venv/bin:$PATH"; export LC_ALL=en_US.UTF-8   # pin repo Python (3.12) and locale (glob order): page hashes depend on both
# Assemble ../index.html from parts/.
# HTML: 01_head, 02_css, 10_header, 20_read_a..d (Reading tab), 39_tab_more (Further reading).
# JS: every *.js in parts/ in file-name order, each in its own <script>, 99_js_tabs.js (the tab wiring) last.
# Links are written {{text|url}} (url may be n:<notion id>, or #t-<tab> for a link to a tab).
cd "$(dirname "$0")"
{ cat parts/01_head.html parts/02_css.html parts/10_header.html parts/20_read_a.html parts/20_read_b.html parts/20_read_c.html parts/20_read_d.html parts/39_tab_more.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in $(ls parts/*.js | LC_ALL=C sort); do [ "$(basename $f)" = 99_js_tabs.js ] && continue; echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo "<script>/* 99_js_tabs.js */"; cat parts/99_js_tabs.js; echo '</script>'
  echo '</div></body></html>'; } | perl -CSD -pe '
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html
# Static reading-time estimate (230 words a minute, closed <details> apart). It misses script-written captions, so the
# header's "Reading: N min, plus M" is set by hand from html_utils/audit_pages.mjs (the rendered DOM) after a rebuild.
python3 - <<'PY'
import re
from html.parser import HTMLParser
s=open('../index.html').read()
a=s.index('id="t-read"');b=s.index('id="t-more"')
class P(HTMLParser):
    def __init__(s):super().__init__();s.st=[];s.core=0;s.depth=0
    def handle_starttag(s,t,a):
        if t not in('br','img','input','hr','meta','wbr'):s.st.append(t)
    def handle_endtag(s,t):
        if t in s.st:
            while s.st and s.st.pop()!=t:pass
    def handle_data(s,d):
        if any(t in('script','style','svg','button','nav') for t in s.st):return
        k=len(d.split())
        if 'details' in s.st and s.st[-1]!='summary' and 'summary' not in s.st:s.depth+=k
        else:s.core+=k
p=P();p.feed(s[a:b])
print('static words: core',p.core,'details',p.depth,'(header times come from audit_pages.mjs)')
PY
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
if grep -q '—' ../index.html; then echo "EM DASH FOUND"; grep -n -o '.\{30\}—.\{30\}' ../index.html | head; fi
wc -c ../index.html

#!/bin/sh
R=$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null) && [ -x "$R/.venv/bin/python3" ] && PATH="$R/.venv/bin:$PATH"; export LC_ALL=en_US.UTF-8   # pin repo Python (3.12) and locale (glob order): page hashes depend on both
# Assemble ../index.html from parts/.
# HTML: 01_head, 02_css, 10_header, 20_read_a, 20_read_b, 20_read_c (Reading tab), 31_tab_test (10-armed testbed), 39_tab_more (Further reading).
# JS: every *.js in parts/ in file-name order, each in its own <script>, 99_js_tabs.js (the tab wiring) last.
# parts/22_js_bx_0data.js is written by make_data.mjs (node make_data.mjs); rerun it if the engine changes.
# Links are written {{text|url}} (url may be n:<notion id>, or #t-<tab> for a link to a tab).
cd "$(dirname "$0")"
{ cat parts/01_head.html parts/02_css.html parts/10_header.html parts/20_read_a.html parts/20_read_b.html parts/20_read_c.html parts/31_tab_test.html parts/39_tab_more.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/*.js; do [ "$(basename $f)" = 99_js_tabs.js ] && continue; echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo "<script>/* 99_js_tabs.js */"; cat parts/99_js_tabs.js; echo '</script>'
  echo '</div></body></html>'; } | perl -CSD -pe '
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html
# Reading time: 230 words a minute over the Reading tab's text, core (outside closed <details>, summaries counted as core)
# and closed details apart, as html_utils/audit_pages.mjs measures it (script-drawn captions are added by an allowance,
# READ_EXTRA words, measured with audit_pages.mjs after the 2026-10-24 rebuild)
python3 - <<'PY'
import re
READ_EXTRA=int(open('reading_extra.txt').read().split()[0]) if __import__('os').path.exists('reading_extra.txt') else 0
s=open('../index.html').read()
a=s.index('id="t-read"');b=s.index('id="t-test"')
t=re.sub(r'<script.*?</script>|<style.*?</style>|<svg.*?</svg>|<nav.*?</nav>|<button.*?</button>','',s[a:b],flags=re.S)
dep=0
def cut(m):
    global dep
    body=re.sub(r'<summary.*?</summary>','',m.group(0),flags=re.S);dep+=len(re.sub(r'<[^>]+>',' ',body).split())
    sm=re.search(r'<summary.*?</summary>',m.group(0),flags=re.S);return sm.group(0) if sm else ''
t=re.sub(r'<details.*?</details>',cut,t,flags=re.S)
core=len(re.sub(r'<[^>]+>',' ',t).split())+READ_EXTRA
mc,md=round(core/230),round(dep/230)
open('../index.html','w').write(s.replace('RT_CORE',str(mc)).replace('RT_DEPTH',str(md)))
print('reading words core',core,'depth',dep,'minutes',mc,'+',md)
PY
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
ED=$(printf '\342\200\224'); if grep -q "$ED" ../index.html; then echo "EM DASH FOUND"; grep -n -o ".\{30\}$ED.\{30\}" ../index.html | head; fi
wc -c ../index.html

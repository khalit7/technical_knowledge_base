#!/bin/sh
R=$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null) && [ -x "$R/.venv/bin/python3" ] && PATH="$R/.venv/bin:$PATH"; export LC_ALL=en_US.UTF-8   # pin repo Python (3.12) and locale (glob order): page hashes depend on both
# Assemble ../index.html from parts/.
# Data first: make_page_data.py writes parts/22_js_mx_0data.js and page_text.json from the recorded outputs in src/.
# HTML: 01_head, 10_header (title and tab bar), 20_read_*.html (Reading tab: 20_read_a first), then 33_tab_calc.html, 39_tab_more.
# JS: the root's Config calculator core (window.CC, used unchanged by the calculator tab), then every *.js in parts/ in
# file-name order, each in its own <script>, 99_js_tabs.js (the tab wiring) last.
# Links {{text|url}} (n:<notion id>, #t-<tab>, or https://...); then fill.py resolves [[...]] placeholders (facts, code refs).
cd "$(dirname "$0")"
python3 make_page_data.py || exit 1
CC=../../src/parts/33_js_cc_1core.js
{ cat parts/01_head.html parts/10_header.html parts/20_read_*.html
  for f in parts/3*_tab_*.html; do cat "$f"; done
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  echo "<script>/* 33_js_cc_1core.js from the root (Topic: llm-architecture Config calculator) */"; cat $CC; echo '</script>'
  for f in parts/*.js; do [ "$(basename $f)" = 99_js_tabs.js ] && continue; echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo "<script>/* 99_js_tabs.js */"; cat parts/99_js_tabs.js; echo '</script>'
  echo '</body></html>'; } | perl -CSD -pe '
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html
python3 fill.py ../index.html $FILL_FLAGS || exit 1
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
D=$(printf '\342\200\224'); if grep -q "$D" ../index.html; then echo "EM DASH FOUND"; grep -n -o ".\{30\}$D.\{30\}" ../index.html | head; fi
wc -c ../index.html
# Reading time is measured from the rendered page by html_utils/audit_pages.mjs (230 words a minute, closed details apart)
# and written into 10_header.html by hand after each rebuild that changes the text (src/README.md, Length judgement).

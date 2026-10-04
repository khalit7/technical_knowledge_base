#!/bin/sh
# Assemble ../index.html from parts/ (child page: SQL and data modelling).
# HTML: 01_head, 10_header (title and tab bar), 20_read_*.html (20_read_a first) (Reading tab), then 3x_tab_*.html (one per tab, in file-name order).
# JS: first the root page's in-page database engine, reused rather than copied (../../src/parts/31_js_sql_a_engine.js: sql.js 1.14.2
# with its WebAssembly inlined; parts/31_js_run.js is this page's copy of the root's loader and runner), then every *.js in parts/ in file-name
# order, each in its own <script>, 99_js_tabs.js (the tab wiring) last.
# Links may be written {{text|url}} (url may be n:<notion id>, or #t-<tab> for a link to a tab); plain <a> tags pass through.
cd "$(dirname "$0")"
ROOTP=../../src/parts
for f in $ROOTP/31_js_sql_a_engine.js; do [ -f "$f" ] || { echo "missing $f (the root page's engine)"; exit 1; }; done
{ cat parts/01_head.html parts/10_header.html parts/20_read_*.html
  for f in parts/3*_tab_*.html; do cat "$f"; done
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in $ROOTP/31_js_sql_a_engine.js; do echo "<script>/* root: $(basename $f) */"; cat "$f"; echo '</script>'; done
  for f in parts/*.js; do [ "$(basename $f)" = 99_js_tabs.js ] && continue; echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo "<script>/* 99_js_tabs.js */"; cat parts/99_js_tabs.js; echo '</script>'
  echo '</div></body></html>'; } | perl -CSD -pe '
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
if grep -q '—' ../index.html; then echo "EM DASH FOUND"; grep -n -o '.\{30\}—.\{30\}' ../index.html | head; fi
wc -c ../index.html

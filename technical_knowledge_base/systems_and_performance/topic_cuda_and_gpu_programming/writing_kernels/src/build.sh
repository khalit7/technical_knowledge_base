#!/bin/sh
# Assemble ../index.html from parts/.
# HTML: 01_head, 10_header (title and tab bar), 20_read.html then 20_read_*.html (Reading tab), then 3x_tab_*.html (one per tab, in file-name order).
# A part may carry its own <style> (deep tabs keep their CSS scoped under their tab id).
# JS: every *.js in parts/ in file-name order, each in its own <script>, 99_js_tabs.js (the tab wiring) last.
# Links may be written {{text|url}} (url may be n:<notion id>, or #t-<tab> for a link to a tab); plain <a> tags pass through.
cd "$(dirname "$0")"
{ cat parts/01_head.html parts/10_header.html parts/20_read.html parts/20_read_*.html
  for f in parts/3*_tab_*.html; do cat "$f"; done
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/*.js; do [ "$(basename $f)" = 99_js_tabs.js ] && continue; echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo "<script>/* 99_js_tabs.js */"; cat parts/99_js_tabs.js; echo '</script>'
  echo '</body></html>'; } | perl -CSD -pe '
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
ED=$(printf '\342\200\224'); if grep -q "$ED" ../index.html; then echo "EM DASH FOUND"; grep -n -o ".\{30\}$ED.\{30\}" ../index.html | head; fi
wc -c ../index.html

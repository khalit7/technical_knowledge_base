#!/bin/sh
# Assemble ../index.html from parts/.
# HTML: 01_head, then 1*.html (title, part bar, tab buttons per part), then every [2-9]*_tab_*.html in file-name order.
# Parts own number ranges: start tab 20; part 1 30-39; part 2 40-49; part 3 50-59; page-wide 90-98.
# A tab may be split across several files (e.g. 30_tab_read_a.html .. 30_tab_read_z.html): the first opens its div, the last closes it.
# JS: every *.js in parts/ in file-name order, each in its own <script>, 99_js_tabs.js (two-level tab wiring) last.
# Links may be written {{text|url}} (url may be n:<notion id>, or #t-<tab> for a link to a tab); plain <a> tags pass through.
cd "$(dirname "$0")"
{ cat parts/01_head.html; for f in parts/1*.html; do cat "$f"; done
  for f in parts/[2-9]*_tab_*.html; do cat "$f"; done
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/*.js; do [ "$(basename $f)" = 99_js_tabs.js ] && continue; echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo "<script>/* 99_js_tabs.js */"; cat parts/99_js_tabs.js; echo '</script>'
  echo '</body></html>'; } | perl -CSD -pe '
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
if grep -q '—' ../index.html; then echo "EM DASH FOUND"; grep -n -o '.\{30\}—.\{30\}' ../index.html | head; fi
wc -c ../index.html

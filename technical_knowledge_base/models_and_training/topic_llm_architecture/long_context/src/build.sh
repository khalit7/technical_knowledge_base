#!/bin/sh
R=$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null) && [ -x "$R/.venv/bin/python3" ] && PATH="$R/.venv/bin:$PATH"; export LC_ALL=en_US.UTF-8   # pin repo Python (3.12) and locale (glob order): page hashes depend on both
# Assemble ../index.html from parts/ (the root's build, plus the root's Config calculator core, window.CC, reused read-only).
# HTML: 01_head, 10_header (title and tab bar), 20_read_*.html (Reading tab), then 3x_tab_*.html (one group per tab).
# JS: the root's parts/33_js_cc_1core.js first (window.CC, unchanged), then every *.js in parts/ in byte order, each in its
# own <script>, 99_js_tabs.js last. Links: {{text|url}}, {{text|n:<notion id>}}, {{text|#t-<tab>}}.
cd "$(dirname "$0")"
CC=../../src/parts/33_js_cc_1core.js
{ cat parts/01_head.html parts/10_header.html
  for f in $(ls parts/20_read_*.html | LC_ALL=C sort); do cat "$f"; done
  for f in $(ls parts/3*_tab_*.html | LC_ALL=C sort); do cat "$f"; done
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  echo "<script>/* root 33_js_cc_1core.js (Config calculator core, reused unchanged) */"; cat "$CC"; echo '</script>'
  for f in $(ls parts/*.js | LC_ALL=C sort); do [ "$(basename $f)" = 99_js_tabs.js ] && continue; echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo "<script>/* 99_js_tabs.js */"; cat parts/99_js_tabs.js; echo '</script>'
  echo '</body></html>'; } | perl -CSD -pe '
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
if grep -q '—' ../index.html; then echo "EM DASH FOUND"; grep -n -o '.\{30\}—.\{30\}' ../index.html | head; fi
wc -c ../index.html

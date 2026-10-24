#!/bin/sh
R=$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null) && [ -x "$R/.venv/bin/python3" ] && PATH="$R/.venv/bin:$PATH"; export LC_ALL=en_US.UTF-8   # pin repo Python (3.12) and locale (glob order): page hashes depend on both
# Assemble ../index.html from parts/ (the explainer-page template build, plus one data script).
# HTML: 01_head, 10_header (title and tab bar), 20_read_*.html (Reading tab), then 3x_tab_*.html (one per tab, in file-name order).
# Data: inputs/mtbench_votes.json (built by mk_data.py) becomes window.MTB in its own <script> before the page's JS.
# JS: every *.js in parts/ in file-name order, each in its own <script>, 99_js_tabs.js (the tab wiring) last.
# Links may be written {{text|url}} (url may be n:<notion id>, or #t-<tab> for a link to a tab); plain <a> tags pass through.
cd "$(dirname "$0")" || exit 1
P=parts
reads=$(ls $P/20_read_*.html 2>/dev/null | LC_ALL=C sort)
tabs=$(ls $P/3*_tab_*.html 2>/dev/null | LC_ALL=C sort)
js=$(ls $P/*.js 2>/dev/null | LC_ALL=C sort)
{ cat $P/01_head.html $P/10_header.html
  for f in $reads; do cat "$f"; done
  for f in $tabs; do cat "$f"; done
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat $P/05z_errbox.js.html
  printf '<script>/* data: inputs/mtbench_votes.json */window.MTB='; cat inputs/mtbench_votes.json; echo ';</script>'
  for f in $js; do [ "$(basename "$f")" = 99_js_tabs.js ] && continue; echo "<script>/* $(basename "$f") */"; cat "$f"; echo '</script>'; done
  echo "<script>/* 99_js_tabs.js */"; cat $P/99_js_tabs.js; echo '</script>'
  echo '</div></body></html>'; } | perl -CSD -pe '
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
ED=$(printf '\342\200\224')  # the em-dash character, written as bytes so this file contains none
if grep -q "$ED" ../index.html; then echo "EM DASH FOUND"; grep -n -o ".\{30\}$ED.\{30\}" ../index.html | head; fi
wc -c ../index.html

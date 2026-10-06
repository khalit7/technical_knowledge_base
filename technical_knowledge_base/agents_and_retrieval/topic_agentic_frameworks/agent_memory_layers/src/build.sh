#!/bin/sh
# Assemble ../index.html from parts/.
# HTML: 01_head, 10_header (title and tab bar), 20_read.html then 20_read_*.html (Reading tab), then 3x_tab_*.html (one per tab, in file-name order).
# JS: every *.js in parts/ in file-name order, each in its own <script>, 99_js_tabs.js (the tab wiring) last.
# Links: {{text|url}}; url may be n:<notion id>, #t-<tab> (a tab of this page), or m0:/gr:/lt: + path#Lx (source at the pinned tag:
#   m0 = mem0ai/mem0 v2.2.1, gr = getzep/graphiti v0.30.2, lt = letta-ai/letta 0.16.8, the last server release).
cd "$(dirname "$0")"
python3 build_data.py || exit 1
{ cat parts/01_head.html parts/10_header.html parts/20_read.html parts/20_read_*.html
  for f in parts/3*_tab_*.html; do cat "$f"; done
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/*.js; do [ "$(basename $f)" = 99_js_tabs.js ] && continue; echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo "<script>/* 99_js_tabs.js */"; cat parts/99_js_tabs.js; echo '</script>'
  echo '</div></body></html>'; } | perl -CSD -pe '
BEGIN{%R=(m0=>"https://github.com/mem0ai/mem0/blob/94c3fe9f238f3dbf29c9ce98643bd71eb13077cd/",gr=>"https://github.com/getzep/graphiti/blob/eaa4128681bc53487138a4bbc22d58336ebe70d2/",lt=>"https://github.com/letta-ai/letta/blob/1131535716e8a31c9a437f8695e25ac98f203a24/")}
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};$u=~s{^(m0|gr|lt):}{$R{$1}}e;"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
D=$(printf '\342\200\224'); if grep -q "$D" ../index.html; then echo "EM DASH FOUND"; grep -n -o ".\{30\}$D.\{30\}" ../index.html | head; fi
wc -c ../index.html

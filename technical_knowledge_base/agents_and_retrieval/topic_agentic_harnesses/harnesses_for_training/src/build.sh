#!/bin/sh
# Assemble ../index.html from parts/.
# HTML: 01_head, 10_header (title and tab bar), 20_read_*.html (Reading tab, 20_read_a opens it), then 3x_tab_*.html (one per tab, in file-name order).
# A part may carry its own <style> (deep tabs keep their CSS scoped under their tab id).
# JS: every *.js in parts/ in file-name order, each in its own <script>, 99_js_tabs.js (the tab wiring) last.
# Links may be written {{text|url}} (url may be n:<notion id>, or #t-<tab> for a link to a tab); plain <a> tags pass through.
cd "$(dirname "$0")"
{ cat parts/01_head.html parts/10_header.html parts/20_read_*.html
  for f in parts/3*_tab_*.html; do cat "$f"; done
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/*.js; do [ "$(basename $f)" = 99_js_tabs.js ] && continue; echo "<script>/* $(basename $f) */"
    # the data file is inserted after link expansion (its text must not be rewritten)
    if [ "$(basename $f)" = 30_js_data.js ]; then echo '@@HTDATA@@'; else cat "$f"; fi; echo '</script>'; done
  echo "<script>/* 99_js_tabs.js */"; cat parts/99_js_tabs.js; echo '</script>'
  echo '</body></html>'; } | perl -CSD -pe '
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html.tmp
python3 - <<'PY'
s = open("../index.html.tmp", encoding="utf-8").read()
d = open("parts/30_js_data.js", encoding="utf-8").read()
open("../index.html", "w", encoding="utf-8").write(s.replace("@@HTDATA@@", d, 1))
PY
rm -f ../index.html.tmp
if grep -v '^window.HT=' ../index.html | grep -q '{{'; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
EMD=$(printf '\342\200\224')
if grep -q "$EMD" ../index.html; then echo "EM DASH FOUND"; grep -n -o ".\{30\}$EMD.\{30\}" ../index.html | head; fi
wc -c ../index.html

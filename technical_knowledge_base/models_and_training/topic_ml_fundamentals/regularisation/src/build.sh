#!/bin/sh
# Assemble ../index.html from parts/ (Regularisation, child of Topic: ml-fundamentals).
# HTML: 01_head, 02_css (closes <head>), 10_header (title and tab bar), 20_read_a/_b/_c (Reading tab),
# 50_tab_path (Coefficient paths), 60_tab_drop (Dropout as an ensemble), 70_tab_more (Further reading).
# Parts are listed explicitly (shell glob order is locale-dependent).
# JS: each part in its own <script>, the tab wiring (99_js_tabs.js) last.
# Generated data parts: 20_js_diab.js (mk_diabetes.py), 30_js_digits.js (train_digits.py), 31_js_dd.js (double_descent.py, mk_parts_data.py).
# Links may be written {{text|url}} (url may be n:<notion id>, #t-<tab> for a link to a tab); plain <a> tags pass through.
# RT_READ / RT_RES in the header are filled by rtime.py (Reading words at 230 a minute; resource times in Further reading).
cd "$(dirname "$0")"
{ for f in 01_head.html 02_css.html 10_header.html 20_read_a.html 20_read_b.html 20_read_c.html 50_tab_path.html 60_tab_drop.html 70_tab_more.html; do cat "parts/$f"; done
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in 20_js_diab.js 21_js_core.js 22_js_common.js 23_js_plot.js 30_js_digits.js 31_js_dd.js 40_js_geo.js 41_js_dropanim.js 42_js_effects.js 43_js_dd.js 44_js_aug.js 50_js_path.js 60_js_drop.js 99_js_tabs.js; do echo "<script>/* $f */"; cat "parts/$f"; echo '</script>'; done
  echo '</div></body></html>'; } | perl -CSD -pe '
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html.tmp
python3 rtime.py ../index.html.tmp > ../index.html && rm ../index.html.tmp
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
if grep -q '—' ../index.html; then echo "EM DASH FOUND"; grep -n -o '.\{30\}—.\{30\}' ../index.html | head; fi
wc -c ../index.html

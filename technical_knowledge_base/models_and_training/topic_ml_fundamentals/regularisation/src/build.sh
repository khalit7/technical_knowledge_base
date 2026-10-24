#!/bin/sh
R=$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null) && [ -x "$R/.venv/bin/python3" ] && PATH="$R/.venv/bin:$PATH"; export LC_ALL=en_US.UTF-8   # pin repo Python (3.12) and locale (glob order): page hashes depend on both
# Assemble ../index.html from parts/ (Regularisation, child of Topic: ml-fundamentals).
# HTML: 01_head, 02_css (closes <head>), 10_header (title and tab bar), 20_read_a/_b/_c (Reading tab),
# 50_tab_path (Coefficient paths), 70_tab_more (Further reading). The Dropout tab was folded into Reading on 2026-10-24.
# Parts are listed explicitly (shell glob order is locale-dependent).
# JS: each part in its own <script>, the tab wiring (99_js_tabs.js) last.
# Generated data parts: 20_js_diab.js (mk_diabetes.py), 30_js_digits.js (train_digits.py), 31_js_dd.js (double_descent.py, mk_parts_data.py).
# Links may be written {{text|url}} (url may be n:<notion id>, #t-<tab> for a link to a tab); plain <a> tags pass through.
# RT_RES in Further reading is filled by rtime.py; the header's reading time is measured with html_utils/audit_pages.mjs and written in 10_header.html.
cd "$(dirname "$0")"
{ for f in 01_head.html 02_css.html 10_header.html 20_read_a.html 20_read_b.html 20_read_c.html 50_tab_path.html 70_tab_more.html; do cat "parts/$f"; done
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in 20_js_diab.js 21_js_rd_common.js 21_js_core.js 22_js_common.js 23_js_plot.js 26_js_wd_sim.js 30_js_digits.js 31_js_dd.js 25_js_hero.js 27_js_wd.js 40_js_geo.js 41_js_dropanim.js 42_js_effects.js 43_js_dd.js 44_js_aug.js 50_js_path.js 60_js_drop.js 99_js_tabs.js; do echo "<script>/* $f */"; cat "parts/$f"; echo '</script>'; done
  echo '</div></body></html>'; } | perl -CSD -pe '
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html.tmp
python3 rtime.py ../index.html.tmp > ../index.html && rm ../index.html.tmp
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
if grep -q '—' ../index.html; then echo "EM DASH FOUND"; grep -n -o '.\{30\}—.\{30\}' ../index.html | head; fi
wc -c ../index.html

#!/bin/sh
R=$(git -C "$(dirname "$0")" rev-parse --show-toplevel 2>/dev/null) && [ -x "$R/.venv/bin/python3" ] && PATH="$R/.venv/bin:$PATH"; export LC_ALL=en_US.UTF-8   # pin repo Python (3.12) and locale (glob order): page hashes depend on both
# Assemble ../index.html from parts/ (HTML parts in order, then the scripts, the tab wiring last).
# Links: {{text|url}} becomes an external link (new tab); url may be n:<notion id> (a Notion page) or #t-<tab> (switches tab).
cd "$(dirname "$0")" || exit 1
P=parts
{ cat $P/01_head.html $P/02_read_a.html $P/03_read_b.html $P/04_read_c.html $P/05_tabs.html $P/07_more.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat $P/05z_errbox.js.html
  for f in $P/10_js_common.js $P/21_js_rd_common.js $P/12_js_attn.js $P/13_js_moe.js $P/14_js_misc.js $P/20_js_pipe.js $P/21_js_r1.js $P/22_js_eplb.js $P/23_js_v41.js $P/24_js_cfg.js $P/30_js_figs.js; do echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo "<script>/* 99_js_tabs.js */"; cat $P/99_js_tabs.js; echo '</script>'
  echo '</body></html>'; } | perl -CSD -pe '
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > ../index.html
if grep -q '{{' ../index.html; then echo "unexpanded link"; grep -o '{{[^}]*}}' ../index.html | head; fi
ED=$(printf '\342\200\224')  # the em-dash character, written as bytes so this file contains none
if grep -q "$ED" ../index.html; then echo "EM DASH FOUND"; grep -n -o ".\{30\}$ED.\{30\}" ../index.html | head; fi
wc -c ../index.html

#!/bin/sh
# Build a page with only the Scaling calculator tab (and a stub Reading tab), so this tab can be checked while the
# other tabs are being written in parallel. usage: sh scale/build_iso.sh <out.html>   (run from anywhere)
cd "$(dirname "$0")/.."
out="$1"; [ -n "$out" ] || { echo "usage: build_iso.sh out.html"; exit 1; }
{ cat parts/01_head.html parts/10_header.html
  echo '<div class="tab" id="t-read" role="tabpanel"><p>Reading tab stub (isolated build of the Scaling calculator).</p></div>'
  cat parts/34_tab_scale.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/34_js_scale*.js; do echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo "<script>/* 99_js_tabs.js */"; cat parts/99_js_tabs.js; echo '</script>'
  echo '</body></html>'; } | perl -CSD -pe '
s/\{\{([^|{}]+)\|([^{}]+)\}\}/my($t,$u)=($1,$2);if($u=~m{^#(t-[\w-]+)$}){"<a href=\"#\" data-tab=\"$1\">$t<\/a>"}else{$u=~s{^n:}{https:\/\/app.notion.com\/p\/};"<a href=\"$u\" target=\"_blank\" rel=\"noopener noreferrer\">$t<\/a>"}/ge;
' > "$out"
grep -c '—' "$out" | sed 's/^/emdash /'

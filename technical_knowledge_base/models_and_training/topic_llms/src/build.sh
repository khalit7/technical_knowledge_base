#!/bin/sh
# Assemble ../index.html from parts/
cd "$(dirname "$0")"
{ cat parts/01_head.html parts/02_body_a.html parts/03_body_b.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/07_js_map.js parts/08_js_scatter.js parts/09_js_kv.js parts/10_js_price.js parts/11_js_misc.js parts/13_js_timeline.js parts/14_js_bench.js parts/15_js_iq.js parts/12_js_tabs.js; do echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo '</body></html>'; } > ../index.html

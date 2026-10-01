#!/bin/sh
# Assemble ../index.html from parts/ (HTML parts in order, then the scripts, tabs last)
cd "$(dirname "$0")"
{ cat parts/01_head.html parts/02_read_a.html parts/03_read_b.html parts/04_read_c.html parts/05_tabs.html parts/07_more.html
  echo '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>'
  cat parts/05z_errbox.js.html
  for f in parts/10_js_common.js parts/11_js_mla.js parts/12_js_attn.js parts/13_js_moe.js parts/14_js_misc.js parts/15_js_cache.js parts/18_js_mlx.js parts/20_js_pipe.js parts/21_js_r1.js parts/22_js_eplb.js parts/23_js_v41.js parts/24_js_cfg.js parts/90_js_tabs.js; do echo "<script>/* $(basename $f) */"; cat "$f"; echo '</script>'; done
  echo '</body></html>'; } > ../index.html

#!/bin/sh
# Reproduce every number on the page, rebuild it and run its checks. Run from anywhere.
#   sh run_all.sh            recompute, build, checks (python3 and node with html_utils' node_modules; no packages)
#   TRACE=1 sh run_all.sh    also re-trace the meta-device steps (uv, torch 2.14.1, transformers 5.18.0; about a minute)
#   M1=1 sh run_all.sh       also re-measure on the Apple M1 Pro GPU (MPS; about 2 minutes; the laptop must be quiet)
set -e
cd "$(dirname "$0")"
[ -n "$TRACE" ] && sh code/run_traces.sh
[ -n "$M1" ] && sh code/run_m1.sh
python3 recompute.py > /dev/null      # out/recompute.json; asserts formula = traced count
python3 code/gen_data.py              # parts/24_js_pmd.js
sh build.sh                           # ../index.html
python3 check/check_embed.py          # prose numbers = out/recompute.json; embedded data = recompute
PAGE="$(cd .. && pwd)"
cd ../../../../..                     # repo root
node "$PAGE/src/check/check_page.mjs" "$PAGE"
SHOTS="${SHOTS:-$PAGE/.shots}"; mkdir -p "$SHOTS"
node "$PAGE/src/check/check_ui.mjs" "$PAGE/index.html" "$SHOTS"

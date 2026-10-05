#!/bin/sh
# Recompute everything, rebuild the page and run its checks. Run from anywhere; needs python3 and node
# with html_utils' node_modules (cd html_utils && npm ci). No GPU or network needed.
set -e
cd "$(dirname "$0")"
python3 sim/systolic.py          # cycle-level reference, writes out/systolic_ref.json
python3 recompute.py > /dev/null # every derived number, writes out/recompute.json
sh build.sh                      # writes ../index.html
python3 check_embed.py           # prose and tables match out/recompute.json; animation = reference case 0
PAGE="$(cd .. && pwd)"
cd ../../../../..                # repo root
node "$PAGE/src/check_sim.mjs" "$PAGE"        # page JavaScript against the Python reference
SHOTS="${SHOTS:-$PAGE/.shots}"; mkdir -p "$SHOTS"
node "$PAGE/src/check_ui.mjs" "$PAGE/index.html" "$SHOTS"   # every control at 390 dark and 920 light

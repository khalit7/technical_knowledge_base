#!/bin/sh
# Reproduce every derived number on this page and check the page against it.
# 1. recompute.py (stdlib only): failure rates, the checkpoint model (exact, first-order, Monte Carlo; Aupy et al. Table 2),
#    power per chip and per gigawatt, cooling flows, the illustrative power-swing trace, energy per token.
#    Writes out/expected.json and parts/22_js_pw_data.js.
# 2. build.sh, then check_embed.py (embedded data and every hand-written number; private patterns).
# 3. From the repo root: node <this folder>/check/check_page.mjs (every control at 390 dark and 920 light; the page's JS engine
#    against out/expected.json; screenshots in ../.shots/own/).
set -e
cd "$(dirname "$0")"
python3 -B recompute.py
sh build.sh
python3 -B check_embed.py

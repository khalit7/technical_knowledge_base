#!/bin/sh
# Rebuild everything behind the OS simulators tab.
#   sh run_all.sh [--real] [path to an ostep-homework clone]
# --real re-runs the measurements in Docker (kb-os-lab:1); without it the recorded outputs in real/out are kept.
# Without a clone path, OSTEP's homework is cloned into a temporary directory (pinned commit afb36ca8).
set -e
cd "$(dirname "$0")"
if [ "$1" = "--real" ]; then sh real/run_real.sh; shift; fi
OSTEP="$1"
if [ -z "$OSTEP" ]; then
  OSTEP="$(mktemp -d)/ostep-homework"
  git clone -q https://github.com/remzi-arpacidusseau/ostep-homework.git "$OSTEP"
  git -C "$OSTEP" checkout -q afb36ca8ddbf81d847d18f6bd18a87f0a18667f2
fi
python3 make_ref.py
python3 check_ostep.py "$OSTEP"
node check_js.mjs
python3 gen_data.py
sh ../build.sh
python3 check_embed.py

#!/bin/sh
# Three runs of each mode (overlap, serial) of ddp_overlap.py. TORCHPY = a Python with torch 2.14.1 (outside the repo).
set -eu
cd "$(dirname "$0")"
mkdir -p out
for r in 1 2 3; do for m in overlap serial; do "$TORCHPY" ddp_overlap.py $m $r out; done; done
rm -f out/ddp_*_run0.json

#!/bin/sh
# Train, evaluate and export the whole toy suite, one model after another (2 threads each).
# About an hour of CPU on a laptop. Run in the background: sh run_all.sh > model/run_all.log 2>&1 &
set -e
cd "$(dirname "$0")"
R="uv run --with torch --with numpy python"
for s in s m l; do $R train.py pretrain $s; done
for s in s m l; do for f in 0.025 0.1 0.25; do $R train.py cross $s $f; done; done
$R train.py evalgen
$R train.py finetune
$R train.py cls_check
$R train.py cls_lowlr
$R train.py export
$R check_forward.py
python3 overlap.py
echo ALL DONE

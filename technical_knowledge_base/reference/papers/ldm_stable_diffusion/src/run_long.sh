#!/bin/sh
# After run_all.sh: the f = 4 model again, for as many steps as fit in the pixel model's training time (28,000 here).
cd "$(dirname "$0")"
until [ -f model/run_all_done.txt ]; do sleep 10; done
OMP_NUM_THREADS=2 DM_STEPS=${LONG_STEPS:-28000} EVAL_EVERY=4000 uv run --with torch --with numpy python train.py dm f4long > model/train_stdout_dm_f4long.txt 2>&1
OMP_NUM_THREADS=2 uv run --with torch --with numpy python train.py eval > model/eval_stdout.txt 2>&1
echo done > model/run_long_done.txt

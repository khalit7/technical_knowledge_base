#!/bin/sh
# Three full runs of measure_m1.py, one after another (the laptop is shared: the spread is reported).
# Usage from src/: MLXPY=<python with mlx 0.32.3> sh code/run_m1.sh
cd "$(dirname "$0")/../out" || exit 1
for r in 1 2 3; do "$MLXPY" ../code/measure_m1.py run_$r.json > run_$r.log 2>&1; done
echo ok > runs_done

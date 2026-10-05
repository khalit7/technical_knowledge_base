#!/bin/sh
# Three runs of measure.py on the M1 Pro GPU. MLXPY must point at a Python with mlx and numpy
# (built outside the repo; see ../README.md). Outputs in out/run_{1,2,3}.json and .log.
set -eu
cd "$(dirname "$0")"
for i in 1 2 3; do "$MLXPY" measure.py out/run_$i.json > out/run_$i.log 2>&1; sleep 20; done

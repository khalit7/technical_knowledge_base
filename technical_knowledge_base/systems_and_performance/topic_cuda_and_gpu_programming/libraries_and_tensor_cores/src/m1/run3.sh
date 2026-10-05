#!/bin/sh
# three runs of measure.py with the shared MLX env (outside the repo); PY points at its python
cd "$(dirname "$0")"
for i in 1 2 3; do "$PY" measure.py $i; done

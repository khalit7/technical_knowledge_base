#!/bin/sh
# Checker runs (pd_check.py, pd_rlcheck.py) with what the root lab's checkers and open-instruct's IFEval code need:
# $DC_SCRATCH/post/pylib (math-verify 0.8.0, antlr4 4.11.0, latex2sympy2_extended 1.11.0, langdetect 1.0.9),
# $DC_SCRATCH/pd/pylib (absl-py 2.3.1, immutabledict 4.2.1), NLTK punkt in $DC_SCRATCH/pd/nltk_data, the
# open-instruct clone (commit 72f46040) and the root's src/post (pt_checkers.py).
# usage: DC_SCRATCH=... PD_WORKERS=4 sh run_check.sh pd_check.py | pd_rlcheck.py
H=$(cd "$(dirname "$0")" && pwd)
POST=$(cd "$H/../../../src/post" && pwd)
S=${1:-pd_check.py}
OMP_NUM_THREADS=1 PYTHONDONTWRITEBYTECODE=1 NLTK_DATA="$DC_SCRATCH/pd/nltk_data" \
  PYTHONPATH="$DC_SCRATCH/pd/pylib:$DC_SCRATCH/post/pylib:$DC_SCRATCH/src/open-instruct:$POST" \
  HF_HOME="$DC_SCRATCH/hf" nice -n 15 "$DC_SCRATCH/venv/bin/python" -B "$H/$S"

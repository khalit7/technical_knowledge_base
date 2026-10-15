#!/bin/sh
# Checker lab run (pd_check.py) with the packages the root lab's checkers need on PYTHONPATH: $DC_SCRATCH/post/pylib
# (math-verify 0.8.0, antlr4 4.11.0, latex2sympy2_extended 1.11.0, langdetect 1.0.9) and the open-instruct clone
# (commit 72f46040), plus the root's src/post for pt_checkers.py. usage: DC_SCRATCH=... PD_WORKERS=4 sh run_check.sh
H=$(cd "$(dirname "$0")" && pwd)
POST=$(cd "$H/../../../src/post" && pwd)
OMP_NUM_THREADS=1 PYTHONDONTWRITEBYTECODE=1 PYTHONPATH="$DC_SCRATCH/post/pylib:$DC_SCRATCH/src/open-instruct:$POST" \
  HF_HOME="$DC_SCRATCH/hf" nice -n 15 "$DC_SCRATCH/venv/bin/python" -B "$H/pd_check.py" "$@"

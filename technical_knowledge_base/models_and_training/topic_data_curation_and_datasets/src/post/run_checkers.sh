#!/bin/sh
# Run the answer-checker comparison (pt_checkers.py) with the extra packages it needs on PYTHONPATH:
# $DC_SCRATCH/post/pylib (antlr4-python3-runtime 4.11.0, math-verify 0.8.0, latex2sympy2_extended 1.11.0,
# langdetect 1.0.9; see SETUP.md) and the open-instruct clone (commit 72f46040) for Tulu 3's verifier code.
# usage: DC_SCRATCH=... sh run_checkers.sh [model_answers.jsonl ...]
H=$(cd "$(dirname "$0")" && pwd)
OMP_NUM_THREADS=4 PYTHONDONTWRITEBYTECODE=1 PYTHONPATH="$DC_SCRATCH/post/pylib:$DC_SCRATCH/src/open-instruct" \
  nice -n 15 "$DC_SCRATCH/venv/bin/python" -B "$H/pt_checkers.py" "$@"

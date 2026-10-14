#!/bin/sh
# Quality lab runs waiting for the GPU queue (not run here: the machine is CPU-only for this topic).
# Run from the repo root with DC_SCRATCH set (see ../data/README.md). Each line: what, estimate.
set -e
cd "$(dirname "$0")"
PY="$DC_SCRATCH/venv/bin/python -B"
export HF_HOME=$DC_SCRATCH/hf OMP_NUM_THREADS=4
# 1) Perplexity under a modern small LM (Qwen3-0.6B, first 512 tokens) for all 2,617 run0 final documents,
#    to compare with CCNet's 5-gram Wikipedia perplexity (q_ccnet.py, already run on CPU).
#    Estimate: about 10 min on one Apple M1 Pro GPU (mps, bf16); measured CPU smoke test in out/q_ppl_smoke.json.
$PY q_ppl.py --set run0 --device mps
# 2) FineWeb-Edu classifier on all 50,000 rows of the FineWeb CC-MAIN-2024-30 sample (the agreement study at 25x the size).
#    Estimate: about 15 min on mps (CPU measured 0.14 s per document with 4 threads, so about 2 hours).
Q_DEVICE=mps $PY q_score.py fw50k
# then: $PY q_make_data.py  (rebuilds parts/33_js_q_0data.js)

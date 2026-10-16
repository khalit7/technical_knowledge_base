#!/bin/sh
# GPU queue for "Quality classifiers and data selection" (prefix qc).
# Status 2026-10-16:
#   Job 1 (Nemotron-CC graders and WebOrganizer classifiers on all 50,000 FineWeb rows, about 75 min): DROPPED by Khalid's
#     decision of 2026-10-15 (skip expensive runs that teach little); the page says "not run here" and cites the published tables.
#   Job 2 (Qwen3-1.7B perplexity on the root's 2,000 FineWeb rows): RUN 2026-10-16 on the M1 Pro GPU (about 15 min), with the
#     FineWeb-Edu classifier rescored on the same rows. Command kept for reproduction:
set -e
cd "$(dirname "$0")"
S=${S:?set S to the scratchpad}
export DC_SCRATCH=$S/dc INF=$S/inf HF_HOME=$S/dc/hf OMP_NUM_THREADS=2
sh "$INF/lock.sh" acquire bench qc 600
$DC_SCRATCH/venv/bin/python -B qc_qwen_ppl.py --device mps      # float16 weights, float32 log-softmax in chunks
sh "$INF/lock.sh" release bench qc
$DC_SCRATCH/venv/bin/python -B qc_refresh_pending.py              # adds the results to ../data without touching recorded values
sh ../build.sh

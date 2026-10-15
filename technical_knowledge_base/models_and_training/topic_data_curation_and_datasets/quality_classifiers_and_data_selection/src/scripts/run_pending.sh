#!/bin/sh
# GPU queue for "Quality classifiers and data selection" (prefix qc). Not run here: the GPU was booked by another topic.
# Run only when the GPU queue hands this page the bench lock. Needs DC_SCRATCH=<scratch>/dc (shared venv, data, models).
# The root's own pending runs (src/qual/run_pending.sh: Qwen3-0.6B perplexity on run0, FineWeb-Edu on 50,000 FineWeb rows)
# are NOT repeated here; job 1 reuses the same 50,000 rows so the two sets of scores line up row by row.
set -e
cd "$(dirname "$0")"
INF=${INF:-$DC_SCRATCH/../inf}
PY="$DC_SCRATCH/venv/bin/python -B"
export HF_HOME=$DC_SCRATCH/hf
sh "$INF/lock.sh" acquire bench qc 7200

# Job 1 (estimate about 75 min on an M1 Pro GPU with mps; CPU measured 0.22 to 0.45 s per document with 4 threads,
# so about 4 x 5 hours on CPU): the Mixtral and Nemotron-4 graders and WebOrganizer's topic and format classifiers on all
# 50,000 FineWeb CC-MAIN-2024-30 rows. Turns the topic, format and country tables of the Bias browser from 2,617 documents
# into 50,000 and lets the Nemotron-CC ensemble be bucketed on a crawl-sized sample.
for m in nemo_mixtral nemo_nemotron wo_topic wo_format; do QC_DEVICE=mps $PY qc_encoders.py $m fw50k; done

# Job 2 (estimate about 25 min on mps): Qwen3-1.7B perplexity, first 512 tokens, on the root's 2,000 FineWeb rows, to set a
# modern small LM beside Pythia-160M (measured here on CPU) and CCNet's 5-gram model.
QC_DEVICE=mps QC_LM="$INF/models/hf/Qwen3-1.7B" $PY qc_ppl.py fw2k

sh "$INF/lock.sh" release bench qc
# then: $PY qc_make_data.py && sh ../build.sh

#!/bin/sh
# The GPU runs this page still needs, in order. Run from this folder with RAG_SCRATCH set, when the coordinator gives
# a slot on the shared machine. Each step holds the bench lock (prefix emb) and touches it while it runs.
# Expected durations on the M1 Pro (MPS): e5 prefixes about 4 min, truncation sweep about 6 min, fine-tune about
# 18 trainings of 2 to 5 min each (one to one and a half hours); memory: one small model at a time (under 2 GB).
set -e
: "${RAG_SCRATCH:?set RAG_SCRATCH}"
PY="$RAG_SCRATCH/venv/bin/python -I -B"
LOCK="$RAG_SCRATCH/../inf/lock.sh"
cd "$(dirname "$0")"
memory_pressure | tail -1
uptime
sh "$LOCK" acquire bench emb 5
( while sleep 240; do sh "$LOCK" touch bench emb >/dev/null; done ) & TOUCH=$!
trap 'kill $TOUCH 2>/dev/null; sh "$LOCK" release bench emb' EXIT
$PY e_prefix.py e5                                   # e5-small-v2: query/passage prefixes, both sets
$PY e_long.py embed                                  # truncation sweep and wrong-pooling runs
$PY e_train.py inbatch bm25 dense dense_f --seeds 0,1,2 --epochs 2
$PY e_train.py inbatch8 inbatch128 --seeds 0,1,2 --epochs 2
kill $TOUCH 2>/dev/null; sh "$LOCK" release bench emb; trap - EXIT
uptime
# CPU, no lock: statistics, lab data, page
$PY e_ftstats.py
$PY e_lab.py
$PY e_choose.py                                      # unchanged inputs; reruns are identical
cd .. && python3 build_data.py && sh build.sh && $PY check_data.py

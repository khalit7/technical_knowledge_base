#!/bin/sh
# The GPU runs this page still needs, in order. Run from this folder with RAG_SCRATCH set, when the coordinator gives
# a slot on the shared machine. Each step holds the bench lock (prefix emb) and touches it while it runs.
# Expected: 18 trainings of 2 to 5 min each on an idle M1 Pro (estimate from FLOPs; not reached on 2026-10-15 because the
# machine was swapping heavily). Check `sysctl vm.swapusage` and `memory_pressure` first: it needs real free memory.
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
# done 2026-10-15: $PY e_prefix.py e5 ; $PY e_long.py embed
# one process per run: a long multi-run process hit an MPS out-of-memory on 2026-10-15
for v in inbatch bm25 dense dense_f inbatch8 inbatch128; do for s in 0 1 2; do
  $PY e_train.py $v --seeds $s --epochs 2
done; done
kill $TOUCH 2>/dev/null; sh "$LOCK" release bench emb; trap - EXIT
uptime
# CPU, no lock: statistics, lab data, page
$PY e_ftstats.py
$PY e_lab.py
$PY e_choose.py                                      # unchanged inputs; reruns are identical
cd .. && python3 build_data.py && sh build.sh && $PY check_data.py

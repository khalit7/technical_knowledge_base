#!/bin/sh
# colSmol-256M over the three ViDoRe sets on MPS, inside the shared bench lock (refreshed every 4 minutes).
# usage: sh run_colsmol.sh <ING_DIR> <scripts dir> <lock.sh>
I=$1; SD=$2; L=$3
$L acquire bench ing 7200 || exit 1
( while sleep 240; do $L touch bench ing >/dev/null; done ) & TP=$!
export HF_HOME=$I/hf HF_HUB_OFFLINE=1 PYTORCH_ENABLE_MPS_FALLBACK=1
for s in infovqa_test_subsampled arxivqa_test_subsampled syntheticDocQA_energy_test; do
  $I/cpenv/bin/python -I $SD/vidore_colsmol.py $I $s mps 2>&1 | grep -av "Loading weights\|pad_token\|Warning" | tail -3
done
kill $TP; $L release bench ing
$I/venv/bin/python -I $SD/vidore_eval.py $I infovqa_test_subsampled arxivqa_test_subsampled syntheticDocQA_energy_test
echo COLDONE

#!/bin/sh
# After the GPU runs: copy the logs, run the CPU analyses (inference only, 4 threads, low priority), write the 8-token
# router file for the root, then build. KB_SCRATCH is the shared scratch folder; LA_SCRATCH=$KB_SCRATCH/la.
# Usage (from the repo root): KB_SCRATCH=<scratch> sh technical_knowledge_base/models_and_training/topic_llm_architecture/mixture_of_experts/src/finish.sh [run ...]
HERE=$(cd "$(dirname "$0")" && pwd); export LA_SCRATCH=$KB_SCRATCH/la OMP_NUM_THREADS=4 MKL_NUM_THREADS=4
PY=$LA_SCRATCH/venv/bin/python
RUNS=${*:-"ref_baseline_s1500 mx_moe8top2 mx_moe16top3_shared mx_moe8top2_bias mx_moe8top2_none mx_moe8top2_sbias mx_moe8top2_cap1 mx_moe8top2_s1 mx_baseline_s1"}
python3 $HERE/runs/collect.py
for r in $RUNS; do
  [ -f "$LA_SCRATCH/runs/$r/ckpt.pt" ] || { echo "no checkpoint for $r"; continue; }
  [ -f "$HERE/analysis/out/$r.json" ] && [ "$HERE/analysis/out/$r.json" -nt "$LA_SCRATCH/runs/$r/ckpt.pt" ] && { echo "analysed $r"; continue; }
  while sh $KB_SCRATCH/tools/guard.sh | grep -q HIGH; do sleep 30; done
  nice -n 15 $PY $HERE/analysis/analyse.py $r
done
if [ -f "$LA_SCRATCH/runs/mx_moe8top2/ckpt.pt" ]; then
  nice -n 15 $PY $HERE/code/grad_check.py mx_moe8top2 3
  OMP_NUM_THREADS=1 nice -n 15 $PY $HERE/ep/ep_alltoall.py mx_moe8top2 3 4
  $PY $HERE/analysis/router_8tok.py
fi
sh $HERE/build.sh

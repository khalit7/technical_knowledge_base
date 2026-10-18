#!/bin/sh
# queue_mps.sh: the page's GPU jobs, run detached; waits for the shared bench lock (no agent waits with it).
# env: KB_SCRATCH (shared scratch with tools/), LA_SCRATCH (topic scratch). About 7 minutes per job on Apple M1 Pro (MPS).
# usage: nohup sh queue_mps.sh [job ...] > $LA_SCRATCH/fo/queue.log 2>&1 &
#   jobs: joint (MTP joint, seed 0), joint_s1 (seed 1), base_s1 (baseline control, seed 1),
#         base_flops (baseline at 1,980 steps = the MTP run's training FLOPs); all ran 2026-10-18
cd "$(dirname "$0")"
L=$KB_SCRATCH/tools/lock.sh; G=$KB_SCRATCH/tools/guard.sh; PY=$LA_SCRATCH/venv/bin/python
ENV="PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.35 OMP_NUM_THREADS=4"
for job in ${@:-joint}; do
  while sh $G | grep -q HIGH; do echo "guard HIGH $(date +%T)"; sleep 120; done
  case $job in
    joint) CMD="$PY train_mtp_joint.py --lam 0.3 --name fo_mtp_joint";;
    joint_s1) CMD="$PY train_mtp_joint.py --lam 0.3 --seed 1 --name fo_mtp_joint_s1";;
    base_s1) CMD="$PY ../../../src/data/train.py --preset baseline --seed 1 --name fo_base_s1 --no_ckpt";;
    base_flops) CMD="$PY ../../../src/data/train.py --preset baseline --steps 1980 --name fo_base_1980 --no_ckpt";;  # equal FLOPs: MTP adds 32%
  esac
  sh $L acquire bench fo 14400 && {
    ( while sleep 300; do sh $L touch bench fo; done ) & TP=$!
    env $ENV nice -n 15 $CMD
    kill $TP; sh $L release bench fo; }
done
echo "queue done $(date +%T)"

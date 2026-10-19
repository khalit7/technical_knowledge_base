#!/bin/sh
# Attention variants page: training queue 1 (detached). One run per bench-lock hold; skips runs that already have eval.json.
# Run: KB_SCRATCH=<scratch> nohup sh queue1.sh &   (about 8 x 7 min on Apple M1 Pro MPS)
S=${KB_SCRATCH:?set KB_SCRATCH to the shared scratch folder}
export LA_SCRATCH=$S/la
HERE=$(cd "$(dirname "$0")" && pwd)
PY=$S/la/venv/bin/python; LOCK=$S/tools/lock.sh; LOG=$S/la/av/queue1.log
ENVS="PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.35 OMP_NUM_THREADS=4 MKL_NUM_THREADS=4"
run() { name=$1; shift
  if [ -f $S/la/runs/$name/eval.json ]; then echo "skip $name" >>$LOG; return; fi
  while sh $S/tools/guard.sh | grep -q HIGH; do echo "$(date +%T) guard HIGH, waiting" >>$LOG; sleep 120; done
  sh $LOCK acquire bench av 7200 >>$LOG 2>&1 || { echo "$(date +%T) lock timeout $name" >>$LOG; return; }
  ( while sleep 300; do sh $LOCK touch bench av; done ) & TP=$!
  echo "$(date +%T) start $name $*" >>$LOG
  env $ENVS nice -n 15 $PY $HERE/av_train.py train --name $name --steps 1500 --time_budget 900 "$@" >>$LOG 2>&1
  env $ENVS nice -n 15 $PY $HERE/av_train.py eval $name >>$LOG 2>&1
  kill $TP; sh $LOCK release bench av >>$LOG 2>&1
  echo "$(date +%T) done $name" >>$LOG
  sleep 25
}
run av_mla_c128 --preset mla --set mla_kv_latent=128
run av_mla_r32 --preset mla --set mla_rope_dim=32
run av_sink --preset sink --set pos=rope
run av_gate --preset rope --gate
run av_swa16 --preset swa64 --set pos=rope window=16
run av_swa32 --preset swa64 --set pos=rope window=32
run av_swa128 --preset swa64 --set pos=rope window=128
run av_swa16_g3 --preset swa64_g3 --set pos=rope window=16
echo "$(date +%T) QUEUE DONE" >>$LOG

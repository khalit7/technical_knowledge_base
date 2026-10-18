#!/bin/sh
# Attention lab training queue (detached). One run per bench-lock hold.
S=${KB_SCRATCH:?set KB_SCRATCH to the shared scratch folder}
export KB_SCRATCH=$S LA_SCRATCH=$S/la
REPO=$(cd "$(dirname "$0")/../data" && pwd)
PY=$S/la/venv/bin/python; LOCK=$S/tools/lock.sh; LOG=$S/la/at/train_queue.log; BENCH_OUT=$REPO/../attn/out/decode_bench.json
bench() {
  if [ -f $BENCH_OUT ]; then echo "skip bench" >>$LOG; return; fi
  while sh $S/tools/guard.sh | grep -q HIGH; do echo "$(date +%T) guard HIGH, waiting" >>$LOG; sleep 120; done
  sh $LOCK acquire bench at 7200 >>$LOG 2>&1 || { echo "$(date +%T) lock timeout bench" >>$LOG; return; }
  echo "$(date +%T) start decode bench" >>$LOG
  PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.35 OMP_NUM_THREADS=4 MKL_NUM_THREADS=4 \
    nice -n 15 $PY $REPO/../attn/decode_bench.py >>$LOG 2>&1
  sh $LOCK release bench at >>$LOG 2>&1
  echo "$(date +%T) done bench" >>$LOG
}
run() { name=$1; shift
  if [ -f $S/la/runs/$name/eval.json ]; then echo "skip $name" >>$LOG; return; fi
  while sh $S/tools/guard.sh | grep -q HIGH; do echo "$(date +%T) guard HIGH, waiting" >>$LOG; sleep 120; done
  sh $LOCK acquire bench at 7200 >>$LOG 2>&1 || { echo "$(date +%T) lock timeout $name" >>$LOG; return; }
  ( while sleep 300; do sh $LOCK touch bench at; done ) & TP=$!
  echo "$(date +%T) start $name $*" >>$LOG
  PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.35 OMP_NUM_THREADS=4 MKL_NUM_THREADS=4 \
    nice -n 15 $PY $REPO/train.py --name $name --steps 1500 --time_budget 900 "$@" >>$LOG 2>&1
  PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.35 OMP_NUM_THREADS=4 \
    nice -n 15 $PY $REPO/eval.py $name >>$LOG 2>&1
  kill $TP; sh $LOCK release bench at >>$LOG 2>&1
  echo "$(date +%T) done $name" >>$LOG
}
run at_mha --preset rope
run at_gqa2 --preset gqa2 --set pos=rope
run at_mqa --preset mqa --set pos=rope
run at_mla --preset mla
run at_swa64 --preset swa64 --set pos=rope
bench
run at_mha_s1 --preset rope --seed 1
run at_mqa_s1 --preset mqa --set pos=rope --seed 1
run at_gqa4 --preset gqa4 --set pos=rope
run at_swa64_g3 --preset swa64_g3 --set pos=rope
run at_mla_s1 --preset mla --seed 1
echo "$(date +%T) QUEUE DONE" >>$LOG

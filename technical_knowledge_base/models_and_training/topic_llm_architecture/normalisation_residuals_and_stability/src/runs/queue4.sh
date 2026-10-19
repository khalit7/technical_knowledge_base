#!/bin/sh
# Normalisation page: training queue 4 (waits for queue 3) (detached). One run per bench-lock hold; skips runs whose log.json exists.
# Run: KB_SCRATCH=<scratch> nohup sh queue4.sh >/dev/null 2>&1 &   (about 5.5 min per run on Apple M1 Pro MPS)
S=${KB_SCRATCH:?set KB_SCRATCH to the shared scratch folder}
export LA_SCRATCH=$S/la
HERE=$(cd "$(dirname "$0")" && pwd)
PY=$S/la/venv/bin/python; LOCK=$S/tools/lock.sh; mkdir -p $S/la/ns; LOG=$S/la/ns/queue4.log
echo $$ > $S/la/ns/queue4.pid
ENVS="PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.35 OMP_NUM_THREADS=4 MKL_NUM_THREADS=4"
run() { name=$1; shift
  if [ -f $S/la/runs/$name/log.json ]; then echo "skip $name" >>$LOG; return; fi
  while sh $S/tools/guard.sh | grep -q HIGH; do echo "$(date +%T) guard HIGH, waiting" >>$LOG; sleep 120; done
  sh $LOCK acquire bench ns 7200 >>$LOG 2>&1 || { echo "$(date +%T) lock timeout $name" >>$LOG; return; }
  ( while sleep 300; do sh $LOCK touch bench ns; done ) & TP=$!
  echo "$(date +%T) start $name $*" >>$LOG
  env $ENVS nice -n 15 $PY $HERE/ns_train.py --name $name --steps 1500 "$@" >>$LOG 2>&1
  kill $TP; sh $LOCK release bench ns >>$LOG 2>&1
  echo "$(date +%T) done $name" >>$LOG
  sleep 25
}
while [ -f $S/la/ns/queue3.pid ] && kill -0 $(cat $S/la/ns/queue3.pid) 2>/dev/null; do sleep 30; done
run ns_sand_lr3e-3_qk --set norm_pos=sandwich qk_norm=True    # Gemma 3 pairs the sandwich with QK-norm
echo "$(date +%T) QUEUE DONE" >>$LOG
rm -f $S/la/ns/queue4.pid

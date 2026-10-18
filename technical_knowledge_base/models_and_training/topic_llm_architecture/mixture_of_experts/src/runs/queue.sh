#!/bin/sh
# The GPU queue that produced this page's runs (one run per bench-lock hold). KB_SCRATCH is the shared scratch folder
# with tools/lock.sh and tools/guard.sh; LA_SCRATCH=$KB_SCRATCH/la holds data/, runs/ and the venv.
# Lines of runs.txt: "name script preset train.py-arguments", script = fast (src/runs/fast_moe.py) or train (root train.py).
# Usage: KB_SCRATCH=<scratch> nohup sh src/runs/queue.sh src/runs/runs.txt > queue.log 2>&1 &
HERE=$(cd "$(dirname "$0")" && pwd); DATA=$(cd "$HERE/../../../src/data" && pwd)
export LA_SCRATCH=$KB_SCRATCH/la
LOCK=$KB_SCRATCH/tools/lock.sh; PY=$LA_SCRATCH/venv/bin/python
while read name script preset extra; do
  [ -z "$name" ] && continue
  [ -f "$LA_SCRATCH/runs/$name/log.json" ] && { echo "skip $name"; continue; }
  while sh $KB_SCRATCH/tools/guard.sh | grep -q HIGH; do sleep 60; done
  sh $LOCK acquire bench mx 5400 || continue
  ( while true; do sleep 300; sh $LOCK touch bench mx; done ) & TP=$!
  if [ "$script" = fast ]; then P=$HERE/fast_moe.py; else P=train.py; fi
  cd $DATA && PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.35 OMP_NUM_THREADS=4 MKL_NUM_THREADS=4 \
    nice -n 15 $PY $P --preset $preset --name $name $extra
  kill $TP; sh $LOCK release bench mx
done < "$1"

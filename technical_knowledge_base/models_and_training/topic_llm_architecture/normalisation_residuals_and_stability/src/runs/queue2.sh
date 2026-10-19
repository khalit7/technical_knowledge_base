#!/bin/sh
# Normalisation page: training queue 2 (waits for queue 1) (detached). One run per bench-lock hold; skips runs whose log.json exists.
# Run: KB_SCRATCH=<scratch> nohup sh queue2.sh >/dev/null 2>&1 &   (about 5.5 min per run on Apple M1 Pro MPS)
S=${KB_SCRATCH:?set KB_SCRATCH to the shared scratch folder}
export LA_SCRATCH=$S/la
HERE=$(cd "$(dirname "$0")" && pwd)
PY=$S/la/venv/bin/python; LOCK=$S/tools/lock.sh; mkdir -p $S/la/ns; LOG=$S/la/ns/queue2.log
echo $$ > $S/la/ns/queue2.pid
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
while [ -f $S/la/ns/queue1.pid ] && kill -0 $(cat $S/la/ns/queue1.pid) 2>/dev/null; do sleep 60; done
run ns_pre_lr3e-3_qk --set qk_norm=True
run ns_pre_lr1e-2_qk --lr 1e-2 --set qk_norm=True
run ns_sand_lr1e-2 --lr 1e-2 --set norm_pos=sandwich
run ns_out_lr1e-2 --lr 1e-2 --norm_pos output
run ns_post_lr1e-3 --lr 1e-3 --set norm_pos=post
run ns_post_lr3e-3_qk --set norm_pos=post qk_norm=True
run ns_rms_lr3e-3 --preset rmsnorm
run ns_rms_lr3e-3_s1 --preset rmsnorm --seed 1
run ns_pre_lr3e-3_s1 --seed 1
run ns_flat_lr3e-3 --init flat
run ns_pre_lr3e-2_c0_cap --lr 3e-2 --clip 0 --attn_softcap 50
# LayerNorm against RMSNorm, the operation alone, on MPS (seconds)
if [ ! -f $HERE/../out/normbench_mps.json ]; then
  sh $LOCK acquire bench ns 7200 >>$LOG 2>&1 && { env $ENVS nice -n 15 $PY $HERE/ns_normbench.py --device mps >>$LOG 2>&1; sh $LOCK release bench ns >>$LOG 2>&1; }
fi
echo "$(date +%T) QUEUE DONE" >>$LOG
rm -f $S/la/ns/queue2.pid

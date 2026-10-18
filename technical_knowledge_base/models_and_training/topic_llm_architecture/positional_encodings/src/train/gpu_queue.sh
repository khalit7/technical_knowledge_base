#!/bin/sh
# Positional Encodings child: equal-budget trainings of the position presets (1,500 steps, 12.3M tokens), one per lock hold.
cd <repo>/technical_knowledge_base/models_and_training/topic_llm_architecture/src/data
export LA_SCRATCH=$KB_SCRATCH/la KB_SCRATCH=$KB_SCRATCH PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.35 OMP_NUM_THREADS=4 MKL_NUM_THREADS=4
L=$KB_SCRATCH/tools/lock.sh; PY=$KB_SCRATCH/la/venv/bin/python
for job in "alibi pe_alibi 0" "nope pe_nope 0" "sinusoidal pe_sinusoidal 0" "rope pe_rope_s1 1" "baseline pe_learned_s1 1"; do
  set -- $job
  if [ -f $KB_SCRATCH/la/runs/$2/ckpt.pt ]; then echo "skip $2"; continue; fi
  while ! sh $L acquire bench pe 600; do echo "waiting $(date +%T)"; done
  ( while true; do sleep 300; sh $L touch bench pe; done ) & T=$!
  echo "start $2 $(date +%T)"
  nice -n 15 $PY train.py --preset $1 --steps 1500 --seed $3 --name $2 --time_budget 900
  kill $T; sh $L release bench pe
  echo "trained $2 $(date +%T)"
  nice -n 15 $PY eval.py $2 --device cpu > $KB_SCRATCH/la/pe/eval_$2.log 2>&1
  echo "evaluated $2 $(date +%T)"
  sleep 25
done
echo GPU DONE

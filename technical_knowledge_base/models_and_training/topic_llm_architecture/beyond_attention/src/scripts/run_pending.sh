#!/bin/sh
# Every run this page records, in order, with rough times on the Apple M1 Pro (MPS, fp32). Each GPU run takes the bench
# lock for itself. Set S to the shared scratch folder (holds la/venv, la/data, la/runs and tools/).
# Training (root src/data/train.py, about 15 min each for SSM presets):
#   train.py --preset ssm     --steps 1500 --time_budget 1500 --name ba_ssm        ; eval.py ba_ssm
#   train.py --preset ssm     --steps 1500 --time_budget 1500 --name ba_ssm_s1 --seed 1 ; eval.py ba_ssm_s1
#   train.py --preset hybrid  --steps 1500 --time_budget 1500 --name ba_hybrid     ; eval.py ba_hybrid
#   train.py --preset hybrid2 --steps 1500 --time_budget 1500 --name ba_hybrid2    ; eval.py ba_hybrid2
# MQAR (src/recall/mqar.py, 1 to 4 min each on MPS): models attn ssm16 ssm64 hybrid x pairs 8 32 64, --steps 8000 --lr 1e-3
# CPU probes: src/recall/tiny_recall.py (seconds), src/recall/pretrained_copy.py (about 20 min, downloads
#   state-spaces/mamba-130m-hf 1e76775f and EleutherAI/pythia-160m 50f5173d into ~/.cache/huggingface),
#   src/inside/ssm_inside.py (seconds), src/code/demos.py and quotes.py (seconds), src/state/state_rules.py, src/mem/statecalc.py.
# Then: LA_SCRATCH=$S/la python3 src/runs/collect.py; python3 src/make_page_data.py; python3 src/code/make_code_part.py; sh src/build.sh
set -e
: "${S:?set S to the scratch folder}"
export LA_SCRATCH=$S/la KB_SCRATCH=$S PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.35 OMP_NUM_THREADS=4
HERE=$(cd "$(dirname "$0")/.." && pwd); D=$HERE/../../src/data; PY=$S/la/venv/bin/python; L=$S/tools/lock.sh
for spec in "ssm ba_ssm 0" "ssm ba_ssm_s1 1" "hybrid ba_hybrid 0" "hybrid2 ba_hybrid2 0"; do set -- $spec
  [ -f $S/la/runs/$2/eval.json ] && continue
  sh $L acquire bench ba 7200 && { (cd $D && nice -n 15 $PY train.py --preset $1 --steps 1500 --time_budget 1500 --seed $3 --name $2 && nice -n 15 $PY eval.py $2); sh $L release bench ba; }
done
for p in 8 32 64; do for m in attn ssm16 ssm64 hybrid; do [ -f $HERE/recall/out/mqar/${m}_p$p.json ] && continue
  sh $L acquire bench ba 7200 && { (cd $HERE/recall && nice -n 15 $PY mqar.py --model $m --pairs $p --steps 8000 --lr 1e-3); sh $L release bench ba; }
done; done
cd $HERE/recall && nice -n 15 $PY tiny_recall.py && nice -n 15 $PY pretrained_copy.py

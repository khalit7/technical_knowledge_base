#!/bin/sh
# Runs this page needs, in order, with time estimates (Apple M1 Pro). Set S to the topic scratch folder first.
# GPU work only under the bench lock with both MPS watermark variables (see the root's src/data/README.md).
set -e
cd "$(dirname "$0")/.."
export LA_SCRATCH=$S/la KB_SCRATCH=$S OMP_NUM_THREADS=4
PY=$S/la/venv/bin/python; L=$S/tools/lock.sh
(cd kv && nice -n 15 $PY run_kv.py check && nice -n 15 $PY run_kv.py evict && nice -n 15 $PY key_channels.py)   # CPU, about 11 min
(cd kv && nice -n 15 $PY run_kv.py map)                                                                         # CPU, about 40 min
for job in "lc_pi_ft linear4" "lc_plain_ft plain"; do                                                           # MPS, about 1 to 2 min each
  sh $L acquire bench lc 3600 && { PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45 PYTORCH_MPS_LOW_WATERMARK_RATIO=0.35 nice -n 15 $PY past/finetune_long.py $job; sh $L release bench lc; }
done
(cd past && nice -n 15 $PY past_len.py)                                                                          # CPU, about 1 min
python3 wall/make_wall_data.py && sh build.sh && (cd ../../../../.. && node technical_knowledge_base/models_and_training/topic_llm_architecture/long_context/src/wall/check_wall.mjs technical_knowledge_base/models_and_training/topic_llm_architecture/long_context/index.html)
python3 make_page_data.py && sh build.sh && python3 check_data.py

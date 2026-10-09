#!/bin/sh
# Run the real-class replays for every trace and capacity, then check ref.py against them.
# Env: SG_PY (python with SGLang v0.5.21), VLLM_PY (python with vLLM v0.31.0 requirements), VLLM_SRC (vLLM source tree),
#      VLLM_MODEL_DIR (folder with Qwen3-0.6B's config.json), OUT (output folder).
set -e
cd "$(dirname "$0")"
export OMP_NUM_THREADS=1
for tr in chat agent unique rag; do for cap in 6000 12000 24000 48000 96000 1000000; do
  [ -s "$OUT/s_${tr}_${cap}.json" ] || "$SG_PY" real_sglang.py $tr $cap 1 > "$OUT/s_${tr}_${cap}.json" 2>/dev/null
  [ -s "$OUT/u_${tr}_${cap}.json" ] || "$SG_PY" real_unified.py $tr $cap > "$OUT/u_${tr}_${cap}.json" 2>/dev/null
  [ -s "$OUT/v_${tr}_${cap}.json" ] || VLLM_TARGET_DEVICE=cpu PYTHONPATH="$VLLM_SRC" "$VLLM_PY" real_vllm.py $tr $cap > "$OUT/v_${tr}_${cap}.json" 2>/dev/null
  echo "$tr $cap done"
done; done
python3 -I check_real.py "$OUT"

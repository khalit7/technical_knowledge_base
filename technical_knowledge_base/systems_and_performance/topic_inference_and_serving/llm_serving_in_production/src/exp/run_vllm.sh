#!/bin/sh
# vLLM 0.31.0 CPU (Docker, float32, Qwen3-0.6B) start-up timing, multi-LoRA and structured output.
# usage: INF_DIR=<scratch inf> LORA_DIR=<dir with lora1..8 PEFT folders> sh run_vllm.sh <out dir> <rep>

OUT=$1; r=$2; HERE=$(cd "$(dirname "$0")" && pwd); PORT=8166; mkdir -p "$OUT"
now() { python3 -c "import time;print(round(time.time(),3))"; }
MODS=""; for k in 1 2 3 4 5 6 7 8; do MODS="$MODS lora$k=/loras/lora$k"; done
T0=$(now)
docker run --rm -d --shm-size 1g --name pr-vllm -p 127.0.0.1:$PORT:8000 -v "$INF_DIR/models/hf/Qwen3-0.6B":/model:ro -v "$LORA_DIR":/loras:ro \
  vllm/vllm-openai-cpu:v0.31.0-arm64 --model /model --served-model-name base --dtype float32 --max-model-len 4096 --gpu-memory-utilization 0.6 \
  --enable-lora --max-loras 4 --max-lora-rank 16 --lora-modules $MODS > /dev/null || exit 1
docker logs -f pr-vllm > "$OUT/vllm_logf_r$r.txt" 2>&1 &
t=0; until curl -sf http://127.0.0.1:$PORT/health >/dev/null 2>&1; do sleep 0.25; t=$((t+1)); [ $t -gt 3600 ] && break; docker inspect pr-vllm >/dev/null 2>&1 || { echo "container exited"; exit 1; }; done
T1=$(now); echo "{\"docker_run\": $T0, \"healthy\": $T1}" > "$OUT/vllm_start_r$r.json"
curl -s http://127.0.0.1:$PORT/metrics > "$OUT/vllm_metrics_start_r$r.txt"
for m in base same distinct:4 distinct:8; do
  ENGINE=vllm python3 -I "$HERE/cl_client.py" $PORT $m 8 2 64 "$OUT/vllm_lora_$(echo $m | sed 's/://')_c8_r$r.json"
done
for m in free schema; do ENGINE=vllm python3 -I "$HERE/cl_client.py" $PORT $m 4 3 200 "$OUT/vllm_so_${m}_c4_r$r.json"; done
docker logs pr-vllm > "$OUT/vllm_log_r$r.txt" 2>&1
curl -s http://127.0.0.1:$PORT/metrics > "$OUT/vllm_metrics_end_r$r.txt"
docker stop pr-vllm > /dev/null; cp "$OUT/vllm_logf_r$r.txt" "$OUT/vllm_log_r$r.txt"

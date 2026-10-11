#!/bin/sh
# Multi-LoRA and structured-output runs on one llama-server (port 8163), Qwen3-0.6B Q4_K_M, 8 slots.
# usage: INF_DIR=<scratch inf> LORA_DIR=<dir with lora1..8.gguf> sh run_lora_so.sh <out dir> <repeats>

OUT=$1; REP=$2; HERE=$(cd "$(dirname "$0")" && pwd); PORT=8163
M=$INF_DIR/models/gguf/Qwen3-0.6B-Q4_K_M.gguf; mkdir -p "$OUT"
L=""; for k in 1 2 3 4 5 6 7 8; do L="$L${L:+,}$LORA_DIR/lora$k.gguf"; done
srv() { llama-server -m "$M" -ngl 99 -fa on -np 8 -c ${LCTX:-8192} --port $PORT --host 127.0.0.1 "$@" > "$OUT/srv.log" 2>&1 & SP=$!
  t=0; until curl -sf http://127.0.0.1:$PORT/health >/dev/null 2>&1; do sleep 0.5; t=$((t+1)); [ $t -gt 240 ] && return 1; done; return 0; }
stop() { kill $SP 2>/dev/null; while kill -0 $SP 2>/dev/null; do sleep 0.2; done; }
r=1; while [ $r -le $REP ]; do
  "$INF_DIR/lock.sh" touch bench pr >/dev/null
  srv || exit 1
  python3 -I "$HERE/cl_client.py" $PORT base 8 3 64 "$OUT/noadapters_c8_r$r.json"
  stop
  srv --lora "$L" --lora-init-without-apply || exit 1
  for m in base same distinct:2 distinct:4 distinct:8; do
    python3 -I "$HERE/cl_client.py" $PORT $m 8 3 64 "$OUT/lora_$(echo $m | sed 's/://')_c8_r$r.json"
  done
  python3 -I "$HERE/cl_client.py" $PORT same 1 3 64 "$OUT/lora_same_c1_r$r.json"
  python3 -I "$HERE/cl_client.py" $PORT base 1 3 64 "$OUT/lora_base_c1_r$r.json"
  for c in 1 4; do for m in free schema; do
    python3 -I "$HERE/cl_client.py" $PORT $m $c 5 200 "$OUT/so_${m}_c${c}_r$r.json"
  done; done
  curl -s http://127.0.0.1:$PORT/lora-adapters > "$OUT/lora_adapters.json"
  stop
  r=$((r+1))
done

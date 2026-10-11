#!/bin/sh
# Structured-output runs on a llama-server with no adapters loaded (port 8163), plus loaded-but-off adapters.
# usage: INF_DIR=<scratch inf> LORA_DIR=<dir with lora1..8.gguf> sh run_so.sh <out dir> <repeats>
OUT=$1; REP=$2; HERE=$(cd "$(dirname "$0")" && pwd); PORT=8163
M=$INF_DIR/models/gguf/Qwen3-0.6B-Q4_K_M.gguf; mkdir -p "$OUT"
L=""; for k in 1 2 3 4 5 6 7 8; do L="$L${L:+,}$LORA_DIR/lora$k.gguf"; done
srv() { llama-server -m "$M" -ngl 99 -fa on -np 8 -c 4096 --port $PORT --host 127.0.0.1 "$@" > "$OUT/srv_so.log" 2>&1 & SP=$!
  t=0; until curl -sf http://127.0.0.1:$PORT/health >/dev/null 2>&1; do sleep 0.5; t=$((t+1)); [ $t -gt 240 ] && return 1; done; return 0; }
stop() { kill $SP 2>/dev/null; while kill -0 $SP 2>/dev/null; do sleep 0.2; done; }
r=1; while [ $r -le $REP ]; do
  srv || exit 1
  for c in 1 4; do for m in free schema; do
    python3 -I "$HERE/cl_client.py" $PORT $m $c 5 200 "$OUT/so_${m}_c${c}_r$r.json"
  done; done
  stop
  srv --lora "$L" --lora-init-without-apply || exit 1
  python3 -I "$HERE/cl_client.py" $PORT zero 8 3 64 "$OUT/lora_zero_c8_r$r.json"
  stop
  r=$((r+1))
done

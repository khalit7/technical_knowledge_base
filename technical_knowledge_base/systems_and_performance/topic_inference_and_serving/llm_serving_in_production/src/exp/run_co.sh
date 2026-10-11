#!/bin/sh
# Coordinated omission: one llama-server (port 8164), the bench's load generator in closed and open loop,
# with and without a 5 s stall (SIGSTOP / SIGCONT of the server process we started, 15 s into the run).
# usage: INF_DIR=<scratch inf> LOADGEN=<path to loadgen.py> sh run_co.sh <out dir> <repeats>

OUT=$1; REP=$2; PORT=8164; M=$INF_DIR/models/gguf/Qwen3-0.6B-Q4_K_M.gguf; mkdir -p "$OUT"
llama-server -m "$M" -ngl 99 -fa on -np 4 -c ${LCTX:-8192} --port $PORT --host 127.0.0.1 > "$OUT/srv.log" 2>&1 & SP=$!
t=0; until curl -sf http://127.0.0.1:$PORT/health >/dev/null 2>&1; do sleep 0.5; t=$((t+1)); [ $t -gt 240 ] && exit 1; done
now() { python3 -c "import time;print(time.time())"; }
stall() { sleep 15; kill -STOP $SP; now > "$1"; sleep 5; kill -CONT $SP; now >> "$1"; }
r=1; while [ $r -le $REP ]; do
  "$INF_DIR/lock.sh" touch bench pr >/dev/null
  for st in no yes; do
    for mode in closed poisson; do
      if [ $mode = closed ]; then A="--mode closed --conc 2 --n 120"; else A="--mode poisson --rate 3 --n 120"; fi
      now > "$OUT/launch_${mode}_stall${st}_r$r.t"
      [ $st = yes ] && { stall "$OUT/stall_${mode}_r$r.t" & IP=$!; }
      python3 -I "$LOADGEN" --url http://127.0.0.1:$PORT --mode $mode $A --prompt-words 150 --max-tokens 48 --seed $r \
        --label "${mode}_stall$st" --out "$OUT/co_${mode}_stall${st}_r$r.json"
      [ $st = yes ] && wait $IP
    done
  done
  r=$((r+1))
done
kill $SP; while kill -0 $SP 2>/dev/null; do sleep 0.2; done

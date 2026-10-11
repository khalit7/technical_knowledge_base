#!/bin/sh
# Routing experiment: for each (policy, repeat), start N fresh llama-server replicas (empty caches),
# replay the trace through route_client.py, stop the replicas. Holds the shared bench lock.
# usage: INF_DIR=<scratch inf> sh run_route.sh <trace.json> <out dir> "<policies>" <repeats> [n_replicas] [cache_ram_mib]

TR=$1; OUT=$2; POL=$3; REP=$4; N=${5:-3}; CRAM=${6:-256}
HERE=$(cd "$(dirname "$0")" && pwd); P0=8160
M=$INF_DIR/models/gguf/Qwen3-0.6B-Q4_K_M.gguf
mkdir -p "$OUT/logs"
start() {
  PIDS=""
  i=0; while [ $i -lt $N ]; do
    llama-server -m "$M" -ngl 99 -fa on -np 2 -c ${CTX:-4096} --cache-ram "$CRAM" --metrics --port $((P0+i)) --host 127.0.0.1 \
      > "$OUT/logs/srv_$i.log" 2>&1 &
    PIDS="$PIDS $!"; i=$((i+1))
  done
  i=0; while [ $i -lt $N ]; do
    t=0; until curl -sf http://127.0.0.1:$((P0+i))/health >/dev/null 2>&1; do sleep 0.5; t=$((t+1)); [ $t -gt 240 ] && echo "replica $i failed" && return 1; done
    i=$((i+1))
  done
}
stop() { for p in $PIDS; do kill $p 2>/dev/null; done; for p in $PIDS; do while kill -0 $p 2>/dev/null; do sleep 0.2; done; done; }
r=${RSTART:-1}; while [ $r -lt $(( ${RSTART:-1} + REP )) ]; do
  for p in $POL; do
    "$INF_DIR/lock.sh" touch bench pr >/dev/null
    start || { stop; exit 1; }
    python3 -I "$HERE/route_client.py" "$TR" $p "$OUT/${p}_r${r}.json" $P0 $N $r
    i=0; while [ $i -lt $N ]; do curl -s http://127.0.0.1:$((P0+i))/metrics > "$OUT/logs/metrics_${p}_r${r}_$i.txt"; i=$((i+1)); done
    stop
  done
  r=$((r+1))
done

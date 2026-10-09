#!/bin/sh
# Chunked prefill on llama-server (Metal, M1 Pro): sweep the per-step token budget -b (= -ub) and record, for each,
# the long prompt's time to first token and the gaps the four decoding users see. Holds the shared bench lock.
# usage: INF_DIR=<scratch>/inf sh run_chunk.sh <model.gguf> <tag> "<budgets>" <reps>
I=${INF_DIR:?set INF_DIR}; H=$(cd "$(dirname "$0")" && pwd)
M=$1; tag=$2; budgets=${3:-"128 256 512 1024 2048 8192"}; reps=${4:-3}
R=$I/bk/results; mkdir -p $R; PORT=8131
load(){ sysctl -n vm.loadavg | tr -d '{}' | awk '{printf "[%s,%s,%s]", $1,$2,$3}'; }
[ -n "$HAVE_LOCK" ] || $I/lock.sh acquire bench bk 5400 || exit 1
for b in $budgets; do
  llama-server -m "$M" -ngl 99 -fa on -c 40960 -np 5 -b $b -ub $b --port $PORT --no-webui > $R/${tag}_b$b.server.log 2>&1 &
  sp=$!
  ok=0; for i in $(seq 1 300); do curl -sf http://127.0.0.1:$PORT/health >/dev/null 2>&1 && { ok=1; break; }; kill -0 $sp 2>/dev/null || break; sleep 1; done
  if [ $ok = 1 ]; then
    for r in $(seq 1 $reps); do
      lb=$(load)
      python3 -I $H/chunk_client.py --url http://127.0.0.1:$PORT --seed $r --out $R/${tag}_b${b}_r$r.json
      la=$(load)
      echo "{\"budget\":$b,\"rep\":$r,\"load_before\":$lb,\"load_after\":$la}" > $R/${tag}_b${b}_r$r.load.json
      $I/lock.sh touch bench bk >/dev/null
    done
    if [ "$b" = "512" ]; then python3 -I $H/chunk_client.py --url http://127.0.0.1:$PORT --no-long --seed 1 --out $R/${tag}_b${b}_nolong.json; fi
  else echo "server failed for b=$b"; tail -3 $R/${tag}_b$b.server.log; fi
  kill $sp 2>/dev/null; wait $sp 2>/dev/null
done
[ -n "$HAVE_LOCK" ] || $I/lock.sh release bench bk
echo done

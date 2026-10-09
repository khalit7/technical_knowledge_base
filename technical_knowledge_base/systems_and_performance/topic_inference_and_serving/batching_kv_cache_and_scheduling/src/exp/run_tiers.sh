#!/bin/sh
# KV tiers on llama-server (Metal, M1 Pro): recompute, resident in the slot, host prompt cache, file. Holds the bench lock.
# Two servers: the default prompt cache (--cache-ram 8192) and none (--cache-ram 0), so step 4 shows both outcomes.
# usage: INF_DIR=<scratch>/inf sh run_tiers.sh <model.gguf> <tag> <reps>
I=${INF_DIR:?set INF_DIR}; H=$(cd "$(dirname "$0")" && pwd)
M=$1; tag=$2; reps=${3:-3}
R=$I/bk/results; S=$I/bk/slots; mkdir -p $R $S; PORT=8132
load(){ sysctl -n vm.loadavg | tr -d '{}' | awk '{printf "[%s,%s,%s]", $1,$2,$3}'; }
[ -n "$HAVE_LOCK" ] || $I/lock.sh acquire bench bk 5400 || exit 1
for cr in 8192 0; do
  llama-server -m "$M" -ngl 99 -fa on -c 16384 -np 1 --cache-ram $cr --slot-save-path $S --port $PORT --no-webui > $R/${tag}_cr$cr.server.log 2>&1 &
  sp=$!
  ok=0; for i in $(seq 1 300); do curl -sf http://127.0.0.1:$PORT/health >/dev/null 2>&1 && { ok=1; break; }; kill -0 $sp 2>/dev/null || break; sleep 1; done
  if [ $ok = 1 ]; then
    for r in $(seq 1 $reps); do
      lb=$(load)
      python3 -I $H/tiers_client.py --url http://127.0.0.1:$PORT --rep $r --out $R/${tag}_cr${cr}_r$r.json
      la=$(load)
      echo "{\"cache_ram\":$cr,\"rep\":$r,\"load_before\":$lb,\"load_after\":$la}" > $R/${tag}_cr${cr}_r$r.load.json
      $I/lock.sh touch bench bk >/dev/null
    done
  else echo "server failed"; tail -3 $R/${tag}_cr$cr.server.log; fi
  kill $sp 2>/dev/null; wait $sp 2>/dev/null
done
for f in $S/bk_*.bin; do [ -f "$f" ] && echo "$(stat -f %z "$f") $(basename "$f")"; done > $R/${tag}_slotfiles.txt; rm -f $S/bk_*.bin
[ -n "$HAVE_LOCK" ] || $I/lock.sh release bench bk
echo done

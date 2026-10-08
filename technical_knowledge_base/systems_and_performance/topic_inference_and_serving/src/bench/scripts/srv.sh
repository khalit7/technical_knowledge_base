#!/bin/sh
# usage: srv.sh <tag> "<server command>" <health-url> "<loadgen arg sets separated by ;>"
# holds the bench lock; starts the server, waits for health, runs each loadgen arg set (each gets --out results/<tag>_<k>.json), stops the server.
. "$(dirname "$0")/env.sh"
tag=$1; scmd=$2; health=$3; sets=$4
$I/lock.sh acquire bench ibench 3600 >/dev/null || exit 1
sh -c "exec $scmd" > $R/$tag.server.log 2>&1 &
sp=$!
ok=0; for i in $(seq 1 600); do curl -sf "$health" >/dev/null 2>&1 && { ok=1; break; }; kill -0 $sp 2>/dev/null || break; sleep 1; done
if [ $ok = 1 ]; then
  echo "$scmd" > $R/$tag.server.cmd
  k=0
  echo "$sets" | tr ';' '\n' | while read -r a; do
    [ -z "$a" ] && continue
    k=$((k+1)); lb=$(load)
    python3 -I $I/ibench/loadgen.py $a --out $R/${tag}_$k.json
    la=$(load)
    python3 - "$R/${tag}_$k.json" "$lb" "$la" "$scmd" <<'PY'
import json,sys
p,b,a,s=sys.argv[1:]; d=json.load(open(p)); d['load_before']=json.loads(b); d['load_after']=json.loads(a); d['server_cmd']=s; json.dump(d,open(p,'w'))
PY
    $I/lock.sh touch bench ibench >/dev/null
  done
else echo "server failed to start"; tail -5 $R/$tag.server.log; fi
kill $sp 2>/dev/null; wait $sp 2>/dev/null
$I/lock.sh release bench ibench >/dev/null

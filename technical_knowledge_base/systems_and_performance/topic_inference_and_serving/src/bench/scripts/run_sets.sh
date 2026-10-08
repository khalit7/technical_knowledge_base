#!/bin/sh
# usage: run_sets.sh <tag> "<server description>" "<loadgen arg sets separated by ;>"  (server already running; caller holds the bench lock)
. "$(dirname "$0")/env.sh"
tag=$1; scmd=$2; sets=$3; k=${K0:-0}
echo "$scmd" > $R/$tag.server.cmd
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

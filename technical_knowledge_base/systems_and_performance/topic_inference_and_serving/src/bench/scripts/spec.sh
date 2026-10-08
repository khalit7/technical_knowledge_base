#!/bin/sh
# usage: spec.sh <label> <server args...>
. "$(dirname "$0")/env.sh"
label=$1; shift
$I/lock.sh acquire bench ibench 3600 >/dev/null || exit 1
b=$(load)
llama-server "$@" -ngl 99 -fa on -np 1 -c 4096 --port 18192 > $R/spec_$label.server.log 2>&1 & sp=$!
for i in $(seq 1 120); do curl -sf http://127.0.0.1:18192/health >/dev/null && break; sleep 1; done
python3 -I $I/ibench/spec_client.py http://127.0.0.1:18192 $R/spec_$label.json $label ${REPS:-3} | tail -4
kill $sp; wait $sp 2>/dev/null
a=$(load)
python3 -c "
import json; p='$R/spec_$label.json'; d=json.load(open(p)); d['server_args']='llama-server $* -ngl 99 -fa on -np 1 -c 4096'; d['load_before']=json.loads('$b'); d['load_after']=json.loads('$a'); json.dump(d,open(p,'w'))"
$I/lock.sh release bench ibench >/dev/null

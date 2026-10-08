#!/bin/sh
# usage: mb.sh <name> <mlx_lm benchmark args...>  (holds the bench lock; results/<name>.json)
. "$(dirname "$0")/env.sh"
name=$1; shift
$I/lock.sh acquire bench ibench 3600 >/dev/null || exit 1
before=$(load)
$I/mlxenv/bin/python -m mlx_lm benchmark "$@" > $R/$name.txt 2>&1
rc=$?
after=$(load)
$I/lock.sh release bench ibench >/dev/null
$I/mlxenv/bin/python - "$R/$name" "$before" "$after" "$rc" "$*" <<'PY'
import json,sys,re
p,before,after,rc,args=sys.argv[1:]
trials=[]
for line in open(p+'.txt'):
    m=re.match(r'Trial \d+:\s+(.*)',line)
    if m: trials.append({k:float(v) for k,v in (kv.split('=') for kv in m.group(1).split(', '))})
d={"name":p.rsplit('/',1)[1],"cmd":"python -m mlx_lm benchmark "+args,"load_before":json.loads(before),"load_after":json.loads(after),"rc":int(rc),"trials":trials}
json.dump(d,open(p+'.json','w'))
import statistics as st
for k in ("prompt_tps","generation_tps","peak_memory"):
    xs=[t[k] for t in trials]
    if xs: print(k, round(st.median(xs),2), 'min',round(min(xs),2),'max',round(max(xs),2))
print('load', d['load_before']['loadavg'], d['load_after']['loadavg'])
PY

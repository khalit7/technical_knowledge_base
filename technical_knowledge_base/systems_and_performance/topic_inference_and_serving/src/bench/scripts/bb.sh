#!/bin/sh
# usage: bb.sh <name> <llama-batched-bench args...>  (bench lock; results/<name>.json, one entry per repetition)
. "$(dirname "$0")/env.sh"
name=$1; shift; reps=${REPS:-3}
$I/lock.sh acquire bench ibench 3600 >/dev/null || exit 1
before=$(load)
: > $R/$name.jsonl
for r in $(seq 1 $reps); do llama-batched-bench "$@" --output-format jsonl 2>/dev/null | grep '^{' | sed "s/^{/{\"rep\":$r,/" >> $R/$name.jsonl; done
after=$(load)
$I/lock.sh release bench ibench >/dev/null
python3 - "$R/$name" "$before" "$after" "llama-batched-bench $*" <<'PY'
import json,sys,statistics as st
p,b,a,cmd=sys.argv[1:]
rows=[json.loads(l) for l in open(p+'.jsonl')]
json.dump({"name":p.rsplit('/',1)[1],"cmd":cmd,"load_before":json.loads(b),"load_after":json.loads(a),"rows":rows},open(p+'.json','w'))
keys=sorted({(r['pp'],r['tg'],r['pl']) for r in rows})
for k in keys:
    xs=[r for r in rows if (r['pp'],r['tg'],r['pl'])==k]
    print(k, 'S_TG', [round(x['speed_tg'],1) for x in xs], 'S_PP', [round(x['speed_pp'],1) for x in xs])
PY

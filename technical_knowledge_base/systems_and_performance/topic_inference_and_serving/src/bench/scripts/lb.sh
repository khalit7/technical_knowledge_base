#!/bin/sh
# usage: lb.sh <name> <llama-bench args...>   (holds the bench lock; writes results/<name>.json with load before/after)
. "$(dirname "$0")/env.sh"
name=$1; shift
$I/lock.sh acquire bench ibench 3600 >/dev/null || exit 1
before=$(load)
llama-bench "$@" -o json > $R/$name.raw.json 2> $R/$name.err
rc=$?
after=$(load)
$I/lock.sh release bench ibench >/dev/null
printf '{"name":"%s","cmd":"llama-bench %s -o json","load_before":%s,"load_after":%s,"rc":%s,"results":' "$name" "$*" "$before" "$after" "$rc" > $R/$name.json
cat $R/$name.raw.json >> $R/$name.json; echo '}' >> $R/$name.json; rm $R/$name.raw.json
python3 -c "
import json,sys; d=json.load(open('$R/$name.json'))
for r in d['results']: print(r['model_type'][:28], 'p',r['n_prompt'],'g',r['n_gen'],'d',r.get('n_depth',0),'fa',r.get('flash_attn'), round(r['avg_ts'],1),'+-',round(r['stddev_ts'],1))
print('load', d['load_before']['loadavg'], d['load_after']['loadavg'])"

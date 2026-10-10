#!/bin/sh
# usage: one.sh <tag> "<extra vllm serve args>" <kv GiB> "<loadgen args A>" ["<loadgen args B, in parallel>"] [patched 0|1]
# Needs INF_DIR (shared scratch folder with models/) and VL_WORK (this page's scratch folder); the caller holds the bench lock.
# Starts the CPU server on port 8110, saves /metrics before and after, scrapes every second, runs the loadgen, stops the server.
H=$(cd "$(dirname "$0")" && pwd); I=${INF_DIR:?}; W=${VL_WORK:?}; R=$W/knob; mkdir -p $R
LG=$H/../../../src/bench/scripts/loadgen.py
tag=$1; xa=$2; kv=$3; la=$4; lb=$5; patched=${6:-0}
P=""
if [ "$patched" = 1 ]; then
  VP=/opt/venv/lib/python3.12/site-packages/vllm
  for f in v1/core/block_pool.py v1/core/kv_cache_manager.py v1/metrics/loggers.py v1/metrics/stats.py; do
    P="$P -v $W/vllm/vllm/$f:$VP/$f:ro"; done
fi
name=vl-knob-$tag
load(){ sysctl -n vm.loadavg | tr -d '{}' | awk '{print "["$1","$2","$3"]"}'; }
lb0=$(load)
# wait until the previous run's container has released the port
for i in $(seq 1 120); do docker ps --format '{{.Ports}}' | grep -q ':8110->' || break; sleep 1; done
docker run -d --rm --name $name -p 8110:8000 --shm-size=2g -e VLLM_CPU_KVCACHE_SPACE=$kv $P \
  -v $I/models/hf/Qwen3-0.6B:/models/Qwen3-0.6B:ro vllm/vllm-openai-cpu:v0.31.0-arm64 \
  /models/Qwen3-0.6B --served-model-name qwen3-0.6b --dtype float32 --max-model-len 4096 $xa > /dev/null || exit 1
ok=0; for i in $(seq 1 600); do curl -sf http://127.0.0.1:8110/health >/dev/null 2>&1 && { ok=1; break; }; sleep 1; done
if [ $ok != 1 ]; then echo "$tag: server failed"; docker logs $name > $R/$tag.fail.log 2>&1; docker stop $name >/dev/null 2>&1; exit 1; fi
curl -s http://127.0.0.1:8110/metrics > $R/$tag.metrics_before.txt
docker exec $name ps -eo pid,ppid,rss,args > $R/$tag.ps.txt 2>&1
rm -f $R/$tag.stop; python3 -I $H/scrape.py http://127.0.0.1:8110 $R/$tag.scrape.jsonl $R/$tag.stop & sp=$!
python3 -I $LG --url http://127.0.0.1:8110 --model qwen3-0.6b $la --out $R/${tag}_A.json > $R/${tag}_A.log 2>&1 & pa=$!
if [ -n "$lb" ]; then python3 -I $LG --url http://127.0.0.1:8110 --model qwen3-0.6b $lb --out $R/${tag}_B.json > $R/${tag}_B.log 2>&1 & pb=$!; wait $pb; fi
wait $pa
touch $R/$tag.stop; wait $sp
curl -s http://127.0.0.1:8110/metrics > $R/$tag.metrics_after.txt
docker logs $name > $R/$tag.server.log 2>&1
docker stop $name >/dev/null 2>&1
la0=$(load)
python3 - "$R" "$tag" "$xa" "$kv" "$la" "$lb" "$lb0" "$la0" "$patched" <<'PY'
import json,sys
R,tag,xa,kv,la,lb,b,a,p=sys.argv[1:]
json.dump({"tag":tag,"serve_args":xa,"kv_gib":kv,"loadgen_A":la,"loadgen_B":lb,"loadavg_before":json.loads(b),"loadavg_after":json.loads(a),"patched":p=="1"},open(f"{R}/{tag}.meta.json","w"))
PY
echo "$tag done $(date +%T)"

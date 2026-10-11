#!/bin/sh
# usage: INF_DIR=... DD_WORK=... BIND=<VLLM_CPU_OMP_THREADS_BIND> sh vllm_tp.sh <tag> "<parallel args>" <run-index>   (caller holds the bench lock)
# Cores 0-3 of the Docker VM; BIND gives each worker its cores ("0-3" for one worker, "0-1|2-3" for two): vLLM's automatic
# binding needs one NUMA node per worker and refuses to start two workers on this single-node VM.
# vLLM v0.31.0 CPU server (4 CPUs) with one parallel layout; closed-loop load at 1 and 8 users with the bench load generator.
H=$(cd "$(dirname "$0")" && pwd); I=${INF_DIR:?}; W=${DD_WORK:?}; tag=$1; xa=$2; k=$3
LG=$H/../../../src/bench/scripts/loadgen.py
O=$W/out/vtp; mkdir -p $O; name=dd-tp-$tag-$k; T=$O/${tag}_$k
sysctl -n vm.loadavg > $T.load_before.txt
docker run -d --rm --name $name -p 8150:8000 --cpuset-cpus 0-3 --shm-size=4g -e VLLM_CPU_KVCACHE_SPACE=1 -e VLLM_CPU_OMP_THREADS_BIND=${BIND:?} \
  -v $I/models/hf/Qwen3-0.6B:/models/Qwen3-0.6B:ro vllm/vllm-openai-cpu:v0.31.0-arm64 \
  /models/Qwen3-0.6B --served-model-name q --dtype float32 --max-model-len 2048 $xa > /dev/null || exit 1
docker logs -f $name > $T.server.log 2>&1 & lp=$!
ok=0; for i in $(seq 1 600); do curl -sf http://127.0.0.1:8150/health >/dev/null 2>&1 && { ok=1; break; }; docker ps -q --filter name=$name | grep -q . || break; sleep 1; done
if [ $ok != 1 ]; then echo "$tag: server failed"; cp $T.server.log $T.fail.log; docker stop $name >/dev/null 2>&1; exit 1; fi
python3 -I $LG --url http://127.0.0.1:8150 --model q --mode closed --conc 1 --n 6 --prompt-words 300 --max-tokens 64 --seed $k --out $T.c1.json > $T.c1.log 2>&1
python3 -I $LG --url http://127.0.0.1:8150 --model q --mode closed --conc 8 --n 24 --prompt-words 300 --max-tokens 64 --seed $k --out $T.c8.json > $T.c8.log 2>&1
docker exec $name ps -eo pid,rss,args > $T.ps.txt 2>&1
docker stop $name >/dev/null 2>&1; wait $lp 2>/dev/null
sysctl -n vm.loadavg > $T.load_after.txt
echo "$tag $k done $(date +%T)"

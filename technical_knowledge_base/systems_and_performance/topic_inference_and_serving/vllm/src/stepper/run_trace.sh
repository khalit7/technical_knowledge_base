#!/bin/sh
# usage: run_trace.sh "<name> <nblocks> <prefix_caching 0|1> <budget>" ...   (needs INF_DIR, VL_WORK; caller holds the bench lock)
# Runs record.py inside the vLLM v0.31.0 CPU image for each scenario; raw output to $VL_WORK/trace/out_<name>.json.
H=$(cd "$(dirname "$0")" && pwd); I=${INF_DIR:?}; T=${VL_WORK:?}/trace; mkdir -p $T; cp $H/record.py $T/
for spec in "$@"; do
  set -- $spec; name=$1
  echo "== trace $name $(date +%T) load $(sysctl -n vm.loadavg)"
  docker run --rm --name vl-trace-$name --cpus 4 --shm-size=2g -e VLLM_CPU_KVCACHE_SPACE=1 \
    -v $I/models/hf/Qwen3-0.6B:/models/Qwen3-0.6B:ro -v $T:/work \
    --entrypoint python3 vllm/vllm-openai-cpu:v0.31.0-arm64 /work/record.py /work/out_$name.json "$@" > $T/log_$name.txt 2>&1
  echo "exit $? $(date +%T)"; tail -1 $T/log_$name.txt
  $I/lock.sh touch bench vl >/dev/null
done

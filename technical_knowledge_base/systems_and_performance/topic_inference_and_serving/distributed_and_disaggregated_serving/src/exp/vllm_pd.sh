#!/bin/sh
# usage: INF_DIR=<shared scratch> DD_WORK=<this page's scratch> sh vllm_pd.sh <run-index>   (the caller holds the bench lock)
# One container (vLLM v0.31.0 CPU image, 4 CPUs): prefill phase, decode phase (KV from the connector), baseline (no connector).
H=$(cd "$(dirname "$0")" && pwd); I=${INF_DIR:?}; W=${DD_WORK:?}; k=$1
O=$W/out/vpd/run$k; rm -rf $O; mkdir -p $O
sysctl -n vm.loadavg > $O/load_before.txt
docker run --rm --name dd-vpd-$k --cpus 4 --shm-size=2g -e VLLM_CPU_KVCACHE_SPACE=2 -e PYTHONDONTWRITEBYTECODE=1 -e VLLM_ENABLE_V1_MULTIPROCESSING=0 \
  -v $I/models/hf/Qwen3-0.6B:/models/Qwen3-0.6B:ro -v $H:/exp:ro -v $O:/out --entrypoint sh vllm/vllm-openai-cpu:v0.31.0-arm64 \
  -c 'for p in prefill decode baseline; do python3 /exp/vllm_pd.py $p /out > /out/$p.log 2>&1; tail -1 /out/$p.log; done; du -sb /out/kv; find /out/kv -name "*.safetensors" | head -3; find /out/kv -name "*.safetensors" | wc -l; ls -l $(find /out/kv -name "*.safetensors" | head -1)'
sysctl -n vm.loadavg > $O/load_after.txt

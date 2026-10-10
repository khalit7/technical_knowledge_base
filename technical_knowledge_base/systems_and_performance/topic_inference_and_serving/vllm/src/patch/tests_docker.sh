#!/bin/sh
# usage: tests_docker.sh <baseline|patched>   (needs VL_WORK with a v0.31.0 clone at $VL_WORK/vllm carrying the patch; caller holds the bench lock)
# Runs vLLM's own unit tests inside the v0.31.0 CPU image. "patched" overlays the four patched files on the installed package;
# the tests directory (with the new test) comes from the clone in both cases, so the new test must fail on baseline.
W=${VL_WORK:?}; mode=$1
VP=/opt/venv/lib/python3.12/site-packages/vllm
P=""
if [ "$mode" = patched ]; then
  for f in v1/core/block_pool.py v1/core/kv_cache_manager.py v1/metrics/loggers.py v1/metrics/stats.py; do
    P="$P -v $W/vllm/vllm/$f:$VP/$f:ro"; done
fi
T="tests/v1/core/test_prefix_caching.py tests/v1/core/test_scheduler.py tests/v1/metrics/test_stats.py"
docker run --rm --name vl-tests-$mode --cpus 2 $P -v $W/vllm/tests:/work/tests:ro -e PYTHONDONTWRITEBYTECODE=1 -e OMP_NUM_THREADS=2 \
  --entrypoint sh vllm/vllm-openai-cpu:v0.31.0-arm64 -c \
  "cd /work && (uv pip install -q pytest pytest-asyncio tblib 2>/dev/null || pip install -q pytest pytest-asyncio tblib) && python3 -c 'import vllm;print(vllm.__version__)' && python3 -m pytest -q -p no:cacheprovider $T 2>&1 | tail -60; python3 -m pytest -v -p no:cacheprovider tests/v1/core/test_prefix_caching.py::test_prefix_cache_stats_count_evicted_blocks tests/v1/core/test_prefix_caching.py::test_evict 2>&1 | tail -12" > $W/tests_$mode.txt 2>&1
echo "tests $mode done"; tail -3 $W/tests_$mode.txt

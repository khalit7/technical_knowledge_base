#!/bin/sh
# Start one SGLang server (native MLX backend, Apple M1 Pro) per configuration and run exp.py against it.
# Usage: run_m1.sh <experiment> <label> <repeat> -- <extra server flags>
# Env: SG_PY (venv python with SGLang v0.5.21 built from source, srt_mps extra, plus the two patches in
#      ../README.md), SG_MODEL (mlx-community style Qwen3-0.6B-4bit folder), SG_WIKI (WikiText-2 test raw), OUT (results dir), LOGS.
# Every server: SGLANG_USE_MLX=1, --disable-cuda-graph, port 8120, page size 1, chunked prefill 4096 (no prompt here is
# chunked: with chunks of 512, prefill batches mixing a chunked prompt with other requests crashed the MLX backend with a
# Metal out-of-memory error, every time, even with 6 GB free) and at most 8 running requests (the MLX backend gives every
# running request its own contiguous KV buffer of 4,096 tokens per layer, model_runner.py L258: 448 MiB for Qwen3-0.6B),
# plus the flags of the experiment. A run that fails (server crash) is retried once on a fresh server.
EXP=$1; LABEL=$2; REP=$3; shift 4
cd "$(dirname "$0")"
for attempt in 1 2; do
  LOG="$LOGS/${EXP}_${LABEL}_${REP}_a$attempt.log"
  SGLANG_USE_MLX=1 HF_HUB_OFFLINE=1 TOKENIZERS_PARALLELISM=false "$SG_PY" -m sglang.launch_server --model-path "$SG_MODEL" \
    --disable-cuda-graph --host 127.0.0.1 --port 8120 --enable-metrics --chunked-prefill-size 4096 --max-running-requests 8 "$@" > "$LOG" 2>&1 &
  PID=$!
  n=0; ready=1; until grep -q "fired up and ready" "$LOG"; do sleep 1; n=$((n+1)); if ! kill -0 $PID 2>/dev/null || [ $n -ge 300 ]; then ready=0; break; fi; done
  ok=0
  if [ $ready = 1 ]; then SG_PORT=8120 "$SG_PY" exp.py "$EXP" "$LABEL" "$OUT/${EXP}_${LABEL}_${REP}.json" && ok=1; curl -s 127.0.0.1:8120/metrics > "$OUT/${EXP}_${LABEL}_${REP}.metrics.txt" || true; fi
  CH=$(pgrep -P $PID)
  kill $PID 2>/dev/null; n=0; while kill -0 $PID 2>/dev/null && [ $n -lt 30 ]; do sleep 1; n=$((n+1)); done
  kill -9 $PID $CH 2>/dev/null
  while lsof -nP -iTCP:8120 -sTCP:LISTEN >/dev/null 2>&1; do sleep 1; done
  [ $ok = 1 ] && exit 0
  echo "attempt $attempt failed: $EXP $LABEL $REP"
done
exit 1

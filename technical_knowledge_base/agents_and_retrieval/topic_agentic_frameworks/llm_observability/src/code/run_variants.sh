#!/bin/sh
# Replays the recorded run once per instrumentation variant. Run from the fobs folder.
F=$(pwd)
AUTH="Basic $(printf 'pk-lf-fobs:sk-lf-fobs' | base64)"
for M in "$@"; do
  rm -rf runs/work; cp -R ../task_repo runs/work; rm -rf runs/v_$M
  curl -s -X POST 127.0.0.1:8492/reset >/dev/null
  echo "=== $M" >> runs/replay_requests.jsonl.marker; wc -l < runs/replay_requests.jsonl >> runs/replay_requests.jsonl.marker 2>/dev/null
  SCRIPT=code/agent.py; [ "$M" = pydantic_ai ] && SCRIPT=code/agent_pai.py
  WORK=$F/runs/work OUT=$F/runs/v_$M BASE_URL=http://127.0.0.1:8492/v1 MODEL=mlx-community/Qwen3-4B-Instruct-2507-4bit \
  LF_OTLP=http://127.0.0.1:3100/api/public/otel/v1/traces LF_AUTH="$AUTH" \
  LANGFUSE_PUBLIC_KEY=pk-lf-fobs LANGFUSE_SECRET_KEY=sk-lf-fobs LANGFUSE_HOST=http://127.0.0.1:3100 LANGFUSE_BASE_URL=http://127.0.0.1:3100 \
  env/bin/python $SCRIPT $M > runs/v_$M.out 2> runs/v_$M.err
  echo "$M exit $?"; tail -c 200 runs/v_$M.out; echo
done

#!/bin/sh
# GPU run for the Post-training data child page (prefix pd); run only with the bench lock.
# Needs: DC_SCRATCH=<scratch>/dc, INF=<scratch>/inf (models, lock.sh), the shared venv, llama.cpp's llama-server.
# Qwen3-4B (Q4_K_M GGUF, Metal) rates both answers of 300 UltraFeedback H4 pairs, each pair in both orders (600 calls,
# 4 in parallel, thinking off, at most 16 new tokens): position bias and agreement with GPT-4's label. About 30 minutes.
# Ran 2026-10-16. Two other jobs (local answers to OpenR1 problems; own delta pairs) were dropped as not worth the cost.
set -e
H=$(cd "$(dirname "$0")" && pwd)
G="$DC_SCRATCH/pd/gen"; mkdir -p "$G"
sh "$INF/lock.sh" acquire bench pd 600
llama-server -m "$INF/models/gguf/Qwen3-4B-Q4_K_M.gguf" -ngl 99 -c 24576 -np 4 -cram 0 --jinja --port 8099 > "$G/llama_q4.log" 2>&1 &
SRV=$!; trap 'kill $SRV 2>/dev/null; sh "$INF/lock.sh" release bench pd' EXIT
until curl -s http://127.0.0.1:8099/health | grep -q ok; do sleep 2; done
nice -n 15 "$DC_SCRATCH/venv/bin/python" -I -B "$H/pd_generate.py" judge "$G/judge_qwen3_4b.jsonl" 300 8099 Qwen3-4B-Q4_K_M 4
kill $SRV; trap - EXIT; sh "$INF/lock.sh" release bench pd
# CPU, a minute: summary, page data, page.
DC_SCRATCH=$DC_SCRATCH nice -n 15 "$DC_SCRATCH/venv/bin/python" -I -B "$H/pd_pending_sum.py"
DC_SCRATCH=$DC_SCRATCH HF_HOME=$DC_SCRATCH/hf nice -n 15 "$DC_SCRATCH/venv/bin/python" -I -B "$H/../build_data.py" --pending-only
sh "$H/../build.sh"

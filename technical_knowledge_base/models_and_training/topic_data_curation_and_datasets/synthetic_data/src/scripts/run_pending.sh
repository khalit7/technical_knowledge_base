#!/bin/sh
# GPU queue for the Synthetic data page (prefix sy). Run only when the GPU queue hands this page the bench lock.
# Needs: DC_SCRATCH=<scratch>/dc, INF=<scratch>/inf (models), the shared venv (dc/venv), llama.cpp (llama-server on PATH).
# Each job is resumable; outputs land in $DC_SCRATCH/syn/ and are folded into the page by src/build_data.py.
set -e
H=$(cd "$(dirname "$0")" && pwd)
PY="$DC_SCRATCH/venv/bin/python -I"
sh "$INF/lock.sh" acquire bench sy 7200

# Job 1 (estimate 1.5 to 2 hours on an M1 Pro GPU): rephrase 200 running-example documents in WRAP's four styles
# with Qwen3-4B (Q4_K_M GGUF, Metal), 800 generations of up to 450 tokens. Then the CPU analysis.
llama-server -m "$INF/models/gguf/Qwen3-4B-Q4_K_M.gguf" -ngl 99 -c 8192 -np 4 -cram 0 --jinja --port 8091 > "$DC_SCRATCH/syn/llama_server.log" 2>&1 &
SRV=$!; trap 'kill $SRV 2>/dev/null' EXIT
until curl -s http://127.0.0.1:8091/health | grep -q ok; do sleep 2; done
$PY "$H/run_rephrase.py" "$DC_SCRATCH/syn/rephrase_qwen3_4b.jsonl" 200 8091 Qwen3-4B-Q4_K_M 4
kill $SRV; trap - EXIT
sh "$INF/lock.sh" release bench sy   # release the GPU before the CPU analysis
OMP_NUM_THREADS=4 $PY "$H/analyze_rephrase.py" "$DC_SCRATCH/syn/rephrase_qwen3_4b.jsonl" "$DC_SCRATCH/syn/rephrase_stats.json"

# Job 2 (a GPT replace-vs-accumulate run) was dropped on 2026-10-15: it restated Gerstgrasser et al.'s published Table 2.

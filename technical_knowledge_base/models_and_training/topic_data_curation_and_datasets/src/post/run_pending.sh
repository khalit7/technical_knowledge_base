#!/bin/sh
# GPU queue for the root's Post-training data lab (prefix pt). Run only when the GPU queue hands this tab the bench lock.
# Needs: DC_SCRATCH=<scratch>/dc, INF=<scratch>/inf (models and lock.sh), the shared venv, llama.cpp (llama-server).
# Outputs land in $DC_SCRATCH/post/gen/; the last steps refresh src/post/out/*.json and parts/35_js_pt_0data.js.
set -e
H=$(cd "$(dirname "$0")" && pwd)
PY="$DC_SCRATCH/venv/bin/python -I -B"
mkdir -p "$DC_SCRATCH/post/gen"
sh "$INF/lock.sh" acquire bench pt 7200

# Job 1 (estimate 1 to 1.5 hours on an M1 Pro GPU; measured CPU rate on the loaded shared machine was 0.2 tokens/s, so
# it cannot run on CPU): Qwen3-1.7B (Q4_K_M GGUF, Metal) answers 500 GSM8K, 500 MATH and 500 IF prompts of Tulu 3's
# RLVR set (1,500 generations, at most 1,024 tokens each, 4 in parallel), then every answer checker on its answers.
llama-server -m "$INF/models/gguf/Qwen3-1.7B-Q4_K_M.gguf" -ngl 99 -c 16384 -np 4 --jinja --port 8098 \
  > "$DC_SCRATCH/post/gen/llama_gpu.log" 2>&1 &
SRV=$!; trap 'kill $SRV 2>/dev/null' EXIT
until curl -s http://127.0.0.1:8098/health | grep -q ok; do sleep 2; done
$PY "$H/pt_generate.py" "$DC_SCRATCH/post/gen/rlvr_qwen3_1.7b.jsonl" 500 8098 Qwen3-1.7B-Q4_K_M 4
kill $SRV; trap - EXIT
sh "$INF/lock.sh" release bench pt

# CPU (about 10 minutes): checkers on the generated answers, then the page data.
DC_SCRATCH=$DC_SCRATCH sh "$H/run_checkers.sh" "$DC_SCRATCH/post/gen/rlvr_qwen3_1.7b.jsonl"
DC_SCRATCH=$DC_SCRATCH PYTHONPATH="$DC_SCRATCH/post/pylib:$DC_SCRATCH/src/open-instruct" nice -n 15 "$DC_SCRATCH/venv/bin/python" -B "$H/pt_filter.py"
# Job 2 is the Synthetic data child's rephrasing job (synthetic_data/src/scripts/run_pending.sh, Job 1): when
# $DC_SCRATCH/syn/rephrase_qwen3_4b.jsonl exists, this picks it up instead of the 2-document smoke test.
OMP_NUM_THREADS=4 nice -n 15 $PY "$H/pt_rephrase.py"
$PY "$H/pt_make_data.py"
sh "$H/../build.sh"

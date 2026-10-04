#!/bin/sh
# Run the same model on the same first N GSM8K test items under lm-evaluation-harness and Inspect (inspect_evals),
# each harness with its own defaults, and keep the real logs. CPU, fp32, 2 threads.
# Usage: sh run_harnesses.sh <venv dir> <out dir> [N]
# The venv needs: lm-eval[hf], inspect-ai, inspect_evals, torch, transformers (see src/README.md).
set -e
VENV=$1; OUT=$2; N=${3:-10}
MODEL=$(ls -d ~/.cache/huggingface/hub/models--Qwen--Qwen2.5-0.5B-Instruct/snapshots/*/ | head -1)
export OMP_NUM_THREADS=2 MKL_NUM_THREADS=2 TOKENIZERS_PARALLELISM=false HF_HUB_DISABLE_TELEMETRY=1
mkdir -p "$OUT"
# 1. lm-evaluation-harness, task gsm8k as shipped (5-shot, raw prompt, no chat template), samples logged
date +%s > "$OUT/lmeval_t0"
"$VENV/bin/lm_eval" --model hf \
  --model_args "pretrained=$MODEL,dtype=float32" --device cpu \
  --tasks gsm8k --limit "$N" --batch_size 1 \
  --log_samples --output_path "$OUT/lmeval" > "$OUT/lmeval.log" 2>&1
date +%s > "$OUT/lmeval_t1"
# 2. Inspect, inspect_evals/gsm8k as shipped (10 shots in the system message, chat template applied by the hf provider).
#    Two departures from Inspect's hf defaults, both to match lm-eval: greedy decoding (the hf provider samples unless
#    do_sample=False) and fp32; max tokens 512 instead of the default 2048 to bound CPU time.
date +%s > "$OUT/inspect_t0"
"$VENV/bin/inspect" eval inspect_evals/gsm8k --model hf/local -M "model_path=$MODEL" -M device=cpu -M dtype=float32 \
  -M do_sample=False --limit "$N" --max-tokens 512 --log-dir "$OUT/inspect" --log-format json --display plain > "$OUT/inspect.log" 2>&1
date +%s > "$OUT/inspect_t1"
echo done

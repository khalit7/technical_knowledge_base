#!/bin/sh
# Trace one training step (forward + backward, batch 1) on the meta device for each case; writes out/trace_*.json.
# PY: a Python with torch and transformers, e.g. PY="uv run --no-project --with torch==2.14.1 --with transformers==5.18.0 python"
set -e
cd "$(dirname "$0")/.."
: "${PY:=uv run --no-project --with torch==2.14.1 --with transformers==5.18.0 python}"
export OMP_NUM_THREADS=2
L8=inputs/cfg_unsloth_Meta-Llama-3.1-8B.json; L70=inputs/cfg_unsloth_Meta-Llama-3.1-70B.json
for s in 2048 8192 32768 131072; do $PY code/trace_llama.py $L8 $s flash out/trace_l8_${s}_flash.json; done
$PY code/trace_llama.py $L8 8192 eager out/trace_l8_8192_eager.json
$PY code/trace_llama.py $L8 8192 flash out/trace_l8_8192_flash_ckpt.json 0 ckpt
$PY code/trace_llama.py $L70 8192 flash out/trace_l70_8192_flash.json

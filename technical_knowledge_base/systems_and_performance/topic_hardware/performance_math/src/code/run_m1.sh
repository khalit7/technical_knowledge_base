#!/bin/sh
# Three runs of the M1 Pro GPU training-step measurement, 20 s apart (the laptop is shared: spread and load are recorded).
set -e
cd "$(dirname "$0")/.."
: "${PY:=uv run --no-project --with torch==2.14.1 --with transformers==5.18.0 --with numpy python}"
for i in 1 2 3; do $PY code/m1_step.py inputs/cfg_unsloth_Meta-Llama-3.1-8B.json out/m1_run_$i.json 512,1024,2048 8; sleep 20; done

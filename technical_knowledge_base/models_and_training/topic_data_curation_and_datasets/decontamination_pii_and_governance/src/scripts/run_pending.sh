#!/bin/sh
# Pending GPU runs for the Decontamination, PII and data governance page. Run from the GPU queue (bench lock held by the
# caller), never while another topic's GPU job runs. Each writes to $DC_SCRATCH/data/dg/ and the page fills from it
# after `python3 build_data.py && sh build.sh`.
#   DC_SCRATCH  the shared dc setup folder;  INF_MODELS  the shared model folder (Qwen3 HF checkpoints)
# Both scripts were smoke-tested on CPU with --smoke (3 items) on 2026-10-15.
set -e
cd "$(dirname "$0")"
PY="$DC_SCRATCH/venv/bin/python -I -B"
case "$1" in
mink)   # Min-K% Prob, Min-K%++, loss and zlib on ~2,100 items x 2 (original and number-shifted), two models.
        # Estimate on the M1 Pro GPU: about 10 min (0.6B) + 15 min (1.7B).
  $PY dg_mink.py --model "$INF_MODELS/hf/Qwen3-0.6B" --device mps
  $PY dg_mink.py --model "$INF_MODELS/hf/Qwen3-1.7B" --device mps ;;
judge)  # LLM judge over the 300 most similar (test item, post-training prompt) pairs from dg_embed.py.
        # Estimate: about 10 min with Qwen3-1.7B on the M1 Pro GPU (the shared folder holds 4B only as GGUF/config) (prompt ~600 tokens, 4 new tokens per pair).
  $PY dg_judge.py --model "$INF_MODELS/hf/Qwen3-1.7B" --device mps --top 300 ;;
*) echo "usage: run_pending.sh mink|judge"; exit 1 ;;
esac

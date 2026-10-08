#!/bin/sh
# Rebuild everything the Serving simulator tab embeds, then run its checks.
# Needs: python3; node with html_utils' node_modules; for the vLLM comparison, a venv with
# torch and vLLM v0.31.0's requirements plus its source tree (see README.md), given as
# VLLM_PY (python), VLLM_SRC (source tree) and VLLM_MODEL_DIR (a folder with Qwen3-0.6B's config.json).
set -e
cd "$(dirname "$0")"
python3 check/make_cases.py
if [ -n "$VLLM_PY" ]; then (cd check && VLLM_TARGET_DEVICE=cpu PYTHONPATH="$VLLM_SRC" "$VLLM_PY" vllm_harness.py cases.json > ../out/vllm_check.json); fi
ADMIT=optimistic SKIP=0 python3 calibrate_h100.py > out/calib_h100_optimistic_0.log
python3 calibrate_m1.py
python3 mlperf_pred.py
python3 gen_data.py
sh ../build.sh
T=${TMPDIR:-/tmp}/isim_ref.json; python3 check/dump_ref.py "$T"; node check/check_core.mjs "$T"
python3 check/check_embed.py
node check/check_ui.mjs ../../index.html dark 390
node check/check_ui.mjs ../../index.html light 920

#!/bin/sh
# Reproduce every recorded output, rebuild the page, run the checks.
# Needs: Docker image kb-gpu-lab:1 (CUDA 13.4.2, Nsight Compute 2026.3.1), uv, an MLX Python as $MLXPY,
# and html_utils' node_modules (puppeteer) for the browser check. Run from src/.
set -e
cd "$(dirname "$0")"
UVR="uv run --no-project --with torch==2.14.1 --with numpy python"
docker run --rm --name prof6-ncu --cpus 2 --memory 3g -v "$PWD":/work kb-gpu-lab:1 sh /work/code/ncu_extract.sh > /dev/null 2>&1
docker run --rm --name prof6-mn --cpus 2 --memory 2g -v "$PWD":/work kb-gpu-lab:1 sh /work/code/check_metric_names.sh > /dev/null 2>&1
python3 code/parse_ncu.py
sh code/run_timing.sh                       # three runs on the M1 Pro GPU (torch MPS), a few minutes
$UVR code/numerics.py > out/numerics.log 2>&1
$UVR code/profile_torch.py > out/torch_profiler.log 2>&1
"${MLXPY:?set MLXPY to a Python with mlx}" code/atomics_mlx.py
$UVR code/reference.py
python3 code/summarize.py
sh build.sh
node check/check_js.mjs
python3 check/check_embed.py
(cd ../../../../.. && node technical_knowledge_base/systems_and_performance/topic_cuda_and_gpu_programming/profiling_and_correctness/src/check/check_page.mjs "${SHOTS:-/tmp/prof_shots}")

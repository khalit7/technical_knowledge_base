#!/bin/sh
# Writing kernels: reproduce every number on the page.
# 1) Three full runs of the Apple M1 Pro GPU measurements (needs a Python with mlx and numpy, outside the repo:
#    uv venv --python 3.12 <scratch>/mlxenv && uv pip install --python <scratch>/mlxenv/bin/python mlx numpy
#    then MLXPY=<scratch>/mlxenv/bin/python sh run_all.sh). About 5 minutes per run.
# 2) The CUDA kernels compiled for sm_80, sm_90a and sm_120 inside the kb-gpu-lab:1 image (Dockerfile in
#    ../../src/compile/image/), no GPU needed; stats extracted by cuda/sass_stats.py.
# 3) gen_data.py merges everything into parts/22_js_data.js; recompute.py derives every number the prose states and
#    writes it into the parts; tree_model.py and fa_model.py are the Python references for the two animated tabs;
#    the checks compare them with the page. The camp_*.json runs (power-of-two experiment) were made separately:
#    for i in 1 2 3; do $PY m1/measure.py m1/out/camp_$i.json camp; done
set -e
cd "$(dirname "$0")"
PY=${MLXPY:-python3}
if [ -z "$SKIP_M1" ]; then
  for i in 1 2 3; do
    PYTHONDONTWRITEBYTECODE=1 $PY m1/measure.py m1/out/run_$i.json > m1/out/run_$i.log 2>&1
    sleep 30
  done
fi
docker run --rm --name wk-cuda --cpus 2 --memory 4g -v "$PWD/cuda":/work kb-gpu-lab:1 sh /work/compile_all.sh > cuda/out/compile.log 2>&1
python3 cuda/sass_stats.py
python3 gen_data.py
python3 recompute.py --fill
python3 tree_model.py
python3 fa_model.py
sh build.sh
node check/check_js.mjs
python3 check/check_embed.py

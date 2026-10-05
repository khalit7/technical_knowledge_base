#!/bin/sh
# Kernel lab: reproduce every number on the tab.
# 1) Three full runs of the M1 Pro GPU measurements (needs a Python with mlx and numpy, built outside the repo:
#    uv venv --python 3.12 /some/scratch/mlxenv && uv pip install --python /some/scratch/mlxenv/bin/python mlx numpy
#    then MLXPY=/some/scratch/mlxenv/bin/python sh run_all.sh). About 3 minutes per run.
# 2) Triton: TRITON_INTERPRET=1 correctness on the CPU and compilation for sm_80 / sm_90a, inside the kb-gpu-lab:1
#    image (Dockerfile in ../compile/image/). No NVIDIA GPU is needed.
# 3) gen_data.py merges everything into ../parts/33_js_lab_0data.js and out/data.json; recompute.py is the
#    Python reference for every derived number the page shows (out/expected.json).
set -e
cd "$(dirname "$0")"
PY=${MLXPY:-python3}
for i in 1 2 3; do
  $PY code/lab_m1.py out/run_$i.json > out/run_$i.log 2>&1
  sleep 20
done
docker run --rm --name lab-triton --cpus 2 --memory 4g -v "$PWD":/work kb-gpu-lab:1 sh -c \
  'cd /work/triton && TRITON_INTERPRET=1 python3 interp_check.py > ../out/triton_interp.json && python3 compile_lab.py > ../out/triton_compile.log 2>&1'
python3 code/gen_data.py
python3 code/recompute.py

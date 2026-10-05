#!/bin/sh
# Roofline lab measurements on the Apple M1 Pro GPU, three full runs, then the data file for the page.
# Needs a Python with mlx and numpy: build one outside the repo, for example
#   uv venv --python 3.12 /some/scratch/mlxenv && uv pip install --python /some/scratch/mlxenv/bin/python mlx numpy
# then: MLXPY=/some/scratch/mlxenv/bin/python sh run_all.sh
set -e
cd "$(dirname "$0")"
PY=${MLXPY:-python3}
$PY -c "import mlx.core as mx, numpy, platform; print('mlx', mx.__version__, 'numpy', numpy.__version__, 'python', platform.python_version())" > out/versions.txt
for i in 1 2 3; do
  $PY code/roof_gpu.py out/run_$i.json > out/run_$i.log 2>&1
  sleep 20
done
python3 code/gen_data.py      # out/run_*.json + published specs -> ../parts/33_js_roof_0data.js
python3 code/recompute.py     # Python reference for every number the page computes

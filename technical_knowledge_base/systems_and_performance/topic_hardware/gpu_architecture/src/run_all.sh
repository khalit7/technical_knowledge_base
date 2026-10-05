#!/bin/sh
# Reproduce every measured and derived number on this page.
# 1. M1 Pro GPU microbenchmarks (needs a Python with mlx and numpy, built outside the repo, e.g.
#      uv venv --python 3.12 <scratch>/mlxenv && uv pip install --python <scratch>/mlxenv/bin/python mlx numpy
#    then MLXPY=<scratch>/mlxenv/bin/python sh run_all.sh). Three full runs, 20 s apart.
# 2. recompute.py: every derived number and the page's data file (stdlib only).
# 3. check_embed.py after sh build.sh: the page embeds exactly these outputs and the prose numbers match.
set -e
cd "$(dirname "$0")"
PY=${MLXPY:-python3}
if [ "${SKIP_MEASURE:-0}" != 1 ]; then
  $PY -c "import mlx.core as mx, numpy, platform; print('mlx', mx.__version__, 'numpy', numpy.__version__, 'python', platform.python_version())" > m1/out/versions.txt
  for i in 1 2 3; do
    $PY m1/gpu_micro.py m1/out/run_$i.json > m1/out/run_$i.log 2>&1
    sleep 20
  done
fi
python3 recompute.py
sh build.sh
python3 check_embed.py

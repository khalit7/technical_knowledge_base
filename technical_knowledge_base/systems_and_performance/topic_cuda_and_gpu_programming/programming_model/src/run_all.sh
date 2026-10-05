#!/bin/sh
# Reproduce everything for this page. Needs Docker with the kb-gpu-lab:1 image (Dockerfile in
# ../../src/compile/image/; CUDA 13.4.2, no GPU needed) and, for the M1 measurements, an MLX Python
# outside the repo: MLXPY=/path/to/python (mlx 0.32.3, numpy). SKIP_MEASURE=1 skips the M1 runs.
# PYVENV=<dir outside the repo> holds the Numba/CuPy venv used by py/run_py.sh (created if missing).
set -eu
cd "$(dirname "$0")"
docker run --rm --name pm-compile --cpus 3 --memory 4g -v "$PWD/cuda":/work kb-gpu-lab:1 sh compile_all.sh
python3 recompute.py                      # writes cuda/out/occ_cases.txt for the header check
docker run --rm --name pm-occ --cpus 1 --memory 1g -v "$PWD/cuda":/work kb-gpu-lab:1 sh -c \
  'cd /work && g++ -O2 -I/usr/local/cuda/include host/occ_suggest.cpp -o /tmp/occs && /tmp/occs > out/occ_nvidia.jsonl'
if [ -n "${PYVENV:-}" ]; then
  [ -x "$PYVENV/venv/bin/python" ] || docker run --rm --name pm-pyinst --cpus 2 --memory 4g -v "$PYVENV":/py kb-gpu-lab:1 sh -c \
    'python3 -m venv --system-site-packages /py/venv && /py/venv/bin/pip install "numba-cuda[cu13]" cupy-cuda13x "numpy<2.4"'
  docker run --rm --name pm-py --cpus 2 --memory 4g -v "$PWD/py":/work -v "$PYVENV":/py kb-gpu-lab:1 sh run_py.sh
fi
[ "${SKIP_MEASURE:-0}" = 1 ] || sh m1/run3.sh
python3 recompute.py
sh build.sh
python3 check_embed.py

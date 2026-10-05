#!/bin/sh
# Runs INSIDE kb-gpu-lab:1 with this folder at /work and a venv at /py/venv that has
# numba-cuda[cu13], cupy-cuda13x and numpy<2.4 (numba 0.68 still calls np.row_stack) (installed by ../run_all.sh into a scratch folder, not the repo).
cd /work
P=/py/venv/bin/python
$P -c "import numba, numba_cuda, json; print(json.dumps({'numba': numba.__version__, 'numba_cuda': numba_cuda.__version__}))" > out/versions.json 2>out/versions.err
NUMBA_ENABLE_CUDASIM=1 $P numba_sim.py > out/numba_sim.json 2> out/numba_sim.err
$P numba_ptx.py > out/numba_ptx.json 2> out/numba_ptx.err
$P cupy_raw.py > out/cupy_raw.json 2> out/cupy_raw.err
/opt/venv/bin/pip install -q ninja >/dev/null 2>&1; CUDA_HOME=/usr/local/cuda MAX_JOBS=2 /opt/venv/bin/python torch_ext.py > out/torch_ext.json 2> out/torch_ext.err
grep -n "^CUDA_HOME = " /opt/venv/lib/python3.12/site-packages/torch/utils/cpp_extension.py > out/torch_cuda_home.txt
echo pydone

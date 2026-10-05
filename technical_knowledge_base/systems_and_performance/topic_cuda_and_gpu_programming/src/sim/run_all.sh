#!/bin/sh
# GPU simulator tab: measurements on the Apple M1 Pro GPU (three full runs), the occupancy check
# against NVIDIA's own calculator, the Python reference, and the data file for the page.
# Needs a Python with mlx and numpy, built outside the repo, for example
#   uv venv --python 3.12 /some/scratch/mlxenv && uv pip install --python /some/scratch/mlxenv/bin/python mlx numpy
# then: MLXPY=/some/scratch/mlxenv/bin/python sh run_all.sh
# The occupancy check needs Docker and the kb-gpu-lab:1 image (see ../compile/image/Dockerfile).
set -e
cd "$(dirname "$0")"
PY=${MLXPY:-python3}
for i in 1 2 3; do
  $PY code/measure_m1.py out/run_$i.json > out/run_$i.log 2>&1
  sleep 20
done
python3 code/occ_cases.py > occ/cases.txt
docker run --rm --name cudasim-occ --cpus 2 --memory 2g -v "$PWD:/w" -w /w kb-gpu-lab:1 \
  sh -c 'g++ -O1 -I/usr/local/cuda/include occ/occ_check.cpp -o /tmp/occ_check && /tmp/occ_check > occ/occ_nvidia.csv'
python3 code/reference.py      # Python reference for every simulator; writes out/expected.json, checks occupancy
python3 code/gen_data.py       # out/*.json -> ../parts/31_js_sim_0data.js
sh ../build.sh
node code/check_js.mjs         # the page's JavaScript against out/expected.json
python3 code/check_embed.py    # the built page embeds out/data.json; prose numbers agree with the data (run after ../build.sh)
node code/check_ui.mjs         # every control at 390 px dark and 920 px light (puppeteer from html_utils)

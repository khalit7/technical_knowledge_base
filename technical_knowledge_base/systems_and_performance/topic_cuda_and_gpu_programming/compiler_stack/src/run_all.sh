#!/bin/sh
# Reproduce every recorded output in out/, then rebuild and check the page.
# Needs Docker with kb-gpu-lab:1 (../../src/compile/image/Dockerfile: CUDA 13.4.2, Triton 3.8.0, CPU torch 2.14.1) and
# kb-gpu-lab-cs7:1 (code/image/Dockerfile: the same plus Python headers for Inductor's C++). No GPU is used anywhere.
# run_tile.sh needs network access (pip install cuda-tile==1.6.0 inside a throw-away container).
set -e
cd "$(dirname "$0")"
docker build -q -t kb-gpu-lab-cs7:1 code/image > /dev/null
K="$PWD/../../src/compile/kernels"
docker run --rm --name cs7-nvcc  --cpus 2 --memory 4g -v "$PWD":/work -v "$K":/kern:ro kb-gpu-lab:1     sh /work/code/nvcc_stages.sh > /dev/null 2>&1   # out/nvcc/
docker run --rm --name cs7-nvrtc --cpus 2 --memory 2g -v "$PWD":/work                 kb-gpu-lab:1     sh /work/code/run_nvrtc.sh   > /dev/null 2>&1   # out/nvrtc/
docker run --rm --name cs7-tile  --cpus 2 --memory 3g -v "$PWD":/work                 kb-gpu-lab:1     sh /work/code/run_tile.sh    > /dev/null 2>&1   # out/tile/
docker run --rm --name cs7-tc    --cpus 2 --memory 4g -v "$PWD":/work                 kb-gpu-lab-cs7:1 sh /work/code/run_tc.sh      > out/tc_run.log 2>&1   # out/tc/
docker run --rm --name cs7-tc2   --cpus 2 --memory 4g -v "$PWD":/work                 kb-gpu-lab-cs7:1 sh /work/code/run_tc2.sh     > out/tc_run2.log 2>&1
head -8 ../../triton_and_gluon/src/out/ir/attn.sm_90a.ptx > inputs/triton_attn_sm_90a_ptx_head.txt 2>/dev/null || true   # from the Triton page's run_all.sh
python3 code/sass_decode.py      # out/sass.json (control bits decoded and checked)
python3 code/compat.py           # out/compat_expected.json
python3 code/build_data.py       # parts/22_js_data.js
sh build.sh
python3 check/check_embed.py
node check/check_js.mjs
echo "then, from the repo root: node <this folder>/check/check_ui.mjs and sh html_utils/checkpage.sh <page folder>"

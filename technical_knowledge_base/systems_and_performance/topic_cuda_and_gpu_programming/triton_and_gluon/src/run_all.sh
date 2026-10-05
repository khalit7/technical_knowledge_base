#!/bin/sh
# Reproduce every recorded output in out/ (needs Docker and the kb-gpu-lab:1 image, built from
# ../../src/compile/image/Dockerfile: CUDA 13.4.2 tools, Triton 3.8.0, CPU PyTorch 2.14.1). No GPU is used.
set -e
cd "$(dirname "$0")"
RUN="docker run --rm --cpus 2 --memory 4g -v $PWD:/work -w /work/code kb-gpu-lab:1"
$RUN env TRITON_INTERPRET=1 python interp_tg.py > /dev/null          # out/interp.json
$RUN python compile_tg.py all > /dev/null                             # out/compile.json, out/ir/
$RUN python gluon_tg.py > /dev/null                                   # out/gluon.json
$RUN python passes_tg.py > /dev/null                                  # out/passes.json
$RUN env TRITON_INTERPRET=1 TORCHINDUCTOR_CACHE_DIR=/tmp/ind python inductor_tg.py > /dev/null   # out/inductor/
python3 code/recompute.py                                            # out/expected.json
python3 code/build_data.py                                           # parts/22_js_data.js
sh build.sh
python3 check/check_embed.py
echo "now, from the repo root: node <this folder>/check/check_js.mjs and check/check_ui.mjs <shots dir>"

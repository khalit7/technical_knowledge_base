#!/bin/sh
# Reproduce everything for this page. Needs Docker with kb-gpu-lab:1 (CUDA 13.4.2, NCCL 2.31.2, no GPU needed),
# TORCHPY=<python with torch 2.14.1> and METALPY=<python with pyobjc-framework-Metal>, both outside the repo.
# SKIP_MEASURE=1 skips the CPU and M1 measurements and reuses the recorded outputs.
set -eu
cd "$(dirname "$0")"
docker run --rm --name sg8-compile --cpus 3 --memory 4g -v "$PWD/cuda":/work kb-gpu-lab:1 sh compile_all.sh
"$TORCHPY" torch/extract_source.py torch/out
if [ "${SKIP_MEASURE:-0}" != 1 ]; then
  sh torch/run3.sh
  "$TORCHPY" torch/ddp_profile.py torch/out
  sh m1/run3.sh
fi
python3 recompute.py
python3 fill_sgv.py
sh build.sh
python3 check_embed.py

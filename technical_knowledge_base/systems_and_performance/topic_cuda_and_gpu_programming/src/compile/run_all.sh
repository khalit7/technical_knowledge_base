#!/bin/sh
# Reproduce everything in this folder. Needs Docker and the kb-gpu-lab:1 image
# (Dockerfile in image/). No NVIDIA GPU is needed: nothing here runs on a GPU.
set -eu
cd "$(dirname "$0")"
docker run --rm --name cmp-compile --cpus 3 --memory 4g -v "$PWD":/work kb-gpu-lab:1 sh compile_all.sh
docker run --rm --name cmp-triton --cpus 3 --memory 4g -v "$PWD":/work kb-gpu-lab:1 sh -c 'cd /work/triton && python3 compile_triton.py > ../out/triton_compile.log 2>&1; TRITON_INTERPRET=1 python3 interp_check.py > ../out/triton_interp.json'
python3 build_data.py            # writes occ/cases.txt (and a first data file)
docker run --rm --name cmp-occ --cpus 1 --memory 1g -v "$PWD":/work kb-gpu-lab:1 sh -c 'cd /work && g++ -O2 -I/usr/local/cuda/include occ/occ_check.cpp -o /tmp/occ && /tmp/occ > out/occ_nvidia.json'
python3 build_data.py            # final data, with the NVIDIA occupancy cross-check
sh ../build.sh && python3 check_embed.py

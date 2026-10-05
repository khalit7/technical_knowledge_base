#!/bin/sh
# Reproduces every recorded output of this page, then rebuilds and checks it. From this src/ folder:
#   PY=<python of the shared MLX env> RAW=<scratch folder outside the repo> CUTLASS=<CUTLASS v4.8.0 checkout> sh run_all.sh
# Needs Docker with the image kb-gpu-lab:1 (CUDA 13.4.2; Dockerfile in ../../src/compile/image/), no GPU.
set -eu
cd "$(dirname "$0")"
H=$(pwd)
# 1. tensor-core, TMA and setmaxnreg kernels for eight targets (+ three newer ones), and the two host programs
python3 cuda/gen_kernels.py
docker run --rm --name lib5-cc --cpus 2 --memory 4g -v "$H/cuda":/work kb-gpu-lab:1 sh /work/compile_all.sh
docker run --rm --name lib5-x --cpus 2 --memory 3g -v "$H/cuda":/work kb-gpu-lab:1 sh /work/extra_targets.sh
docker run --rm --name lib5-host --cpus 2 --memory 3g -v "$H/cuda":/work kb-gpu-lab:1 sh /work/host/run_host.sh
python3 cuda/summarise.py
# 2. CuTe layouts printed by CuTe (C++), and the CuTe DSL in Python
docker run --rm --name lib5-cute --cpus 2 --memory 4g -v "$H":/work -v "$CUTLASS":/cutlass:ro kb-gpu-lab:1 \
  sh -c 'cd /work/cute && nvcc -std=c++17 -O1 -I/cutlass/include -o /tmp/layouts layouts.cu && /tmp/layouts > out/layouts.txt'
docker run --rm --name lib5-dsl --cpus 2 --memory 4g -v "$H/cute_dsl":/work -w /work kb-gpu-lab:1 \
  sh -c 'pip install -q nvidia-cutlass-dsl==4.8.0 && CUTE_DSL_ARCH=sm_90a python dsl_layouts.py > out/run.txt 2>&1; mv cutlass_launch_* out/ 2>/dev/null; rm -f out/*.cubin'
# 3. CUTLASS examples to SASS (SASS kept in $RAW: 0.4 to 3 MB each), summarised
mkdir -p "$RAW/cutlass_sass"
docker run --rm --name lib5-cutlass --cpus 2 --memory 5g -v "$H/cutlass_sass":/work -v "$CUTLASS":/cutlass:ro kb-gpu-lab:1 sh /work/compile_cutlass.sh
mv cutlass_sass/out/*.sass.txt "$RAW/cutlass_sass/"
python3 cutlass_sass/summarise.py "$RAW/cutlass_sass"
# 4. cuBLAS inventory (raw listings, ~15 MB, kept in $RAW)
cp cublas/opscan.sh "$RAW/opscan.sh"
docker run --rm --name lib5-blas --cpus 2 --memory 4g -v "$RAW":/o -v "$H/cublas":/s kb-gpu-lab:1 sh /s/scan.sh
python3 cublas/inventory.py "$RAW"
# 5. cuDNN frontend probe
docker run --rm --name lib5-cudnn --cpus 2 --memory 3g -v "$H/cudnn":/work -w /work kb-gpu-lab:1 \
  sh -c 'pip install -q nvidia-cudnn-frontend==1.30.0 nvidia-cudnn-cu13==9.27.0.42 && python probe.py > out/probe.txt 2>&1'
# 6. M1 measurements (3 runs), data, page, checks
PY="$PY" sh m1/run3.sh
node check/check_layouts.mjs
python3 recompute.py
sh build.sh
python3 check_embed.py
(cd ../../../../.. && sh html_utils/checkpage.sh technical_knowledge_base/systems_and_performance/topic_cuda_and_gpu_programming/libraries_and_tensor_cores && node technical_knowledge_base/systems_and_performance/topic_cuda_and_gpu_programming/libraries_and_tensor_cores/src/check/check_page.mjs)

#!/bin/sh
# Runs INSIDE the kb-gpu-lab:1 container (CUDA 13.4.2 toolkit, no GPU), with src/cuda mounted at /work.
# For every kernel file and target: cubin with the ptxas -v resource report, and SASS (cuobjdump).
set -u
cd /work
mkdir -p out
nvcc --version > out/nvcc_version.txt
for f in kernels/*.cu; do
  k=$(basename "$f" .cu)
  for a in sm_80 sm_90a sm_120; do
    c=$(echo "$a" | sed 's/^sm_/compute_/')
    o=out/${k}.${a}
    nvcc -std=c++17 -O3 -gencode arch=$c,code=$a -cubin -Xptxas -v -o /tmp/$k.$a.cubin "$f" > $o.ptxas.txt 2>&1
    echo "exit=$?" >> $o.ptxas.txt
    [ -s /tmp/$k.$a.cubin ] && cuobjdump -sass /tmp/$k.$a.cubin > $o.sass.txt 2>&1
  done
done
echo done

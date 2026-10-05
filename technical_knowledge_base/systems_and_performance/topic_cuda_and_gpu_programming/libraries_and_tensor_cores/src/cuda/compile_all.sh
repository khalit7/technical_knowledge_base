#!/bin/sh
# Runs INSIDE kb-gpu-lab:1 (CUDA 13.4.2, no GPU) with this folder mounted at /work.
# Every kernel for eight targets: ptxas -v report (or the error), SASS (cuobjdump), PTX.
# Failures are kept: which instruction assembles where is the point.
set -u
cd /work
mkdir -p out
nvcc --version > out/nvcc_version.txt
TARGETS="sm_80 sm_89 sm_90a sm_100a sm_100f sm_103a sm_120 sm_120a"
for f in kernels/*.cu; do
  k=$(basename "$f" .cu)
  for a in $TARGETS; do
    c=$(echo "$a" | sed 's/^sm_/compute_/')
    o=out/${k}.${a}
    nvcc -std=c++17 -O3 -gencode arch=$c,code=$a -cubin -Xptxas -v -o $o.cubin "$f" > $o.ptxas.txt 2>&1
    echo "exit=$?" >> $o.ptxas.txt
    if [ -s $o.cubin ]; then cuobjdump -sass $o.cubin > $o.sass.txt 2>&1; rm -f $o.cubin; fi
  done
  nvcc -std=c++17 -O3 -gencode arch=compute_100a,code=compute_100a -ptx -o out/${k}.ptx "$f" > /dev/null 2>&1 \
    || nvcc -std=c++17 -O3 -gencode arch=compute_90a,code=compute_90a -ptx -o out/${k}.ptx "$f" > /dev/null 2>&1 \
    || nvcc -std=c++17 -O3 -gencode arch=compute_120a,code=compute_120a -ptx -o out/${k}.ptx "$f" > /dev/null 2>&1 || true
done
echo done

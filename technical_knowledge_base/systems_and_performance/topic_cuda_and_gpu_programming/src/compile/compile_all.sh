#!/bin/sh
# Runs INSIDE the kb-gpu-lab:1 container (CUDA toolkit, no GPU needed), with this folder mounted at /work.
# For every kernel and target: PTX (with .loc line info), cubin, ptxas -v resource report,
# SASS (cuobjdump) and SASS with source lines (nvdisasm -g). Failures are kept: they teach too.
set -u
cd /work
mkdir -p out
nvcc --version > out/nvcc_version.txt
ARCHS="sm_80 sm_90a sm_100a sm_120"
for f in kernels/*.cu; do
  k=$(basename "$f" .cu)
  for a in $ARCHS; do
    c=$(echo "$a" | sed 's/^sm_/compute_/')
    o=out/${k}.${a}
    nvcc -std=c++17 -O3 -lineinfo -gencode arch=$c,code=$a -cubin -Xptxas -v -o $o.cubin "$f" > $o.ptxas.txt 2>&1
    echo "exit=$?" >> $o.ptxas.txt
    nvcc -std=c++17 -O3 -lineinfo -gencode arch=$c,code=$c -ptx -o $o.ptx "$f" > /dev/null 2>&1 || rm -f $o.ptx
    if [ -s $o.cubin ]; then
      cuobjdump -sass $o.cubin > $o.sass.txt 2>&1
      nvdisasm -gi -c $o.cubin > $o.sassline.txt 2>&1
    fi
  done
done
echo done
# a fat binary: one object carrying SASS for four targets plus PTX, as a library ships it
nvcc -std=c++17 -O3 -c kernels/k1_vadd.cu -o out/fat_vadd.o \
  -gencode arch=compute_80,code=sm_80 -gencode arch=compute_90a,code=sm_90a \
  -gencode arch=compute_100a,code=sm_100a -gencode arch=compute_120,code=[sm_120,compute_120]
cuobjdump -lelf -lptx out/fat_vadd.o > out/fat_vadd.list.txt 2>&1
echo fatdone

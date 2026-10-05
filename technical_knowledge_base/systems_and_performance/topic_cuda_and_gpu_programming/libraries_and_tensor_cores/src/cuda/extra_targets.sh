#!/bin/sh
# Runs INSIDE kb-gpu-lab:1: the Blackwell and Rubin family targets beyond the main eight, for the tcgen05,
# wgmma and FP4 kernels only: which of sm_107a (Rubin, per CUTLASS 4.8.0's changelog) and sm_110a accept them.
cd /work; mkdir -p out/extra
nvcc --list-gpu-arch > out/extra/list_gpu_arch.txt 2>&1
for k in i14_tcgen05_f16 i16_tcgen05_f8f6f4 i18_tcgen05_nvf4 i10_wgmma_f16_ss i07_mma_mxf4_blockscale i21_setmaxnreg; do
  for a in sm_107a sm_110a sm_121a; do
    c=$(echo $a | sed s/^sm_/compute_/)
    nvcc -std=c++17 -O3 -gencode arch=$c,code=$a -cubin -o /tmp/x.cubin kernels/$k.cu > out/extra/$k.$a.txt 2>&1
    echo "exit=$?" >> out/extra/$k.$a.txt
    if [ -s /tmp/x.cubin ]; then cuobjdump -sass /tmp/x.cubin | grep -oE "(UTC[A-Z]*MMA|OMMA|HGMMA|USETMAXREG)[.A-Z0-9x_]*" | sort | uniq -c >> out/extra/$k.$a.txt; fi
    : > /tmp/x.cubin
  done
done

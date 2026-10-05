#!/bin/sh
# Runs INSIDE kb-gpu-lab:1 (CUDA 13.4.2, no GPU) with src/cuda mounted at /work.
# Every kernel for four targets: ptxas -v report and SASS. Failures are kept: they teach too.
set -u
cd /work
mkdir -p out
nvcc --version | tail -2 > out/nvcc_version.txt
for f in kernels/p*.cu; do
  k=$(basename "$f" .cu)
  [ "$k" = p6_params ] && continue
  for a in sm_80 sm_90a sm_100a sm_120; do
    c=$(echo "$a" | sed 's/^sm_/compute_/')
    o=out/${k}.${a}
    nvcc -std=c++17 -O3 -gencode arch=$c,code=$a -cubin -Xptxas -v -o /tmp/$k.cubin "$f" > $o.ptxas.txt 2>&1
    echo "exit=$?" >> $o.ptxas.txt
    if [ -s /tmp/$k.cubin ]; then cuobjdump -sass /tmp/$k.cubin > $o.sass.txt 2>&1; rm -f /tmp/$k.cubin; fi
  done
done
# kernel-argument size limit: three sizes, sm_90a
for n in 4096 32756 32760; do
  nvcc -std=c++17 -O3 -DARGBYTES=$n -gencode arch=compute_90a,code=sm_90a -cubin -o /tmp/p6.cubin kernels/p6_params.cu > out/p6_params.$n.txt 2>&1
  echo "exit=$?" >> out/p6_params.$n.txt
done
# host programs: run here, where there is a toolkit but no GPU and no driver
nvcc -O2 -o /tmp/errors host/errors.cu && /tmp/errors > out/errors.txt 2>&1
nvcc -O2 -arch=sm_90a -o /tmp/first host/first_program.cu > out/first_program.txt 2>&1; echo "compile_exit=$?" >> out/first_program.txt
/tmp/first >> out/first_program.txt 2>&1; echo "run_exit=$?" >> out/first_program.txt
for c in cudaErrorAssert cudaErrorInvalidConfiguration cudaErrorLaunchOutOfResources cudaErrorIllegalAddress cudaErrorLaunchFailure cudaErrorCooperativeLaunchTooLarge; do
  awk -v c="$c" '/\/\*\*/{buf=""} {buf=buf $0 "\n"} $0 ~ c" +="{printf "%s", buf; exit}' /usr/local/cuda/include/driver_types.h
done > out/driver_types_excerpt.txt
[ -f out/occ_cases.txt ] && g++ -O2 -I/usr/local/cuda/include host/occ_suggest.cpp -o /tmp/occs && /tmp/occs > out/occ_nvidia.jsonl
echo done

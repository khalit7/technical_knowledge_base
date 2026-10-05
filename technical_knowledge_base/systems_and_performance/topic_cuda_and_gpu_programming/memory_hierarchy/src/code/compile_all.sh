#!/bin/sh
# Runs INSIDE the kb-gpu-lab:1 container (CUDA 13.4.2 toolkit, no GPU), with src/ mounted at /work:
#   docker run --rm --name cumem-cc --cpus 2 --memory 4g -v "$PWD":/work kb-gpu-lab:1 sh /work/code/compile_all.sh
# For every kernel and target: ptxas -v report and SASS. The register-cap sweep compiles m3 under several caps.
set -u
cd /work
mkdir -p out/cc
nvcc --version > out/cc/nvcc_version.txt
ARCHS="sm_80 sm_90a sm_120"
for f in kernels/m*.cu; do
  k=$(basename "$f" .cu)
  for a in $ARCHS; do
    c=$(echo "$a" | sed 's/^sm_/compute_/'); o=out/cc/${k}.${a}
    nvcc -std=c++17 -O3 -gencode arch=$c,code=$a -cubin -Xptxas -v -o /tmp/x.cubin "$f" > $o.ptxas.txt 2>&1
    echo "exit=$?" >> $o.ptxas.txt
    [ -s /tmp/x.cubin ] && cuobjdump -sass /tmp/x.cubin > $o.sass.txt 2>&1
    rm -f /tmp/x.cubin
  done
done
for cap in 32 64 96 128 160 192 224 255; do
  for a in $ARCHS; do
    c=$(echo "$a" | sed 's/^sm_/compute_/'); o=out/cc/regcap_${cap}.${a}
    nvcc -std=c++17 -O3 -gencode arch=$c,code=$a -cubin -maxrregcount=$cap -Xptxas -v -o /tmp/x.cubin kernels/m3_regcap.cu > $o.ptxas.txt 2>&1
    echo "exit=$?" >> $o.ptxas.txt; rm -f /tmp/x.cubin
  done
done
echo done > out/cc/done

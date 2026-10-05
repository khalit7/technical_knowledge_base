#!/bin/sh
# Recompile one kernel file inside kb-gpu-lab:1 (same flags as compile_all.sh). Usage: sh /work/code/compile_one.sh m5_const
cd /work; k=$1
for a in sm_80 sm_90a sm_120; do
  c=$(echo "$a" | sed 's/^sm_/compute_/'); o=out/cc/${k}.${a}
  nvcc -std=c++17 -O3 -gencode arch=$c,code=$a -cubin -Xptxas -v -o /tmp/x.cubin kernels/$k.cu > $o.ptxas.txt 2>&1
  echo "exit=$?" >> $o.ptxas.txt
  [ -s /tmp/x.cubin ] && cuobjdump -sass /tmp/x.cubin > $o.sass.txt 2>&1; rm -f /tmp/x.cubin
done

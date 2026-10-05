#!/bin/sh
# Runs INSIDE kb-gpu-lab:1 with /work = this page's src/. Builds and runs the NVRTC demo, then disassembles what it made.
set -eu
O=/work/out/nvrtc; rm -rf $O; mkdir -p $O; cd /work/code
g++ -O2 nvrtc_demo.cpp -I/usr/local/cuda/include -L/usr/local/cuda/lib64 -lnvrtc -o /tmp/nvrtc_demo
cd /work/code && /tmp/nvrtc_demo
for t in generic special4096; do cuobjdump -sass $O/$t.sm_90a.cubin > $O/$t.sm_90a.sass.txt; done
grep -n -E 'cudaErrorUnsupportedPtxVersion|cudaErrorNoKernelImageForDevice|cudaErrorJitCompilerNotFound|cudaErrorCallRequiresNewerDriver' -A0 -B3 /usr/local/cuda/include/driver_types.h | grep -v '^\-\-' > $O/error_enum.txt
cat /proc/loadavg > $O/loadavg.txt

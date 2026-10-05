#!/bin/sh
# Runs INSIDE kb-gpu-lab:1 with an output folder mounted at /o (outside the repo: the raw listings are ~10 MB).
# 1. every kernel text section in libcublasLt / libcublas (name and architecture);
# 2. for five architectures, which matrix and copy opcodes each libcublasLt kernel's SASS contains.
cd /o
L=/usr/local/cuda/lib64/libcublasLt.so.13.8.0.4
cuobjdump -lelf $L > lelf_lt.txt 2>&1
cuobjdump -ltext $L > ltext_lt.txt 2>&1
cuobjdump -ltext /usr/local/cuda/lib64/libcublas.so.13.8.0.4 > ltext_blas.txt 2>&1
sh /o/opscan.sh
# 3. kernel names that appear only as strings (CUTLASS 3.x naming), unique
strings -n 6 $L | grep -oE "cutlass3x_sm[0-9]+[a-z]?_[A-Za-z0-9_]+" | sort -u > cutlass3x_names.txt
# 4. the PTX shipped in the library (JIT-compiled by the driver at load time): kernel entries and matrix instructions per target
cuobjdump -ptx $L 2>/dev/null | awk '/^\.target/{t=$2} /\.entry /{e[t]++} /mma\.sync/{m[t]++} /wgmma/{w[t]++} /tcgen05\.mma/{c[t]++} END{for(k in e) print k, "entries", e[k], "mma.sync", m[k]+0, "wgmma", w[k]+0, "tcgen05", c[k]+0}' > ptx_summary.txt

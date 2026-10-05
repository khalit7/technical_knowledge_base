#!/bin/sh
# Runs INSIDE kb-gpu-lab:1 (CUDA 13.4.2, NCCL 2.31.2, no GPU, no driver) with src/cuda mounted at /work.
# Builds and runs every host program (the runs fail without a driver: that output is recorded too),
# dumps the SASS of the graph kernels, shows how the per-thread default stream changes the binary,
# and extracts the header lines the page quotes.
set -u
cd /work
mkdir -p out
nvcc --version | tail -2 > out/nvcc_version.txt
for k in s1_pipeline s2_graph s3_peer s4_nccl_overlap s5_default_stream; do
  L=""; [ "$k" = s4_nccl_overlap ] && L="-lnccl"
  nvcc -std=c++17 -O2 -arch=sm_90a -o /tmp/$k kernels/$k.cu $L > out/$k.build.txt 2>&1
  echo "compile_exit=$?" >> out/$k.build.txt
  if [ -x /tmp/$k ]; then /tmp/$k > out/$k.run.txt 2>&1; echo "run_exit=$?" >> out/$k.run.txt; fi
done
# SASS of the graph kernels (the device-side cudaGraphSetConditional), sm_90a and sm_100a
for a in sm_90a sm_100a; do
  c=$(echo "$a" | sed 's/^sm_/compute_/')
  nvcc -std=c++17 -O3 -gencode arch=$c,code=$a -cubin -Xptxas -v -o /tmp/s2.cubin kernels/s2_graph.cu > out/s2_graph.$a.ptxas.txt 2>&1
  echo "exit=$?" >> out/s2_graph.$a.ptxas.txt
  cuobjdump -sass /tmp/s2.cubin > out/s2_graph.$a.sass.txt 2>&1
done
nvcc -std=c++17 -O3 -arch=sm_90a -ptx -o out/s2_graph.sm_90a.ptx kernels/s2_graph.cu
# legacy vs per-thread default stream: which runtime entry points does the object call?
for m in legacy per-thread; do
  nvcc -std=c++17 -O2 -arch=sm_90a --default-stream $m -c -o /tmp/s5_$m.o kernels/s5_default_stream.cu
  nm -C /tmp/s5_$m.o | awk '$1=="U" && $2 ~ /^cuda/ {print $2}' | sort > out/s5_symbols.$m.txt
done
# header excerpts
H=/usr/local/cuda/include
{ echo "== driver_types.h: cudaGraphNodeType"; awk '/^enum __device_builtin__ cudaGraphNodeType/,/cudaGraphNodeTypeCount/' $H/driver_types.h | grep -E "cudaGraphNodeType[A-Za-z0-9]+ *=" | sed 's/^ *//' | cut -c1-110
  echo "== driver_types.h: cudaGraphConditionalNodeType"; awk '/^enum __device_builtin__ cudaGraphConditionalNodeType/,/^};/' $H/driver_types.h | grep -E "cudaGraphCondType" | sed 's/^ *//'
  echo "== driver_types.h: cudaStreamCaptureMode"; awk '/^enum __device_builtin__ cudaStreamCaptureMode/,/^};/' $H/driver_types.h | grep -E "cudaStreamCaptureMode[A-Za-z]+ *=" | sed 's/^ *//'
  echo "== driver_types.h: cudaGraphInstantiateFlags"; awk '/^enum __device_builtin__ cudaGraphInstantiateFlags/,/^};/' $H/driver_types.h | grep -E "cudaGraphInstantiateFlag[A-Za-z]+ *=" | sed 's/^ *,* *//' | cut -c1-60
  echo "== driver_types.h: cudaGraphExecUpdateResult"; awk '/^enum __device_builtin__ cudaGraphExecUpdateResult/,/^}/' $H/driver_types.h | grep -E "cudaGraphExecUpdate[A-Za-z]+ *=" | sed 's/^ *//' | cut -c1-150
  echo "== nccl.h version"; grep -E "#define NCCL_(MAJOR|MINOR|PATCH) " /usr/include/nccl.h
  echo "== nccl.h public entry points"; grep -oE "^ncclResult_t +nccl[A-Za-z]+" /usr/include/nccl.h | awk '{print $2}' | sort -u | tr '\n' ' '; echo
  echo "== nccl.h ncclConfig_t fields"; awk '/^typedef struct ncclConfig_v/,/} ncclConfig_t;/' /usr/include/nccl.h | grep -E "^ +(int|const char) " | sed 's/^ *//' | tr '\n' ' '; echo
  echo "== nccl_device headers"; ls /usr/include/nccl_device | tr '\n' ' '; echo
} > out/headers.txt
# environment variables the page names: are they in the NCCL library?
for v in NCCL_DEBUG NCCL_DEBUG_SUBSYS NCCL_ALGO NCCL_PROTO NCCL_P2P_DISABLE NCCL_SHM_DISABLE NCCL_IB_DISABLE NCCL_SOCKET_IFNAME NCCL_MIN_NCHANNELS NCCL_MAX_NCHANNELS NCCL_MIN_CTAS NCCL_MAX_CTAS NCCL_NVLS_ENABLE NCCL_CUMEM_ENABLE NCCL_LAUNCH_MODE NCCL_GRAPH_REGISTER NCCL_RAS_ENABLE NCCL_BLOCKING_WAIT NCCL_ASYNC_ERROR_HANDLING; do
  n=$(strings /usr/lib/aarch64-linux-gnu/libnccl.so.2 | grep -c -x -E "${v#NCCL_}|$v")
  echo "$v $n"
done > out/nccl_env_strings.txt
ls -l /usr/lib/aarch64-linux-gnu/libnccl.so.2* | awk '{print $5, $9}' > out/nccl_lib.txt
echo done

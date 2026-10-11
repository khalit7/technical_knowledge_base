#!/bin/sh
INF=$1; H=$INF/models/hf; L=$INF/src/llama.cpp-b11146
export OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1
mkdir -p $INF/lo/q
nice -n 19 $INF/sd/cenv/bin/python $L/convert_hf_to_gguf.py $H/Qwen3-1.7B --outtype f16 --outfile $INF/lo/q/Qwen3-1.7B-F16.gguf
echo rc=$?
# Qwen3-4B: same converter, hf/Qwen3-4B -> Qwen3-4B-F16.gguf (run with OMP_NUM_THREADS=1, nice 19)

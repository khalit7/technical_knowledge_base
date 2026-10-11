#!/bin/sh
# usage: INF=<scratch inf dir> convert.sh <python with torch, numpy, gguf-py>
# Converts the EAGLE-3, DFlash and DSpark drafts for Qwen3-4B to F16 GGUF with llama.cpp b11146's converter
# (single-threaded, low priority: it is mostly file I/O).
H=$INF/models/hf; G=$INF/models/gguf; L=$INF/src/llama.cpp-b11146; PY=$1
export OMP_NUM_THREADS=1 MKL_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1
for x in "Qwen3-4B_eagle3 Qwen3-4B-EAGLE3-F16" "Qwen3-4B-DFlash-b16 Qwen3-4B-DFlash-b16-F16" "dspark_qwen3_4b_block7 Qwen3-4B-DSpark-block7-F16"; do
  set -- $x
  [ -f $G/$2.gguf ] && continue
  nice -n 19 $PY $L/convert_hf_to_gguf.py $H/$1 --target-model-dir $H/Qwen3-4B --outtype f16 --outfile $G/$2.gguf || echo "FAILED $2"
  ls -la $G/$2.gguf
done

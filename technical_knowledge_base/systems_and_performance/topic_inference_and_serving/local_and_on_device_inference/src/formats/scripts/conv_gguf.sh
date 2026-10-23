#!/bin/sh
# Convert Qwen3-0.6B safetensors to GGUF with llama.cpp b11146's converter (bf16 twice, f16 once), time and hash each.
# Usage: INF_DIR=... PY=<python with torch, transformers, gguf-py 0.19.0> OUT=<scratch dir> sh conv_gguf.sh
set -e
SRC=$INF_DIR/src/llama.cpp-b11146
for run in bf16_a bf16_b f16; do
  t=${run%_*}
  s=$(python3 -c 'import time;print(time.time())')
  $PY $SRC/convert_hf_to_gguf.py $INF_DIR/models/hf/Qwen3-0.6B --outtype $t --outfile $OUT/conv_$run.gguf > $OUT/conv_$run.log 2>&1
  e=$(python3 -c 'import time;print(time.time())')
  echo "$run seconds=$(python3 -c "print(round($e-$s,2))") bytes=$(stat -f %z $OUT/conv_$run.gguf) sha256=$(shasum -a 256 $OUT/conv_$run.gguf | cut -c1-64) load=$(sysctl -n vm.loadavg)"
done

#!/bin/sh
I=$(cd "$(dirname "$0")/.." && pwd)
G=$I/models/gguf
while kill -0 60204 2>/dev/null; do sleep 3; done
[ -s $G/Qwen3-0.6B-BF16.gguf.part ] && [ $(stat -f %z $G/Qwen3-0.6B-BF16.gguf.part) = 1198182848 ] && mv $G/Qwen3-0.6B-BF16.gguf.part $G/Qwen3-0.6B-BF16.gguf && echo "got 0.6B BF16"
for q in F16 Q8_0 Q4_K_M; do [ -s $G/Qwen3-0.6B-$q.gguf ] || { llama-quantize $G/Qwen3-0.6B-BF16.gguf $G/Qwen3-0.6B-$q.gguf $q > $G/quantize-0.6B-$q.log 2>&1 && echo "quantized 0.6B $q"; }; done
dl(){ repo=$1; sha=$2; f=$3; [ -s "$G/$f" ] && { echo "have $f"; return; }
  curl -sSL --fail -C - -o "$G/$f.part" "https://huggingface.co/$repo/resolve/$sha/$f" && mv "$G/$f.part" "$G/$f" && echo "got $f $(date +%T)"; }
dl unsloth/Qwen3-1.7B-GGUF d7f544eead698dbd1f15126ef60b45a1e1933222 Qwen3-1.7B-Q4_K_M.gguf
HF_HOME=$I/hf $I/mlxenv/bin/python $I/ibench/dl_mlx.py $I 1
dl unsloth/Qwen3-1.7B-GGUF d7f544eead698dbd1f15126ef60b45a1e1933222 Qwen3-1.7B-Q8_0.gguf
dl Qwen/Qwen3-4B-GGUF bc640142c66e1fdd12af0bd68f40445458f3869b Qwen3-4B-Q4_K_M.gguf
echo ALLDONE $(date +%T)

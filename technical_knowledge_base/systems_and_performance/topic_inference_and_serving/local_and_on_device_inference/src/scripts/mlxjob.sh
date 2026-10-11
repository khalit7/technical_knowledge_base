#!/bin/sh
# usage: mlxjob.sh <INF>   (holds the bench lock) converts Qwen3-1.7B to MLX variants, scores them, benchmarks them
INF=$1; INF_DIR=$INF; . $INF/ibench/env.sh
PY=$INF/mlxenv/bin/python; H=$INF/models/hf/Qwen3-1.7B; D=$INF/lo/mlx; O=$INF/lo/runs/mlx; mkdir -p $D $O
export HF_HUB_OFFLINE=1
$INF/lock.sh acquire bench lo 5400 || exit 1
cv(){ n=$1; shift; [ -d $D/$n ] || $PY -m mlx_lm convert --hf-path $H --mlx-path $D/$n "$@" > $O/conv_$n.log 2>&1; }
cv bf16 --dtype bfloat16
cv 8bit -q --q-bits 8 --q-group-size 64
cv 6bit -q --q-bits 6 --q-group-size 64
cv 4bit -q --q-bits 4 --q-group-size 64
cv 4bit-g32 -q --q-bits 4 --q-group-size 32
cv 3bit -q --q-bits 3 --q-group-size 64
cv mxfp4 -q --q-mode mxfp4
cv mixed_3_6 -q --quant-predicate mixed_3_6
du -sk $D/* > $O/sizes.txt
for n in bf16 8bit 6bit 4bit 4bit-g32 3bit mxfp4 mixed_3_6; do ls -l $D/$n/*.safetensors | awk '{s+=$5} END {print "'$n'", s}'; done > $O/bytes.txt
echo "{\"before\":$(load)," > $O/q.load
$PY $INF/lo/mlxq.py $INF/lo/tmp/wiki_ids.txt 40 $O/quality.json $D/bf16 $D/8bit $D/6bit $D/4bit $D/4bit-g32 $D/3bit $D/mxfp4 $D/mixed_3_6 $INF/models/mlx/Qwen3-1.7B-4bit > $O/quality.log 2>&1
echo "\"after\":$(load)}" >> $O/q.load
$INF/lock.sh touch bench lo
for n in bf16 8bit 6bit 4bit 4bit-g32 3bit mxfp4 mixed_3_6; do
  b=$(load); $PY -m mlx_lm benchmark --model $D/$n -p 512 -g 128 -n 5 > $O/bench_$n.txt 2>&1; a=$(load)
  echo "{\"before\":$b,\"after\":$a}" > $O/bench_$n.load
done
$INF/lock.sh release bench lo
echo done > $O/DONE

#!/bin/sh
# usage: speedpass.sh <INF> <tag> <pass> <base.gguf> <imatrix.gguf> ITEM...  re-measures llama-bench speed only (requantizing if the file is gone), under the bench lock
INF=$1; TAG=$2; PASS=$3; BASE=$4; IMX=$5; shift 5
INF_DIR=$INF; . $INF/ibench/env.sh
O=$INF/lo/runs/speed/$TAG/p$PASS; Q=$INF/lo/q; mkdir -p $O
$INF/lock.sh acquire bench lo 5400 >/dev/null || exit 1
b=$(load); llama-bench -m $BASE -p 512 -n 128 -r 5 -ngl 99 -fa 1 -o json > $O/F16.bench.json 2>/dev/null; echo "{\"before\":$b,\"after\":$(load)}" > $O/F16.load
for it in "$@"; do
  $INF/lock.sh touch bench lo >/dev/null
  T=${it%+i}; IM=""; [ "$T" != "$it" ] && IM="--imatrix $IMX"
  F=$Q/$TAG-$it.gguf; made=0
  [ -f $F ] || { llama-quantize $IM $BASE $F $T 8 > /dev/null 2>&1; made=1; }
  b=$(load); llama-bench -m $F -p 512 -n 128 -r 5 -ngl 99 -fa 1 -o json > $O/$it.bench.json 2>/dev/null; echo "{\"before\":$b,\"after\":$(load)}" > $O/$it.load
  [ $made = 1 ] && rm -f $F
done
$INF/lock.sh release bench lo >/dev/null
echo done > $O/DONE

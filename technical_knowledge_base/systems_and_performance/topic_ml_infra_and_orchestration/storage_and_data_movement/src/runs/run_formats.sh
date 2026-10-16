#!/bin/sh
# Storage and data movement: checkpoint formats (DCP metadata, safetensors, DCP's safetensors writer) and resharding reads.
# Native on the Mac (torchrun, gloo, 1 thread per rank, nice 15).
# usage: OUT=<raw dir> SCR=<scratch dir> PY=<venv python> DATA=<input.txt> STLIB=<dir with safetensors> sh run_formats.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
TRAIN=$HERE/../../../src/data/train/train.py
TR="nice -n 15 env OMP_NUM_THREADS=1 PYTHONPATH=$STLIB $(dirname "$PY")/torchrun --master-port 29633"
A="$HERE/ckpt_formats.py --train-py $TRAIN --data $DATA --dir $SCR/fmt"
rm -rf "$SCR/fmt"; mkdir -p "$SCR/fmt" "$OUT"
$TR --nproc-per-node 4 $A --mode save > "$OUT/fmt_save.jsonl"
$TR --nproc-per-node 2 $A --mode load > "$OUT/fmt_load2.jsonl"
$TR --nproc-per-node 3 $A --mode load > "$OUT/fmt_load3.jsonl"
$TR --nproc-per-node 4 $A --mode load > "$OUT/fmt_load4.jsonl"
echo done

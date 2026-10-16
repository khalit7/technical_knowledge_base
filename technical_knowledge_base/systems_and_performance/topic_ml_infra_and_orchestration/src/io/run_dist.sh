#!/bin/sh
# Storage lab: the multi-rank checkpoint experiments, natively on the Mac (torchrun, gloo, 1 thread per rank).
# usage: OUT=<raw dir> SCR=<scratch dir> PY=<venv python> DATA=<input.txt> sh run_dist.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
TRAIN=$HERE/../data/train/train.py
TR="nice -n 15 env OMP_NUM_THREADS=1 $(dirname "$PY")/torchrun --master-port 29613"
A="$HERE/dist_ckpt.py --train-py $TRAIN --data $DATA"
mkdir -p "$OUT" "$SCR/dist"
$TR --nproc-per-node 4 $A --out "$SCR/dist/lay" --mode layouts --reps 3 > "$OUT/layouts.jsonl"
for c in none sync async; do
  rm -rf "$SCR/dist/tr_$c"
  $TR --nproc-per-node 4 $A --out "$SCR/dist/tr_$c" --mode train --ckpt $c --steps 60 --every 15 > "$OUT/train_$c.jsonl"
done
rm -rf "$SCR/dist/src4" "$SCR/dist/src4_full"
$TR --nproc-per-node 4 $A --out "$SCR/dist" --mode make_src --src "$SCR/dist/src4" > "$OUT/make_src.jsonl"
$TR --nproc-per-node 2 $A --out "$SCR/dist" --mode reshard --src "$SCR/dist/src4" > "$OUT/reshard.jsonl"
$TR --nproc-per-node 3 $A --out "$SCR/dist" --mode reshard --src "$SCR/dist/src4" >> "$OUT/reshard.jsonl"
nice -n 15 "$PY" "$HERE/errors.py" --train-py "$TRAIN" --src "$SCR/dist/src4" --work "$SCR/dist/err" > "$HERE/out/errors.json"
echo done

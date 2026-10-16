#!/bin/sh
# Storage lab: the same multi-rank checkpoint experiments inside one container (4 ranks, 2 CPUs), writing to
# a SLOW shared target: a host folder shared into Docker Desktop's VM (about 30-40 MB/s here), and for
# comparison to a Docker volume in the VM. Model d 256, 4 layers (3.2M parameters, about 38.6 MB with AdamW).
# usage: OUT=<raw dir> SCR=<scratch dir> sh run_dist_slow.sh
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$OUT" "$SCR/bind"
for tgt in bind vol; do
  docker run --rm --name io-dist --memory 2g --cpus 2 -v "$HERE":/io:ro -v "$SCR/bind":/bind -v io-vol:/vol mi-train:1 sh -c "
    T='torchrun --master-port 29613 --nproc-per-node 4'
    A='/io/dist_ckpt.py --train-py /opt/mi/train.py --data /opt/mi/input.txt --d 256 --layers 4'
    rm -rf /$tgt/dist
    \$T \$A --out /$tgt/dist/lay --mode layouts --reps 3 > /tmp/lay.jsonl 2>/tmp/err.txt
    for c in none sync async; do \$T \$A --out /$tgt/dist/tr_\$c --mode train --ckpt \$c --steps 60 --every 15 > /tmp/tr_\$c.jsonl 2>>/tmp/err.txt; done
    rm -rf /$tgt/dist
    cat /tmp/lay.jsonl; cat /tmp/tr_none.jsonl /tmp/tr_sync.jsonl /tmp/tr_async.jsonl" | grep '^{' > "$OUT/slow_$tgt.jsonl"
done
echo done

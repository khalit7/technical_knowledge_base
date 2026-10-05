#!/bin/sh
# Three runs of every M1 measurement, one after another, 20 s apart.
# METALPY: a Python with pyobjc-framework-Metal 12.x; TORCHPY: a Python with torch 2.14.1 (both outside the repo).
set -eu
cd "$(dirname "$0")"
mkdir -p out; rm -f out/metal_launch.jsonl out/metal_concurrency.jsonl ../torch/out/mps_launch.jsonl
for r in 1 2 3; do
  "$METALPY" metal_launch.py $r out
  "$METALPY" metal_concurrency.py $r out
  "$TORCHPY" ../torch/mps_launch.py $r ../torch/out
  sleep 20
done

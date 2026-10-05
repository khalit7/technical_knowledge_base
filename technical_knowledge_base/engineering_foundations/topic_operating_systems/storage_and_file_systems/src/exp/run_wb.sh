#!/bin/sh
# One container per scenario, one at a time (each run fills memory with dirty pages).
cd "$(dirname "$0")/.."
for s in ${*:-small mid fsync big primed}; do
  echo "### host: docker run --cpus 1 --memory 1500m -v /data kb-os-lab:1 python /exp/writeback.py $s /data" > raw/wb_$s.txt
  docker run --rm --name os-stor-wb-$s --cpus 1 --memory 1500m -v /data -v "$PWD/exp":/exp:ro kb-os-lab:1 python /exp/writeback.py $s /data >> raw/wb_$s.txt 2>&1
done

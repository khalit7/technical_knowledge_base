#!/bin/sh
# Reproduce every measurement and every number on the page.
#   MLXPY=<python with mlx and numpy> SCRATCH=<a directory outside the repo with 5 GB free> sh run_all.sh
# Measurements (about 15 s per GPU run on the M1 Pro, plus about a minute for the SSD file), then the data build,
# the page build and the checks. Run from anywhere; the checks need html_utils' node_modules (cd html_utils && npm ci).
set -e
cd "$(dirname "$0")"
: "${MLXPY:?set MLXPY to a Python with mlx installed}"
: "${SCRATCH:?set SCRATCH to a directory outside the repo for the 4 GiB SSD test file}"
for i in 1 2 3; do "$MLXPY" code/mem_gpu.py out/run_$i.json > out/run_$i.log 2>&1; sleep 20; done
python3 code/ssd_read.py "$SCRATCH" out/ssd.json > out/ssd.log 2>&1
python3 code/build_data.py
sh build.sh
python3 check/check_embed.py
cd ../../../../.. && node technical_knowledge_base/systems_and_performance/topic_hardware/memory_technology/src/check/check_ui.mjs "${SCRATCH}/shots"

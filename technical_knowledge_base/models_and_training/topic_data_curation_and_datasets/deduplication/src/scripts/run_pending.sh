#!/bin/sh
# Pending GPU runs of the deduplication child page (run later from the GPU queue, under the shared bench lock).
# usage: DC_SCRATCH=<dc setup folder> sh src/scripts/run_pending.sh d4-fwedu50k
#
# d4-fwedu50k (RAN 2026-10-15: 2,037 s of embedding on MPS, float32, batch 32, on a loaded shared machine; about 2 hours on 4 CPU threads at the 415 s per
#   2,692 documents measured on 2026-10-14): embeds the 50,000 random FineWeb-Edu rows of CC-MAIN-2024-30 with
#   arctic-embed-m (on disk, no download), runs SemDeDup (eps 0.01 to 0.15) and D4's prototype pruning, and writes
#   ../data/out/dp_d4_fw50k.json. Then rebuild the page: python3 src/build_data.py && sh src/build.sh.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
case "$1" in
d4-fwedu50k)
  sh "$DC_SCRATCH/../inf/lock.sh" acquire bench dp
  trap 'sh "$DC_SCRATCH/../inf/lock.sh" release bench dp' EXIT
  HF_HOME="$DC_SCRATCH/hf" nice -n 5 "$DC_SCRATCH/venv/bin/python" -I -B "$HERE/dp_d4_fw50k.py";;
*) echo "usage: run_pending.sh d4-fwedu50k"; exit 1;;
esac

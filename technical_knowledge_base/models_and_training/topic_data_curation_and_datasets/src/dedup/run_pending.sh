#!/bin/sh
# Pending GPU runs of the Dedup lab (run later from the GPU queue, under the shared bench lock).
# usage: DC_SCRATCH=<dc setup folder> sh src/dedup/run_pending.sh semantic-fw50k
#
# semantic-fw50k (estimate about 25 minutes on the Mac's GPU (MPS), both encoders; CPU-only would take about
#   2 hours per encoder at the 415 s per 2,692 documents measured on 2026-10-14):
#   embeds the 50,000 random FineWeb rows of CC-MAIN-2024-30 with google/embeddinggemma-300m (NeMo Curator 1.4.0's
#   default; needs a download of about 1.2 GB under the download lock) and with arctic-embed-m (on disk), then runs the
#   SemDeDup rule (k-means 100 clusters, "hard" ranking, eps 0.01 to 0.15) and writes out/dd_semantic_fw50k.json
#   (removals per eps for each encoder and how many both remove).
#   embeddinggemma-300m is gated on Hugging Face (Gemma terms): accept them and log in first, or run arctic only.
#   Script: dd_semantic_fw50k.py (written, not yet run; the CPU version on 2,692 documents is dd_semantic.py).
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
case "$1" in
semantic-fw50k)
  sh "$DC_SCRATCH/../inf/lock.sh" acquire bench dd
  trap 'sh "$DC_SCRATCH/../inf/lock.sh" release bench dd' EXIT
  HF_HOME="$DC_SCRATCH/hf" nice -n 5 "$DC_SCRATCH/venv/bin/python" -I -B "$HERE/dd_semantic_fw50k.py";;
*) echo "usage: run_pending.sh semantic-fw50k"; exit 1;;
esac

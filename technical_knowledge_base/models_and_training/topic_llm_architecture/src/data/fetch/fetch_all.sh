#!/bin/sh
# Rebuild the downloads the running example needs (run from anywhere; takes the download lock).
# Needs: LA_SCRATCH (scratch root), KB_SCRATCH (lock folder parent), LOCK (path to lock.sh).
set -e
H=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$LA_SCRATCH/dl/configs" "$LA_SCRATCH/dl/tinystories" "$LA_SCRATCH/setup"
sh "$LOCK" acquire download la-setup 600
REV=f54c09fd23315a6f9c86f9dc80f725de7d8f9c64
for f in train-00000-of-00004-2d5a1467fff1081b validation-00000-of-00001-869c898b519ad725; do
  curl -sL -o "$LA_SCRATCH/dl/tinystories/$f.parquet" "https://huggingface.co/datasets/roneneldan/TinyStories/resolve/$REV/data/$f.parquet"
done
sh "$H/dl_configs.sh" "$H/cfg_list.tsv" "$LA_SCRATCH/dl/configs"
cp "$LA_SCRATCH/dl/configs/fetched.tsv" "$LA_SCRATCH/dl/configs/fetched1.tsv"
sh "$H/dl_configs.sh" "$H/cfg_list2.tsv" "$LA_SCRATCH/dl/configs2" && mv "$LA_SCRATCH"/dl/configs2/*.json "$LA_SCRATCH/dl/configs/"
cat "$LA_SCRATCH/dl/configs/fetched1.tsv" "$LA_SCRATCH/dl/configs2/fetched.tsv" > "$LA_SCRATCH/dl/configs/fetched.tsv"
sh "$LOCK" release download la-setup
shasum -a 256 "$LA_SCRATCH"/dl/tinystories/*.parquet   # expect 77cf780c... and 33406a62...
# then: python3 -I st_totals.py cfg_list.tsv cfg_list2.tsv <out.json>; write_manifest.py (expects the setup layout); prepare_data.py

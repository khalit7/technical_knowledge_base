#!/bin/sh
# Reproduce everything behind this page, from src/.
#   MLXPY=<python with mlx 0.32.3 and numpy>  (an MLX environment outside the repo; never `uv run` inside the repo without --no-project)
# 1. real CUDA 13.4.2 compiles (Docker image kb-gpu-lab:1, no GPU needed)
docker run --rm --name cumem-cc --cpus 2 --memory 4g -v "$PWD":/work kb-gpu-lab:1 sh /work/code/compile_all.sh
# 2. M1 measurements: three runs (about 3 minutes in all)
MLXPY="$MLXPY" sh code/run_m1.sh
# 3. page data, the models' reference, build and checks
python3 code/summarize.py && python3 code/reference.py && node check/check_js.mjs && sh build.sh && python3 check/check_embed.py
# 4. UI check from the repo root: node <this folder>/check/check_ui.mjs <scratch folder for screenshots>

#!/bin/sh
# Run the running example once inside kb-os-lab:1 (plain run, no tracing).
# Usage: sh run_job.sh [extra train.py args...]   e.g. sh run_job.sh --start-method spawn --sigterm-at-step 8
# PREFIX lets each agent name its container (os-rd-, os-sim-, os-tr-, os-dbg-); default os-tr-.
set -e
HERE=$(cd "$(dirname "$0")" && pwd)
PREFIX=${PREFIX:-os-tr-}
docker run --rm --name "${PREFIX}job-$$" --cpus 2 --memory 3g --shm-size 256m \
  -v "$HERE":/job:ro kb-os-lab:1 \
  sh -c 'mkdir -p /work/data /work/out && python /job/make_data.py /work/data/train.bin && python /job/train.py "$@"' sh "$@"

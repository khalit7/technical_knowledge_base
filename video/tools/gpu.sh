#!/usr/bin/env bash
# Run a GPU command on whichever card is actually free, waiting if neither is.
#
# Several episodes are produced at once, and the voice model wants the best
# part of twenty gigabytes. Two renders landing on one card is a CUDA OOM
# that throws away an episode's worth of work, and the failure arrives late,
# after the script is written and the takes are half done.
#
# A lock alone is not enough, because a job pinned by an earlier convention
# can be holding memory without holding a lock, so this checks free VRAM as
# well and waits until a card can genuinely take the model.
#
#   video/tools/gpu.sh uv run video/build.py <episode>
#
# The command sees exactly one device, so plain `--device cuda` and
# `--device auto` both do the right thing and nothing needs to name a card.
set -uo pipefail

NEED_MIB=${KB_GPU_NEED:-20000}
LOCK_DIR=${KB_GPU_LOCKDIR:-/tmp/kb-gpu-locks}
mkdir -p "$LOCK_DIR"
GPUS=$(nvidia-smi --query-gpu=index --format=csv,noheader 2>/dev/null | tr -d ' ')
[ -z "$GPUS" ] && exec "$@"          # no GPU here: run it and let it decide

waited=0
while true; do
    for i in $GPUS; do
        free=$(nvidia-smi --id="$i" --query-gpu=memory.free --format=csv,noheader,nounits)
        [ "${free:-0}" -lt "$NEED_MIB" ] && continue
        exec {fd}>"$LOCK_DIR/gpu$i.lock"
        if flock -n "$fd"; then
            echo "gpu.sh: card $i, ${free} MiB free, waited ${waited}s" >&2
            CUDA_VISIBLE_DEVICES="$i" "$@"
            rc=$?
            flock -u "$fd"
            exec {fd}>&-
            exit $rc
        fi
        exec {fd}>&-
    done
    sleep 20
    waited=$((waited + 20))
    if [ $((waited % 300)) -eq 0 ]; then
        echo "gpu.sh: still waiting for a card with ${NEED_MIB} MiB free (${waited}s)" >&2
    fi
done

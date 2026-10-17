#!/bin/sh
# SD 1.5 runs for this page, one process, under the shared bench lock.
# usage: GM_SCRATCH=<shared setup folder> LOCKSH=<scratchpad>/inf/lock.sh GUARD=<scratchpad>/inf/guard.sh sh run_sd.sh [stages]
cd "$(dirname "$0")"
export GM_LOCK="$LOCKSH" HF_HUB_OFFLINE=1 PYTORCH_MPS_HIGH_WATERMARK_RATIO=0.45   # lead rule 2026-10-17 (recorded run predates it)
sh "$GUARD"
sh "$LOCKSH" acquire bench ld 7200 || exit 1
nice -n 15 $GM_SCRATCH/venv/bin/python -I sd_ld.py "$@"
rc=$?
sh "$LOCKSH" release bench ld
echo "sd exit $rc"

#!/bin/sh
# Copy one lab run's raw evidence from the scratch folder into src/fail/runs/<run>/, scrubbed with
# src/data/scrub.py (ANSI codes, container IPs, user paths and host names). Checkpoint files are not copied.
# usage: fl_save_runs.sh <raw dir> <run> [<run> ...]
RAW=$1; shift
HERE=$(cd "$(dirname "$0")/.." && pwd)
for r in "$@"; do
  mkdir -p "$HERE/runs/$r"
  for f in "$RAW/$r"/*; do
    [ -f "$f" ] || continue
    case "$f" in *.pid|*.pt|*.tmp) continue;; esac
    python3 "$HERE/../data/scrub.py" < "$f" > "$HERE/runs/$r/$(basename "$f")"
  done
done

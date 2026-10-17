#!/bin/sh
# Shared locks for the agents on this machine: one GPU job at a time (bench), one big download at a time (download),
# one workload per local cluster (slurm, kind, ray, or any other name a topic needs).
# usage: lock.sh acquire <name> <owner-prefix> [max-wait-seconds, default 3600]
#        lock.sh release|touch|status <name> <owner-prefix>
# Lock folder: $KB_LOCK_DIR, else $KB_SCRATCH/locks, else ${TMPDIR:-/tmp}/kb_locks. Every agent on the machine must resolve
# the SAME folder, so the lead sets KB_SCRATCH (the shared scratch folder) in every brief. A scratch folder in /tmp is wiped by a
# reboot, which also clears stale locks; never put the lock folder inside the repository.
# Gate the work on a successful acquire:  sh lock.sh acquire bench gm-df 3600 && { <gpu work>; sh lock.sh release bench gm-df; }
# Release checks the owner (one agent cannot free another's lock). After a release, the same owner waits 20 s before
# re-acquiring, so other pollers get a turn (fairness; written 2026-10-17 after one agent starved the others).
D="${KB_LOCK_DIR:-${KB_SCRATCH:+$KB_SCRATCH/locks}}"; D="${D:-${TMPDIR:-/tmp}/kb_locks}"; mkdir -p "$D"
cmd=$1; name=$2; owner=$3; L="$D/$name"
[ -n "$name" ] || { echo "usage: lock.sh acquire|release|touch|status <name> <owner>"; exit 2; }
case "$cmd" in
acquire)
  [ -n "$owner" ] || { echo "acquire needs an owner prefix"; exit 2; }
  wait=${4:-3600}; t=0
  last="$D/$name.last"
  if [ -f "$last" ] && [ "$(awk '{print $1}' "$last")" = "$owner" ] && [ $(( $(date +%s) - $(awk '{print $2}' "$last") )) -lt 20 ]; then sleep 20; fi
  while ! mkdir "$L" 2>/dev/null; do
    [ "$t" -ge "$wait" ] && { echo "TIMEOUT waiting for $name lock held by $(cat "$L/owner" 2>/dev/null)"; exit 1; }
    sleep 1; t=$((t+1))
  done
  echo "$owner $(date '+%Y-%m-%d %H:%M:%S')" > "$L/owner"; echo "acquired $name by $owner";;
release)
  cur=$(awk '{print $1}' "$L/owner" 2>/dev/null)
  if [ -d "$L" ] && [ -n "$owner" ] && [ "$cur" != "$owner" ]; then echo "NOT RELEASED: $name is held by $cur, not $owner"; exit 1; fi
  rm -rf "$L"; echo "$owner $(date +%s)" > "$D/$name.last"; echo "released $name";;
touch) [ -d "$L" ] && touch "$L/owner";;
status) if [ -d "$L" ]; then echo "$name: held by $(cat "$L/owner" 2>/dev/null)"; else echo "$name: free"; fi;;
*) echo "usage: lock.sh acquire|release|touch|status <name> <owner>"; exit 2;;
esac

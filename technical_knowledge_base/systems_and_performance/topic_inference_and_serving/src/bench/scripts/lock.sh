#!/bin/sh
# Shared lock for the inference agents. mkdir is atomic, so this works without flock.
# usage: lock.sh acquire <bench|download> <owner-prefix> [max-wait-seconds, default 3600]
#        lock.sh release <bench|download> <owner-prefix>
#        lock.sh status  [bench|download]
# A lock older than 45 minutes whose owner has not refreshed it (lock.sh touch) is treated as stale and taken over.
D=$(cd "$(dirname "$0")" && pwd)
cmd=$1; name=$2; owner=$3; L="$D/$name.lock"
case "$cmd" in
acquire)
  wait=${4:-3600}; t=0
  while ! mkdir "$L" 2>/dev/null; do
    age=$(( $(date +%s) - $(stat -f %m "$L" 2>/dev/null || date +%s) ))
    if [ "$age" -gt 2700 ]; then echo "stale lock ($(cat "$L/owner" 2>/dev/null)), taking over"; rm -rf "$L"; continue; fi
    [ "$t" -ge "$wait" ] && { echo "TIMEOUT waiting for $name lock held by $(cat "$L/owner" 2>/dev/null)"; exit 1; }
    sleep 5; t=$((t+5))
  done
  echo "$owner $(date '+%Y-%m-%d %H:%M:%S')" > "$L/owner"; echo "acquired $name by $owner";;
touch) [ "$(cut -d' ' -f1 "$L/owner" 2>/dev/null)" = "$owner" ] && touch "$L" && echo refreshed;;
release)
  if [ "$(cut -d' ' -f1 "$L/owner" 2>/dev/null)" = "$owner" ]; then rm -rf "$L"; echo "released $name"; else echo "not held by $owner (holder: $(cat "$L/owner" 2>/dev/null))"; fi;;
status) for n in ${name:-bench download}; do if [ -d "$D/$n.lock" ]; then echo "$n: held by $(cat "$D/$n.lock/owner")"; else echo "$n: free"; fi; done;;
*) echo "usage: lock.sh acquire|release|touch|status <bench|download> <owner>";;
esac

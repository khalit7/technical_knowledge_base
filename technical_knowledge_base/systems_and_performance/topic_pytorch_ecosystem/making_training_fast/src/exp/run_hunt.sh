#!/bin/sh
# All timed runs of the bottleneck hunt, under the shared bench lock (PY = the shared venv's python; SP = scratch root).
cd "$(dirname "$0")"
L="$SP/inf/lock.sh"
sh "$L" acquire bench fst 3600 || exit 1
( while sleep 240; do sh "$L" touch bench fst >/dev/null; done ) & TOUCH=$!
export FST_SCRATCH="$SP/pt/fst"
rm -f inputs/hunt_time_mps.json inputs/hunt_time_cpu.json inputs/hunt_phases_mps.json inputs/hunt_phases_cpu.json
for d in mps cpu; do
  $PY hunt.py phases $d s0,s3,s6
  $PY hunt.py time $d s0,s1,s2,s3,s4,s5,s6
  for st in s0 s6; do $PY hunt.py trace $d $st; done
done
kill $TOUCH
sh "$L" release bench fst

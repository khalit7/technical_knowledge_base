#!/bin/sh
# Timed single-technique measurements and the final traces, under the shared bench lock
# (PY = the shared venv's python; SP = scratch root). Parts given as arguments, default all.
cd "$(dirname "$0")"
L="$SP/inf/lock.sh"
sh "$L" acquire bench fst 3600 || exit 1
( while sleep 240; do sh "$L" touch bench fst >/dev/null; done ) & TOUCH=$!
export FST_SCRATCH="$SP/pt/fst"
$PY time_misc.py ${PARTS:-timer optim data attn amp ckpt lce ao flex}
$PY hunt.py trace mps s6
$PY hunt.py trace cpu s3
kill $TOUCH
sh "$L" release bench fst

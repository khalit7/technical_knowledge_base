#!/bin/sh
# Second pass of the hunt (bench lock): stages redefined after the first pass showed bfloat16 slower (s6 = compile in
# float32, s7 = compile + bfloat16), and a short CPU bfloat16 measurement.
cd "$(dirname "$0")"
L="$SP/inf/lock.sh"
sh "$L" acquire bench fst 3600 || exit 1
( while sleep 240; do sh "$L" touch bench fst >/dev/null; done ) & TOUCH=$!
export FST_SCRATCH="$SP/pt/fst"
$PY hunt.py phases mps s6
$PY hunt.py time mps s6,s7
$PY hunt.py time cpu s6
FST_TRIALS=2 FST_STEPS=3 FST_WARM=1 $PY hunt.py time cpu s5
kill $TOUCH
sh "$L" release bench fst

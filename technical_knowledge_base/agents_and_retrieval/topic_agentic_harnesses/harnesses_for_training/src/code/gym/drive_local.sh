#!/bin/sh
# Sequential local-model rollouts: 4 rollouts x 10 tasks x 3 harnesses, one request at a time.
H=$(cd "$(dirname "$0")/.." && pwd); PY=$H/../afsame/fwenv/bin/python; OUT=$H/runs/main
cd "$H/gym"
for r in r1 r2 r3 r4; do for t in T01 T02 T03 T04 T05 T06 T07 T08 T09 T10; do for h in bash tools plain; do
  [ -f "$OUT/local_${h}_${t}_${r}.done" ] && continue
  [ -f "$H/STOP_LOCAL" ] && exit 0
  $PY rollout_local.py $t $h $r "$OUT" && touch "$OUT/local_${h}_${t}_${r}.done"
  if grep -q '"stop": "infra_error"' "$OUT/local_${h}_${t}_${r}.jsonl"; then echo "infra error, pausing 120 s"; rm -f "$OUT/local_${h}_${t}_${r}.done"; sleep 120; fi
done; done; done
echo ALL_LOCAL_DONE

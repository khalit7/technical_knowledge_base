#!/bin/sh
# Sequential Claude Haiku 4.5 rollouts: 3 rollouts x 10 tasks x 4 harnesses (3 via the Agent SDK, Claude Code itself).
H=$(cd "$(dirname "$0")/.." && pwd); PY=$H/../afsame/fwenv/bin/python; OUT=$H/runs/main
cd "$H/gym"
for r in r1 r2 r3; do for t in T01 T02 T03 T04 T05 T06 T07 T08 T09 T10; do for h in bash tools plain ccfull; do
  [ -f "$H/STOP_CLAUDE" ] && exit 0
  if [ $h = ccfull ]; then n=cc-haiku_ccfull_${t}_${r}; else n=sdk-haiku_${h}_${t}_${r}; fi
  [ -f "$OUT/$n.done" ] && continue
  if [ $h = ccfull ]; then $PY rollout_cc.py $t $r "$OUT" haiku; else $PY rollout_sdk.py $t $h $r "$OUT" haiku; fi && touch "$OUT/$n.done"
  if grep -q '"status": *"rejected"' "$OUT/$n.jsonl"; then echo "RATE LIMITED at $n"; touch "$H/STOP_CLAUDE"; exit 1; fi
done; done; done
echo ALL_CLAUDE_DONE

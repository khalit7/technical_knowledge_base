#!/bin/sh
# PowerSGD (rank 1, 2 buckets) on 4 gloo ranks with a no_sync backward before each step, as the hooks experiment
# does; every all-reduce PowerSGD issues is logged before it is issued. Writes the first step where ranks issued
# them in different orders -> ../inputs/psgd_race.json (up to 3 attempts).
cd "$(dirname "$0")"
P="$DPT_SCRATCH/psgd_probe"; mkdir -p "$P"
for i in 1 2 3; do
  rm -f "$P"/psgd_race*
  DPT_SCRATCH="$P" PORT=29534 sh run.sh 4 psgd_race.py --rank 1 --steps 40 --nosync-first > "$P/run.log" 2>&1
  grep -q Enforce "$P/run.log" && break
done
python3 - "$P" "$i" <<'PYEOF'
import json, sys, time
from collections import defaultdict
P, attempt = sys.argv[1], int(sys.argv[2])
log = open(P + "/run.log").read()
c = [[json.loads(l) for l in open(P + "/psgd_race.calls.r%d.jsonl" % i)] for i in range(4)]
by = [defaultdict(list) for _ in c]
for i, cc in enumerate(c):
    for st, b, m in cc: by[i][st].append([b, "main thread" if m else "callback thread"])
steps = sorted(set().union(*[set(x) for x in by]))
first = None
for st in steps:
    seqs = [by[i][st] for i in range(4)]
    if any(s != seqs[0] for s in seqs):
        first = {"step": st, "per_rank": seqs, "previous_step_rank0": by[0].get(st - 1)}; break
json.dump({"name": "psgd_race", "recorded": time.strftime("%Y-%m-%d"), "launches": attempt,
           "aborted": "EnforceNotMet" in log, "abort_text": "gloo::EnforceNotMet: [enforce fail at gloo/transport/uv/pair.cc:253] op.nread == op.preamble.nbytes." if "EnforceNotMet" in log else None,
           "steps_logged": len(steps), "first_difference": first}, open("../inputs/psgd_race.json", "w"), indent=1)
print("wrote psgd_race", first and first["step"])
PYEOF

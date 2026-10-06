#!/usr/bin/env python3
# Print a recorded run compactly: show.py LOG.jsonl
import json, sys
for l in open(sys.argv[1]):
    r = json.loads(l)
    k = r["kind"]
    if k == "run_start":
        print(f'== {r["run"]} {r["trigger"]["kind"]} {r["trigger"]["at"]}: {r["trigger"]["text"][:90]}')
    elif k == "model":
        u = r["usage"]
        print(f'  [{r["step"]}] in {u.get("in")} out {u.get("out")} {r["secs"]}s drop {r["dropped_chars"]}: {r["text"][:160]!r}')
    elif k == "action":
        print(f'      {r["tool"]} {json.dumps(r["args"])[:120]} -> {r["decision"]}: {r["result"][:80]!r}')
    elif k in ("incoming", "queued"):
        print(f'  >> {k} ({r.get("mode")}) at step {r.get("step")}: {r["text"][:80]}')
    elif k == "run_end":
        print(f'  end: {r["reason"]} steps {r["steps"]} {str(r.get("summary"))[:100]}')
    elif k == "final_state":
        s = r["state"]
        print("FINAL", {k: v for k, v in s.items() if v and k != "events"})

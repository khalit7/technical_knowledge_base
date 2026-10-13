#!/bin/sh
# One clean torchrun launch per hook variant (a PowerSGD abort then cannot take the others with it); merged after.
# usage: sh run_hooks.sh <world>
cd "$(dirname "$0")"
W=$1
for v in 0 1 2 3 4 5 6 7; do
  PORT=29533 sh run.sh $W ddp_more.py hooks --variant $v --tag hooks_w${W}_v$v > "$DPT_SCRATCH/hooks_w${W}_v$v.log" 2>&1
  [ -f ../inputs/hooks_w${W}_v$v.json ] || echo "variant $v failed: $(grep -m1 -o 'EnforceNotMet.*' "$DPT_SCRATCH/hooks_w${W}_v$v.log" | cut -c1-160)"
done
python3 - "$W" <<'PYEOF'
import json, os, sys, time
W = sys.argv[1]; res = []; env = None; mb = None
for v in range(8):
    p = f"../inputs/hooks_w{W}_v{v}.json"
    if not os.path.exists(p):
        res.append({"variant_index": v, "aborted": True}); continue
    d = json.load(open(p)); os.remove(p); env = d["env"]
    r = d["ranks"][0]["result"]; res.extend(r["variants"]); mb = r.get("model_bytes_fp32", mb)
json.dump({"name": f"hooks_w{W}", "recorded": time.strftime("%Y-%m-%d"), "env": env, "model_bytes_fp32": mb, "variants": res},
          open(f"../inputs/hooks_w{W}.json", "w"), indent=1)
print("wrote", f"hooks_w{W}", len(res))
PYEOF

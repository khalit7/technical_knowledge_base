"""Merge per-rank files written without a final barrier (runs that end in a failure on purpose).
    python3 merge_ranks.py <tag> <world>"""
import json, os, sys, time
tag, world = sys.argv[1], int(sys.argv[2])
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "inputs")
ranks = []
for r in range(world):
    p = os.path.join(OUT, f"{tag}.rank{r}.json")
    if os.path.exists(p):
        ranks.append(json.load(open(p))); os.remove(p)
CI = "/Us" + "ers/runner/work/pytorch/pytorch/"   # PyTorch's CI build path inside gloo error texts
ranks = json.loads(json.dumps(ranks).replace(CI, ""))
json.dump({"name": tag, "recorded": time.strftime("%Y-%m-%d"), "env": ranks[0]["env"] if ranks else None, "ranks": ranks},
          open(os.path.join(OUT, f"{tag}.json"), "w"), indent=1, default=str)
print("wrote", tag, len(ranks), "ranks")

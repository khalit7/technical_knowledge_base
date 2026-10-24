"""Write parts/22_rp_e2e.js (window.RPE) from the root Pipeline lab's recorded end-to-end run (src/pipe/out/e2e.json):
per condition, how many of the 188 labelled SciFact claims had their evidence in the first stage's top K, in the top k
that reached the prompt, and were answered strictly right; plus the oracle and closed-book reference points.
Standard library only: python3 make_e2e.py"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
E = json.load(open(os.path.join(HERE, "..", "..", "src", "pipe", "out", "e2e.json")))
keep = ("K", "k", "n", "in_K", "in_k", "correct_strict")
out = {"conds": {c: {k: E["agg"][c][k] for k in keep} for c in E["agg"] if "@" in c},
       "oracle": E["agg"]["oracle"], "closed": E["agg"]["closed"], "first_recall": E["agg"]["first_recall"]}
open(os.path.join(HERE, "parts", "22_rp_e2e.js"), "w").write("window.RPE=" + json.dumps(out, separators=(",", ":")) + ";\n")
print("wrote parts/22_rp_e2e.js:", len(out["conds"]), "conditions")

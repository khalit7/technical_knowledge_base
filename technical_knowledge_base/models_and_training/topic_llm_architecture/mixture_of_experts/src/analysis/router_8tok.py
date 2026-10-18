"""Router probabilities of the trained moe8top2 model (softmax router, auxiliary-loss balancing) for tokens 1 to 8 of the
running sequence ("Once upon a time, in a big"), for the root's Reading-tab MoE animation, exactly in the requested form
{"tokens": [...], "probs": [[8 floats] x 8]}. The layer is the one whose routing of these 8 tokens is most decisive
(the most distinct first-choice experts among the 8 tokens, ties broken by the highest mean top-1 probability), printed below and recorded in src/README.md. Reads src/analysis/out/mx_moe8top2.json.
Run: python3 src/analysis/router_8tok.py  ->  src/analysis/out/router_probs_8tok.json
"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__))
a = json.load(open(os.path.join(HERE, "out", "mx_moe8top2.json")))
pieces = json.load(open(os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "data", "running_sequence.json"))))["pieces"]
L = a["running"]["layers"]
def score(l):  # most distinct first choices among the 8 tokens, then the most decisive routing
    rows = L[l]["scores64"][1:9]
    return (len({max(range(8), key=lambda e: r[e]) for r in rows}), sum(max(r) for r in rows))
best = max(range(len(L)), key=score)
probs = [[round(v, 3) for v in r] for r in a["running"]["layers"][best]["scores64"][1:9]]
out = {"tokens": pieces[1:9], "probs": probs}
json.dump(out, open(os.path.join(HERE, "out", "router_probs_8tok.json"), "w"))
print("layer index", best, "(block", best + 1, ")", out["tokens"])
for t, p in zip(out["tokens"], probs):
    print(f"{t!r:10} {p}  sum {sum(p):.3f}")

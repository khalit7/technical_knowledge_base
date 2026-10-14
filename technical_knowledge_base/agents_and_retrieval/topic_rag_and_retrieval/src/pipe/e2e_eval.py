"""Score the generator's answers (e2e_gen.py) and split the end-to-end accuracy A into its three factors,
A = r_K x p_(k|K) x g, on the 188 SciFact test claims that have annotated evidence (124 SUPPORT, 64 CONTRADICT):
  r_K       the first stage (hybrid RRF) has an evidence abstract in its top K
  p_(k|K)   after reranking the top K, an evidence abstract is in the top k that reach the prompt (given r_K)
  g         the answer is right (strict: right label and it cites an evidence abstract) given evidence in the prompt
The 112 claims without evidence (NEI) need no retrieval to be right; they are reported apart.
Output: out/e2e.json (aggregates plus compact per-claim arrays for the page's K and k slider)."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import numpy as np
from common import L, save, work, r3
from e2e_gen import gold, pipeline, parse, conditions, KS, SMALLK

G0 = gold()
corpus, queries, qt, hy, rr = pipeline()
A = json.load(open(work("e2e_answers.json")))
ans = A["answers"]


def res(q, docs):
    t = ans["%s|%s" % (q, ",".join(docs) if docs is not None else "closed")]
    lab, cite = parse(t)
    g = G0[q]
    cited = docs[cite - 1] if (docs and cite and 0 < cite <= len(docs)) else None
    len_ = lab == g["label"]
    strict = len_ and (g["label"] == "NOT ENOUGH INFO" or cited in set(g["evidence"]))
    return 2 if strict else 1 if len_ else 0, lab


def rank(lst, ev):
    for i, d in enumerate(lst):
        if d in ev:
            return i + 1
    return 0


CONDS = ["closed"] + ["first@%d" % k for k in SMALLK] + ["rr%d@%d" % (K, k) for K in KS for k in SMALLK] + ["oracle"]
claims = []
labels = {}
for q in qt:
    g = G0[q]
    ev = set(g["evidence"])
    row = {"q": q, "lab": {"SUPPORT": "S", "CONTRADICT": "C", "NOT ENOUGH INFO": "N"}[g["label"]],
           "fr": rank(hy[q], ev) if ev else 0, "rr": [rank(rr[K][q], ev) if ev else 0 for K in KS], "res": []}
    for c in CONDS:
        if c == "closed":
            v, lab = res(q, None)
        elif c == "oracle":
            if not ev:
                row["res"].append(-1); continue
            v, lab = res(q, g["evidence"])
        else:
            src, k = c.split("@"); k = int(k)
            docs = hy[q][:k] if src == "first" else rr[int(src[2:])][q][:k]
            v, lab = res(q, docs)
        row["res"].append(v)
        labels.setdefault(c, {}).setdefault(lab, 0)
        labels[c][lab] += 1
    claims.append(row)

lab_claims = [c for c in claims if c["lab"] != "N"]
N = len(lab_claims)
agg = {}
for ci, c in enumerate(CONDS):
    if c in ("closed", "oracle"):
        v = [x["res"][ci] for x in lab_claims]
        agg[c] = {"strict": sum(x == 2 for x in v), "lenient": sum(x >= 1 for x in v), "n": N}
        continue
    src, k = c.split("@"); k = int(k)
    if src == "first":
        K = k; inK = [x["fr"] and x["fr"] <= k for x in lab_claims]; ink = inK
    else:
        K = int(src[2:]); Ki = KS.index(K)
        inK = [x["fr"] and x["fr"] <= K for x in lab_claims]
        ink = [x["rr"][Ki] and x["rr"][Ki] <= k for x in lab_claims]
    v = [x["res"][ci] for x in lab_claims]
    r = sum(map(bool, inK)); p = sum(map(bool, ink)); gg = sum(1 for a, b in zip(ink, v) if a and b == 2)
    agg[c] = {"K": K, "k": k, "n": N, "in_K": r, "in_k": p, "correct_strict": gg, "lenient": sum(x >= 1 for x in v),
              "lenient_without_evidence": sum(1 for a, b in zip(ink, v) if not a and b >= 1),
              "r_K": r3(r / N), "p_k_given_K": r3(p / r) if r else None, "g": r3(gg / p) if p else None, "A": r3(gg / N)}
nei = [c for c in claims if c["lab"] == "N"]
agg["nei"] = {c: sum(x["res"][ci] >= 1 for x in nei) for ci, c in enumerate(CONDS) if c != "oracle"}
agg["nei_n"] = len(nei)
# first-stage recall curve for the labelled claims
agg["first_recall"] = {str(K): r3(sum(1 for x in lab_claims if x["fr"] and x["fr"] <= K) / N) for K in (1, 3, 5, 10, 20, 30, 50, 100)}
# generation cost from the e2e cache (seconds per answer by prompt size)
cache = [json.loads(l) for l in open(work("gen", "e2e.jsonl"))]
by_k = {}
for r_ in cache:
    by_k.setdefault(r_["n_in"] // 500, []).append(r_["seconds"])
gen_cost = {"answers": len(cache), "median_s": r3(np.median([r_["seconds"] for r_ in cache])),
            "median_in_tokens": int(np.median([r_["n_in"] for r_ in cache])),
            "prompt_tps_median": r3(np.median([r_["prompt_tps"] for r_ in cache if r_.get("prompt_tps")])),
            "gen_tps_median": r3(np.median([r_["gen_tps"] for r_ in cache if r_.get("gen_tps")])),
            "by_500_tokens": {str(500 * k): [len(v), r3(np.median(v))] for k, v in sorted(by_k.items())}}
out = {"conds": CONDS, "KS": KS, "smallk": SMALLK, "n_labelled": N, "agg": agg, "labels_out": labels, "gen_cost": gen_cost, "cost": A["cost"],
       "claims": [[c["q"], c["lab"], c["fr"], c["rr"], c["res"]] for c in claims]}
save("e2e.json", out)
for c in CONDS:
    print(c, agg[c])
print("nei", agg["nei"])
print(json.dumps(gen_cost))

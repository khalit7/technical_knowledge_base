"""Choose the end-to-end answer prompt on SciFact TRAIN claims (never the test claims): the first prompt made the
1.7 B generator answer NOT ENOUGH INFO even when given the gold evidence. Each candidate is scored with the gold
evidence abstracts in the prompt (an oracle context) on 120 train claims with evidence and 60 without (given their
cited abstracts), and the best balanced accuracy is kept. Hold the bench lock.
Output: out/prompt_tune.json.
Run of 2026-10-14: p1, p2, p3 finished; p3-think was stopped (about 8 s per answer, so about 5 hours for the
end-to-end grid) and out/prompt_tune.json was written from the log of the three finished candidates."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, random
from common import L, save, work, r3
import gen as G
from e2e_gen import abstracts, parse, PROMPTS
P1, P2, P3 = PROMPTS["p1"], PROMPTS["p2"], PROMPTS["p3"]

CANDS = {"p1": (P1, False), "p2": (P2, False), "p3": (P3, False), "p3-think": (P3, True)}
corpus, _, _ = L.beir("scifact")
tr = [json.loads(l) for l in open(work("scifact_orig", "data", "claims_train.jsonl"))]
rng = random.Random(0)
lab = [x for x in tr if x["evidence"]]; nei = [x for x in tr if not x["evidence"]]
rng.shuffle(lab); rng.shuffle(nei)
sample = lab[:120] + nei[:60]
cache = G.Cache("prompt_tune")
res = {}
for name, (tmpl, think) in CANDS.items():
    ok = {"lab": 0, "nei": 0, "strict": 0}; labels = {}
    for x in sample:
        ev = sorted(x["evidence"]) if x["evidence"] else [str(c) for c in x["cited_doc_ids"]]
        ev = [d for d in ev if d in corpus]
        gold = {e["label"] for v in x["evidence"].values() for e in v}
        gold = gold.pop() if gold else "NOT ENOUGH INFO"
        r = G.chat(tmpl.format(claim=x["claim"], abstracts=abstracts(corpus, ev)), cache, max_tokens=700 if think else 16, tag=name, think=think)
        l, c = parse(r["text"])
        labels[l] = labels.get(l, 0) + 1
        if x["evidence"]:
            ok["lab"] += l == gold; ok["strict"] += l == gold and c is not None and 0 < c <= len(ev)
        else:
            ok["nei"] += l == gold
    res[name] = {"labelled_right": ok["lab"], "labelled_n": 120, "nei_right": ok["nei"], "nei_n": 60, "labels": labels,
                 "balanced": r3((ok["lab"] / 120 + ok["nei"] / 60) / 2), "think": think}
    print(name, res[name], flush=True)
res["chosen"] = max(CANDS, key=lambda n: (res[n]["balanced"], not CANDS[n][1]))
save("prompt_tune.json", res)

"""nDCG@5 and recall@1/5 of each ranking on a ViDoRe v1 set (one relevant page per query, binary gain:
nDCG@5 = 1/log2(rank+1) if the relevant page is in the top 5, else 0; ideal DCG is 1). 95% interval by bootstrap
over queries (1,000 resamples, seed 0).
usage: python -I vidore_eval.py <ING_DIR> <set> [<set> ...]  -> prints and writes <set>/eval.json"""
import json, math, os, random, sys

ING = sys.argv[1]
for name in sys.argv[2:]:
    d = os.path.join(ING, "vidore", name)
    meta = json.load(open(os.path.join(d, "meta.json")))
    gold = {q["qid"]: q["gold"] for q in meta["queries"]}
    out = {"n_queries": len(gold), "n_pages": len(meta["pages"]), "systems": {}}
    for f in sorted(os.listdir(d)):
        if not (f.startswith("rank_") and f.endswith(".json")):
            continue
        rk = json.load(open(os.path.join(d, f)))
        per = []
        for qid, g in gold.items():
            lst = rk[qid]
            r = lst.index(g) + 1 if g in lst else None
            per.append(r)
        nd = [1 / math.log2(r + 1) if r and r <= 5 else 0.0 for r in per]
        rng = random.Random(0); bs = []
        for _ in range(1000):
            s = [nd[rng.randrange(len(nd))] for _ in nd]; bs.append(sum(s) / len(s))
        bs.sort()
        out["systems"][f[5:-5]] = {"ndcg5": 100 * sum(nd) / len(nd), "ci95": [100 * bs[25], 100 * bs[974]],
                                   "r1": 100 * sum(1 for r in per if r == 1) / len(per),
                                   "r5": 100 * sum(1 for r in per if r and r <= 5) / len(per)}
    json.dump(out, open(os.path.join(d, "eval.json"), "w"), indent=1)
    print(name, {k: round(v["ndcg5"], 1) for k, v in out["systems"].items()})

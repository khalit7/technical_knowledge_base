"""Data for the funnel animation: one SciFact claim through BM25, dense (Qwen3-Embedding-0.6B), RRF (k 60),
Qwen3-Reranker-0.6B on the top 30, and the generator on the top 3, under four pipelines (hybrid or dense only,
reranker on or off). Answers come from the e2e cache when e2e_gen.py produced the same prompt, else the generator
runs here (hold the bench lock). Output: out/funnel.json."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
from common import L, save, work
import fusion as F
from rerank import load_scores
from e2e_gen import PROMPT, abstracts, parse, gold, THINK, CHOSEN

QID = sys.argv[1] if len(sys.argv) > 1 else "70"
K, k = 30, 3
corpus, queries, qrels = L.beir("scifact")
bm = L.run("scifact", "bm25"); de = L.run("scifact", "qwen3-emb-0.6b")
S = load_scores("qwen3-reranker-0.6b_top30")
q = QID
hy = F.top(F.rrf([list(bm[q]), list(de[q])], 60))
G0 = gold()[q]
ev = set(G0["evidence"]) or set(qrels["test"][q])
lists = {"bm25": list(bm[q].items()), "dense": list(de[q].items()), "hybrid": list(hy.items())}
for name in ("hybrid", "dense"):
    top = [d for d, _ in lists[name][:K]]
    miss = [d for d in top if d not in S[q]]
    if miss:
        raise SystemExit("missing reranker scores for %s: %s" % (name, miss))
    lists[name + "+rr"] = sorted(((d, S[q][d]) for d in top), key=lambda x: -x[1])


def rank(lst):
    for i, (d, _) in enumerate(lst):
        if d in ev:
            return i + 1
    return None


out = {"qid": q, "prompt": CHOSEN, "claim": queries[q], "label": G0["label"], "evidence": sorted(ev), "K": K, "k": k, "lists": {}, "ranks": {}, "titles": {}, "answers": {}}
for name, lst in lists.items():
    show = lst[:10]
    r = rank(lst)
    if r and r > 10:
        show = show + [lst[r - 1]]
    out["lists"][name] = [[d, round(s, 4), i + 1 if i < 10 else r] for i, (d, s) in enumerate(show)]
    out["ranks"][name] = r
    for d, _ in show:
        out["titles"][d] = corpus[d]["title"]
import gen as G
cache = G.Cache("e2e")
for name in ("hybrid+rr", "hybrid", "dense+rr", "dense"):
    docs = [d for d, _ in lists[name][:k]]
    p = PROMPT.format(claim=queries[q], abstracts=abstracts(corpus, docs))
    r = G.chat(p, cache, max_tokens=700 if THINK else 16, tag=q, think=THINK)
    lab, cite = parse(r["text"])
    cited = docs[cite - 1] if cite and 0 < cite <= len(docs) else None
    out["answers"][name] = {"text": r["text"], "label": lab, "cited": cited, "docs": docs, "n_in": r["n_in"],
                            "lenient": lab == G0["label"], "strict": lab == G0["label"] and (G0["label"] == "NOT ENOUGH INFO" or cited in ev)}
out["prompt_example"] = PROMPT.format(claim=queries[q], abstracts=abstracts(corpus, [d for d, _ in lists["hybrid+rr"][:k]]))
save("funnel.json", out)
print(json.dumps({k_: v for k_, v in out.items() if k_ in ("ranks", "answers")}, indent=1))

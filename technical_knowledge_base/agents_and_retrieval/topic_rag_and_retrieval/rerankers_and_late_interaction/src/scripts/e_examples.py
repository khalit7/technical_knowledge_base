"""Real candidate lists for the rerank before/after lab (deterministic, recorded scores).
For a handful of SciFact test claims chosen by rule (below), the top 30 of BM25, Qwen3-Embedding and hybrid RRF,
with every reranker's recorded score for every candidate, the ColBERT MaxSim score (stored vectors) and the labels.
Selection rules (first match in sorted claim-id order, so the choice is reproducible):
  rescued    Qwen3-Reranker moves the relevant abstract from BM25 rank >= 10 to rank 1
  hurt       the relevant abstract is BM25 rank 1 and Qwen3-Reranker puts it at rank >= 4
  disagree   on hybrid, CE MiniLM moves the relevant abstract down by >= 5 places while Qwen3-Reranker puts it first
  ceiling    no relevant abstract in any first stage's top 30 (no reranker can help)
  multi      >= 3 relevant abstracts
  plus the MaxSim animation claim (1180) for continuity.
Output: data/examples.json"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from rrlib import L, DS, first_stages, rerank_scores, RERANKERS, logit, r3, save

NAMES = ["ce-minilm-l6", "bge-reranker-v2-m3", "qwen3-reranker-0.6b"]
SNIP = 110


def order(lst, S):
    return sorted(lst, key=lambda d: -S[d])


def main():
    corpus, queries, qrels = L.beir(DS)
    qt = qrels["test"]
    test = sorted(qt, key=int)
    FS = first_stages()
    S = {n: rerank_scores(RERANKERS[n]) for n in NAMES}
    pick = {}

    def rank_after(fs, n, q, d, K=30):
        head = list(FS[fs][q])[:K]
        return order(head, S[n][q]).index(d) + 1 if d in head else None

    for q in test:
        rel = list(qt[q])
        bmh = list(FS["bm25"][q])[:30]
        hyh = list(FS["hybrid"][q])[:30]
        for d in rel:
            if "rescued" not in pick and d in bmh and bmh.index(d) >= 9 and rank_after("bm25", "qwen3-reranker-0.6b", q, d) == 1:
                pick["rescued"] = q
            if "hurt" not in pick and d in bmh and bmh.index(d) == 0 and rank_after("bm25", "qwen3-reranker-0.6b", q, d) >= 4:
                pick["hurt"] = q
            if "disagree" not in pick and d in hyh:
                a = rank_after("hybrid", "ce-minilm-l6", q, d)
                b = rank_after("hybrid", "qwen3-reranker-0.6b", q, d)
                if a - (hyh.index(d) + 1) >= 5 and b == 1:
                    pick["disagree"] = q
        if "ceiling" not in pick and not any(d in list(FS[f][q])[:30] for f in FS for d in rel):
            pick["ceiling"] = q
        if "multi" not in pick and len(rel) >= 3 and all(d in hyh for d in rel):
            pick["multi"] = q
    pick["maxsim-1"] = "1180"
    print(pick)
    # ColBERT MaxSim for the candidates (stored float16 vectors)
    p = L.path("data", "colbert", DS)
    D = np.load(os.path.join(p, "doc_tokens.npy"), mmap_mode="r")
    off = np.load(os.path.join(p, "doc_offsets.npy"))
    Qv = np.load(os.path.join(p, "query_tokens.npy")).astype(np.float32)
    qoff = np.load(os.path.join(p, "query_offsets.npy"))
    dids = open(os.path.join(p, "doc_ids.txt")).read().split("\n")
    qids = open(os.path.join(p, "query_ids.txt")).read().split("\n")
    dpos = {d: i for i, d in enumerate(dids)}
    qpos = {q: i for i, q in enumerate(qids)}
    out = {"claims": []}
    for why, q in pick.items():
        cands = list(dict.fromkeys(sum((list(FS[f][q])[:30] for f in ("bm25", "dense", "hybrid")), [])))
        qr = Qv[qoff[qpos[q]]:qoff[qpos[q] + 1]]
        docs = {}
        for d in cands:
            j = dpos[d]
            ms = float((qr @ np.asarray(D[off[j]:off[j + 1]], dtype=np.float32).T).max(1).sum())
            t = corpus[d]["text"]
            docs[d] = {"t": corpus[d]["title"][:120], "x": t[:SNIP] + ("..." if len(t) > SNIP else ""), "rel": int(d in qt[q]),
                       "s": [r3(S[n][q][d]) if n != "bge-reranker-v2-m3" else round(S[n][q][d], 5) for n in NAMES],
                       "colbert": r3(ms)}
        out["claims"].append({"qid": q, "why": why, "claim": queries[q], "n_rel": len(qt[q]),
                              "lists": {f: list(FS[f][q])[:30] for f in ("bm25", "dense", "hybrid")},
                              "first_scores": {f: [round(float(FS[f][q][d]), 4) for d in list(FS[f][q])[:30]] for f in ("bm25", "dense", "hybrid")},
                              "docs": docs})
    out["names"] = NAMES
    save("examples.json", out)


if __name__ == "__main__":
    main()

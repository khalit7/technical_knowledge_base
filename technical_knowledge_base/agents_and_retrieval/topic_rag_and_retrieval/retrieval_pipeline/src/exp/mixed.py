"""Testing the old page's unsourced claim that mixing chunking strategies across ingestion runs "can cost ~8 points
of recall". Deterministic, existing bge-small vectors (root lab).
Setting: ONE index over all 281 QASPER papers (global search, not within a paper). Half the papers (seeded split by
paper) are chunked with 128-token windows, the other half with 512-token windows (fixed-128-16, fixed-512-64), as if
a re-ingestion had changed the chunker for half the corpus. Compared with the uniform 128 index and the uniform 512
index. Hit = the root's metric (the top chunks within a token budget cover >= 90% of an evidence paragraph).
Also: share of top-10 slots taken by long chunks, vs their share of the index.
Output: out/mixed.json"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, random
import numpy as np
import rp

L = rp.L
sys.path.insert(0, os.path.join(rp.ROOT_SRC, "pipe"))
import chunk_eval as CE  # noqa: E402


def load(strat):
    rows = [json.loads(l) for l in open(L.path("pipe", "chunks", strat + ".jsonl"))]
    V = np.load(L.path("pipe", "chunks", strat + ".bge-small.npy"))
    for r in rows:
        r["s"] = strat
    return rows, V


def main():
    docs, qs = L.longdoc()
    pids = sorted(d["paper_id"] for d in docs)
    random.Random(0).shuffle(pids)
    A = set(pids[:len(pids) // 2])
    small, Vs = load("fixed-128-16"); big, Vb = load("fixed-512-64")
    qids = open(L.path("pipe", "chunks", "questions.bge-small.ids")).read().split("\n")
    QV = np.load(L.path("pipe", "chunks", "questions.bge-small.npy")); qp = {q: i for i, q in enumerate(qids)}
    idx = {"uniform 128": (small, Vs), "uniform 512": (big, Vb)}
    ms = [i for i, r in enumerate(small) if r["paper_id"] in A]; mb = [i for i, r in enumerate(big) if r["paper_id"] not in A]
    idx["mixed (half 128, half 512)"] = ([small[i] for i in ms] + [big[i] for i in mb], np.vstack([Vs[ms], Vb[mb]]))
    res = {"papers_128_in_mixed": len(A), "budgets": [512, 1024, 2048]}
    for name, (rows, V) in idx.items():
        S = QV[[qp[q["qid"]] for q in qs]] @ V.T
        out = {"group A (128 in mixed)": {b: 0 for b in (512, 1024, 2048)}, "group B (512 in mixed)": {b: 0 for b in (512, 1024, 2048)}}
        nA = sum(q["paper_id"] in A for q in qs)
        long_share, own = [], 0
        for i, q in enumerate(qs):
            order = np.argsort(-S[i])[:200]
            ranked = [rows[j] for j in order]
            g = "group A (128 in mixed)" if q["paper_id"] in A else "group B (512 in mixed)"
            for b in out[g]:
                out[g][b] += CE.hit(CE.by_budget(ranked, b), q)
            long_share.append(np.mean([r["s"] == "fixed-512-64" for r in ranked[:10]]))
            own += ranked[0]["paper_id"] == q["paper_id"]
        res[name] = {"recall": {g: {str(b): rp.r3(v / (nA if g.startswith("group A") else len(qs) - nA)) for b, v in d.items()} for g, d in out.items()},
                     "all": {str(b): rp.r3((out["group A (128 in mixed)"][b] + out["group B (512 in mixed)"][b]) / len(qs)) for b in (512, 1024, 2048)},
                     "long_chunk_share_of_index": rp.r3(np.mean([r["s"] == "fixed-512-64" for r in rows])),
                     "long_chunk_share_of_top10": rp.r3(np.mean(long_share)), "top1_from_own_paper": rp.r3(own / len(qs))}
        print(name, res[name], flush=True)
    rp.save("mixed.json", res)


if __name__ == "__main__":
    main()

"""Deduplication and diversity, measured (deterministic, precomputed vectors, no lock).
1. Near-duplicates in each corpus: pairs of documents with cosine >= 0.95 / 0.98 (bge-small vectors), and in the
   QASPER default chunks (fixed-256-32, which overlap by construction).
2. MMR (Carbonell and Goldstein 1998): next = argmax over candidates d of
      lambda * sim(q, d) - (1 - lambda) * max over already chosen s of sim(d, s)
   applied to a dense top-50, lambda from 1.0 (plain ranking) down to 0.3, on
   - HotpotQA multi-hop (200 questions, 9,760 paragraphs): both gold paragraphs in the top k;
   - NFCorpus (323 test queries, many relevant documents each): nDCG@10, relevant in the top 10, redundancy;
   - SciFact (300 test claims, mostly one relevant abstract): nDCG@10 (what diversity costs when there is one answer).
3. QASPER within-paper, overlapping default chunks: hand over chunks by budget with and without dropping a chunk
   whose text overlaps an already chosen one, and with MMR.
Output: out/mmr.json"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import numpy as np
import rp

L, PC = rp.L, rp.PC
sys.path.insert(0, os.path.join(rp.ROOT_SRC, "pipe"))
LAMS = [1.0, 0.9, 0.8, 0.7, 0.6, 0.5, 0.3]


def mmr(qv, C, lam, k):
    """qv: query vector; C: candidate vectors (rows, unit norm) in first-stage order. Returns indices into C."""
    sq = C @ qv
    if lam >= 1.0:
        return list(np.argsort(-sq, kind="stable")[:k])
    S = C @ C.T
    chosen, rest = [], list(range(len(C)))
    while rest and len(chosen) < k:
        if chosen:
            red = S[np.ix_(rest, chosen)].max(axis=1)
        else:
            red = np.zeros(len(rest))
        sc = lam * sq[rest] - (1 - lam) * red
        j = rest[int(np.argmax(sc))]
        chosen.append(j); rest.remove(j)
    return chosen


def neardup(X, thr):
    n, cnt = X.shape[0], {t: 0 for t in thr}
    docs = {t: set() for t in thr}
    for i in range(0, n, 1024):
        S = X[i:i + 1024] @ X.T
        for t in thr:
            r, c = np.where(S >= t)
            m = c > (r + i)
            cnt[t] += int(m.sum())
            docs[t].update((r[m] + i).tolist()); docs[t].update(c[m].tolist())
    return {str(t): {"pairs": cnt[t], "docs_involved": len(docs[t])} for t in thr}


def main():
    res = {"lambdas": LAMS}
    # ---- 1. near-duplicates
    nd = {}
    for ds in ("scifact", "nfcorpus", "hotpotqa"):
        ids, X = L.embeddings(ds, "bge-small")
        nd[ds] = {"docs": len(ids), **neardup(np.asarray(X), (0.95, 0.98, 0.995))}
    res["near_duplicates"] = nd
    print(nd, flush=True)
    # an example NFCorpus duplicate pair (titles) for the page
    corpus, _, _ = L.beir("nfcorpus")
    ids, X = L.embeddings("nfcorpus", "bge-small"); X = np.asarray(X)
    S = X[:400] @ X.T
    r, c = np.where(S >= 0.995)
    ex = [(ids[a], ids[b]) for a, b in zip(r, c) if b > a][:3]
    res["nfcorpus_dup_examples"] = [{"a": a, "b": b, "title_a": corpus[a]["title"][:90], "title_b": corpus[b]["title"][:90],
                                     "same_text": corpus[a]["text"] == corpus[b]["text"]} for a, b in ex]
    # ---- 2a. HotpotQA
    hq, hc = L.multihop()
    for model in ("bge-small", "qwen3-emb-0.6b"):
        cid, CX = L.embeddings("hotpotqa", model); CX = np.asarray(CX)
        qid, QX = L.embeddings("hotpotqa", model, "queries"); QX = np.asarray(QX)
        qpos = {q: i for i, q in enumerate(qid)}; cpos = {c: i for i, c in enumerate(cid)}
        R = {}
        for lam in LAMS:
            both = {2: 0, 5: 0, 10: 0}; rec = {2: 0, 5: 0, 10: 0}
            for q in hq:
                qv = QX[qpos[q["qid"]]]
                s = CX @ qv
                top = np.argsort(-s)[:50]
                pick = [top[j] for j in mmr(qv, CX[top], lam, 10)]
                got = [cid[j] for j in pick]
                for k in both:
                    g = sum(p in got[:k] for p in q["gold_pids"])
                    both[k] += g == len(q["gold_pids"]); rec[k] += g / len(q["gold_pids"])
            R[str(lam)] = {"both_gold@%d" % k: both[k] for k in both} | {"recall@%d" % k: rp.r3(rec[k] / len(hq)) for k in rec}
        res["hotpotqa_" + model] = R
        print("hotpot", model, R, flush=True)
    # ---- 2b. NFCorpus and SciFact
    for ds, model in (("nfcorpus", "bge-small"), ("nfcorpus", "qwen3-emb-0.6b"), ("scifact", "qwen3-emb-0.6b"), ("scifact", "bge-small")):
        _, _, qr = L.beir(ds); te = qr["test"]
        cid, CX = L.embeddings(ds, model); CX = np.asarray(CX)
        qid, QX = L.embeddings(ds, model, "queries"); QX = np.asarray(QX); qpos = {q: i for i, q in enumerate(qid)}
        R = {}
        for lam in LAMS:
            run, red, nrel = {}, [], []
            for q in te:
                qv = QX[qpos[q]]
                s = CX @ qv
                top = np.argsort(-s)[:50]
                pick = [top[j] for j in mmr(qv, CX[top], lam, 10)]
                run[q] = {cid[j]: float(10 - i) for i, j in enumerate(pick)}
                V = CX[pick]; G = V @ V.T
                red.append(float((G.sum() - 10) / 90))
                nrel.append(sum(qr["test"][q].get(cid[j], 0) > 0 for j in pick))
            pq = PC.per_query(run, te, ("ndcg_cut.10",))
            R[str(lam)] = {"ndcg10": rp.r3(PC.mean(pq, "ndcg_cut.10")), "relevant_in_top10": rp.r3(np.mean(nrel)), "mean_pairwise_cos_top10": rp.r3(np.mean(red))}
        res["%s_%s" % (ds, model)] = R
        print(ds, model, R, flush=True)
    # ---- 3. QASPER overlapping chunks, within paper, bge-small, by budget
    import chunk_eval as CE
    docs, qs = L.longdoc()
    rows = [json.loads(l) for l in open(L.path("pipe", "chunks", "fixed-256-32.jsonl"))]
    V = np.load(L.path("pipe", "chunks", "fixed-256-32.bge-small.npy"))
    for i, r in enumerate(rows):
        r["v"] = i
    by = {}
    for r in rows:
        by.setdefault(r["paper_id"], []).append(r)
    qids = open(L.path("pipe", "chunks", "questions.bge-small.ids")).read().split("\n")
    QV = np.load(L.path("pipe", "chunks", "questions.bge-small.npy")); qp = {q: i for i, q in enumerate(qids)}

    tokdoc = {}

    def fill(units, budget, dedup):
        if dedup == "merge":
            # overlapping or touching chunks are merged into one span; only the new tokens are paid for
            spans, used = [], 0
            for u in units:
                pid = u["paper_id"]
                new = [u["start"], u["end"]]
                hit = [s_ for s_ in spans if s_[0] <= new[1] and new[0] <= s_[1]]
                merged = [min([new[0]] + [h[0] for h in hit]), max([new[1]] + [h[1] for h in hit])]
                old = sum(tokdoc[pid].ntok(h[0], h[1]) for h in hit)
                cost = tokdoc[pid].ntok(*merged) - old
                if used + cost <= budget:
                    spans = [s_ for s_ in spans if s_ not in hit] + [merged]
                    used += cost
            return [{"start": a, "end": b} for a, b in spans]
        out, used = [], 0
        for u in units:
            if dedup and any(min(u["end"], o["end"]) - max(u["start"], o["start"]) > 0 for o in out):
                continue
            if used + u["n_tokens"] <= budget:
                out.append(u); used += u["n_tokens"]
        return out
    import chunkers as C
    tk = CE.load_tok()
    for d in docs:
        tokdoc[d["paper_id"]] = C.Doc(d, tk)
    Q = {}
    for name, lam, dedup in (("plain", 1.0, False), ("drop overlapping", 1.0, True), ("merge overlapping, pay once", 1.0, "merge"),
                             ("MMR 0.7", 0.7, False), ("MMR 0.5", 0.5, False)):
        hits = {b: 0 for b in (512, 1024, 2048)}
        for q in qs:
            cs = by[q["paper_id"]]
            C = V[[c["v"] for c in cs]]
            order = [cs[j] for j in mmr(QV[qp[q["qid"]]], C, lam, len(cs))] if lam < 1 else [cs[j] for j in np.argsort(-(C @ QV[qp[q["qid"]]]), kind="stable")]
            for b in hits:
                hits[b] += CE.hit(fill(order, b, dedup), q)
        Q[name] = {str(b): rp.r3(h / len(qs)) for b, h in hits.items()}
        print("qasper", name, Q[name], flush=True)
    res["qasper_fixed-256-32_bge"] = Q
    rp.save("mmr.json", res)


if __name__ == "__main__":
    main()

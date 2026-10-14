"""Late interaction on the setup's stored ColBERT token vectors (answerai-colbert-small-v1, SciFact; deterministic,
CPU, no lock). Runs in the colenv (it has pylate for tokenising; numpy for the scores).
1 storage: token vectors per document, bytes per token and per document, against single-vector embeddings.
2 exhaustive MaxSim recomputed from the stored vectors (must equal the setup's colbert-small run, nDCG@10 0.743),
  and the same with the query's [MASK] expansion tokens dropped (query augmentation ablation).
3 ColBERT as a reranker: MaxSim over the top K of BM25, dense and hybrid, K sweep.
4 candidates for the MaxSim animation: claims whose relevant abstract ColBERT ranks first but Qwen3-Embedding ranks low.
Output: data/colbert.json and $RAG_SCRATCH/rr/colbert_qtok.json (query token ids)"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import numpy as np
from rrlib import L, DS, first_stages, rerank, per_query, mean, r3, save, work

KS = [10, 20, 30, 50, 100]


def main():
    corpus, queries, qrels = L.beir(DS)
    qt = qrels["test"]
    p = L.path("data", "colbert", DS)
    D = np.load(os.path.join(p, "doc_tokens.npy")).astype(np.float32)
    off = np.load(os.path.join(p, "doc_offsets.npy"))
    Qv = np.load(os.path.join(p, "query_tokens.npy")).astype(np.float32)
    qoff = np.load(os.path.join(p, "query_offsets.npy"))
    dids = open(os.path.join(p, "doc_ids.txt")).read().split("\n")
    qids = open(os.path.join(p, "query_ids.txt")).read().split("\n")
    dpos = {d: i for i, d in enumerate(dids)}
    lens = np.diff(off)
    # query token ids (to find the [MASK] expansion tokens): pylate's own tokenizer, no model forward
    from pylate import models
    m = models.ColBERT(model_name_or_path=L.path("models", L.COLBERT), device="cpu")
    tok = m.tokenize([queries[q] for q in qids], is_query=True)
    ids = tok["input_ids"].numpy()
    mask_id = m.tokenizer.mask_token_id
    real = ids != mask_id
    json.dump({"qids": qids, "input_ids": ids.tolist(), "mask_id": int(mask_id),
               "tokens": [m.tokenizer.convert_ids_to_tokens(r) for r in ids.tolist()]}, open(work("colbert_qtok.json"), "w"))
    assert ids.shape[1] == qoff[1] - qoff[0], (ids.shape, qoff[:3])
    out = {"model": L.COLBERT, "dim": int(D.shape[1]), "n_docs": len(dids), "n_tokens": int(lens.sum()),
           "tok_mean": r3(lens.mean()), "tok_median": int(np.median(lens)), "tok_max": int(lens.max()), "tok_min": int(lens.min()),
           "query_len": int(ids.shape[1]), "query_real_mean": r3(real.sum(1).mean()),
           "query_real_min": int(real.sum(1).min()), "query_real_max": int(real.sum(1).max())}
    out["bytes_fp16_total"] = int(lens.sum() * D.shape[1] * 2)
    out["bytes_per_doc_fp16"] = r3(lens.mean() * D.shape[1] * 2)
    out["single_vector_bytes"] = {"qwen3-emb-0.6b fp32": 1024 * 4, "bge-small fp32": 384 * 4}
    out["corpus_bytes_single"] = {"qwen3-emb-0.6b fp32": len(dids) * 1024 * 4, "bge-small fp32": len(dids) * 384 * 4}
    # 2 exhaustive MaxSim, all tokens and real tokens only
    seg = off[:-1]

    def exhaustive(qrows):
        S = qrows @ D.T  # [lq, n_tokens]
        mx = np.maximum.reduceat(S, seg, axis=1)  # [lq, n_docs]: best document token per query token
        return mx.sum(0)

    runs = {"all32": {}, "real_only": {}}
    contrib = []
    for i, q in enumerate(qids):
        qr = Qv[qoff[i]:qoff[i + 1]]
        S = qr @ D.T
        mx = np.maximum.reduceat(S, seg, axis=1)
        s_all = mx.sum(0)
        s_real = mx[real[i]].sum(0)
        for name, s in (("all32", s_all), ("real_only", s_real)):
            top = np.argpartition(-s, 100)[:100]
            top = top[np.argsort(-s[top])]
            runs[name][q] = {dids[j]: float(s[j]) for j in top}
        j = int(np.argmax(s_all))
        contrib.append(float(mx[~real[i], j].sum() / s_all[j]))
    ref = L.run(DS, "colbert-small")
    out["exhaustive"] = {k: {kk: r3(v) for kk, v in L.evaluate(r, qt, ("ndcg_cut_10", "recall_100", "recall_10")).items()} for k, r in runs.items()}
    out["exhaustive"]["setup_run"] = {kk: r3(v) for kk, v in L.evaluate(ref, qt, ("ndcg_cut_10", "recall_100", "recall_10")).items()}
    same_top10 = np.mean([list(runs["all32"][q])[:10] == list(ref[q])[:10] for q in qids])
    out["exhaustive"]["top10_identical_to_setup"] = r3(same_top10)
    out["mask_share_of_top_score"] = r3(np.mean(contrib))
    print("exhaustive", out["exhaustive"], "mask share", out["mask_share_of_top_score"])
    # 3 ColBERT as a reranker of each first stage
    FS = first_stages()
    qi = {q: i for i, q in enumerate(qids)}
    cache = {}

    def maxsim(q, d):
        k = (q, d)
        if k not in cache:
            qr = Qv[qoff[qi[q]]:qoff[qi[q] + 1]]
            j = dpos[d]
            cache[k] = float((qr @ D[off[j]:off[j + 1]].T).max(1).sum())
        return cache[k]

    S = {q: {} for q in qids}
    for fn, first in FS.items():
        for q in qids:
            for d in list(first[q])[:100]:
                S[q][d] = maxsim(q, d)
    out["rerank"] = {}
    for fn, first in FS.items():
        row = {}
        pq0 = per_query(first, qt)
        for K in KS:
            run, miss = rerank(first, S, K, qt)
            assert miss == 0
            pq = per_query(run, qt)
            row[str(K)] = {"ndcg10": r3(mean(pq, "ndcg_cut.10")), "r10": r3(mean(pq, "recall.10"))}
        out["rerank"][fn] = {"first_ndcg10": r3(mean(pq0, "ndcg_cut.10")), "sweep": row}
        print("colbert rerank", fn, row)
    # 4 animation candidates
    de = FS["dense"]
    cands = []
    for q in qids:
        rel = list(qt[q])
        colrank = {d: r for r, d in enumerate(runs["all32"][q])}
        derank = {d: r for r, d in enumerate(de[q])}
        for d in rel:
            if colrank.get(d) == 0 and derank.get(d, 999) >= 5:
                cands.append({"qid": q, "doc": d, "dense_rank": derank.get(d, 999) + 1, "doc_tokens": int(lens[dpos[d]]),
                              "real_q": int(real[qi[q]].sum()), "claim": queries[q]})
    cands.sort(key=lambda c: (c["doc_tokens"], -c["dense_rank"]))
    out["anim_candidates"] = cands[:15]
    for c in cands[:15]:
        print(c)
    save("colbert.json", out)


if __name__ == "__main__":
    main()

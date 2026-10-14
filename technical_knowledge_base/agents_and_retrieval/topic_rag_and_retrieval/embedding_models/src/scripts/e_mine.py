"""Hard-negative pools for the tiny fine-tune, and how many of them are probably false negatives. CPU, no lock.
For every SciFact TRAIN claim (809) and each labelled positive:
  bm25   : BM25's top 30 (bm25s Lucene k1 1.2 b 0.75, stopwords, Snowball, as the running example) minus labelled
  dense  : bge-small's top 30 by the setup's stored vectors (exact search) minus labelled
  dense_f: dense, minus candidates whose bge-small cosine is above 0.95 x the positive's cosine (the "relative
           margin 0.05" of sentence-transformers' mine_hard_negatives; NV-Retriever's TopK-PercPos at 95%,
           arXiv 2407.15831)
Each run samples one negative per (claim, positive) per epoch from the top 10 of its pool (seeded).
Also: overlap of the pools; where the positive itself ranks; share of claims with a candidate above the positive under
bge-small and under Qwen3-Embedding (two different models agreeing is a stronger hint of a missing label); the most
suspicious examples, with text, for the page.
usage: python -I -B e_mine.py   -> $RAG_SCRATCH/emb/negatives.json (pools) and ../data/mine.json (summary)"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from emblib import L, corpus_vectors, query_vectors, scratch, save, r4  # noqa: E402

corpus, queries, qrels = L.beir("scifact")
tr = qrels["train"]
trq = sorted(tr, key=int)
pairs = [(q, d) for q in trq for d in sorted(tr[q], key=int)]

# BM25 (same settings as the running example's index)
import bm25s, Stemmer  # noqa: E402
stem = Stemmer.Stemmer("english")
dids = list(corpus)
ret = bm25s.BM25(method="lucene", k1=1.2, b=0.75)
ret.index(bm25s.tokenize([L.doc_text(corpus[d]) for d in dids], stopwords="en", stemmer=stem, show_progress=False), show_progress=False)
res, _ = ret.retrieve(bm25s.tokenize([queries[q] for q in trq], stopwords="en", stemmer=stem, show_progress=False), k=40, show_progress=False, n_threads=1)
bm = {q: [dids[res[i, j]] for j in range(40)] for i, q in enumerate(trq)}

S = {}
for m in ("bge-small", "qwen3-emb-0.6b"):
    ids, X = corpus_vectors("scifact", m)
    Q = query_vectors("scifact", m, trq)
    S[m] = (ids, {d: i for i, d in enumerate(ids)}, Q @ X.T)
ids, pos_of, Sb = S["bge-small"]
_, _, Sq = S["qwen3-emb-0.6b"]

pools = {"bm25": {}, "dense": {}, "dense_f": {}}
n_filtered, n_cand, pos_rank, above_b, above_q, above_both = 0, 0, [], 0, 0, 0
sus = []
first_kept = []
for i, q in enumerate(trq):
    order = np.argsort(-Sb[i], kind="stable")
    rank = {ids[j]: r for r, j in enumerate(order[:200])}
    dense_all = [ids[j] for j in order[:200] if ids[j] not in tr[q]]
    dense = dense_all[:30]
    for d in sorted(tr[q], key=int):
        ps = Sb[i, pos_of[d]]
        pos_rank.append(rank.get(d, 200) + 1)
        key = q + "|" + d
        pools["bm25"][key] = [x for x in bm[q] if x not in tr[q]][:30]
        pools["dense"][key] = dense
        keep = [x for x in dense_all if Sb[i, pos_of[x]] < 0.95 * ps]
        n_cand += len(dense[:10]); n_filtered += sum(1 for x in dense[:10] if Sb[i, pos_of[x]] >= 0.95 * ps)
        pools["dense_f"][key] = keep[:30]
        first_kept.append(dense_all.index(keep[0]) + 1 if keep else 201)
        top_b = dense[0]
        jq = int(np.argmax([Sq[i, pos_of[x]] if x not in tr[q] else -9 for x in ids]))
        qpos = Sq[i, pos_of[d]]
        hb = Sb[i, pos_of[top_b]] > ps
        hq = Sq[i, jq] > qpos
        above_b += hb; above_q += hq; above_both += hb and hq
        if hb and hq and top_b == ids[jq]:
            sus.append(dict(qid=q, claim=queries[q], pos=d, pos_title=corpus[d]["title"], neg=top_b,
                            neg_title=corpus[top_b]["title"], neg_text=corpus[top_b]["text"][:400],
                            bge_pos=r4(ps), bge_neg=r4(Sb[i, pos_of[top_b]]), qw_pos=r4(qpos), qw_neg=r4(Sq[i, jq]),
                            margin=r4(Sb[i, pos_of[top_b]] - ps + Sq[i, jq] - qpos)))
# the root's per-claim figure (first labelled positive by id, top non-relevant over the whole corpus)
first = {}
for m in ("bge-small", "qwen3-emb-0.6b"):
    ids_m, po, Sm = S[m]
    c = 0
    for i, q in enumerate(trq):
        d = sorted(tr[q], key=int)[0]
        best = max(Sm[i, j] for j in np.argsort(-Sm[i])[:50] if ids_m[j] not in tr[q])
        c += best > Sm[i, po[d]]
    first[m] = r4(c / len(trq))
sus.sort(key=lambda x: -x["margin"])
ov = np.mean([len(set(pools["bm25"][k][:10]) & set(pools["dense"][k][:10])) / 10 for k in pools["bm25"]])
short = [len(v) for v in pools["dense_f"].values()]
json.dump(dict(pairs=pairs, pools=pools), open(scratch("negatives.json"), "w"))
pr = np.array(pos_rank)
from collections import Counter  # noqa: E402
cnt = Counter(d for _, d in pairs)
shared = dict(abstracts=sum(1 for v in cnt.values() if v > 1), pairs=sum(v for v in cnt.values() if v > 1),
              p_batch32=r4(1 - np.prod([1 - (sum(v * (v - 1) for v in cnt.values()) / (len(pairs) * (len(pairs) - 1)))] * (32 * 31 // 2))))
out = dict(asof="2026-10-14", n_claims=len(trq), n_pairs=len(pairs), shared_pos=shared,
           pos_rank_bge=dict(first=r4((pr == 1).mean()), top10=r4((pr <= 10).mean()), median=int(np.median(pr))),
           above_pos_bge=r4(above_b / len(pairs)), above_pos_qwen3=r4(above_q / len(pairs)),
           above_pos_both=r4(above_both / len(pairs)), same_top_both=len(sus), root_check_per_claim=first,
           filtered_top10_share=r4(n_filtered / n_cand), dense_f_short=int(sum(1 for x in short if x < 10)), dense_f_empty=int(sum(1 for x in short if x == 0)), dense_f_first_rank_median=float(np.median(first_kept)),
           overlap_bm25_dense_top10=r4(ov),
           examples=sus[:30])
save("mine.json", out)
print({k: v for k, v in out.items() if k != "examples"})
for e in sus[:4]:
    print(e["claim"], "|", e["pos_title"], "|", e["neg_title"], e["bge_pos"], e["bge_neg"], e["qw_pos"], e["qw_neg"])

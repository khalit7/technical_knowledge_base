"""Data for the MaxSim animation: real (claim, abstract) pairs with the token strings behind every stored ColBERT
vector, the full query-token x document-token similarity matrix (from the setup's stored float16 vectors), and the
candidate list each pair sits in, scored two ways (Qwen3-Embedding cosine: one vector each; ColBERT MaxSim).
Token strings: pylate 1.6.0 tokenises on CPU; the document's skiplist (punctuation) mask is applied exactly as
pylate's encode does, and the vectors are re-encoded on CPU (float32) to check they line up with the stored ones.
Runs in the colenv. Output: data/maxsim_pairs.json"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import torch
from rrlib import L, DS, r3, save

PAIRS = [("1180", "31272411"), ("268", "970012")]


def main():
    corpus, queries, qrels = L.beir(DS)
    qt = qrels["test"]
    p = L.path("data", "colbert", DS)
    D = np.load(os.path.join(p, "doc_tokens.npy"), mmap_mode="r")
    off = np.load(os.path.join(p, "doc_offsets.npy"))
    Qv = np.load(os.path.join(p, "query_tokens.npy"))
    qoff = np.load(os.path.join(p, "query_offsets.npy"))
    dids = open(os.path.join(p, "doc_ids.txt")).read().split("\n")
    qids = open(os.path.join(p, "query_ids.txt")).read().split("\n")
    dpos = {d: i for i, d in enumerate(dids)}
    qpos = {q: i for i, q in enumerate(qids)}
    from pylate import models
    m = models.ColBERT(model_name_or_path=L.path("models", L.COLBERT), device="cpu")
    ids, X = L.embeddings(DS, "qwen3-emb-0.6b")
    eq, EQ = L.embeddings(DS, "qwen3-emb-0.6b", "queries")
    epos = {d: i for i, d in enumerate(ids)}
    de = L.run(DS, "qwen3-emb-0.6b")
    out = {"pairs": []}
    for q, d in PAIRS:
        qtext, dtext = queries[q], L.doc_text(corpus[d])
        enc_q = m.encode([qtext], is_query=True, output_value=None, convert_to_numpy=False)
        enc_d = m.encode([dtext], is_query=False, output_value=None, convert_to_numpy=False)
        qid_ = enc_q["input_ids"][0][enc_q["masks"][0].bool()].tolist()
        did_ = enc_d["input_ids"][0][enc_d["masks"][0].bool()].tolist()
        qtok = m.tokenizer.convert_ids_to_tokens(qid_)
        dtok = m.tokenizer.convert_ids_to_tokens(did_)
        qe = enc_q["token_embeddings"][0][enc_q["masks"][0].bool()].float().numpy()
        dv = enc_d["token_embeddings"][0][enc_d["masks"][0].bool()].float().numpy()
        qs = Qv[qoff[qpos[q]]:qoff[qpos[q] + 1]].astype(np.float32)
        ds = np.asarray(D[off[dpos[d]]:off[dpos[d] + 1]], dtype=np.float32)
        assert qs.shape[0] == len(qtok) and ds.shape[0] == len(dtok), (qs.shape, len(qtok), ds.shape, len(dtok))
        cq = float(np.min(np.sum(qe / np.linalg.norm(qe, axis=1, keepdims=True) * qs, 1)))
        cd = float(np.min(np.sum(dv / np.linalg.norm(dv, axis=1, keepdims=True) * ds, 1)))
        Smat = qs @ ds.T
        realm = np.array([t != "[MASK]" for t in qtok])
        best = Smat.argmax(1)
        # candidate list: Qwen3 dense top 10 plus the pair's doc; both scores for each
        cl = list(de[q])[:10]
        if d not in cl:
            cl.append(d)
        qvec = np.asarray(EQ[eq.index(q)])
        cands = []
        for c in cl:
            cv = np.asarray(X[epos[c]])
            dsx = np.asarray(D[off[dpos[c]]:off[dpos[c] + 1]], dtype=np.float32)
            cands.append({"doc": c, "title": corpus[c]["title"][:110], "rel": c in qt[q],
                          "cos": r3(float(cv @ qvec)), "maxsim": r3(float((qs @ dsx.T).max(1).sum())), "maxsim_real": r3(float((qs[realm] @ dsx.T).max(1).sum())), "n_tok": int(dsx.shape[0])})
        out["pairs"].append({"qid": q, "doc": d, "claim": qtext, "title": corpus[d]["title"], "qtok": qtok, "dtok": dtok,
                             "sim": [[round(float(x), 2) for x in row] for row in Smat], "best": best.tolist(),
                             "best_sim": [r3(Smat[i, best[i]]) for i in range(len(qtok))],
                             "maxsim": r3(Smat.max(1).sum()), "check_cos_min_query": round(cq, 4), "check_cos_min_doc": round(cd, 4),
                             "doc_raw_tokens": int(enc_d["attention_mask"][0].sum()), "cands": cands})
        print(q, d, "tokens", len(qtok), len(dtok), "maxsim", r3(Smat.max(1).sum()), "check", round(cq, 4), round(cd, 4))
        print(" ".join(qtok)); print(" ".join(dtok[:60]))
    save("maxsim_pairs.json", out)


if __name__ == "__main__":
    torch.set_num_threads(2)
    main()

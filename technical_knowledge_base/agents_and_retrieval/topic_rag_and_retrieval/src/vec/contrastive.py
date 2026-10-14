"""Contrastive training, shown on real vectors without training anything.
A batch of SciFact TRAIN claims, each with one relevant abstract (its positive). With the already-trained bge-small
and Qwen3-Embedding vectors we compute the batch's cosine matrix (claims x abstracts): the diagonal is the
positives, everything else in a row is an in-batch negative. A hard negative per claim = the highest-scoring
non-relevant abstract of the whole corpus under the same model (dense-mined). The page computes the InfoNCE loss
from these cosines live (temperature slider). Also, over all train claims: how often the positive already ranks
first among B in-batch candidates, for several batch sizes (seeded random batches): bigger batches are a harder
task. No fine-tune is run here (that belongs to the Embedding models child page).
Writes out/contrastive.json."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from common import L, save

corpus, queries, qrels = L.beir("scifact")
train = qrels["train"]
rng = np.random.default_rng(0)


def short(did):
    d = corpus[did]; return (d["title"] or d["text"])[:100]


out = dict(asof="2026-10-14", set="SciFact train claims with a relevant abstract", models={})
qid_list = sorted(train, key=lambda q: int(q))
pairs = [(q, sorted(train[q], key=int)[0]) for q in qid_list]
# one fixed batch of 8 short claims, seeded
short_ok = [p for p in pairs if len(queries[p[0]]) <= 80]
bi = rng.choice(len(short_ok), 8, replace=False)
batch = [short_ok[i] for i in sorted(bi)]
out["batch"] = [dict(qid=q, claim=queries[q], pos=d, pos_title=short(d)) for q, d in batch]
out["n_train_pairs"] = len(pairs)

for model in ("bge-small", "qwen3-emb-0.6b"):
    ids, X = L.embeddings("scifact", model)
    qids, Qa = L.embeddings("scifact", model, "queries")
    pos = {d: i for i, d in enumerate(ids)}; qpos = {q: i for i, q in enumerate(qids)}
    Q = np.asarray(Qa[[qpos[q] for q, _ in pairs]], dtype=np.float32)
    P = np.asarray(X[[pos[d] for _, d in pairs]], dtype=np.float32)
    Xf = np.asarray(X, dtype=np.float32)
    # hard negatives for every train claim
    S = Q @ Xf.T
    hard = []
    for r, (q, _) in enumerate(pairs):
        o = np.argsort(-S[r], kind="stable")
        j = next(j for j in o if ids[j] not in train[q])
        hard.append(j)
    H = Xf[hard]
    # the shown batch
    rows = [pairs.index(p) for p in batch]
    C = Q[rows] @ P[rows].T
    hn = np.einsum("bd,bd->b", Q[rows], H[rows])
    out["models"][model] = dict(
        cos=[[round(float(x), 4) for x in r] for r in C],
        hard=[dict(id=ids[hard[r]], title=short(ids[hard[r]]), cos=round(float(c), 4)) for r, c in zip(rows, hn)])
    # batch-size sweep: share of claims whose positive ranks first among the batch's B abstracts (+ its hard negative)
    sweep = []
    for B in (2, 8, 32, 128, 512):
        top1, top1h, loss, lossh, n = 0, 0, 0.0, 0.0, 0
        for rep in range(40 if B < 512 else 10):
            perm = rng.permutation(len(pairs))
            for s in range(0, len(perm) - B + 1, B):
                b = perm[s:s + B]
                Cb = Q[b] @ P[b].T
                hb = np.einsum("bd,bd->b", Q[b], H[b])
                diag = np.diag(Cb)
                top1 += int((Cb.max(1) <= diag + 1e-12).sum())
                top1h += int(((Cb.max(1) <= diag + 1e-12) & (hb < diag)).sum())
                for tau in (0.05,):
                    Z = Cb / tau; Zh = np.concatenate([Z, (hb / tau)[:, None]], 1)
                    lse = lambda A: A.max(1) + np.log(np.exp(A - A.max(1, keepdims=True)).sum(1))
                    loss += float((lse(Z) - np.diag(Z)).sum()); lossh += float((lse(Zh) - np.diag(Z)).sum())
                n += B
        sweep.append(dict(B=B, top1=round(top1 / n, 4), top1_with_hard=round(top1h / n, 4),
                          loss_tau005=round(loss / n, 4), loss_hard_tau005=round(lossh / n, 4), samples=n))
        print(model, sweep[-1], flush=True)
    out["models"][model]["sweep"] = sweep
    # how often the dense-mined hard negative outscores the labelled positive (a hint of false negatives)
    pp = np.einsum("bd,bd->b", Q, P); hh = np.einsum("bd,bd->b", Q, H)
    out["models"][model]["hard_beats_pos"] = round(float((hh > pp).mean()), 4)
    # Qwen3-Embedding's loss masks a negative whose score exceeds the positive's by more than 0.1 (arXiv 2506.05176, 3.1)
    out["models"][model]["hard_masked_01"] = round(float((hh > pp + 0.1).mean()), 4)
save("contrastive.json", out)

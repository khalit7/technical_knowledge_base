"""A tiny real training run: fine-tune the MS MARCO cross-encoder (ms-marco-MiniLM-L6-v2) on SciFact's TRAIN claims,
with hard negatives (BM25's top 30 non-relevant abstracts) or random negatives, and measure reranking on the TEST
claims. Hold the bench lock (MPS). Labelled tiny: 809 train claims, 1 epoch, one learning rate, 2 seeds.
Loss: pointwise binary cross-entropy on the logit (relevant = 1, negative = 0), 1 positive : 7 negatives per claim
per epoch, AdamW lr 2e-5, batch 16, linear warm-up 10%, max length 512, fp32 on MPS.
Evaluation: rerank the BM25 and hybrid top 30 of the 300 test claims; nDCG@10 with the root's pytrec_eval helper.
usage: python -I -B e_train.py        Output: data/train.json (appends per variant and seed)"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import random
import time
import numpy as np
import torch
from rrlib import L, DS, first_stages, rerank, per_query, mean, r3, DATA

NEG = 7


def bm25_train(corpus, queries, qids):
    import bm25s, Stemmer
    stem = Stemmer.Stemmer("english")
    dids = list(corpus)
    ret = bm25s.BM25(method="lucene", k1=1.2, b=0.75)
    ret.index(bm25s.tokenize([L.doc_text(corpus[d]) for d in dids], stopwords="en", stemmer=stem, show_progress=False), show_progress=False)
    res, sc = ret.retrieve(bm25s.tokenize([queries[q] for q in qids], stopwords="en", stemmer=stem, show_progress=False), k=30, show_progress=False, n_threads=1)
    return {q: [dids[res[i, j]] for j in range(30)] for i, q in enumerate(qids)}


def score(model, tok, pairs, bs=32):
    out = []
    model.eval()
    order = np.argsort([-len(a) - len(b) for a, b in pairs])
    with torch.no_grad():
        for i in range(0, len(pairs), bs):
            idx = order[i:i + bs]
            enc = tok([pairs[j][0] for j in idx], [pairs[j][1] for j in idx], truncation="only_second", max_length=512,
                      padding=True, return_tensors="pt").to("mps")
            lg = model(**enc).logits[:, 0].float().cpu().numpy()
            out += list(zip(idx, lg))
    s = np.zeros(len(pairs))
    for j, v in out:
        s[j] = v
    return s


def evaluate(model, tok, corpus, queries, qt, FS):
    res = {}
    for fn in ("bm25", "hybrid"):
        keys = [(q, d) for q in qt for d in list(FS[fn][q])[:30]]
        sc = score(model, tok, [(queries[q], L.doc_text(corpus[d])) for q, d in keys])
        S = {}
        for (q, d), v in zip(keys, sc):
            S.setdefault(q, {})[d] = float(v)
        run, _ = rerank(FS[fn], S, 30, qt)
        res[fn] = r3(mean(per_query(run, qt), "ndcg_cut.10"))
    return res


def main():
    from transformers import AutoTokenizer, AutoModelForSequenceClassification, get_linear_schedule_with_warmup
    corpus, queries, qrels = L.beir(DS)
    qt, qtr = qrels["test"], qrels["train"]
    trq = sorted(qtr, key=int)
    FS = first_stages()
    hard = bm25_train(corpus, queries, trq)
    dids = list(corpus)
    md = L.model_dir("ce-minilm-l6")
    tok = AutoTokenizer.from_pretrained(md)
    path = os.path.join(DATA, "train.json")
    allr = json.load(open(path)) if os.path.exists(path) else {"runs": []}
    la0 = os.getloadavg()
    base = AutoModelForSequenceClassification.from_pretrained(md).to("mps")
    if not any(r["variant"] == "zero-shot" for r in allr["runs"]):
        allr["runs"].append({"variant": "zero-shot", "seed": None, **evaluate(base, tok, corpus, queries, qt, FS)})
        print(allr["runs"][-1], flush=True)
    del base
    n_hard_pool = []
    for variant in ("hard", "random"):
        for seed in (0, 1):
            if any(r["variant"] == variant and r["seed"] == seed for r in allr["runs"]):
                continue
            rng = random.Random(seed)
            torch.manual_seed(seed)
            ex = []
            for q in trq:
                for d in qtr[q]:
                    ex.append((queries[q], L.doc_text(corpus[d]), 1.0))
                pool = [d for d in hard[q] if d not in qtr[q]] if variant == "hard" else None
                if variant == "hard":
                    n_hard_pool.append(len(pool))
                negs = rng.sample(pool, min(NEG, len(pool))) if variant == "hard" else rng.sample([d for d in dids if d not in qtr[q]], NEG)
                for d in negs:
                    ex.append((queries[q], L.doc_text(corpus[d]), 0.0))
            rng.shuffle(ex)
            model = AutoModelForSequenceClassification.from_pretrained(md).to("mps")
            opt = torch.optim.AdamW(model.parameters(), lr=2e-5)
            bs = 16
            steps = (len(ex) + bs - 1) // bs
            sch = get_linear_schedule_with_warmup(opt, int(0.1 * steps), steps)
            lossf = torch.nn.BCEWithLogitsLoss()
            model.train()
            t0 = time.perf_counter()
            losses = []
            for i in range(0, len(ex), bs):
                b = ex[i:i + bs]
                enc = tok([x[0] for x in b], [x[1] for x in b], truncation="only_second", max_length=512, padding=True, return_tensors="pt").to("mps")
                y = torch.tensor([x[2] for x in b], device="mps")
                loss = lossf(model(**enc).logits[:, 0], y)
                loss.backward(); opt.step(); sch.step(); opt.zero_grad()
                losses.append(float(loss))
            torch.mps.synchronize()
            tt = time.perf_counter() - t0
            r = {"variant": variant, "seed": seed, "examples": len(ex), "train_s": round(tt, 1),
                 "loss_first50": r3(np.mean(losses[:50])), "loss_last50": r3(np.mean(losses[-50:])),
                 **evaluate(model, tok, corpus, queries, qt, FS)}
            allr["runs"].append(r)
            print(r, flush=True)
            json.dump(allr, open(path, "w"), indent=1)
            del model, opt
            torch.mps.empty_cache()
    allr["loadavg_before"] = [round(x, 2) for x in la0]
    allr["loadavg_after"] = [round(x, 2) for x in os.getloadavg()]
    allr["train_claims"] = len(trq)
    json.dump(allr, open(path, "w"), indent=1)


if __name__ == "__main__":
    main()

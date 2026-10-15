"""A tiny real contrastive fine-tune of bge-small-en-v1.5 on SciFact's TRAIN claims (809 claims, 919 claim-abstract
pairs), measured on the TEST claims of SciFact and NFCorpus. Hold the bench lock (MPS). Labelled tiny.

Model: the setup's bge-small (BERT, 33 M), CLS pooling + L2 normalisation, exactly as its sentence-transformers
modules (checked against SentenceTransformer.encode by e_pooling.py), query prefix "Represent this sentence for
searching relevant passages: " on claims, nothing on abstracts, max 512 tokens, float32 on MPS.
Loss: InfoNCE / MultipleNegativesRankingLoss with scale 20 (temperature 0.05, sentence-transformers' default): each
claim against every positive in the batch plus every mined negative in the batch; columns that are labelled relevant
for the claim (other than its own positive) are masked out, so a shared abstract is never a negative.
Large batches use gradient caching (Gao et al. 2021, arXiv 2101.06983; what CachedMultipleNegativesRankingLoss
does): embeddings are computed without gradients in chunks of 16, the loss gives gradients on the embeddings, then
each chunk is re-encoded with gradients and back-propagated. The result equals the plain loss; memory is that of 16.
Optimiser AdamW lr 2e-5, weight decay 0.01, linear warm-up 10% then linear decay, EPOCHS epochs, seeds 0 1 2.
Variants (negatives from e_mine.py; one negative per pair per epoch sampled from the top 10 of the pool):
  inbatch   no mined negative (B in-batch candidates only)   B = 32 (and B = 8, 128 for the batch-size effect)
  bm25      + 1 BM25-mined negative                          B = 32
  dense     + 1 bge-small-mined negative                     B = 32
  dense_f   + 1 bge-small-mined negative after the 0.95 x positive filter   B = 32
Evaluation: re-encode SciFact (5,183) and NFCorpus (3,633) corpora and their test queries with the trained weights;
nDCG@10, recall@100 with pytrec_eval (the root's helper); per-query values saved for paired bootstraps.
Snapshots: every SNAP steps (and at 0 and the end) the vectors of a fixed set of 72 texts (12 test claims, their
positives, 3 hard negatives each, 12 random abstracts) for the animation.
usage: python -I -B e_train.py [variant ...] [--seeds 0,1,2] [--epochs 2] [--smoke]
       --smoke: CPU, 32 pairs, 2 steps, 200-document eval: checks the code only, writes nothing to data/.
Writes ../data/train_runs.json (appends) and $RAG_SCRATCH/emb/train/<run>.npz (per-query values, snapshots)."""
import json
import math
import os
import random
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import torch  # noqa: E402
import torch.nn.functional as F  # noqa: E402
from emblib import L, golden, per_query, scratch, DATA, r4  # noqa: E402

PREFIX = L.query_prefix("bge-small", "scifact")
VARIANTS = {"inbatch": (None, 32), "inbatch8": (None, 8), "inbatch128": (None, 128),
            "bm25": ("bm25", 32), "dense": ("dense", 32), "dense_f": ("dense_f", 32)}
CHUNK, SCALE, LR, MAXLEN, SNAP = 16, 20.0, 2e-5, 512, 4


def args():
    a = sys.argv[1:]
    o = dict(variants=[x for x in a if not x.startswith("--") and x in VARIANTS], seeds=[0, 1, 2], epochs=2, smoke="--smoke" in a)
    for i, x in enumerate(a):
        if x == "--seeds":
            o["seeds"] = [int(s) for s in a[i + 1].split(",")]
        if x == "--epochs":
            o["epochs"] = int(a[i + 1])
    o["variants"] = o["variants"] or ["inbatch", "bm25", "dense", "dense_f", "inbatch8", "inbatch128"]
    return o


def encode(model, tok, texts, dev, bs=64, grad=False):
    out = []
    for i in range(0, len(texts), bs):
        enc = tok(texts[i:i + bs], truncation=True, max_length=MAXLEN, padding=True, return_tensors="pt").to(dev)
        with torch.set_grad_enabled(grad):
            h = model(**enc).last_hidden_state[:, 0]  # CLS pooling
            out.append(F.normalize(h, dim=-1))
    return torch.cat(out) if out else torch.zeros(0)


def ordered_encode(model, tok, texts, dev, bs=64):
    """no-grad encode, sorted by length for speed, returned in input order (float32 numpy)."""
    o = np.argsort([-len(t) for t in texts])
    E = np.zeros((len(texts), model.config.hidden_size), np.float32)
    model.eval()
    for i in range(0, len(o), bs):
        idx = o[i:i + bs]
        E[idx] = encode(model, tok, [texts[j] for j in idx], dev, bs).float().cpu().numpy()
    return E


def evaluate(model, tok, dev, smoke=False):
    res, pq_all = {}, {}
    for ds in ("scifact", "nfcorpus"):
        corpus, queries, qrels = L.beir(ds)
        gold = golden(ds)
        qt = {q: v for q, v in qrels["test"].items() if q in set(gold)}
        dids = list(corpus)
        if smoke:
            keep = set(d for v in list(qt.values())[:20] for d in v)
            dids = [d for d in dids if d in keep] + [d for d in dids if d not in keep][:200]
            qt = dict(list(qt.items())[:20])
        X = ordered_encode(model, tok, [L.doc_text(corpus[d]) for d in dids], dev)
        qs = sorted(qt)
        Q = ordered_encode(model, tok, [L.query_prefix("bge-small", ds) + queries[q] for q in qs], dev)
        S = Q @ X.T
        run = {}
        for r, q in enumerate(qs):
            idx = np.argsort(-S[r], kind="stable")[:100]
            run[q] = {dids[j]: float(S[r, j]) for j in idx}
        pq, order = per_query(run, qt)
        res[ds] = dict(ndcg10=r4(pq["ndcg_cut.10"].mean()), recall100=r4(pq["recall.100"].mean()))
        pq_all[ds] = pq["ndcg_cut.10"]
    model.train()
    return res, pq_all


def snap_texts():
    """72 fixed texts: 12 test claims (seeded), their first positive, their 3 top bge-small non-relevant abstracts, 12 random."""
    corpus, queries, qrels = L.beir("scifact")
    gold = golden("scifact")
    rng = random.Random(7)
    claims = sorted(rng.sample([q for q in gold if q in qrels["test"] and len(queries[q]) <= 110], 12), key=int)
    ids, X = L.embeddings("scifact", "bge-small")
    X = np.asarray(X, np.float32)
    allq, Qa = L.embeddings("scifact", "bge-small", "queries")
    qp = {q: i for i, q in enumerate(allq)}
    items = []
    for q in claims:
        items.append(dict(kind="claim", id=q, group=q, text=queries[q]))
        p = sorted(qrels["test"][q], key=int)[0]
        items.append(dict(kind="pos", id=p, group=q, text=L.doc_text(corpus[p])))
        s = X @ np.asarray(Qa[qp[q]], np.float32)
        negs = [ids[j] for j in np.argsort(-s) if ids[j] not in qrels["test"][q]][:3]
        items += [dict(kind="neg", id=d, group=q, text=L.doc_text(corpus[d])) for d in negs]
    used = set(x["id"] for x in items)
    for d in rng.sample([d for d in ids if d not in used], 12):
        items.append(dict(kind="rand", id=d, group="", text=L.doc_text(corpus[d])))
    return items


def snapshot(model, tok, dev, items):
    t = [(PREFIX + x["text"]) if x["kind"] == "claim" else x["text"] for x in items]
    return ordered_encode(model, tok, t, dev).astype(np.float16)


def loss_fn(Qe, De, mask):
    S = (Qe @ De.T) * SCALE
    S = S.masked_fill(mask, -1e4)
    tgt = torch.arange(Qe.shape[0], device=Qe.device)  # positives are the first B columns
    return F.cross_entropy(S, tgt)


def run_one(variant, seed, epochs, smoke, data, items, tok, md, dev):
    from transformers import AutoModel, get_linear_schedule_with_warmup
    pool_name, B = VARIANTS[variant]
    corpus, queries, tr, pairs, pools = data
    rng = random.Random(seed)
    torch.manual_seed(seed)
    model = AutoModel.from_pretrained(md).to(dev)
    model.train()
    nopt = [p for n, p in model.named_parameters() if "bias" in n or "LayerNorm" in n]
    yopt = [p for n, p in model.named_parameters() if not ("bias" in n or "LayerNorm" in n)]
    opt = torch.optim.AdamW([{"params": yopt, "weight_decay": 0.01}, {"params": nopt, "weight_decay": 0.0}], lr=LR)
    if smoke:
        B = min(B, 32)
    P = pairs[:2 * B] if smoke else pairs
    steps_per_epoch = len(P) // B
    total = steps_per_epoch * epochs
    sch = get_linear_schedule_with_warmup(opt, max(1, int(0.1 * total)), total)
    snaps, snap_steps, losses = [snapshot(model, tok, dev, items)], [0], []
    t0 = time.perf_counter()
    step = 0
    for ep in range(epochs):
        order = list(range(len(P)))
        rng.shuffle(order)
        for b in range(steps_per_epoch):
            bp = [P[i] for i in order[b * B:(b + 1) * B]]
            qtext = [PREFIX + queries[q] for q, _ in bp]
            dlist = [d for _, d in bp]
            if pool_name:
                dlist += [rng.choice(pools[pool_name][q + "|" + d][:10]) if pools[pool_name][q + "|" + d] else rng.choice(list(corpus))
                          for q, d in bp]
            dtext = [L.doc_text(corpus[d]) for d in dlist]
            # mask: column j is masked for row i when doc j is relevant to claim i and is not column i itself
            mask = torch.tensor([[(dlist[j] in tr[q]) and j != i for j in range(len(dlist))] for i, (q, _) in enumerate(bp)], device=dev)
            # gradient cache: 1) embeddings without grad
            with torch.no_grad():
                Qe = torch.cat([encode(model, tok, qtext[i:i + CHUNK], dev) for i in range(0, len(qtext), CHUNK)])
                De = torch.cat([encode(model, tok, dtext[i:i + CHUNK], dev) for i in range(0, len(dtext), CHUNK)])
            Qe.requires_grad_(True); De.requires_grad_(True)
            loss = loss_fn(Qe, De, mask)
            loss.backward()
            gq, gd = Qe.grad.detach(), De.grad.detach()
            # 2) re-encode each chunk with grad, back-propagate the cached embedding gradients
            for txt, g in ((qtext, gq), (dtext, gd)):
                for i in range(0, len(txt), CHUNK):
                    e = encode(model, tok, txt[i:i + CHUNK], dev, grad=True)
                    e.backward(g[i:i + CHUNK])
            opt.step(); sch.step(); opt.zero_grad(set_to_none=True)
            if dev == "mps":
                torch.mps.empty_cache()  # keep the MPS allocator from growing into swap (seen on 2026-10-15)
            losses.append(float(loss.detach()))
            step += 1
            if step % SNAP == 0 or step == total:
                snaps.append(snapshot(model, tok, dev, items)); snap_steps.append(step)
                print("  %s seed %d step %d/%d loss %.3f %.1f s load %.1f" % (variant, seed, step, total, float(loss), time.perf_counter() - t0, os.getloadavg()[0]), flush=True)
    if dev == "mps":
        torch.mps.synchronize()
    tt = time.perf_counter() - t0
    res, pq = evaluate(model, tok, dev, smoke)
    del model, opt
    if dev == "mps":
        torch.mps.empty_cache()
    return dict(variant=variant, seed=seed, B=B, epochs=epochs, steps=total, train_s=round(tt, 1),
                loss_first=r4(np.mean(losses[:3])), loss_last=r4(np.mean(losses[-3:])), losses=[r4(x) for x in losses], **res), pq, np.stack(snaps), snap_steps


def main():
    from transformers import AutoTokenizer, AutoModel
    o = args()
    dev = "cpu" if o["smoke"] or not torch.backends.mps.is_available() else "mps"
    if o["smoke"]:
        torch.set_num_threads(2)
    md = L.model_dir("bge-small")
    tok = AutoTokenizer.from_pretrained(md)
    corpus, queries, qrels = L.beir("scifact")
    neg = json.load(open(scratch("negatives.json")))
    data = (corpus, queries, qrels["train"], [tuple(p) for p in neg["pairs"]], neg["pools"])
    items = snap_texts()
    odir = scratch("train")
    os.makedirs(odir, exist_ok=True)
    path = os.path.join(DATA, "train_runs.json")
    allr = json.load(open(path)) if os.path.exists(path) and not o["smoke"] else {"runs": []}
    la0 = os.getloadavg()
    if not o["smoke"] and not any(r["variant"] == "base" for r in allr["runs"]):
        base = AutoModel.from_pretrained(md).to(dev)
        res, pq = evaluate(base, tok, dev)
        sn = snapshot(base, tok, dev, items)
        np.savez_compressed(os.path.join(odir, "base.npz"), scifact=pq["scifact"], nfcorpus=pq["nfcorpus"], snap=sn)
        allr["runs"].append(dict(variant="base", seed=None, **res))
        allr["snap_items"] = [{k: (v if k != "text" else v[:160]) for k, v in x.items()} for x in items]
        print(allr["runs"][-1], flush=True)
        del base
    for v in o["variants"]:
        for s in o["seeds"]:
            if any(r["variant"] == v and r["seed"] == s and r.get("epochs") == o["epochs"] for r in allr["runs"]):
                continue
            r, pq, sn, ss = run_one(v, s, o["epochs"], o["smoke"], data, items, tok, md, dev)
            print({k: x for k, x in r.items() if k != "losses"}, flush=True)
            if o["smoke"]:  # development data for the page's animation only; never read by build_data.py
                np.savez_compressed(os.path.join(odir, "smoke_%s.npz" % v), snap=sn, snap_steps=np.array(ss))
                json.dump([{k: (x if k != "text" else x[:160]) for k, x in it.items()} for it in items], open(os.path.join(odir, "smoke_items.json"), "w"))
                continue
            np.savez_compressed(os.path.join(odir, "%s_s%d_e%d.npz" % (v, s, o["epochs"])), scifact=pq["scifact"],
                                nfcorpus=pq["nfcorpus"], snap=sn, snap_steps=np.array(ss))
            r["loadavg"] = [round(x, 2) for x in os.getloadavg()]
            allr["runs"].append(r)
            json.dump(allr, open(path, "w"), indent=1)
    if not o["smoke"]:
        allr["loadavg_before"] = [round(x, 2) for x in la0]
        allr["device"] = dev
        allr["when"] = time.strftime("%Y-%m-%d %H:%M")
        json.dump(allr, open(path, "w"), indent=1)


if __name__ == "__main__":
    main()

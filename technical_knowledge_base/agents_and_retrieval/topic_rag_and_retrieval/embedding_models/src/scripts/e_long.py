"""Long inputs and truncation.
Mode "stats" (CPU, deterministic, no lock):
  - token lengths of every SciFact and NFCorpus document (title + text) under each model's tokenizer (BERT WordPiece
    for MiniLM, bge-small, e5; ModernBERT for gte; Qwen3); share over 128, 256, 512, 1,024 tokens;
  - where the evidence sits: the original SciFact release marks the evidence sentences of each (claim, abstract)
    pair; for every evidence sentence of a train or dev claim, the BERT-token position where it ENDS. A model cut at
    T tokens cannot read evidence that ends after T.
Mode "embed" (MPS, bench lock): re-embed the SciFact corpus with bge-small at max length 64, 128, 256, 512 and
  MiniLM-L6 at 64, 128, 256, 512, and NFCorpus the same, keeping the CLS and the mean of the same forward pass (so the
  wrong-pooling result costs no extra run); evaluate with the setup's stored query vectors (the queries are short,
  so their vectors do not change with the document limit), except for the mean-pooled bge-small, whose queries are
  re-encoded with mean pooling too.
usage: python -I -B e_long.py stats | embed   -> ../data/long.json (merges)"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
from emblib import L, golden, query_vectors, search, per_query, load_data, save, r4  # noqa: E402

mode = sys.argv[1] if len(sys.argv) > 1 else "stats"
out = load_data("long.json") or dict(asof="2026-10-14")
TOK = {"BERT WordPiece (MiniLM, bge-small, e5)": "bge-small", "ModernBERT (gte)": "gte-modernbert", "Qwen3": "qwen3-emb-0.6b"}

if mode == "stats":
    from transformers import AutoTokenizer
    lens = {}
    for ds in ("scifact", "nfcorpus"):
        corpus, _, _ = L.beir(ds)
        texts = [L.doc_text(corpus[d]) for d in corpus]
        lens[ds] = {}
        for name, m in TOK.items():
            tok = AutoTokenizer.from_pretrained(L.model_dir(m))
            n = np.array([len(x) for x in tok(texts, add_special_tokens=True)["input_ids"]])
            lens[ds][name] = dict(median=int(np.median(n)), p90=int(np.quantile(n, .9)), max=int(n.max()),
                                  over={str(t): r4((n > t).mean()) for t in (128, 256, 512, 1024)},
                                  hist=[int(x) for x in np.histogram(np.clip(n, 0, 1200), bins=24, range=(0, 1200))[0]])
    out["lengths"] = lens
    # evidence position (original release: abstract = list of sentences; evidence = sentence indices)
    tok = AutoTokenizer.from_pretrained(L.model_dir("bge-small"))
    abst = {}
    for line in open(L.path("pipe", "scifact_orig", "data", "corpus.jsonl")):
        d = json.loads(line)
        abst[str(d["doc_id"])] = (d["title"], d["abstract"])
    ends, firsts = [], []
    for f in ("claims_train.jsonl", "claims_dev.jsonl"):
        for line in open(L.path("pipe", "scifact_orig", "data", f)):
            c = json.loads(line)
            for did, evs in c["evidence"].items():
                title, sents = abst[str(did)]
                # cumulative BERT tokens: [CLS] + title + sentences (BEIR joins title and text with a space)
                pos = 1 + len(tok(title, add_special_tokens=False)["input_ids"])
                cum = []
                for s in sents:
                    pos += len(tok(s, add_special_tokens=False)["input_ids"])
                    cum.append(pos)
                idx = sorted(set(i for e in evs for i in e["sentences"]))
                ends += [cum[i] for i in idx]
                firsts.append(cum[idx[0]])
    ends, firsts = np.array(ends), np.array(firsts)
    out["evidence"] = dict(n_sentences=int(len(ends)), n_pairs=int(len(firsts)),
                           end_beyond={str(t): r4((ends > t).mean()) for t in (64, 128, 256, 512)},
                           pair_first_beyond={str(t): r4((firsts > t).mean()) for t in (64, 128, 256, 512)},
                           median_end=int(np.median(ends)))
    save("long.json", out)
    print(json.dumps(out)[:1500])

elif mode == "embed":
    import torch
    import torch.nn.functional as F
    from transformers import AutoModel, AutoTokenizer
    dev = "mps" if torch.backends.mps.is_available() else "cpu"
    res = out.get("embed", {})
    la = os.getloadavg()
    for m in ("bge-small", "minilm-l6"):
        tok = AutoTokenizer.from_pretrained(L.model_dir(m))
        model = AutoModel.from_pretrained(L.model_dir(m)).to(dev).eval()
        native = {"bge-small": "cls", "minilm-l6": "mean"}[m]
        for ds in ("scifact", "nfcorpus"):
            corpus, queries, qrels = L.beir(ds)
            gold = set(golden(ds))
            qt = {q: v for q, v in qrels["test"].items() if q in gold}
            qs = sorted(qt)
            ids = list(corpus)
            texts = [L.doc_text(corpus[d]) for d in ids]
            order = np.argsort([-len(t) for t in texts])
            Qstored = query_vectors(ds, m, qs)
            for T in (64, 128, 256, 512):
                key = "%s|%s|%d" % (m, ds, T)
                if key in res:
                    continue
                cls = np.zeros((len(ids), 384), np.float32); mean = np.zeros_like(cls)
                t0 = time.perf_counter()
                with torch.no_grad():
                    for i in range(0, len(order), 64):
                        idx = order[i:i + 64]
                        enc = tok([texts[j] for j in idx], truncation=True, max_length=T, padding=True, return_tensors="pt").to(dev)
                        h = model(**enc).last_hidden_state
                        mk = enc["attention_mask"].unsqueeze(-1).float()
                        cls[idx] = F.normalize(h[:, 0], dim=-1).cpu().numpy()
                        mean[idx] = F.normalize((h * mk).sum(1) / mk.sum(1), dim=-1).cpu().numpy()
                secs = time.perf_counter() - t0
                X = cls if native == "cls" else mean
                pq, _ = per_query(search(Qstored, X, ids, qs), qt)
                r = dict(ndcg10=r4(pq["ndcg_cut.10"].mean()), recall100=r4(pq["recall.100"].mean()), s=round(secs, 1))
                if T == 512:  # wrong pooling, queries re-encoded with the same wrong pooling
                    qp = L.query_prefix(m, ds)
                    enc = tok([qp + queries[q] for q in qs], truncation=True, max_length=512, padding=True, return_tensors="pt").to(dev)
                    with torch.no_grad():
                        h = model(**enc).last_hidden_state
                    mk = enc["attention_mask"].unsqueeze(-1).float()
                    Qw = F.normalize((h * mk).sum(1) / mk.sum(1) if native == "cls" else h[:, 0], dim=-1).cpu().numpy()
                    Xw = mean if native == "cls" else cls
                    pw, _ = per_query(search(Qw, Xw, ids, qs), qt)
                    r["wrong_pooling"] = "mean" if native == "cls" else "cls"
                    r["wrong_ndcg10"] = r4(pw["ndcg_cut.10"].mean())
                res[key] = r
                print(key, r, flush=True)
        del model
    out["embed"] = res
    out["embed_load"] = [round(x, 2) for x in la] + [round(x, 2) for x in os.getloadavg()]
    out["embed_device"] = dev
    save("long.json", out)

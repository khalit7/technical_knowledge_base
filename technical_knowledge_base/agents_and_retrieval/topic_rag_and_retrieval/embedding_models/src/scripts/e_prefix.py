"""Instruction and prefix effects, measured on SciFact (300 test claims) and NFCorpus (323 test queries).
Mode "queries" (CPU, 2 threads, no lock): only the QUERY side changes, so the setup's stored corpus vectors are reused.
  bge-small : its documented query prefix vs none
  qwen3-emb : the task instruction of the running example ("Instruct: <task>\\nQuery:"), the model card's generic
              web-search instruction, the wrong task's instruction (the other set's), and no instruction.
  Every variant is re-encoded here in float32 on CPU (the stored queries were float16 on MPS), so the comparison
  is like for like; the stored-run score is listed beside it.
Mode "e5" (MPS, bench lock; the corpus must be re-embedded): e5-small-v2 with "query: " / "passage: " on both,
  either, or neither side.
Writes ../data/prefix.json (merges modes) and per-query nDCG@10 in $RAG_SCRATCH/emb/prefix_pq.json.
usage: python -I -B e_prefix.py queries | e5"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import torch  # noqa: E402
from emblib import L, golden, corpus_vectors, search, per_query, paired_bootstrap, scratch, load_data, save, r4  # noqa: E402

mode = sys.argv[1] if len(sys.argv) > 1 else "queries"
SETS = ("scifact", "nfcorpus")
GENERIC = "Instruct: Given a web search query, retrieve relevant passages that answer the query\nQuery:"
out = load_data("prefix.json") or dict(asof="2026-10-14", variants={})
pqp = scratch("prefix_pq.json")
PQ = json.load(open(pqp)) if os.path.exists(pqp) else {}


def evaluate(ds, qvec_fn, X, ids, key):
    corpus, queries, qrels = L.beir(ds)
    gold = set(golden(ds))
    qt = {q: v for q, v in qrels["test"].items() if q in gold}
    qs = sorted(qt)
    Q = qvec_fn([queries[q] for q in qs])
    pq, _ = per_query(search(Q, X, ids, qs), qt)
    PQ[key] = [float(x) for x in pq["ndcg_cut.10"]]
    return r4(pq["ndcg_cut.10"].mean())


if mode == "queries":
    torch.set_num_threads(2)
    from sentence_transformers import SentenceTransformer
    for model, variants in (("bge-small", {"documented prefix": lambda ds: L.query_prefix("bge-small", ds), "none": lambda ds: ""}),
                            ("qwen3-emb-0.6b", {"task instruction": lambda ds: L.query_prefix("qwen3-emb-0.6b", ds),
                                                "generic instruction": lambda ds: GENERIC,
                                                "other set's instruction": lambda ds: L.query_prefix("qwen3-emb-0.6b", "nfcorpus" if ds == "scifact" else "scifact"),
                                                "none": lambda ds: ""})):
        enc = SentenceTransformer(L.model_dir(model), device="cpu", model_kwargs={"dtype": torch.float32})
        enc.max_seq_length = L.MODELS[model]["max_len"]
        for ds in SETS:
            ids, X = corpus_vectors(ds, model)
            stored = r4(L.evaluate(L.run(ds, model), {q: v for q, v in L.beir(ds)[2]["test"].items() if q in set(golden(ds))})["ndcg@10"])
            for name, pf in variants.items():
                key = "%s|%s|%s" % (model, ds, name)
                if key in out["variants"]:
                    continue
                t0 = time.perf_counter()
                v = evaluate(ds, lambda t: enc.encode(t, prompt=pf(ds), normalize_embeddings=True, batch_size=16), X, ids, key)
                out["variants"][key] = dict(model=model, set=ds, variant=name, prefix=pf(ds), ndcg10=v, stored_run=stored,
                                            device="cpu float32", s=round(time.perf_counter() - t0, 1))
                print(key, v, stored, flush=True)
                json.dump(PQ, open(pqp, "w")); save("prefix.json", out)
        del enc
elif mode == "e5":
    from sentence_transformers import SentenceTransformer
    dev = "mps" if torch.backends.mps.is_available() else "cpu"
    enc = SentenceTransformer(L.path("models", "e5-small-v2"), device=dev)
    enc.max_seq_length = 512
    la = os.getloadavg()
    for ds in SETS:
        corpus, queries, qrels = L.beir(ds)
        ids = list(corpus)
        for dp in ("passage: ", ""):
            t0 = time.perf_counter()
            X = enc.encode([dp + L.doc_text(corpus[d]) for d in ids], normalize_embeddings=True, batch_size=64)
            secs = time.perf_counter() - t0
            np.save(scratch("e5_%s_%s.npy" % (ds, "p" if dp else "n")), X.astype(np.float32))
            for qp in ("query: ", ""):
                name = "query %s / passage %s" % ("yes" if qp else "no", "yes" if dp else "no")
                key = "e5-small-v2|%s|%s" % (ds, name)
                v = evaluate(ds, lambda t: enc.encode([qp + x for x in t], normalize_embeddings=True, batch_size=64), X, ids, key)
                out["variants"][key] = dict(model="e5-small-v2", set=ds, variant=name, ndcg10=v, device=dev,
                                            corpus_s=round(secs, 1), load=[round(x, 2) for x in la])
                print(key, v, flush=True)
            json.dump(PQ, open(pqp, "w")); save("prefix.json", out)
# paired comparisons against each model's documented setting
pairs = {}
for key in out["variants"]:
    m, ds, name = key.split("|")
    base = {"bge-small": "documented prefix", "qwen3-emb-0.6b": "task instruction", "e5-small-v2": "query yes / passage yes"}[m]
    bk = "%s|%s|%s" % (m, ds, base)
    if key != bk and bk in PQ and key in PQ:
        pairs[key] = paired_bootstrap(PQ[key], PQ[bk])
        pairs[key]["changed_queries"] = int(sum(1 for a, b in zip(PQ[key], PQ[bk]) if abs(a - b) > 1e-9))
out["paired_vs_documented"] = pairs
save("prefix.json", out)

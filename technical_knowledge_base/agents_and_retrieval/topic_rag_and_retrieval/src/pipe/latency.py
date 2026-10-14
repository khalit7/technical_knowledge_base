"""Per-query latency of each pipeline stage on SciFact, measured on the Apple M1 Pro (hold the bench lock).
40 test claims (every 7th of the sorted ids), batch 1 (one user query at a time), after a warm-up; 3 repeats of the
whole pass; p50 and p90 over the 40 x 3 timings, with the spread of the per-repeat medians. Stages:
  bm25        bm25s retrieve top 100, 1 thread (CPU)
  embed       Qwen3-Embedding-0.6B encodes the query (MPS, fp16)
  search      exact inner product over 5,183 x 1,024 float32 vectors + top 100 (numpy, CPU)
  fuse        RRF of the two top-100 lists (Python)
  rerank-<m>-<K>  cross-encoder scores K candidates in one batch (MPS): CE MiniLM K 10/30/100, bge-reranker-v2-m3
              and Qwen3-Reranker-0.6B K 10/30 (Qwen3-Reranker on the first 20 of the 40 claims: about 6 s per query at K 30)
Generation is timed inside e2e_gen.py (same machine, same lock) and summarised by e2e_eval.py.
One model at a time; output out/latency.json."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, time, gc
import numpy as np
from common import L, save
import fusion as F

REP = 3
corpus, queries, qrels = L.beir("scifact")
qs = sorted(qrels["test"])[::7][:40]
bm = L.run("scifact", "bm25"); de = L.run("scifact", "qwen3-emb-0.6b")
hy = {q: list(F.top(F.rrf([list(bm[q]), list(de[q])], 60))) for q in qs}
res = {"n_queries": len(qs), "repeats": REP, "stages": {}, "loadavg": []}


def record(name, fn, items):
    fn(items[0])
    allt, meds = [], []
    for _ in range(REP):
        ts = []
        for it in items:
            t0 = time.perf_counter(); fn(it); ts.append(1000 * (time.perf_counter() - t0))
        allt += ts; meds.append(float(np.median(ts)))
    res["stages"][name] = {"p50_ms": round(float(np.percentile(allt, 50)), 2), "p90_ms": round(float(np.percentile(allt, 90)), 2),
                           "median_per_repeat_ms": [round(m, 2) for m in meds]}
    print(name, res["stages"][name], flush=True)


res["loadavg"].append(["start", [round(x, 2) for x in os.getloadavg()]])
# BM25
import bm25s, Stemmer
stem = Stemmer.Stemmer("english")
dids = list(corpus)
ret = bm25s.BM25(method="lucene", k1=1.2, b=0.75)
ret.index(bm25s.tokenize([L.doc_text(corpus[d]) for d in dids], stopwords="en", stemmer=stem, show_progress=False), show_progress=False)
record("bm25", lambda q: ret.retrieve(bm25s.tokenize([queries[q]], stopwords="en", stemmer=stem, show_progress=False), k=100, show_progress=False, n_threads=1), qs)
# dense: encode + exact search
import torch
enc = L.encoder("qwen3-emb-0.6b")
pref = L.query_prefix("qwen3-emb-0.6b", "scifact")
def emb(q):
    v = enc.encode([queries[q]], prompt=pref, normalize_embeddings=True, convert_to_numpy=True)
    return v
record("embed", emb, qs)
ids, X = L.embeddings("scifact", "qwen3-emb-0.6b"); X = np.ascontiguousarray(np.asarray(X))
V = {q: emb(q)[0] for q in qs}
def search(q):
    s = X @ V[q]; t = np.argpartition(-s, 100)[:100]; return t[np.argsort(-s[t])]
record("search", search, qs)
record("fuse", lambda q: F.top(F.rrf([list(bm[q]), list(de[q])], 60)), qs)
del enc; gc.collect(); torch.mps.empty_cache()
res["loadavg"].append(["after dense", [round(x, 2) for x in os.getloadavg()]])
# rerankers
from sentence_transformers import CrossEncoder
for key, Ks in (("ce-minilm-l6", (10, 30, 100)), ("bge-reranker-v2-m3", (10, 30)), ("qwen3-reranker-0.6b", (10, 30))):
    extra = dict(prompts={"task": L.TASKS["scifact"]}, default_prompt_name="task") if key == "qwen3-reranker-0.6b" else {}
    ce = CrossEncoder(L.model_dir(key), device="mps", model_kwargs={"torch_dtype": torch.float16} if key != "ce-minilm-l6" else {},
                      max_length=1024 if key == "qwen3-reranker-0.6b" else 512, **extra)
    for K in Ks:
        def rr(q, K=K):
            ce.predict([(queries[q], L.doc_text(corpus[d])) for d in hy[q][:K]], batch_size=K if key == "ce-minilm-l6" else 16, show_progress_bar=False)
            torch.mps.synchronize()
        record("rerank-%s-%d" % (key, K), rr, qs[:20] if key == "qwen3-reranker-0.6b" else qs)
    del ce; gc.collect(); torch.mps.empty_cache()
    res["loadavg"].append(["after " + key, [round(x, 2) for x in os.getloadavg()]])
res["when"] = time.strftime("%Y-%m-%d %H:%M")
save("latency.json", res)

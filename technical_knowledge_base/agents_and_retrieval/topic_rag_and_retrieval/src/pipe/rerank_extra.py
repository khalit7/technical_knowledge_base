"""Score the (query, abstract) pairs the setup did not: the big rerankers were run only on the BM25 top 30 and the
Qwen3-Embedding top 30, so the hybrid list and deeper K need more pairs. Same models, dtype, batch, max length and
instruction as the setup's rerank_all.py. Hold the bench lock (MPS).
usage: python -I -B rerank_extra.py <reranker> <first stage: hybrid|dense|bm25> <K>
Appends to $RAG_SCRATCH/pipe/rerank_extra/scifact/<reranker>_top30.tsv (the name rerank.py reads) and records
pairs/s with the load average in $RAG_SCRATCH/pipe/rerank_extra/timings.jsonl."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, time
from common import L, work
import fusion as F

key, fs, K = sys.argv[1], sys.argv[2], int(sys.argv[3])
DS = "scifact"
corpus, queries, qrels = L.beir(DS)
qt = sorted(qrels["test"])
bm = L.run(DS, "bm25"); de = L.run(DS, "qwen3-emb-0.6b")
first = {"bm25": bm, "dense": de, "hybrid": {q: F.top(F.rrf([list(bm[q]), list(de[q])], 60)) for q in qt}}[fs]
name = key + ("_top30" if key != "ce-minilm-l6" else "")
have = L.rerank_scores(DS, name)
out = work("rerank_extra", DS, name + ".tsv")
if os.path.exists(out):
    for line in open(out):
        q, d, s = line.rstrip("\n").split("\t")
        have.setdefault(q, {})[d] = float(s)
pairs, keys = [], []
for q in qt:
    for d in list(first[q])[:K]:
        if d not in have.get(q, {}):
            pairs.append((queries[q], L.doc_text(corpus[d])))
            keys.append((q, d))
print("pairs to score:", len(pairs), flush=True)
if not pairs:
    sys.exit(0)
import torch
from sentence_transformers import CrossEncoder
extra = dict(prompts={"task": L.TASKS[DS]}, default_prompt_name="task") if key == "qwen3-reranker-0.6b" else {}
ce = CrossEncoder(L.model_dir(key), device="mps", model_kwargs={"torch_dtype": torch.float16} if key != "ce-minilm-l6" else {},
                  max_length=1024 if key == "qwen3-reranker-0.6b" else 512, **extra)
bs = 32 if key == "ce-minilm-l6" else 16
ce.predict(pairs[:bs], batch_size=bs)
torch.mps.synchronize()
la0 = os.getloadavg(); t0 = time.perf_counter()
with open(out, "a") as f:
    for i in range(0, len(pairs), 256):
        sc = ce.predict(pairs[i:i + 256], batch_size=bs, show_progress_bar=False)
        for (q, d), s in zip(keys[i:i + 256], sc):
            f.write("%s\t%s\t%.6f\n" % (q, d, float(s)))
        f.flush()
        print(i + 256, "/", len(pairs), round(time.perf_counter() - t0), "s", flush=True)
torch.mps.synchronize()
dt = time.perf_counter() - t0
rec = dict(reranker=key, first=fs, K=K, pairs=len(pairs), seconds=round(dt, 1), pairs_per_s=round(len(pairs) / dt, 1),
           loadavg_before=[round(x, 2) for x in la0], loadavg_after=[round(x, 2) for x in os.getloadavg()], when=time.strftime("%Y-%m-%d %H:%M"))
print(json.dumps(rec))
with open(work("rerank_extra", "timings.jsonl"), "a") as f:
    f.write(json.dumps(rec) + "\n")

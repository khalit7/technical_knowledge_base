"""Score the pairs the big rerankers need for depth K up to 100 on the hybrid list (the setup scored only the BM25
top 30 + Qwen3 top 30; the root's Pipeline lab added the hybrid top 30). Same models, dtype, batch, max length and
instruction as the setup's rerank_all.py. Hold the bench lock (MPS). Resumable.
usage: python -I -B e_rerank_deep.py <bge-reranker-v2-m3|qwen3-reranker-0.6b> <K>
Appends to $RAG_SCRATCH/rr/rerank_extra/scifact/<reranker>_top30.tsv (rrlib.rerank_scores reads it) and records
pairs/s with the load average in $RAG_SCRATCH/rr/rerank_extra/timings.jsonl."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import time
from rrlib import L, DS, first_stages, rerank_scores, work

key, K = sys.argv[1], int(sys.argv[2])
name = key + "_top30"
corpus, queries, qrels = L.beir(DS)
qt = sorted(qrels["test"])
hy = first_stages()["hybrid"]
have = rerank_scores(name)
out = work("rerank_extra", DS, name + ".tsv")
pairs, keys = [], []
for q in qt:
    for d in list(hy[q])[:K]:
        if d not in have.get(q, {}):
            pairs.append((queries[q], L.doc_text(corpus[d])))
            keys.append((q, d))
print("pairs to score:", len(pairs), flush=True)
if not pairs:
    sys.exit(0)
import torch
from sentence_transformers import CrossEncoder
extra = dict(prompts={"task": L.TASKS[DS]}, default_prompt_name="task") if key == "qwen3-reranker-0.6b" else {}
ce = CrossEncoder(L.model_dir(key), device="mps", model_kwargs={"torch_dtype": torch.float16},
                  max_length=1024 if key == "qwen3-reranker-0.6b" else 512, **extra)
bs = 16
ce.predict(pairs[:bs], batch_size=bs)
torch.mps.synchronize()
la0 = os.getloadavg(); t0 = time.perf_counter()
with open(out, "a") as f:
    for i in range(0, len(pairs), 512):
        sc = ce.predict(pairs[i:i + 512], batch_size=bs, show_progress_bar=False)
        for (q, d), s in zip(keys[i:i + 512], sc):
            f.write("%s\t%s\t%.6f\n" % (q, d, float(s)))
        f.flush()
        print(i + 512, "/", len(pairs), round(time.perf_counter() - t0), "s", flush=True)
torch.mps.synchronize()
dt = time.perf_counter() - t0
rec = dict(reranker=key, first="hybrid", K=K, pairs=len(pairs), seconds=round(dt, 1), pairs_per_s=round(len(pairs) / dt, 1),
           loadavg_before=[round(x, 2) for x in la0], loadavg_after=[round(x, 2) for x in os.getloadavg()], when=time.strftime("%Y-%m-%d %H:%M"))
print(json.dumps(rec))
with open(work("rerank_extra", "timings.jsonl"), "a") as f:
    f.write(json.dumps(rec) + "\n")

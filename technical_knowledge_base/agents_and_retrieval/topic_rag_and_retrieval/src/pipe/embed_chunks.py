"""Embed the chunks of each chunking strategy (and the 892 QASPER questions) with one embedding model, on MPS.
Hold the bench lock. One model per process.
usage: python -I -B embed_chunks.py <model key> <strategy> [<strategy> ...]
The default chunks (fixed-256-32) with Qwen3-Embedding are not re-embedded: the setup's vectors are reused.
Writes $RAG_SCRATCH/pipe/chunks/<strategy>.<model>.npy (rows in chunk-file order) and questions.<model>.npy/.ids,
and appends throughput with the load average to $RAG_SCRATCH/pipe/chunks/embed_timings.jsonl."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, time
import numpy as np
from common import L, work
from chunk_eval import chunk_texts

model, strats = sys.argv[1], sys.argv[2:]
_, qs = L.longdoc()
qp = work("chunks", "questions.%s.npy" % model)
enc = None


def get_enc():
    global enc
    if enc is None:
        enc = L.encoder(model)
    return enc


if model == "qwen3-emb-0.6b" and not os.path.exists(qp):
    # reuse the setup's question vectors (same model, same instruction)
    qids, Q = L.embeddings("qasper", model, "queries")
    np.save(qp, np.asarray(Q)); open(work("chunks", "questions.%s.ids" % model), "w").write("\n".join(qids))
if not os.path.exists(qp):
    e = get_enc()
    Q = e.encode([q["question"] for q in qs], prompt=L.query_prefix(model, "qasper"), normalize_embeddings=True, batch_size=64)
    np.save(qp, Q.astype(np.float32)); open(work("chunks", "questions.%s.ids" % model), "w").write("\n".join(q["qid"] for q in qs))

for s in strats:
    out = work("chunks", "%s.%s.npy" % (s, model))
    rows, _, tf = chunk_texts(s)
    if model == "qwen3-emb-0.6b" and s == "fixed-256-32":
        ids, X = L.embeddings("qasper", model)
        pos = {(c.rsplit("_c", 1)[0], int(c.rsplit("_c", 1)[1])): i for i, c in enumerate(ids)}
        X = np.asarray(X)
        V = np.stack([X[pos[(r["paper_id"], int(r["cid"].rsplit("_", 1)[1]))]] for r in rows])
        np.save(out, V); print("reused setup vectors", s, V.shape); continue
    texts = [tf(r) for r in rows]
    e = get_enc()
    e.encode(texts[:32], batch_size=32)
    la0 = os.getloadavg(); t0 = time.perf_counter()
    V = e.encode(texts, batch_size=32 if model == "qwen3-emb-0.6b" else 64, normalize_embeddings=True, show_progress_bar=False)
    dt = time.perf_counter() - t0
    np.save(out, V.astype(np.float32))
    rec = dict(model=model, strategy=s, chunks=len(texts), seconds=round(dt, 1), chunks_per_s=round(len(texts) / dt, 1),
               loadavg_before=[round(x, 2) for x in la0], loadavg_after=[round(x, 2) for x in os.getloadavg()], when=time.strftime("%Y-%m-%d %H:%M"))
    print(json.dumps(rec), flush=True)
    with open(work("chunks", "embed_timings.jsonl"), "a") as f:
        f.write(json.dumps(rec) + "\n")

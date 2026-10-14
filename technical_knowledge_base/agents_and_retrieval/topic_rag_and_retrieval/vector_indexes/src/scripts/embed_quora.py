"""The scale set: BEIR Quora (522,931 questions), embedded with all-MiniLM-L6-v2 (384-d, unit length) exactly as the
Search and vector databases page did (its measure/embed.py: title + space + text, batch 256, normalised), so that
this page's library measurements and that page's pgvector measurements are on the same vectors. Queries: the first
1,000 test queries in queries.jsonl order (the same 1,000 that page used). Heavy MPS work: run under the bench lock.
usage: embed_quora.py <folder with quora/corpus.jsonl>   Output: $RAG_SCRATCH/vix/quora/{corpus,queries}.npy + log"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import time

import numpy as np
import torch

import vixlib as V

base = os.path.join(sys.argv[1], "quora")
out = os.path.join(V.WORK, "quora")
os.makedirs(out, exist_ok=True)
C = [json.loads(l) for l in open(base + "/corpus.jsonl")]
Qd = {}
for l in open(base + "/queries.jsonl"):
    q = json.loads(l); Qd[q["_id"]] = q["text"]
qrels = {}
for i, l in enumerate(open(base + "/qrels/test.tsv")):
    if i == 0:
        continue
    a, b, s = l.rstrip("\n").split("\t")
    if int(s) > 0:
        qrels.setdefault(a, {})[b] = int(s)
qids = [q for q in Qd if q in qrels][:1000]
texts = [((c.get("title") or "") + " " + c["text"]).strip() for c in C]
from sentence_transformers import SentenceTransformer
dev = "mps" if torch.backends.mps.is_available() else "cpu"
m = SentenceTransformer(V.L.model_dir("minilm-l6"), device=dev)
la0 = V.loadavg(); t = time.time()
E = m.encode(texts, batch_size=256, normalize_embeddings=True, convert_to_numpy=True, show_progress_bar=False).astype(np.float32)
te = time.time() - t
QE = m.encode([Qd[q] for q in qids], batch_size=256, normalize_embeddings=True, convert_to_numpy=True).astype(np.float32)
np.save(out + "/corpus.npy", E); np.save(out + "/queries.npy", QE)
open(out + "/corpus_ids.txt", "w").write("\n".join(c["_id"] for c in C))
open(out + "/queries_ids.txt", "w").write("\n".join(qids))
log = {"docs": len(C), "queries": len(qids), "embed_s": round(te, 1), "docs_per_s": round(len(C) / te, 1), "device": dev,
       "load_before": la0, "load_after": V.loadavg(), "when": V.stamp(), "max_seq_length": m.max_seq_length}
json.dump(log, open(out + "/embed_log.json", "w"))
print(log)

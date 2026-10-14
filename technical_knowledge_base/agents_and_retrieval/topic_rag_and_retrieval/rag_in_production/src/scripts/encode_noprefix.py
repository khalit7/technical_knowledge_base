"""Encode SciFact's 300 test claims with bge-small on CPU WITHOUT its query prefix (for monitor.py's regression).
Separate process because torch and faiss load two OpenMP runtimes. Output: $RAG_SCRATCH/prd/scifact_bge_noprefix.npy"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from common import L, work

corpus, queries, qrels = L.beir("scifact")
tq = sorted(qrels["test"], key=int)
enc = L.encoder("bge-small", device="cpu")
V = enc.encode([queries[q] for q in tq], normalize_embeddings=True, convert_to_numpy=True).astype(np.float32)
np.save(work("scifact_bge_noprefix.npy"), V)
print(V.shape)

"""Semantic chunking, as LangChain's SemanticChunker does it (langchain_experimental.text_splitter, defaults:
buffer_size 1, breakpoint_threshold_type "percentile", amount 95): split the paper into sentences, embed each
sentence together with its neighbours (one before, one after), measure the cosine distance between consecutive
windows, and cut where the distance is above the paper's 95th percentile (also 80th, for smaller chunks).
No size cap, as in LangChain. Embedder: bge-small (MPS; hold the bench lock).
usage: python -I -B semantic.py   then   python -I -B chunk_eval.py semantic-p95 semantic-p80"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, time
import numpy as np
from common import L, work
import chunkers as C
from chunk_eval import load_tok, chunk_file

tok = load_tok()
docs, _ = L.longdoc()
D = [C.Doc(d, tok) for d in docs]
sents = {}
wins, owner = [], []
for doc in D:
    ss = []
    for s, e, _ in doc.paragraphs():
        ss += doc.sentences(s, e)
    sents[doc.d["paper_id"]] = ss
    for i in range(len(ss)):
        a, b = ss[max(0, i - 1)][0], ss[min(len(ss) - 1, i + 1)][1]
        wins.append(doc.text[a:b])
        owner.append(doc.d["paper_id"])
vp = work("chunks", "semantic_windows.bge-small.npy")
if not os.path.exists(vp):
    enc = L.encoder("bge-small")
    t0 = time.perf_counter()
    V = enc.encode(wins, batch_size=64, normalize_embeddings=True, show_progress_bar=False)
    print("embedded", len(wins), "windows in", round(time.perf_counter() - t0, 1), "s", flush=True)
    np.save(vp, V.astype(np.float32))
V = np.load(vp)
i0 = 0
for p in (95, 80):
    with open(chunk_file("semantic-p%d" % p), "w") as f:
        i0 = 0
        for doc in D:
            ss = sents[doc.d["paper_id"]]
            v = V[i0:i0 + len(ss)]
            i0 += len(ss)
            dist = 1 - np.sum(v[:-1] * v[1:], axis=1) if len(ss) > 1 else np.array([])
            thr = np.percentile(dist, p) if len(dist) else 1
            cuts = [i + 1 for i, d in enumerate(dist) if d > thr]
            bounds = [0] + cuts + [len(ss)]
            for k in range(len(bounds) - 1):
                a, b = ss[bounds[k]][0], ss[bounds[k + 1] - 1][1]
                f.write(json.dumps({"cid": "%s_%03d" % (doc.d["paper_id"], k), "paper_id": doc.d["paper_id"],
                                    "start": a, "end": b, "n_tokens": doc.ntok(a, b)}) + "\n")
    print("wrote semantic-p%d" % p)

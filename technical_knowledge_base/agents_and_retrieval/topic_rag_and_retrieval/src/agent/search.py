"""The search tool every strategy uses: exact top-k over the 9,760 HotpotQA paragraphs.

Default: bge-small-en-v1.5 (33 M, MIT), encoded on the CPU so it does not share the GPU with the generator.
bge-small is chosen over Qwen3-Embedding because Qwen3-Embedding declares HotpotQA in its training data (in-domain
here), and over BM25 because it had the best recall@10 of the gold paragraphs on this set (0.908 vs BM25 0.868; the
setup's table). `method="bm25"` uses the setup's saved bm25s index (Lucene, k1 1.2, b 0.75)."""
import json
import os
import time

import numpy as np

from common import L, data, work

_S = {}


def _bge():
    if "enc" not in _S:
        ids, X = L.embeddings("hotpotqa", "bge-small")
        _S["ids"], _S["X"] = ids, np.asarray(X)
        _S["enc"] = L.encoder("bge-small", device="cpu")
        _S["pre"] = L.query_prefix("bge-small", "hotpotqa")
        cp = work("qvec_bge.json")
        _S["qc"] = json.load(open(cp)) if os.path.exists(cp) else {}
    return _S


def _save_qc():
    if "qc" in _S:
        json.dump(_S["qc"], open(work("qvec_bge.json"), "w"))


def qvec(q):
    s = _bge()
    v = s["qc"].get(q)
    if v is None:
        v = s["enc"].encode([q], prompt=s["pre"], normalize_embeddings=True)[0].astype(np.float32).tolist()
        s["qc"][q] = v
        if len(s["qc"]) % 50 == 0:
            _save_qc()
    return np.asarray(v, dtype=np.float32)


def search(q, k=3, exclude=(), method="bge"):
    """[(pid, score)] best first; pids in `exclude` are skipped (an agent is not shown the same paragraph twice)."""
    if method == "bm25":
        return _bm25(q, k, exclude)
    s = _bge()
    sc = s["X"] @ qvec(q)
    top = np.argpartition(-sc, k + len(exclude) + 1)[:k + len(exclude) + 1]
    top = top[np.argsort(-sc[top])]
    out = [(s["ids"][j], float(sc[j])) for j in top if s["ids"][j] not in exclude]
    return out[:k]


def _bm25(q, k, exclude):
    import bm25s, Stemmer
    if "bm" not in _S:
        _S["bm"] = bm25s.BM25.load(L.path("data", "bm25", "hotpotqa"))
        _S["stem"] = Stemmer.Stemmer("english")
        _S["bm_ids"] = [p["pid"] for p in data()[1]]
    tok = bm25s.tokenize([q], stopwords="en", stemmer=_S["stem"], show_progress=False)
    res, sc = _S["bm"].retrieve(tok, k=k + len(exclude), show_progress=False, n_threads=1)
    out = [(_S["bm_ids"][res[0, j]], float(sc[0, j])) for j in range(res.shape[1]) if _S["bm_ids"][res[0, j]] not in exclude]
    return out[:k]


def timed(q, k=3, exclude=(), method="bge"):
    t0 = time.perf_counter()
    r = search(q, k, exclude, method)
    return r, (time.perf_counter() - t0) * 1000


import atexit  # noqa: E402
atexit.register(_save_qc)

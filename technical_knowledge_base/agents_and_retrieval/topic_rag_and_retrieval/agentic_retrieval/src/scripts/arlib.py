"""Shared helpers for the page "Agentic retrieval, long context and memory" (prefix ar).

Run every script with the shared env, from anywhere:
    RAG_SCRATCH=<shared rag folder> $RAG_SCRATCH/venv/bin/python -I -B <this folder>/<script>.py
Reads (never writes) the root's running example (src/data/load.py) and the root Agentic lab's harness and recorded
runs (src/agent/*.py, $RAG_SCRATCH/agt/runs/*.jsonl). Writes large files to $RAG_SCRATCH/ar/ and the small results the
page embeds to ../data/*.json.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE_SRC = os.path.normpath(os.path.join(HERE, ".."))
ROOT_SRC = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src"))
sys.path.insert(0, os.path.join(ROOT_SRC, "data"))
sys.path.insert(1, os.path.join(ROOT_SRC, "agent"))
os.environ.setdefault("OMP_NUM_THREADS", "2")
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")
import load as L  # noqa: E402

DATA = os.path.join(PAGE_SRC, "data")


def work(*parts):
    p = L.path("ar", *parts)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    return p


def save(name, obj):
    os.makedirs(DATA, exist_ok=True)
    p = os.path.join(DATA, name)
    with open(p, "w") as f:
        json.dump(obj, f, separators=(",", ":"), ensure_ascii=False, sort_keys=True)
    print("wrote", name, os.path.getsize(p), "bytes")


def load_data(name):
    return json.load(open(os.path.join(DATA, name)))


def r3(x):
    return round(float(x), 3)


def jl(path):
    return [json.loads(l) for l in open(path)] if os.path.exists(path) else []


_C = {}


def mh():
    """questions (200), corpus list, pid -> paragraph"""
    if not _C:
        qs, corpus = L.multihop()
        _C.update(qs=qs, corpus=corpus, by={p["pid"]: p for p in corpus})
    return _C["qs"], _C["corpus"], _C["by"]


def root_run(name):
    """A run recorded by the root's Agentic lab: {qid: row}. name like test_1.7b_react."""
    return {r["qid"]: r for r in jl(L.path("agt", "runs", name + ".jsonl"))}


# ---------------------------------------------------------------- bge-small search on the CPU (same tool as the root)
_S = {}


def _bge():
    if "X" not in _S:
        import numpy as np
        ids, X = L.embeddings("hotpotqa", "bge-small")
        _S["ids"], _S["X"] = ids, np.asarray(X)
        _S["row"] = {p: i for i, p in enumerate(ids)}
        _S["pre"] = L.query_prefix("bge-small", "hotpotqa")
        root_qc = L.path("agt", "qvec_bge.json")  # the root's query-vector cache (read only)
        _S["rq"] = json.load(open(root_qc)) if os.path.exists(root_qc) else {}
        mine = work("qvec_bge.json")
        _S["qc"] = json.load(open(mine)) if os.path.exists(mine) else {}
    return _S


def qvecs(texts):
    """bge-small query vectors (with the bge query prefix), CPU float32; cached."""
    import numpy as np
    s = _bge()
    miss = [t for t in dict.fromkeys(texts) if t not in s["qc"] and t not in s["rq"]]
    if miss:
        if "enc" not in s:
            import torch
            torch.set_num_threads(2)
            s["enc"] = L.encoder("bge-small", device="cpu")
        V = s["enc"].encode(miss, prompt=s["pre"], normalize_embeddings=True, batch_size=32)
        for t, v in zip(miss, V):
            s["qc"][t] = [float(x) for x in v.astype(np.float32)]
        json.dump(s["qc"], open(work("qvec_bge.json"), "w"))
    return np.asarray([s["qc"].get(t) or s["rq"][t] for t in texts], dtype=np.float32)


def dense_scores(q):
    s = _bge()
    return s["X"] @ qvecs([q])[0]


def ranking(q, exclude=()):
    """pids best first (all 9,760), minus exclude"""
    import numpy as np
    s = _bge()
    sc = dense_scores(q)
    order = np.argsort(-sc, kind="stable")
    ex = set(exclude)
    return [s["ids"][j] for j in order if s["ids"][j] not in ex]


def rank_of(q, pid, exclude=()):
    r = ranking(q, exclude)
    return r.index(pid) + 1 if pid in r else None


def doc_vec(pid):
    s = _bge()
    return s["X"][s["row"][pid]]


# ---------------------------------------------------------------- Qwen3 tokenizer (same vocabulary as the generators)
_T = {}


def ntok(text):
    if "tok" not in _T:
        from tokenizers import Tokenizer
        _T["tok"] = Tokenizer.from_file(os.path.join(L.path("models", "Qwen3-Embedding-0.6B"), "tokenizer.json"))
    return len(_T["tok"].encode(text, add_special_tokens=False).ids)


def auroc(scores, labels):
    """Mann-Whitney AUROC with ties counted half"""
    pos = [s for s, y in zip(scores, labels) if y]
    neg = [s for s, y in zip(scores, labels) if not y]
    if not pos or not neg:
        return None
    w = 0.0
    for p in pos:
        for n in neg:
            w += 1.0 if p > n else 0.5 if p == n else 0.0
    return w / (len(pos) * len(neg))


def boot_ci(vals, n=2000, seed=0):
    import random
    rng = random.Random(seed)
    m = len(vals)
    means = sorted(sum(vals[rng.randrange(m)] for _ in range(m)) / m for _ in range(n))
    return [r3(means[int(0.025 * n)]), r3(means[int(0.975 * n) - 1])]

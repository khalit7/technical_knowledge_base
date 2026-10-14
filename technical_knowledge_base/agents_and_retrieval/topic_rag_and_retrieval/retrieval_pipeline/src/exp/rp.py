"""Shared helpers for the retrieval_pipeline child page experiments.

Every script imports the running example's loader (the root's src/data/load.py) and the root Pipeline lab's
helpers (src/pipe/common.py), so numbers agree with the root by construction (same data, same metric code).
Run from anywhere with the shared env:
    RAG_SCRATCH=<shared rag folder> $RAG_SCRATCH/venv/bin/python -I -B retrieval_pipeline/src/exp/<script>.py
Small results go to ../out/*.json (committed); large intermediates to $RAG_SCRATCH/rp/.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src"))
sys.path.insert(0, os.path.join(ROOT_SRC, "data"))
sys.path.insert(0, os.path.join(ROOT_SRC, "pipe"))
import load as L  # noqa: E402
import common as PC  # noqa: E402  (root Pipeline lab helpers: per_query, mean, bm25_runs, dense_runs)

OUT = os.path.normpath(os.path.join(HERE, "..", "out"))
PIPE_OUT = os.path.join(ROOT_SRC, "pipe", "out")


def work(*parts):
    p = L.path("rp", *parts)
    d = p if not os.path.splitext(p)[1] else os.path.dirname(p)
    os.makedirs(d, exist_ok=True)
    return p


def save(name, obj):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), "w") as f:
        json.dump(obj, f, separators=(",", ":"))
    print("wrote", name, os.path.getsize(os.path.join(OUT, name)), "bytes", flush=True)


def load_out(name):
    p = os.path.join(OUT, name)
    return json.load(open(p)) if os.path.exists(p) else {}


def r3(x):
    return round(float(x), 3)


def r4(x):
    return round(float(x), 4)


M3 = ("ndcg_cut.10", "recall.10", "recall.100")


def summ(pq):
    return {"ndcg10": r3(PC.mean(pq, M3[0])), "r10": r3(PC.mean(pq, M3[1])), "r100": r3(PC.mean(pq, M3[2]))}


def top(d, n=100):
    return dict(sorted(d.items(), key=lambda x: -x[1])[:n])

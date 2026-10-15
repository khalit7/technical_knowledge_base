"""Shared helpers for the child page "Quality classifiers and data selection" (prefix qc).

Reuses the root's running example (../../../src/data/load.py) and Quality lab scorers (../../../src/qual/q_common.py).
Run from this folder with the shared venv, never inside the repo with uv:
  export DC_SCRATCH=<the shared dc setup folder> HF_HOME=$DC_SCRATCH/hf OMP_NUM_THREADS=4
  nice -n 15 $DC_SCRATCH/venv/bin/python -B <script>.py
Large outputs go to $DC_SCRATCH/qc/ (outside the repo); small results to ../data/out/.
"""
import gzip
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src"))
sys.path.insert(0, os.path.join(ROOT_SRC, "data"))
sys.path.insert(0, os.path.join(ROOT_SRC, "qual"))
import load as L  # noqa: E402
import q_common as Q  # noqa: E402

OUT = os.path.normpath(os.path.join(HERE, "..", "data", "out"))
os.makedirs(OUT, exist_ok=True)


def sdir(*p):
    """Large scratch outputs of this page."""
    d = os.path.join(L.scratch(), "qc")
    os.makedirs(os.path.join(d, *p[:-1]) if len(p) > 1 else d, exist_ok=True)
    return os.path.join(d, *p)


def ddir(*p):
    """Downloads of this page (DC/data/qc)."""
    return os.path.join(L.scratch(), "data", "qc", *p)


def dump(name, obj, indent=1):
    with open(os.path.join(OUT, name), "w") as f:
        json.dump(obj, f, indent=indent, ensure_ascii=False)


def load_out(name):
    return json.load(open(os.path.join(OUT, name)))


def jl_write(path, rows):
    op = gzip.open if path.endswith(".gz") else open
    with op(path, "wt") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def jl_read(path, limit=None):
    op = gzip.open if path.endswith(".gz") else open
    out = []
    with op(path, "rt") as f:
        for line in f:
            out.append(json.loads(line))
            if limit and len(out) >= limit:
                break
    return out


def one_line(t):
    """DCLM / Dolma form: lines joined with a space (dolma taggers/quality.py:29). fastText reads one line."""
    return " ".join(t.strip().splitlines())


def host(url):
    m = re.match(r"https?://([^/:]+)", url or "")
    return m.group(1).lower() if m else ""


def run0_final():
    """run0 final documents (PII-scrubbed) in the root's order, with the root's published-classifier scores attached."""
    sc = {r["id"]: r for r in Q.qj("run0_final_scores.jsonl")} if hasattr(Q, "qj") else None
    if sc is None:
        sc = {}
        for line in open(Q.qdir("run0_final_scores.jsonl")):
            r = json.loads(line)
            sc[r["id"]] = r
    docs = L.run0("final")
    out = []
    for d in docs:
        r = sc[d["id"]]
        out.append({"id": d["id"], "url": r["url"], "text": d["text"], "edu": r["edu"], "dclm": r["dclm"], "words": r["words"]})
    return out


DCLM_CUT = json.load(open(os.path.join(ROOT_SRC, "qual", "out", "q_check_models.json")))["dclm_baseline_50k_min_score"]

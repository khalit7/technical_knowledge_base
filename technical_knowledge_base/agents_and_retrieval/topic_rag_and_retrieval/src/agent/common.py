"""Shared helpers for the Agentic lab scripts (tab t-agent of Topic: rag-and-retrieval).

Run with the shared env, from anywhere:
    RAG_SCRATCH=<shared rag folder> $RAG_SCRATCH/venv/bin/python -I -B src/agent/<script>.py
Large intermediate files (generator caches, per-question logs) go to $RAG_SCRATCH/agt/ (outside the repo);
the small results the page embeds go to src/agent/out/*.json (committed).
"""
import json
import os
import random
import re
import string
import sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "data"))
import load as L  # noqa: E402

OUT = os.path.join(HERE, "out")


def work(*parts):
    p = L.path("agt", *parts)
    os.makedirs(os.path.dirname(p) if "." in os.path.basename(p) else p, exist_ok=True)
    return p


def save(name, obj):
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), "w") as f:
        json.dump(obj, f, separators=(",", ":"), ensure_ascii=False)
    print("wrote", name, os.path.getsize(os.path.join(OUT, name)), "bytes")


def r3(x):
    return round(float(x), 3)


def jl_write(path, rows):
    with open(path, "w") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def jl_read(path):
    return [json.loads(l) for l in open(path)] if os.path.exists(path) else []


# ---------------------------------------------------------------- data
_C = {}


def data():
    """questions (the 200 test questions), corpus list, pid -> paragraph."""
    if not _C:
        qs, corpus = L.multihop()
        _C["qs"], _C["corpus"], _C["by"] = qs, corpus, {p["pid"]: p for p in corpus}
    return _C["qs"], _C["corpus"], _C["by"]


def heldout():
    """The other 800 dev questions whose paragraphs are in the corpus (setup's prep_data.py: seed 0 shuffle of the
    7,405 distractor-dev rows, the first 200 are the test set, the next 800 only contribute paragraphs).
    Used ONLY for prompt choice, never for reporting."""
    import pandas as pd
    _, _, by = data()
    title2pid = {p["title"]: p["pid"] for p in by.values()}
    h = pd.read_parquet(L.path("data", "raw", "hotpotqa", "distractor_validation.parquet"))
    idx = list(range(len(h)))
    random.Random(0).shuffle(idx)
    out = []
    for i in idx[200:1000]:
        row = h.iloc[i]
        sf = row["supporting_facts"]
        gold = list(dict.fromkeys(sf["title"].tolist()))
        out.append({"qid": row["id"], "question": row["question"], "answer": row["answer"], "type": row["type"],
                    "level": row["level"], "gold_pids": [title2pid[t] for t in gold],
                    "own_context_pids": [title2pid[t] for t in row["context"]["title"]]})
    return out


def para_text(p):
    return p["title"] + ": " + p["text"]


# ---------------------------------------------------------------- HotpotQA official answer metrics
# (hotpot_evaluate_v1.py: normalize_answer, exact match, token F1 with the yes/no/noanswer rule)
def normalize_answer(s):
    s = s.lower()
    s = "".join(ch for ch in s if ch not in set(string.punctuation))
    s = re.sub(r"\b(a|an|the)\b", " ", s)
    return " ".join(s.split())


def em(pred, gold):
    return float(normalize_answer(pred) == normalize_answer(gold))


def f1(pred, gold):
    p, g = normalize_answer(pred), normalize_answer(gold)
    if p in ("yes", "no", "noanswer") or g in ("yes", "no", "noanswer"):
        if p != g:
            return 0.0
    pt, gt = p.split(), g.split()
    common = Counter(pt) & Counter(gt)
    same = sum(common.values())
    if same == 0:
        return 0.0
    prec, rec = same / len(pt), same / len(gt)
    return 2 * prec * rec / (prec + rec)


def clean_answer(text):
    """The generator's final answer line: strip 'Answer:' prefixes, trailing period, quotes."""
    t = text.strip()
    m = re.search(r"(?i)final answer\s*[:\-]\s*(.+)", t) or re.search(r"(?i)^answer\s*[:\-]\s*(.+)", t, re.M)
    if m:
        t = m.group(1)
    t = t.strip().split("\n")[0].strip()
    t = t.strip(" \"'*").rstrip(".").strip()
    return t

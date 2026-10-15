"""Shared helpers for the scripts of the page "GraphRAG and structured retrieval" (prefix gr).

Everything loads the running example through the parent page's src/data/load.py, so numbers agree with the
root's Agentic lab and the sibling pages. Three environments (see ../README.md):
    $RAG_SCRATCH/venv      shared env (bge-small on CPU, bm25s, pytrec_eval)
    $RAG_SCRATCH/gr/venv   graspologic-native 1.3.1, igraph + leidenalg, networkx, kuzu, sqlglot
    $RAG_SCRATCH/gr/grenv  graphrag 3.3.0 (its own NLP extractor and hierarchical_leiden, graspologic-native 1.2.5)
Run as  RAG_SCRATCH=<shared rag folder> <env>/bin/python -I -B scripts/<name>.py
Large intermediates go to $RAG_SCRATCH/gr/; the small results the page embeds go to src/data/*.json.
"""
import json
import os
import re
import string
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src"))
sys.path.insert(0, os.path.join(ROOT_SRC, "data"))
import load as L  # noqa: E402

DATA = os.path.normpath(os.path.join(HERE, "..", "data"))
AGENT_OUT = os.path.join(ROOT_SRC, "agent", "out")


def work(*parts):
    p = L.path("gr", *parts)
    os.makedirs(os.path.dirname(p) if "." in os.path.basename(p) else p, exist_ok=True)
    return p


def save(name, obj):
    os.makedirs(DATA, exist_ok=True)
    with open(os.path.join(DATA, name), "w") as f:
        json.dump(obj, f, separators=(",", ":"), ensure_ascii=False)
    print("wrote", name, os.path.getsize(os.path.join(DATA, name)), "bytes")


def load_data(name):
    return json.load(open(os.path.join(DATA, name)))


def r3(x):
    return round(float(x), 3)


def jl(path):
    return [json.loads(l) for l in open(path)] if os.path.exists(path) else []


def hotpot():
    """(questions, corpus list, pid -> paragraph). The root's 200 test questions over the 9,760 paragraphs."""
    qs, corpus = L.multihop()
    return qs, corpus, {p["pid"]: p for p in corpus}


def para_text(p):
    """Same convention as the root's Agentic lab (common.para_text)."""
    return p["title"] + ": " + p["text"]


# HotpotQA official normalisation (hotpot_evaluate_v1.py), same as the root's src/agent/common.py
def normalize_answer(s):
    s = s.lower()
    s = "".join(ch for ch in s if ch not in set(string.punctuation))
    s = re.sub(r"\b(a|an|the)\b", " ", s)
    return " ".join(s.split())


GEN_PORTS = {"1.7b": 8370, "4b": 8371}  # this page's ports (the root's Agentic lab uses 8220/8221)


def generator():
    """The root Agentic lab's generator module (src/agent/gen.py: llama-server, Qwen3 GGUF Q4_K_M, temperature 0, seed 0,
    thinking off, every call cached by (model, messages, max_tokens, stop)), on this page's ports, with this page's
    caches under $RAG_SCRATCH/gr/gen/ so the root's caches are never written. Returns (gen module, cache factory)."""
    sys.path.insert(0, os.path.join(ROOT_SRC, "agent"))
    import gen as G  # noqa: E402
    for m, p in GEN_PORTS.items():
        G.MODELS[m]["port"] = p
    G.work = work  # server logs go to $RAG_SCRATCH/gr/logs

    def cache(name):
        c = G.Cache.__new__(G.Cache)
        c.path = work("gen", name + ".jsonl")
        c.d = {}
        if os.path.exists(c.path):
            for l in open(c.path):
                r = json.loads(l)
                c.d[r["key"]] = r
        return c
    return G, cache


def both_at(ranked, gold, ks=(1, 2, 3, 5, 10, 20)):
    """{k: 1 if every gold pid is in ranked[:k]}"""
    return {k: int(all(g in ranked[:k] for g in gold)) for k in ks}

"""Load helper for the running example of Topic: rag-and-retrieval.

Every tab imports this. Large artefacts live outside the repo, under the folder named by the
environment variable RAG_SCRATCH (the shared setup folder: venv, data, models, hf). Nothing here
hard-codes a user path.

    import os, sys; sys.path.insert(0, "<root>/src/data"); import load as L
    corpus, queries, qrels = L.beir("scifact")              # dicts
    ids, X = L.embeddings("scifact", "qwen3-emb-0.6b")       # corpus ids, float32 [n, d], unit norm
    qids, Q = L.embeddings("scifact", "qwen3-emb-0.6b", "queries")
    run = L.run("scifact", "bm25")                          # {qid: {docid: score}} top 100, test queries
    L.evaluate(run, qrels["test"])                          # {"ndcg@10": .., "recall@100": ..}

Run with the shared venv: $RAG_SCRATCH/venv/bin/python -I -B your_script.py (-B: no __pycache__ in the repo; -I ignores PYTHONDONTWRITEBYTECODE)
"""
import json
import os

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))


def scratch():
    rs = os.environ.get("RAG_SCRATCH")
    if not rs or not os.path.isdir(rs):
        raise RuntimeError("set RAG_SCRATCH to the shared rag setup folder (see src/data/README.md)")
    return rs


def path(*parts):
    return os.path.join(scratch(), *parts)


# ---------------------------------------------------------------- models
# Task instructions for instruction-aware embedders (Qwen3-Embedding format "Instruct: {task}\nQuery:{query}").
TASKS = {
    "scifact": "Given a scientific claim, retrieve documents that support or refute the claim",
    "nfcorpus": "Given a question, retrieve relevant documents that best answer the question",
    "hotpotqa": "Given a multi-hop question, retrieve documents that can help answer the question",
    "qasper": "Given a question about a research paper, retrieve passages from the paper that answer the question",
}

# key -> local folder under $RAG_SCRATCH/models, output dim, max tokens used here, dtype on MPS, prompts
MODELS = {
    "qwen3-emb-0.6b": dict(dir="Qwen3-Embedding-0.6B", dim=1024, max_len=1024, dtype="float16",
                           query_prefix="instruct", doc_prefix=""),
    "bge-small": dict(dir="bge-small-en-v1.5", dim=384, max_len=512, dtype="float32",
                      query_prefix="Represent this sentence for searching relevant passages: ", doc_prefix=""),
    "gte-modernbert": dict(dir="gte-modernbert-base", dim=768, max_len=1024, dtype="float32",
                           query_prefix="", doc_prefix=""),
    "minilm-l6": dict(dir="all-MiniLM-L6-v2", dim=384, max_len=256, dtype="float32",
                      query_prefix="", doc_prefix=""),
}
RERANKERS = {
    "ce-minilm-l6": "ms-marco-MiniLM-L6-v2",
    "bge-reranker-v2-m3": "bge-reranker-v2-m3",
    "qwen3-reranker-0.6b": "Qwen3-Reranker-0.6B",
}
COLBERT = "answerai-colbert-small-v1"  # runs in $RAG_SCRATCH/colenv (pylate pins older libraries)


def query_prefix(model, task):
    p = MODELS[model]["query_prefix"]
    return "Instruct: " + TASKS[task] + "\nQuery:" if p == "instruct" else p


def model_dir(name):
    return path("models", MODELS[name]["dir"] if name in MODELS else RERANKERS.get(name, name))


def encoder(model, device=None):
    """SentenceTransformer for an embedding model key, on mps if available. Encode queries with
    enc.encode(texts, prompt=query_prefix(model, task), normalize_embeddings=True)."""
    import torch
    from sentence_transformers import SentenceTransformer
    device = device or ("mps" if torch.backends.mps.is_available() else "cpu")
    m = MODELS[model]
    enc = SentenceTransformer(model_dir(model), device=device,
                              model_kwargs={"torch_dtype": getattr(torch, m["dtype"])} if device != "cpu" else {})
    enc.max_seq_length = m["max_len"]
    return enc


# ---------------------------------------------------------------- BEIR sets (scifact, nfcorpus)
def doc_text(d):
    """BEIR convention: title + space + text."""
    return (d["title"] + " " + d["text"]).strip() if d.get("title") else d["text"]


def beir(name):
    """corpus {docid: {"title","text"}}, queries {qid: text}, qrels {split: {qid: {docid: grade}}}."""
    import pandas as pd
    raw = path("data", "raw", name)
    c = pd.read_parquet(os.path.join(raw, "corpus.parquet"))
    corpus = {str(i): {"title": t or "", "text": x or ""} for i, t, x in zip(c["_id"], c["title"], c["text"])}
    q = pd.read_parquet(os.path.join(raw, "queries.parquet"))
    queries = {str(i): t for i, t in zip(q["_id"], q["text"])}
    qrels = {}
    for split in ("train", "dev", "test"):
        f = os.path.join(raw, split + ".tsv")
        if not os.path.exists(f):
            continue
        d = {}
        for i, line in enumerate(open(f)):
            if i == 0:
                continue  # header: query-id corpus-id score
            qid, did, s = line.rstrip("\n").split("\t")
            if int(s) > 0:
                d.setdefault(qid, {})[did] = int(s)
        qrels[split] = d
    return corpus, queries, qrels


# ---------------------------------------------------------------- long documents (QASPER) and multi-hop (HotpotQA)
def _jsonl(p):
    with open(p) as f:
        return [json.loads(l) for l in f]


def longdoc():
    """docs: [{paper_id, title, text, paragraphs:[{section,start,end}]}];
    questions: [{qid, paper_id, question, answers:[{type,text}], evidence:[{start,end,annotators}]}].
    Evidence spans are character offsets into the paper's text."""
    return _jsonl(path("data", "longdoc", "docs.jsonl")), _jsonl(path("data", "longdoc", "questions.jsonl"))


def longdoc_chunks():
    """Default chunking (256 Qwen3 tokens, 32 overlap): [{cid, paper_id, start, end, n_tokens, text}]."""
    return _jsonl(path("data", "longdoc", "chunks_t256_o32.jsonl"))


def multihop():
    """questions: [{qid, question, answer, type, level, gold_pids, supporting_facts, own_context_pids}];
    corpus: [{pid, title, sentences, text}] (gold + distractor paragraphs of 1,000 dev questions)."""
    return _jsonl(path("data", "multihop", "questions.jsonl")), _jsonl(path("data", "multihop", "corpus.jsonl"))


# ---------------------------------------------------------------- precomputed artefacts
def embeddings(dataset, model, which="corpus", mmap=True):
    """(ids, float32 array [n, dim], rows unit-normalised). dataset in scifact, nfcorpus, qasper, hotpotqa."""
    d = path("data", "emb", dataset, model)
    ids = open(os.path.join(d, which + "_ids.txt")).read().split("\n")
    X = np.load(os.path.join(d, which + ".npy"), mmap_mode="r" if mmap else None)
    return ids, X


def run(dataset, system):
    """Run on the test queries: {qid: {docid: score}}, insertion order = rank order. system: bm25, bm25-rankbm25,
    an embedding model key, colbert-small, or "<first stage>+<reranker>[_top30]" (see README)."""
    out = {}
    for line in open(path("data", "runs", dataset, system + ".run")):
        qid, _, did, rank, score, _ = line.split()
        out.setdefault(qid, {})[did] = float(score)
    return out


def rerank_scores(dataset, reranker):
    """{qid: {docid: score}} for every scored candidate. reranker: ce-minilm-l6 (BM25 top 100 + one embedder's top 100),
    qwen3-reranker-0.6b_top30 or bge-reranker-v2-m3_top30 (BM25 top 30 + Qwen3-Emb top 30)."""
    out = {}
    for line in open(path("data", "rerank", dataset, reranker + ".tsv")):
        q, d, s = line.rstrip("\n").split("\t")
        out.setdefault(q, {})[d] = float(s)
    return out


def write_run(run_dict, fname, tag, k=100):
    os.makedirs(os.path.dirname(fname), exist_ok=True)
    with open(fname, "w") as f:
        for qid, d in run_dict.items():
            for r, (did, s) in enumerate(sorted(d.items(), key=lambda x: -x[1])[:k]):
                f.write("%s Q0 %s %d %.6f %s\n" % (qid, did, r + 1, s, tag))


def evaluate(run_dict, qrels_split, metrics=("ndcg_cut_10", "recall_100")):
    """Mean of pytrec_eval metrics over the queries in qrels (missing queries score 0, as in BEIR)."""
    import pytrec_eval
    measures = set()
    for m in metrics:  # "ndcg_cut_10" -> "ndcg_cut.10", "recall_100" -> "recall.100", "recip_rank" stays
        base, _, k = m.rpartition("_")
        measures.add(base + "." + k if k.isdigit() else m)
    ev = pytrec_eval.RelevanceEvaluator(qrels_split, measures)
    res = ev.evaluate({q: run_dict[q] for q in qrels_split if run_dict.get(q)})
    names = {"ndcg_cut_10": "ndcg@10", "recall_100": "recall@100", "recall_10": "recall@10", "recip_rank": "mrr"}
    return {names.get(m, m): float(np.mean([res.get(q, {}).get(m, 0.0) for q in qrels_split])) for m in metrics}


def manifest():
    return json.load(open(os.path.join(HERE, "manifest.json")))

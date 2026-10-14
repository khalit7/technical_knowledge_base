"""Chunking on QASPER (281 papers, 892 answerable questions with evidence located as character spans).
For every strategy in chunkers.py (plus semantic and contextual variants written by other scripts):
- chunk count and size in Qwen3 tokens;
- evidence intact: questions with at least one evidence paragraph wholly inside one chunk;
- retrieval inside the question's own paper (the setting of a "chat with this document" app): rank the paper's
  chunks with BM25 (bm25s, same settings as the corpus runs) and, when its vectors exist, with a dense model;
  a question is a hit when the chunks handed to the generator together cover at least 90% of the characters of
  one evidence paragraph. Two ways of handing chunks over: the top k chunks (k = 1, 3, 5), and a token budget
  (256, 512, 1024, 2048 tokens: chunks taken in rank order while they fit; overlap is paid twice).
usage: python -I -B chunk_eval.py [--write-chunks] [strategy ...]
Output: out/chunking.json (merged with earlier runs), chunk spans in $RAG_SCRATCH/pipe/chunks/<strategy>.jsonl."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import numpy as np
from common import L, save, r3, work, OUT
import chunkers as C

KS = [1, 3, 5]
BUDGETS = [256, 512, 1024, 2048]
COVER = 0.9


def load_tok():
    from transformers import AutoTokenizer
    return AutoTokenizer.from_pretrained(L.path("models", "Qwen3-Embedding-0.6B"))


def chunk_file(strat):
    return work("chunks", strat + ".jsonl")


def write_chunks(strats):
    tok = load_tok()
    docs, _ = L.longdoc()
    D = [C.Doc(d, tok) for d in docs]
    for s in strats:
        fn = C.STRATEGIES[s]
        with open(chunk_file(s), "w") as f:
            for doc in D:
                for i, (a, b) in enumerate(fn(doc)):
                    f.write(json.dumps({"cid": "%s_%03d" % (doc.d["paper_id"], i), "paper_id": doc.d["paper_id"],
                                        "start": a, "end": b, "n_tokens": doc.ntok(a, b)}) + "\n")
        print("chunks", s, flush=True)


def read_chunks(strat):
    rows = [json.loads(l) for l in open(chunk_file(strat))]
    by = {}
    for r in rows:
        by.setdefault(r["paper_id"], []).append(r)
    return rows, by


def covered(spans, ev):
    """fraction of ev's characters inside the union of spans"""
    s, e = ev["start"], ev["end"]
    iv = sorted((max(a, s), min(b, e)) for a, b in spans if b > s and a < e)
    tot, cur = 0, None
    for a, b in iv:
        if cur is None or a > cur[1]:
            if cur:
                tot += cur[1] - cur[0]
            cur = [a, b]
        else:
            cur[1] = max(cur[1], b)
    if cur:
        tot += cur[1] - cur[0]
    return tot / max(1, e - s)


def hit(chosen, q):
    spans = [(c["start"], c["end"]) for c in chosen]
    return any(covered(spans, ev) >= COVER for ev in q["evidence"])


def by_budget(ranked, budget):
    out, used = [], 0
    for c in ranked:
        if used + c["n_tokens"] <= budget:
            out.append(c)
            used += c["n_tokens"]
    return out


def bm25_rank(text_of, by, qs):
    import bm25s, Stemmer
    stem = Stemmer.Stemmer("english")
    ranks = {}
    for pid, cs in by.items():
        ret = bm25s.BM25(method="lucene", k1=1.2, b=0.75)
        ret.index(bm25s.tokenize([text_of(c) for c in cs], stopwords="en", stemmer=stem, show_progress=False), show_progress=False)
        mine = [q for q in qs if q["paper_id"] == pid]
        if not mine:
            continue
        qtok = bm25s.tokenize([q["question"] for q in mine], stopwords="en", stemmer=stem, show_progress=False)
        res, sc = ret.retrieve(qtok, k=len(cs), show_progress=False, n_threads=1)
        for i, q in enumerate(mine):
            ranks[q["qid"]] = [cs[j] for j in res[i]]
    return ranks


def dense_rank(strat, model, by, qs):
    p = work("chunks", "%s.%s.npy" % (strat, model))
    if not os.path.exists(p):
        return None
    V = np.load(p)
    qids = open(work("chunks", "questions.%s.ids" % model)).read().split("\n")
    QV = np.load(work("chunks", "questions.%s.npy" % model))
    qpos = {q: i for i, q in enumerate(qids)}
    rows, _, _ = chunk_texts(strat)
    pos = {r["cid"]: i for i, r in enumerate(rows)}
    ranks = {}
    for q in qs:
        cs = by[q["paper_id"]]
        s = V[[pos[c["cid"]] for c in cs]] @ QV[qpos[q["qid"]]]
        ranks[q["qid"]] = [cs[j] for j in np.argsort(-s, kind="stable")]
    return ranks


def score(ranks, qs):
    out = {"k": {}, "budget": {}}
    for k in KS:
        out["k"][str(k)] = r3(np.mean([hit(ranks[q["qid"]][:k], q) for q in qs]))
    for b in BUDGETS:
        out["budget"][str(b)] = r3(np.mean([hit(by_budget(ranks[q["qid"]], b), q) for q in qs]))
    return out


def section_of(doc):
    ps = doc["paragraphs"]
    starts = [p["start"] for p in ps]
    import bisect
    def f(pos):
        i = max(0, bisect.bisect_right(starts, pos) - 1)
        return ps[i]["section"] if ps else ""
    return f


def subset_papers():
    """the papers given LLM-written context (every 4th paper by id): contextual.py writes it"""
    p = work("chunks", "ctx_subset.txt")
    return set(open(p).read().split()) if os.path.exists(p) else set()


def chunk_texts(strat):
    """rows of the base strategy and the text each chunk is indexed with. Variants:
    <base>+hdr  title and section heading prepended (no model);
    <base>+ctx  the generator's 1 to 2 sentence context prepended (subset of papers only; contextual.py)."""
    base, _, var = strat.partition("+")
    docs, _ = L.longdoc()
    dd = {d["paper_id"]: d for d in docs}
    rows, by = read_chunks(base)
    if var == "ctx":
        keep = subset_papers()
        rows = [r for r in rows if r["paper_id"] in keep]
        by = {p: v for p, v in by.items() if p in keep}
        ctx = json.load(open(work("chunks", "ctx_%s.json" % base)))
    secf = {p: section_of(d) for p, d in dd.items()}
    def text(c):
        t = dd[c["paper_id"]]["text"][c["start"]:c["end"]]
        if var == "hdr":
            return "Title: %s\nSection: %s\n%s" % (dd[c["paper_id"]]["title"], secf[c["paper_id"]](c["start"]), t)
        if var == "ctx":
            return ctx[c["cid"]] + "\n" + t
        return t
    return rows, by, text


def evaluate(strat, models=("bge-small",), only=None):
    docs, qs = L.longdoc()
    rows, by, tf = chunk_texts(strat)
    if only is not None:  # restrict to a subset of papers (for comparisons with +ctx)
        rows = [r for r in rows if r["paper_id"] in only]
        by = {p: v for p, v in by.items() if p in only}
    qs = [q for q in qs if q["paper_id"] in by]
    n = np.array([r["n_tokens"] for r in rows])
    intact = sum(any(c["start"] <= ev["start"] and ev["end"] <= c["end"] for ev in q["evidence"] for c in by[q["paper_id"]]) for q in qs)
    R = {"chunks": len(rows), "tok_mean": round(float(n.mean()), 1), "tok_p10": int(np.percentile(n, 10)),
         "tok_median": int(np.median(n)), "tok_p90": int(np.percentile(n, 90)), "tok_max": int(n.max()),
         "total_tokens": int(n.sum()), "intact": int(intact), "n_questions": len(qs), "papers": len(by),
         "bm25": score(bm25_rank(tf, by, qs), qs)}
    for m in models:
        dr = dense_rank(strat, m, by, qs)
        if dr:
            R[m] = score(dr, qs)
    return R


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "--write-chunks":
        args = args[1:] or list(C.STRATEGIES)
        write_chunks(args)
    strats = args or list(C.STRATEGIES)
    outp = os.path.join(OUT, "chunking.json")
    res = json.load(open(outp)) if os.path.exists(outp) else {}
    for s in strats:
        if s.endswith("@sub"):  # a base strategy restricted to the +ctx subset, for a like-for-like comparison
            res[s] = evaluate(s[:-4], models=("bge-small", "qwen3-emb-0.6b"), only=subset_papers())
        else:
            res[s] = evaluate(s, models=("bge-small", "qwen3-emb-0.6b"))
        print(s, json.dumps(res[s]), flush=True)
    save("chunking.json", res)

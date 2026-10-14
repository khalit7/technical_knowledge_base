"""Score the chunk files made by chunk_make.py (real LangChain splitters) with the root Pipeline lab's own metric
code (src/pipe/chunk_eval.py: evidence intact, within-paper BM25 and dense retrieval by top k and by token budget),
so the numbers sit in the same table as the root's chunking.json.
usage: python -I -B chunk_eval_rp.py [--embed] [name ...]
  --embed  embed the chunks with bge-small on MPS first (hold the bench lock); vectors in $RAG_SCRATCH/rp/chunks/
Output: out/chunking_rp.json (merged)."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, time
import numpy as np
import rp

L = rp.L
sys.path.insert(0, os.path.join(rp.ROOT_SRC, "pipe"))
import chunk_eval as CE  # noqa: E402

NAMES = ["lc-rec-tok256", "lc-rec-tok256-sent", "lc-rec-char1000", "lc-rec-char4000", "lc-md+rec-tok256"]


def rows_by(name):
    rows = [json.loads(l) for l in open(rp.work("chunks", name + ".jsonl"))]
    by = {}
    for r in rows:
        by.setdefault(r["paper_id"], []).append(r)
    return rows, by


def embed(names):
    docs, _ = L.longdoc(); text = {d["paper_id"]: d["text"] for d in docs}
    enc = L.encoder("bge-small")
    for n in names:
        p = rp.work("chunks", n + ".bge-small.npy")
        if os.path.exists(p):
            continue
        rows, _ = rows_by(n)
        texts = [text[r["paper_id"]][r["start"]:r["end"]] for r in rows]
        enc.encode(texts[:64], batch_size=64)
        la = os.getloadavg(); t0 = time.perf_counter()
        V = enc.encode(texts, batch_size=64, normalize_embeddings=True, show_progress_bar=False)
        dt = time.perf_counter() - t0
        np.save(p, V.astype(np.float32))
        rec = dict(strategy=n, chunks=len(texts), seconds=round(dt, 1), loadavg_before=[round(x, 2) for x in la],
                   loadavg_after=[round(x, 2) for x in os.getloadavg()], when=time.strftime("%Y-%m-%d %H:%M"))
        print(json.dumps(rec), flush=True)
        with open(rp.work("chunks", "embed_timings.jsonl"), "a") as f:
            f.write(json.dumps(rec) + "\n")


def dense_rank(name, by, qs):
    p = rp.work("chunks", name + ".bge-small.npy")
    if not os.path.exists(p):
        return None
    V = np.load(p)
    qids = open(L.path("pipe", "chunks", "questions.bge-small.ids")).read().split("\n")
    QV = np.load(L.path("pipe", "chunks", "questions.bge-small.npy")); qp = {q: i for i, q in enumerate(qids)}
    rows, _ = rows_by(name)
    pos = {id(r): i for i, r in enumerate(rows)}
    # by holds the same dicts? rebuild by from rows to share identities
    by2 = {}
    for i, r in enumerate(rows):
        r["_i"] = i
        by2.setdefault(r["paper_id"], []).append(r)
    out = {}
    for q in qs:
        cs = by2[q["paper_id"]]
        s = V[[c["_i"] for c in cs]] @ QV[qp[q["qid"]]]
        out[q["qid"]] = [cs[j] for j in np.argsort(-s, kind="stable")]
    return out


def evaluate(name):
    docs, qs = L.longdoc(); text = {d["paper_id"]: d["text"] for d in docs}
    rows, by = rows_by(name)
    n = np.array([r["n_tokens"] for r in rows])
    intact = sum(any(c["start"] <= ev["start"] and ev["end"] <= c["end"] for ev in q["evidence"] for c in by[q["paper_id"]]) for q in qs)
    R = {"chunks": len(rows), "tok_mean": round(float(n.mean()), 1), "tok_p10": int(np.percentile(n, 10)), "tok_median": int(np.median(n)),
         "tok_p90": int(np.percentile(n, 90)), "tok_max": int(n.max()), "total_tokens": int(n.sum()), "intact": int(intact),
         "n_questions": len(qs), "papers": len(by),
         "bm25": CE.score(CE.bm25_rank(lambda c: text[c["paper_id"]][c["start"]:c["end"]], by, qs), qs)}
    dr = dense_rank(name, by, qs)
    if dr:
        R["bge-small"] = CE.score(dr, qs)
    return R


if __name__ == "__main__":
    args = sys.argv[1:]
    if args and args[0] == "--embed":
        args = args[1:] or NAMES
        embed(args)
    names = args or NAMES
    res = rp.load_out("chunking_rp.json")
    for n in names:
        res[n] = evaluate(n)
        print(n, json.dumps(res[n]), flush=True)
    rp.save("chunking_rp.json", res)

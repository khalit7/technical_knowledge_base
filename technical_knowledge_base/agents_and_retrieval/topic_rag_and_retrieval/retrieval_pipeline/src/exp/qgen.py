"""Generator calls for query understanding (hold the bench lock). Qwen3-1.7B, greedy, thinking off (rpgen.py).
1. step-back (Zheng et al. 2023, arXiv 2310.06117): a more general question behind each of the 300 SciFact test claims;
2. decomposition: each of the 200 HotpotQA questions split into self-contained sub-questions (one per line);
3. self-query: 300 constructed QASPER queries (a question plus a reference to its paper by title, by month and
   year, or by year only; templates below, seed 0) -> the generator extracts {"query", "year", "month", "title"} as JSON.
Writes $RAG_SCRATCH/rp/qgen.json (texts) and the costs. The retrieval side is scored by qeval.py."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, random, time
import rp
import rpgen as G

L = rp.L
STEP = ("You are an expert at world knowledge. Your task is to step back and paraphrase a question to a more generic "
        "step-back question, which is easier to answer.\n\nOriginal claim: {q}\n\nWrite the step-back question only, on one line.")
DECOMP = ("Break the question below into the simplest self-contained sub-questions needed to answer it, one per line, "
          "at most 3. Do not answer them. If the question is already simple, repeat it.\n\nQuestion: {q}")
SELFQ = ("You turn a search request over a library of research papers into a structured query.\n"
         "The library's metadata fields are: year (integer, the year the paper appeared on arXiv), month (integer 1-12), "
         "title (the paper's title, or words from it).\n"
         "Return only a JSON object with keys \"query\" (the request with every reference to the paper removed), "
         "\"year\", \"month\" and \"title\" (use null for any field the request does not mention).\n\nRequest: {q}")
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


def selfq_queries():
    docs, qs = L.longdoc()
    meta = {}
    for d in docs:
        yy, mm = int(d["paper_id"][:2]), int(d["paper_id"][2:4])
        meta[d["paper_id"]] = {"year": 2000 + yy, "month": mm, "title": d["title"]}
    rnd = random.Random(0)
    pick = rnd.sample(qs, 300)
    out = []
    for i, q in enumerate(pick):
        m = meta[q["paper_id"]]
        kind = ["title", "month_year", "year"][i % 3]
        if kind == "title":
            text = 'In the paper "%s", %s' % (m["title"], q["question"][0].lower() + q["question"][1:])
        elif kind == "month_year":
            text = "%s (the paper posted to arXiv in %s %d)" % (q["question"].rstrip("?"), MONTHS[m["month"] - 1], m["year"])
        else:
            text = "%s Only look at papers from %d." % (q["question"].rstrip("?") + "?", m["year"])
        out.append({"qid": q["qid"], "paper_id": q["paper_id"], "kind": kind, "text": text, "gold": m})
    return out


def main():
    _, queries, qr = L.beir("scifact")
    te = sorted(qr["test"])
    hq, _ = L.multihop()
    sq = selfq_queries()
    cache = G.Cache("qgen")
    res = {"step_back": {}, "decomp": {}, "selfq": {"queries": sq, "out": {}}, "cost": {}}
    la0 = os.getloadavg(); t0 = time.perf_counter()
    secs = {"step_back": 0.0, "decomp": 0.0, "selfq": 0.0}
    toks = {"step_back": [0, 0], "decomp": [0, 0], "selfq": [0, 0]}
    def call(kind, prompt, mx):
        r = G.chat(prompt, cache, max_tokens=mx, tag=kind)
        secs[kind] += r["seconds"]; toks[kind][0] += r["n_in"]; toks[kind][1] += r["n_out"]
        return r["text"]
    for i, q in enumerate(te):
        res["step_back"][q] = call("step_back", STEP.format(q=queries[q]), 60)
    print("step-back done", round(time.perf_counter() - t0), "s", flush=True)
    for q in hq:
        res["decomp"][q["qid"]] = call("decomp", DECOMP.format(q=q["question"]), 120)
    print("decomp done", round(time.perf_counter() - t0), "s", flush=True)
    for q in sq:
        res["selfq"]["out"][q["qid"]] = call("selfq", SELFQ.format(q=q["text"]), 120)
    print("selfq done", round(time.perf_counter() - t0), "s", flush=True)
    res["cost"] = {"model": G.MODEL_NAME, "seconds": {k: round(v, 1) for k, v in secs.items()}, "tokens_in_out": toks,
                   "n": {"step_back": len(te), "decomp": len(hq), "selfq": len(sq)},
                   "wall_s": round(time.perf_counter() - t0, 1), "loadavg_before": [round(x, 2) for x in la0],
                   "loadavg_after": [round(x, 2) for x in os.getloadavg()], "when": time.strftime("%Y-%m-%d %H:%M")}
    json.dump(res, open(rp.work("qgen.json"), "w"))
    G.stop()
    print(json.dumps(res["cost"]))


if __name__ == "__main__":
    main()

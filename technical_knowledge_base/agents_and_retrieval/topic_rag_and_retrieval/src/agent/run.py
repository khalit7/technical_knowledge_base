"""Run one strategy over a question set with one generator and record every question's trajectory.

usage: python -I -B run.py <strategy> <model> [set] [n] [option=value ...]
  strategy: closed | single | react | decomp | longctx
  model:    1.7b | 4b
  set:      test (the 200 questions, default) | heldout (the other 800 dev questions, for prompt choice only) | single (constructed single-hop, router.py)
  n:        first n questions of the set (default all)
  options:  prompt=<key>  k=<int>  budget=<int>  tokens=<int> (longctx window)  method=bge|bm25  offline=1
Writes $RAG_SCRATCH/agt/runs/<set>_<model>_<strategy><suffix>.jsonl. Generator runs hold the bench lock."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import time

import gen as G
import strategies as ST
from common import data, em, f1, heldout, jl_read, jl_write, work


def qset(name):
    if name == "test":
        return data()[0]
    if name == "heldout":
        return heldout()
    if name == "single":
        return jl_read(work("single_hop.jsonl"))
    raise SystemExit("unknown set " + name)


def run_name(set_, model, strategy, opts):
    suf = "".join("_%s%s" % (k, v) for k, v in sorted(opts.items()) if k not in ("offline",))
    return "%s_%s_%s%s" % (set_, model, strategy, suf)


def main(argv):
    strategy, model = argv[0], argv[1]
    set_ = argv[2] if len(argv) > 2 and "=" not in argv[2] else "test"
    n = int(argv[3]) if len(argv) > 3 and "=" not in argv[3] else None
    opts = dict(a.split("=", 1) for a in argv[2:] if "=" in a)
    offline = opts.get("offline") == "1"
    kw = {}
    for k in ("k", "budget", "tokens"):
        if k in opts:
            kw["budget_tokens" if k == "tokens" else k] = int(opts[k])
    if "prompt" in opts:
        kw["prompt"] = opts["prompt"]
    if "method" in opts:
        kw["method"] = opts["method"]
    fn = {"closed": ST.closed, "single": ST.single, "react": ST.react, "decomp": ST.decompose, "longctx": ST.longctx}[strategy]
    qs = qset(set_)[:n]
    cache = G.Cache("%s_%s" % (model, strategy))
    name = run_name(set_, model, strategy, opts)
    rows, t0 = [], time.time()
    for i, q in enumerate(qs):
        r = fn(q, cache, model, offline=offline, **kw)
        if r is None:
            print("not cached:", q["qid"]); continue
        gold = set(q.get("gold_pids", []))
        row = {"qid": q["qid"], "type": q.get("type"), "answer": r["answer"], "gold": q["answer"],
               "em": em(r["answer"], q["answer"]), "f1": round(f1(r["answer"], q["answer"]), 4),
               "n_search": len(r["searches"]), "n_calls": len(r["calls"]),
               "gold_seen": sum(p in set(r["seen"]) for p in gold), "n_gold": len(gold), "n_seen": len(r["seen"]),
               "tok_in": sum(c["n_in"] for c in r["calls"]), "tok_in_new": sum(c["n_in_new"] or 0 for c in r["calls"]),
               "tok_out": sum(c["n_out"] for c in r["calls"]), "gen_s": round(sum(c["seconds"] for c in r["calls"]), 3),
               "search_ms": round(sum(s["ms"] for s in r["searches"]), 2), "wall_s": round(r["wall_s"], 3),
               "calls": r["calls"], "searches": r["searches"], "steps": r["steps"], "seen": r["seen"]}
        rows.append(row)
        if (i + 1) % 20 == 0:
            m = len(rows)
            print("%s %d/%d EM %.3f F1 %.3f gold_seen %.2f %.0fs" % (name, i + 1, len(qs), sum(x["em"] for x in rows) / m,
                  sum(x["f1"] for x in rows) / m, sum(x["gold_seen"] for x in rows) / m, time.time() - t0), flush=True)
    jl_write(work("runs", name + ".jsonl"), rows)
    m = max(1, len(rows))
    print("DONE %s n=%d EM %.3f F1 %.3f searches %.2f tok_in %.0f wall %.1fs" % (
        name, len(rows), sum(x["em"] for x in rows) / m, sum(x["f1"] for x in rows) / m, sum(x["n_search"] for x in rows) / m,
        sum(x["tok_in"] for x in rows) / m, sum(x["wall_s"] for x in rows) / m), flush=True)


if __name__ == "__main__":
    main(sys.argv[1:])

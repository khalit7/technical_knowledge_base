"""Evaluate the LLM reranker runs of e_llm.py (deterministic, no model): nDCG@10 on the same claims for the prompted
Qwen3-4B (pointwise, pairwise, listwise) and for the trained rerankers' recorded scores at the same depth, with calls,
prompt tokens and wall time per claim from llama-server's own timings. Also picks the claim for the sliding-window
animation (rule: the first claim in id order where the listwise run moves a relevant abstract from BM25 rank > 10 into
the top 3) and replays its windows.
Output: data/llm.json"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import numpy as np
from rrlib import L, DS, RERANKERS, rerank_scores, per_query, mean, r3, save, work, load_data
import e_llm as E


def jl(name):
    p = work("llm", name + ".jsonl")
    return [json.loads(l) for l in open(p)] if os.path.exists(p) else []


def nd(run, qrels, qs):
    sub = {q: qrels[q] for q in qs}
    return mean(per_query(run, sub, ("ndcg_cut.10",)), "ndcg_cut.10")


def as_run(orders, bm, depth):
    out = {}
    for q, o in orders.items():
        lst = o + [d for d in bm[q] if d not in o]
        out[q] = {d: float(len(lst) - i) for i, d in enumerate(lst)}
    return out


def main():
    corpus, queries, qrels = L.beir(DS)
    qt = qrels["test"]
    bm = L.run(DS, "bm25")
    claims = E.subset()
    tim = load_data("timings.json") if os.path.exists(os.path.join(os.path.dirname(__file__), "..", "data", "timings.json")) else {}
    tok = load_data("tokens.json")["models"]
    rows = []
    rows.append({"name": "BM25 alone", "ndcg10": r3(nd({q: bm[q] for q in claims}, qt, claims)), "calls": 0, "tokens": "0", "secs": "under 0.01"})
    for n, key in RERANKERS.items():
        S = rerank_scores(key)
        orders = {q: sorted(list(bm[q])[:E.DEPTH_POINT], key=lambda d: -S[q][d]) for q in claims}
        t = tim.get(n, {}).get("K", {}).get("20")
        rows.append({"name": n + " (trained), top 20", "ndcg10": r3(nd(as_run(orders, bm, 20), qt, claims)), "calls": 20,
                     "tokens": "{:,}".format(int(round(20 * tok[n]["tokens_mean"]))), "secs": ("%.2f" % (t["p50_ms"] / 1000)) if t else "%.2f" % (20 / tok[n]["pairs_per_s_measured"]),
                     "hl": n == "qwen3-reranker-0.6b"})
    out = {"n_claims": len(claims), "rows": rows, "pair_passes": "2"}
    # pointwise
    P = jl("point")
    if P:
        S, ptok, wall = {}, {}, {}
        for r in P:
            y = r["lp_yes"] if r["lp_yes"] is not None else -30.0
            n_ = r["lp_no"] if r["lp_no"] is not None else -30.0
            S.setdefault(r["q"], {})[r["d"]] = y - n_
            ptok[r["q"]] = ptok.get(r["q"], 0) + (r["prompt_n"] or 0) + (r["cache_n"] or 0)
            wall[r["q"]] = wall.get(r["q"], 0) + r["wall_s"]
        cq = [q for q in claims if q in S and len(S[q]) == E.DEPTH_POINT]
        orders = {q: sorted(list(bm[q])[:E.DEPTH_POINT], key=lambda d: -S[q][d]) for q in cq}
        rows.append({"name": "Qwen3-4B prompted, pointwise yes/no, top 20", "ndcg10": r3(nd(as_run(orders, bm, 20), qt, cq)), "calls": 20,
                     "tokens": "{:,}".format(int(np.mean([ptok[q] for q in cq]))), "secs": "%.1f" % np.mean([wall[q] for q in cq]), "n": len(cq)})
        out["point_missing_yes_no"] = sum(1 for r in P if r["lp_yes"] is None or r["lp_no"] is None)
    # listwise
    Li = jl("list")
    if Li:
        orders = {r["q"]: r["order"] for r in Li}
        cq = [q for q in claims if q in orders]
        calls = [len(r["calls"]) for r in Li]
        miss = sum(c["missing"] for r in Li for c in r["calls"])
        ncalls = sum(calls)
        rows.append({"name": "Qwen3-4B prompted, listwise (window 10, step 5), top 20", "ndcg10": r3(nd(as_run(orders, bm, 20), qt, cq)), "calls": int(np.mean(calls)),
                     "tokens": "{:,}".format(int(np.mean([sum((c["prompt_n"] or 0) + (c["cache_n"] or 0) for c in r["calls"]) for r in Li]))),
                     "secs": "%.1f" % np.mean([sum(c["wall_s"] for c in r["calls"]) for r in Li]), "n": len(cq)})
        out["list_missing"] = "%d identifiers missing over %d calls" % (miss, ncalls)
        out["list_calls_with_missing"] = sum(1 for r in Li for c in r["calls"] if c["missing"])
        out["list_identity"] = sum(1 for r in Li for c in r["calls"] if E.parse_perm(c["text"], E.WIN)[0] == list(range(E.WIN)))
        out["list_calls"] = ncalls
        # sliding-window animation claim
        for r in sorted(Li, key=lambda r: int(r["q"])):
            q = r["q"]
            start = list(bm[q])[:E.DEPTH_LIST]
            rel = [d for d in start if d in qt[q]]
            if not rel:
                continue
            if start.index(rel[0]) >= 10 and min(r["order"].index(d) for d in rel) < 3:
                order = list(start)
                wins = []
                for c in r["calls"]:
                    win = order[c["start"]:c["start"] + E.WIN]
                    perm, m = E.parse_perm(c["text"], len(win))
                    order[c["start"]:c["start"] + E.WIN] = [win[i] for i in perm]
                    wins.append({"start": c["start"], "size": len(win), "after": list(order), "text": c["text"], "missing": c["missing"]})
                assert order == r["order"], "replay differs"
                out["sw"] = {"qid": q, "claim": queries[q], "start": start, "windows": wins, "rel": rel,
                             "titles": {d: corpus[d]["title"] for d in start}}
                break
    else:
        out["list_missing"] = "PENDING"
    # pairwise (fewer claims): compare with the trained reranker on the same claims and depth
    Pa = jl("pair")
    if Pa:
        orders = {r["q"]: r["order"] for r in Pa}
        cq = [q for q in claims if q in orders]
        S = rerank_scores(RERANKERS["qwen3-reranker-0.6b"])
        tr = {q: sorted(list(bm[q])[:E.DEPTH_PAIR], key=lambda d: -S[q][d]) for q in cq}
        rows.append({"name": "Qwen3-4B prompted, pairwise PRP (2 passes, both orders), top 10; %d claims" % len(cq),
                     "ndcg10": r3(nd(as_run(orders, bm, 10), qt, cq)), "calls": int(np.mean([2 * len(r["calls"]) for r in Pa])),
                     "tokens": "{:,}".format(int(np.mean([sum((c["prompt_n1"] or 0) + (c["cache_n1"] or 0) + (c["prompt_n2"] or 0) + (c["cache_n2"] or 0) for c in r["calls"]) for r in Pa]))),
                     "secs": "%.1f" % np.mean([sum(c["wall_s1"] + c["wall_s2"] for c in r["calls"]) for r in Pa]), "n": len(cq)})
        rows.append({"name": "same %d claims: BM25 alone / Qwen3-Reranker top 10" % len(cq), "ndcg10": r3(nd({q: bm[q] for q in cq}, qt, cq)),
                     "calls": 0, "tokens": "-", "secs": "-", "extra": r3(nd(as_run(tr, bm, 10), qt, cq))})
        rows[-1]["name"] += " = %.3f / %.3f" % (rows[-1]["ndcg10"], rows[-1]["extra"])
        out["pair_disagree"] = sum(1 for r in Pa for c in r["calls"] if c["pref"][0] != c["pref"][1])
        out["pair_comparisons"] = sum(len(r["calls"]) for r in Pa)
    runs = jl("runs")
    out["runs"] = runs
    byname = {r["name"]: r for r in rows}
    pw = [r for r in rows if "pointwise" in r["name"]]
    lw = [r for r in rows if "listwise" in r["name"]]
    qw = [r for r in rows if r["name"].startswith("qwen3-reranker")][0]
    if pw and lw:
        out["summary"] = ("nDCG@10 %s pointwise and %s listwise, against %s for the trained reranker and %s for BM25 alone, at about %s and %s seconds per claim against %s" %
                          (r3(pw[0]["ndcg10"]), r3(lw[0]["ndcg10"]), r3(qw["ndcg10"]), r3(rows[0]["ndcg10"]), pw[0]["secs"], lw[0]["secs"], qw["secs"]))
        if Pa:
            pr = [r for r in rows if "pairwise" in r["name"]][0]; same = rows[-1]
            out["summary"] += ("; pairwise comparisons on 50 claims did best of the three (%s against %s for BM25 and %s for Qwen3-Reranker on the same claims, top 10)" %
                               (r3(pr["ndcg10"]), r3(same["ndcg10"]), r3(same["extra"])))
        note = ("Same %d claims (every third test claim), same BM25 candidates. Pointwise: %d of the %d calls lacked a yes or no log-probability among the top 20 and were scored at the floor. "
                "Listwise: %s (%d calls had to be repaired); %d of %d calls returned the input order unchanged. " % (len(claims), out.get("point_missing_yes_no", 0), 20 * len(claims), out["list_missing"], out.get("list_calls_with_missing", 0), out.get("list_identity", 0), out.get("list_calls", 0)))
        if Pa:
            note += "Pairwise: the two orders disagreed on %d of %d comparisons (position bias), kept as ties. " % (out["pair_disagree"], out["pair_comparisons"])
        note += "Seconds are wall time on this laptop with llama-server's prompt cache on (the shared system prompt and claim are reused between calls); the trained rerankers' seconds are one batch of 20 on MPS."
        out["note"] = note
    else:
        out["summary"] = "PENDING"; out["note"] = "PENDING"
    for r in rows:
        print(r)
    save("llm.json", out)


if __name__ == "__main__":
    main()

"""What the second search needs: the same 200 HotpotQA questions, the same bge-small tool (top 3, already-seen
paragraphs excluded, as in the root's agent), searched a second time with different queries. Deterministic, CPU.

hop 1 = the gold paragraph the question itself ranks higher; hop 2 = the other one. After a first search with the
question (top 3), a second search is run with:
  same      the question again (so: ranks 4 to 6 of the first search; what "search more" buys)
  sent      the supporting sentence(s) of hop 1 as labelled by HotpotQA (what a perfect reasoning step would have
            written after reading hop 1: IRCoT queries with its last chain-of-thought sentence)
  q_sent    the question followed by that sentence
  title     the title of hop 2 (the bridge entity named exactly: a perfect Self-Ask follow-up)
  agent     the second query the root's Qwen3-1.7B ReAct agent actually wrote (recorded run)
  decomp    the second sub-question of the root's decomposition run, with #1 filled in (recorded run)
Writes ../data/hops.json and a per-question example list for the page's animation."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from statistics import median

import arlib as A

qs, corpus, by = A.mh()
react = A.root_run("test_1.7b_react")
decomp = A.root_run("test_1.7b_decomp")


def sup_sents(q, pid):
    p = by[pid]
    idx = [i for t, i in q["supporting_facts"] if t == p["title"]]
    return " ".join(p["sentences"][i].strip() for i in idx if i < len(p["sentences"]))


rows = []
for q in qs:
    g = q["gold_pids"]
    r0 = A.ranking(q["question"])
    rk = {p: r0.index(p) + 1 for p in g}
    h1, h2 = sorted(g, key=lambda p: rk[p])
    first = r0[:3]
    row = {"qid": q["qid"], "type": q["type"], "h1": h1, "h2": h2, "r1_q": rk[h1], "r2_q": rk[h2],
           "both_first": h2 in first and h1 in first, "h2_in_h1_text": by[h2]["title"].lower() in by[h1]["text"].lower()}
    queries = {"same": q["question"], "sent": sup_sents(q, h1), "q_sent": q["question"] + " " + sup_sents(q, h1),
               "title": by[h2]["title"]}
    rr = react.get(q["qid"])
    if rr and len(rr["searches"]) >= 2:
        queries["agent"] = rr["searches"][1]["query"]
        row["agent_first_q"] = rr["searches"][0]["query"]
    dd = decomp.get(q["qid"])
    if dd and len(dd["searches"]) >= 2:
        queries["decomp"] = dd["searches"][1]["query"]
    excl = {"agent": rr["searches"][0]["pids"] if "agent" in queries else first,
            "decomp": dd["searches"][0]["pids"] if "decomp" in queries else first}
    if rr:
        row["agent_found_h2"] = h2 in rr["seen"]
        row["agent_found_both"] = h1 in rr["seen"] and h2 in rr["seen"]
        row["agent_f1"] = rr["f1"]
    for k, text in queries.items():
        if not text.strip():
            continue
        r = A.ranking(text, exclude=excl.get(k, first))
        row["rank_" + k] = r.index(h2) + 1 if h2 in r else None
        row["q_" + k] = text
    rows.append(row)

need = [r for r in rows if r["h2"] not in A.ranking(next(q for q in qs if q["qid"] == r["qid"])["question"])[:3]]
VARS = ["same", "sent", "q_sent", "title", "agent", "decomp"]


def summ(sub):
    out = {"n": len(sub)}
    for v in VARS:
        xs = [r["rank_" + v] for r in sub if r.get("rank_" + v)]
        out[v] = {"n": len(xs), "top3": sum(x <= 3 for x in xs), "top10": sum(x <= 10 for x in xs),
                  "median_rank": median(xs) if xs else None}
    return out


res = {"n": len(rows), "need_second": len(need), "first_found_h1": sum(r["r1_q"] <= 3 for r in rows),
       "h2_in_h1_text": sum(r["h2_in_h1_text"] for r in rows),
       "all": summ(need), "bridge": summ([r for r in need if r["type"] == "bridge"]),
       "comparison": summ([r for r in need if r["type"] == "comparison"]),
       "r2_q_median": median(r["r2_q"] for r in rows), "r1_q_median": median(r["r1_q"] for r in rows)}
# the agent's own second query, when it existed, on the questions that needed it: written with the bridge entity?
ag = [r for r in need if r.get("q_agent")]
res["agent_has_title"] = sum(by[r["h2"]]["title"].lower().split(" (")[0] in r["q_agent"].lower() for r in ag)
res["agent_n"] = len(ag)
res["agent_found_h2_need"] = sum(1 for r in need if r.get("agent_found_h2"))
res["agent_searches2_need"] = len(ag)
# examples for the animation: bridge questions that needed a second hop, where the oracle sentence finds hop 2
ex = []
for r in need:
    if r["type"] != "bridge" or not r.get("rank_sent") or r["rank_sent"] > 3 or len(r["q_sent"]) > 260:
        continue
    q = next(x for x in qs if x["qid"] == r["qid"])
    first = A.ranking(q["question"])[:3]
    second_same = A.ranking(q["question"], exclude=first)[:3]
    second_sent = A.ranking(r["q_sent"], exclude=first)[:3]
    ex.append({"qid": r["qid"], "question": q["question"], "answer": q["answer"], "h1": r["h1"], "h2": r["h2"],
               "first": first, "same": second_same, "sent": second_sent, "q_sent": r["q_sent"],
               "q_agent": r.get("q_agent"), "rank_agent": r.get("rank_agent"), "r2_q": r["r2_q"],
               "rank_sent": r["rank_sent"], "rank_same": r["rank_same"],
               "agent": react[r["qid"]]["searches"][1]["pids"] if len(react[r["qid"]]["searches"]) > 1 else [],
               "agent_q1": react[r["qid"]]["searches"][0]["query"] if react[r["qid"]]["searches"] else None})
    if len(ex) >= 8:
        break
titles = {p: by[p]["title"] for e in ex for p in e["first"] + e["same"] + e["sent"] + e["agent"] + [e["h1"], e["h2"]]}
res["examples"] = ex
res["titles"] = titles
A.save("hops.json", res)
print({k: v for k, v in res.items() if k not in ("examples", "titles")})

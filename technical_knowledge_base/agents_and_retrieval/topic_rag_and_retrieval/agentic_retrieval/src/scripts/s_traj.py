"""Trajectory-level evaluation of the root's recorded runs (Qwen3-1.7B, 200 HotpotQA questions). Deterministic, CPU.

1. Where each answer was lost, per strategy: right (F1 >= 0.5), read wrong (both gold paragraphs reached the prompt,
   answer wrong), half found (one gold paragraph), none found. Same split as the root's A = r x p x g, at the level of
   a whole trajectory.
2. The agent loop's own behaviour: searches until both gold paragraphs were seen, searches made after that (wasted),
   stops before the second gold paragraph, repeated queries, unparseable steps.
3. Read-time curation of the agent's own history (the memory question at the scale of one task): at the final step,
   keep only m of the paragraphs the agent has read, chosen by bge-small similarity to the question (or to the question
   plus the agent's last thought), against keeping the last observation only (a sliding window) and keeping everything.
   Measured: do both gold paragraphs survive, and how many tokens are kept. The answer with the curated memory needs the
   generator: pending (run_pending.sh, memory step).
4. Compact per-question trajectories for the page's Trajectory comparer.
Writes ../data/traj.json."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from statistics import mean, median

import numpy as np

import arlib as A

qs, corpus, by = A.mh()
STR = ["closed", "single_k2", "single_k5", "single_k10", "decomp", "react", "longctx", "longctx_tokens8000"]
runs = {s: A.root_run("test_1.7b_" + s) for s in STR}


def cat(row, gold):
    seen = set(row["seen"])
    g = sum(p in seen for p in gold)
    if row["f1"] >= 0.5:
        return "right"
    return "readwrong" if g == 2 else "half" if g == 1 else "none"


tax = {}
for s in STR:
    c = {"right": 0, "readwrong": 0, "half": 0, "none": 0}
    right_unseen = 0
    for q in qs:
        r = runs[s][q["qid"]]
        k = cat(r, q["gold_pids"])
        c[k] += 1
        if k == "right" and sum(p in set(r["seen"]) for p in q["gold_pids"]) < 2:
            right_unseen += 1
    c["right_without_both"] = right_unseen
    both = sum(sum(p in set(runs[s][q["qid"]]["seen"]) for p in q["gold_pids"]) == 2 for q in qs)
    c["both_seen"] = both
    c["right_given_both"] = A.r3(sum(1 for q in qs if cat(runs[s][q["qid"]], q["gold_pids"]) == "right" and
                                     sum(p in set(runs[s][q["qid"]]["seen"]) for p in q["gold_pids"]) == 2) / max(1, both))
    tax[s] = c

# 2. the agent loop's behaviour
rx = runs["react"]
beh = {"n": 200, "until_both": [], "wasted_after_both": 0, "stopped_missing": 0, "stopped_missing_wrong": 0, "repeat": 0,
       "noaction": 0, "budget_hit": 0, "zero_search": 0, "found_at_search": {}}
for q in qs:
    r = rx[q["qid"]]
    seen = []
    got = None
    for i, s in enumerate(r["searches"]):
        seen += s["pids"]
        if got is None and all(g in seen for g in q["gold_pids"]):
            got = i + 1
    if got:
        beh["until_both"].append(got)
        beh["wasted_after_both"] += len(r["searches"]) - got
        beh["found_at_search"][str(got)] = beh["found_at_search"].get(str(got), 0) + 1
    elif r["steps"] and r["steps"][-1]["kind"] == "finish":
        beh["stopped_missing"] += 1
        beh["stopped_missing_wrong"] += int(r["f1"] < 0.5)
    qn = [s["query"].strip().lower() for s in r["searches"]]
    beh["repeat"] += int(len(qn) != len(set(qn)))
    beh["noaction"] += int(any(st["kind"] == "noaction" for st in r["steps"]))
    beh["budget_hit"] += int(len(r["searches"]) >= 4)
    beh["zero_search"] += int(len(r["searches"]) == 0)
beh["until_both_n"] = len(beh["until_both"])
beh["until_both_mean"] = A.r3(mean(beh["until_both"])) if beh["until_both"] else None
del beh["until_both"]

# 3. read-time curation of the agent's own history
cur = {"n": 0, "keep_all": 0, "last_obs": 0, "tok_all": [], "tok_last": []}
for m in (2, 3, 4):
    cur["top%d_q" % m] = 0; cur["top%d_qt" % m] = 0; cur["tok_top%d" % m] = []; cur["tok_top%d_qt" % m] = []
for q in qs:
    r = rx[q["qid"]]
    if len(r["searches"]) < 2:
        continue
    seen = list(dict.fromkeys(r["seen"]))
    gold = q["gold_pids"]
    if not all(g in seen for g in gold):
        continue  # only trajectories that did read both gold paragraphs: can curation keep them?
    cur["n"] += 1
    toks = {p: A.ntok(by[p]["title"] + ": " + by[p]["text"]) for p in seen}
    cur["keep_all"] += 1
    cur["tok_all"].append(sum(toks.values()))
    last = r["searches"][-1]["pids"]
    cur["last_obs"] += int(all(g in last for g in gold))
    cur["tok_last"].append(sum(toks[p] for p in last))
    thought = r["steps"][-1].get("thought", "") if r["steps"] else ""
    for key, text in (("q", q["question"]), ("qt", q["question"] + " " + thought)):
        v = A.qvecs([text])[0]
        order = sorted(seen, key=lambda p: -float(A.doc_vec(p) @ v))
        for m in (2, 3, 4):
            keep = order[:m]
            cur["top%d_%s" % (m, key)] += int(all(g in keep for g in gold))
            cur[("tok_top%d" if key == "q" else "tok_top%d_qt") % m].append(sum(toks[p] for p in keep))
for k in list(cur):
    if k.startswith("tok_"):
        cur[k] = round(mean(cur[k]), 1) if cur[k] else None

# 4. compact trajectories for the comparer: paragraph table + per-strategy steps
pid_ix = {}


def ix(p):
    if p not in pid_ix:
        pid_ix[p] = len(pid_ix)
    return pid_ix[p]


def short(t, n=110):
    t = " ".join((t or "").split())
    return t if len(t) <= n else t[:n - 1].rstrip() + "..."


comp = []
for q in qs:
    e = {"g": [ix(p) for p in q["gold_pids"]]}
    for s in ("single_k5", "decomp", "react"):
        r = runs[s][q["qid"]]
        st = []
        for x in r["steps"]:
            if x["kind"] == "search":
                st.append(["s", short(x.get("query"), 120), [ix(p) for p in x["pids"]], short(x.get("thought"), 110), short(x.get("sub_answer"), 40)])
            elif x["kind"] == "decompose":
                st.append(["d", [short(y, 120) for y in x["subs"]]])
            elif x["kind"] == "finish":
                st.append(["f", short(x.get("answer"), 60), short(x.get("thought"), 110)])
            elif x["kind"] == "noaction":
                st.append(["n", short(x.get("text"), 110)])
        e[s] = {"a": short(r["answer"], 60), "c": [[c["n_in"], c["n_in_new"] or 0, c["n_out"], round(c["seconds"], 2)] for c in r["calls"]],
                "st": st, "sm": round(r["search_ms"], 1)}
    for s in ("closed", "longctx"):
        r = runs[s][q["qid"]]
        e[s] = {"a": short(r["answer"], 60), "c": [[c["n_in"], c["n_in_new"] or 0, c["n_out"], round(c["seconds"], 2)] for c in r["calls"]],
                "np": len(r["seen"])}
    comp.append(e)
titles = [None] * len(pid_ix)
for p, i in pid_ix.items():
    titles[i] = by[p]["title"]
A.save("traj.json", {"tax": tax, "beh": beh, "cur": cur, "comp": comp, "titles": titles})
print(tax)
print(beh)
print(cur)

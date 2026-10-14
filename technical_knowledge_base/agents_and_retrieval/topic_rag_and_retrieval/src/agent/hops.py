"""Deterministic: why one search is not enough on the multi-hop set. For each first-stage retriever (the setup's recorded
top-100 runs), how often the first and the second gold paragraph are found, and "both gold in the top k".
The "second hop" of a question is its lower-ranked gold paragraph. Also: how many of the question's content words
each gold paragraph shares (the second hop often shares none: its link to the question goes through the first).
Writes out/hops.json."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import re

from common import L, data, save, r3

STOP = set("a an the of in on at to for and or is was were are be by with from as that which who whom whose what when where "
           "how did does do this these those it its his her their than then also both same one two first second".split())


def words(t):
    return {w for w in re.findall(r"[a-z0-9]+", t.lower()) if w not in STOP and len(w) > 2}


def main():
    qs, _, by = data()
    out = {"n": len(qs), "by_type": {"bridge": sum(q["type"] == "bridge" for q in qs), "comparison": sum(q["type"] == "comparison" for q in qs)}, "systems": {}}
    for sysname in ("bm25", "bge-small", "gte-modernbert", "qwen3-emb-0.6b", "minilm-l6"):
        run = L.run("hotpotqa", sysname)
        ks = (1, 2, 3, 5, 10, 20, 50, 100)
        both = {k: 0 for k in ks}; first = {k: 0 for k in ks}; second_rank = []
        both_t = {"bridge": {k: 0 for k in ks}, "comparison": {k: 0 for k in ks}}
        for q in qs:
            r = list(run[q["qid"]])
            ranks = sorted(r.index(g) + 1 if g in r else 999 for g in q["gold_pids"])
            second_rank.append(ranks[-1])
            for k in ks:
                both[k] += ranks[-1] <= k; first[k] += ranks[0] <= k
                both_t[q["type"]][k] += ranks[-1] <= k
        out["systems"][sysname] = {"both": both, "any": first, "both_by_type": both_t,
                                   "second_rank_median": sorted(second_rank)[len(second_rank) // 2]}
    # word overlap of each gold paragraph with the question (bge-small ranking decides which is the 'second hop')
    run = L.run("hotpotqa", "bge-small")
    ov = {"first": [], "second": []}
    zero_second = 0
    for q in qs:
        r = list(run[q["qid"]])
        g = sorted(q["gold_pids"], key=lambda p: r.index(p) if p in r else 999)
        qw = words(q["question"])
        a, b = len(qw & words(by[g[0]]["title"] + " " + by[g[0]]["text"])), len(qw & words(by[g[1]]["title"] + " " + by[g[1]]["text"]))
        ov["first"].append(a); ov["second"].append(b); zero_second += b == 0
    out["overlap"] = {"first_median": sorted(ov["first"])[100], "second_median": sorted(ov["second"])[100], "second_zero": zero_second,
                      "first_mean": r3(sum(ov["first"]) / 200), "second_mean": r3(sum(ov["second"]) / 200)}
    save("hops.json", out)
    for s, v in out["systems"].items():
        print(s, "both@10", v["both"][10], "any@10", v["any"][10], "both@3", v["both"][3], "both@5", v["both"][5], "2nd median rank", v["second_rank_median"])
    print(out["overlap"])


if __name__ == "__main__":
    main()

"""Turn the recorded runs ($RAG_SCRATCH/agt/runs/*.jsonl) into the small JSON files the page embeds.
  out/strategies.json : per (model, strategy) accuracy, gold recall, searches, tokens, latency, by question type, 95% CIs
  out/steps.json      : agent loop token growth by step (billed input vs newly prefilled)
  out/position.json   : lost-in-the-middle accuracy by slot
  out/tune.json       : held-out prompt choice
  out/replay.json     : full trajectories of a few test questions under several strategies (for the replay)
Deterministic (bootstrap with a fixed seed)."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glob
import json
import random

import numpy as np

from common import data, jl_read, save, work, r3, para_text, normalize_answer

RUNS = work("runs")


def load(name):
    return jl_read(os.path.join(RUNS, name + ".jsonl"))


def ci(xs, n=2000, seed=0):
    rng = random.Random(seed)
    m = len(xs)
    bs = sorted(sum(xs[rng.randrange(m)] for _ in range(m)) / m for _ in range(n))
    return [r3(bs[int(0.025 * n)]), r3(bs[int(0.975 * n) - 1])]


def summ(rows):
    if not rows:
        return None
    a = lambda k: [r[k] for r in rows]
    wall = sorted(a("wall_s"))
    out = {"n": len(rows), "em": r3(np.mean(a("em"))), "f1": r3(np.mean(a("f1"))), "f1_ci": ci(a("f1")), "em_ci": ci(a("em")),
           "gold_recall": r3(np.mean([r["gold_seen"] / max(1, r["n_gold"]) for r in rows])),
           "both_gold": r3(np.mean([r["gold_seen"] == r["n_gold"] for r in rows])),
           "searches": r3(np.mean(a("n_search"))), "calls": r3(np.mean(a("n_calls"))), "paras": r3(np.mean(a("n_seen"))),
           "tok_in": r3(np.mean(a("tok_in"))), "tok_in_new": r3(np.mean(a("tok_in_new"))), "tok_out": r3(np.mean(a("tok_out"))),
           "wall_mean": r3(np.mean(wall)), "wall_p50": r3(wall[len(wall) // 2]), "wall_p90": r3(wall[int(0.9 * len(wall))]),
           "search_ms": r3(np.mean(a("search_ms"))), "empty": int(sum(1 for r in rows if not r["answer"])),
           # answers "yes"/"no" to a question whose gold answer is not yes/no (the answer-prompt failure seen in tuning)
           "yesno_wrong": int(sum(1 for r in rows if normalize_answer(r["gold"]) not in ("yes", "no") and normalize_answer(r["answer"]) in ("yes", "no"))),
           "yesno_gold": int(sum(1 for r in rows if normalize_answer(r["gold"]) in ("yes", "no")))}
    for t in ("bridge", "comparison", "single"):
        x = [r for r in rows if r["type"] == t]
        if x:
            out["f1_" + t] = r3(np.mean([r["f1"] for r in x]))
            out["n_" + t] = len(x)
    return out


def strategies():
    res = {}
    for f in sorted(glob.glob(os.path.join(RUNS, "test_*.jsonl"))):
        name = os.path.basename(f)[:-6]
        _, model, strat = name.split("_", 2)
        res.setdefault(model, {})[strat] = summ(jl_read(f))
    # paired comparisons against the single-shot pipeline (bootstrap of the per-question F1 difference)
    for model, d in res.items():
        base = {r["qid"]: r["f1"] for r in load("test_%s_single_k5" % model)}
        for strat in d:
            rows = {r["qid"]: r["f1"] for r in load("test_%s_%s" % (model, strat))}
            common = [q for q in rows if q in base]
            if common and strat != "single_k5":
                diff = [rows[q] - base[q] for q in common]
                d[strat]["vs_single"] = {"diff": r3(np.mean(diff)), "ci": ci(diff), "wins": sum(x > 0 for x in diff), "losses": sum(x < 0 for x in diff)}
    save("strategies.json", res)
    return res


def steps():
    out = {}
    for model in ("1.7b", "4b"):
        rows = load("test_%s_react" % model)
        if not rows:
            continue
        mx = max(len(r["calls"]) for r in rows)
        billed, new = [[] for _ in range(mx)], [[] for _ in range(mx)]
        cum = []
        for r in rows:
            cb = cn = 0
            for i, c in enumerate(r["calls"]):
                cb += c["n_in"]; cn += c["n_in_new"] or 0
                billed[i].append(c["n_in"]); new[i].append(c["n_in_new"] or 0)
        out[model] = {"prompt_at_step": [r3(np.mean(b)) if b else None for b in billed],
                      "new_at_step": [r3(np.mean(b)) if b else None for b in new],
                      "n_at_step": [len(b) for b in billed],
                      "by_n_calls": {}}
        for n in range(1, mx + 1):
            x = [r for r in rows if len(r["calls"]) == n]
            if x:
                out[model]["by_n_calls"][n] = {"n": len(x), "tok_in": r3(np.mean([r["tok_in"] for r in x])),
                                               "tok_in_new": r3(np.mean([r["tok_in_new"] for r in x])),
                                               "wall": r3(np.mean([r["wall_s"] for r in x])), "f1": r3(np.mean([r["f1"] for r in x]))}
        # failure kinds
        kinds = {"answered_no_search": 0, "hit_budget": 0, "no_action": 0, "repeat_query": 0}
        for r in rows:
            if r["n_search"] == 0:
                kinds["answered_no_search"] += 1
            if any(s["kind"] == "noaction" for s in r["steps"]):
                kinds["no_action"] += 1
            qs_ = [s["query"].lower() for s in r["searches"]]
            if len(set(qs_)) < len(qs_):
                kinds["repeat_query"] += 1
        out[model]["kinds"] = kinds
        out[model]["search_hist"] = {str(k): sum(1 for r in rows if r["n_search"] == k) for k in range(0, 7)}
    save("steps.json", out)


def position():
    out = {}
    for model in ("1.7b", "4b"):
        rows = jl_read(os.path.join(RUNS, "position_%s.jsonl" % model))
        if not rows:
            continue
        slots = sorted({r["slot"] for r in rows})
        out[model] = {"n": len(rows) // len(slots), "slots": [s + 1 for s in slots],
                      "em": [r3(np.mean([r["em"] for r in rows if r["slot"] == s])) for s in slots],
                      "f1": [r3(np.mean([r["f1"] for r in rows if r["slot"] == s])) for s in slots],
                      "f1_ci": [ci([r["f1"] for r in rows if r["slot"] == s]) for s in slots],
                      "n_in": r3(np.mean([r["n_in"] for r in rows]))}
    save("position.json", out)


def tune():
    out = {}
    for f in sorted(glob.glob(os.path.join(RUNS, "heldout_*.jsonl"))):
        name = os.path.basename(f)[:-6]
        s = summ(jl_read(f))
        out[name] = {k: s[k] for k in ("n", "em", "f1", "searches", "tok_in", "empty", "yesno_wrong")}
    save("tune.json", out)



def choose():
    """Pick each strategy's prompt by held-out F1 (ties: the first key) and write out/tune_choice.json."""
    t = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "tune.json")))
    ch = {}
    for strat, keys in (("closed", ("c1", "c2", "c3")), ("single", ("s1", "s2", "s3")), ("react", ("r1", "r2", "r3"))):
        cands = [(t[n]["f1"], -i, k) for i, k in enumerate(keys) for n in t if n.startswith("heldout_1.7b_" + strat) and n.endswith("prompt" + k)]
        if cands:
            ch[strat] = max(cands)[2]
    save("tune_choice.json", ch)
    print("chosen", ch)


if __name__ == "__main__":
    what = sys.argv[1:] or ["tune", "strategies", "steps", "position"]
    for w in what:
        globals()[w]()

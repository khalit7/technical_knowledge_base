"""Choose the questions the replay shows, by a fixed rule over the recorded 4B runs (the 1.7B single-shot runs are confounded by an answer-prompt failure, see README) (so the choice is not
hand-picked for a story): the first question in test order of each kind below.
  1. agent right (F1 = 1), pipeline wrong (F1 = 0), bridge
  2. pipeline right, agent wrong
  3. both right, comparison question
  4. both wrong, agent used its whole search budget
  5. decomposition right, both others wrong
  6. agent right, pipeline wrong, a second such question
Writes out/replay_picks.json."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json

from common import data, jl_read, work, OUT


def main():
    qs = data()[0]
    models = [m for m in ("4b", "1.7b") if os.path.exists(work("runs", "test_%s_react.jsonl" % m))]
    R = {s: {r["qid"]: r for r in jl_read(work("runs", "test_4b_%s.jsonl" % s))} for s in ("single_k5", "react", "decomp")}
    rules = [("Agent right, pipeline wrong", lambda q, s, a, d: a["f1"] == 1 and s["f1"] == 0 and q["type"] == "bridge"),
             ("Pipeline right, agent wrong", lambda q, s, a, d: s["f1"] == 1 and a["f1"] == 0),
             ("Both right, a comparison", lambda q, s, a, d: s["f1"] == 1 and a["f1"] == 1 and q["type"] == "comparison"),
             ("Both wrong, agent used every search", lambda q, s, a, d: s["f1"] == 0 and a["f1"] == 0 and a["n_search"] >= 4),
             ("Only decomposition right", lambda q, s, a, d: d["f1"] == 1 and s["f1"] == 0 and a["f1"] == 0),
             ("Agent right, pipeline wrong (2)", lambda q, s, a, d: a["f1"] == 1 and s["f1"] == 0)]
    picks, used = [], set()
    for label, f in rules:
        for q in qs:
            x = q["qid"]
            if x in used or not all(x in R[k] for k in R):
                continue
            if f(q, R["single_k5"][x], R["react"][x], R["decomp"][x]):
                picks.append([x, label + ": " + (q["question"][:60] + ("..." if len(q["question"]) > 60 else ""))])
                used.add(x)
                break
    json.dump({"models": models, "items": picks, "rule": __doc__.split("\n\n")[0]}, open(os.path.join(OUT, "replay_picks.json"), "w"), indent=0)
    print(picks)


if __name__ == "__main__":
    main()

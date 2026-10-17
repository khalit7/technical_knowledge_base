"""Score the recorded answers (CPU, no model): out/qa_raw.json and out/pope_raw.json -> out/scores.json.
    python3 score.py
Question answers: right if any 'accept' pattern of qa_set.json matches (case-insensitive) and no 'reject' pattern does.
Yes/no answers: 'yes' if the answer starts with yes (after stripping punctuation), 'no' otherwise (every recorded answer is listed on the page).
"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "out")
QS = json.load(open(os.path.join(HERE, "qa_set.json")))
qa = json.load(open(os.path.join(OUT, "qa_raw.json"))); pope = json.load(open(os.path.join(OUT, "pope_raw.json")))
items = {i["id"]: i for i in QS["qa"]}


def right(it, a):
    a = a.strip()
    ok = any(re.search(p, a, re.I) for p in it["accept"])
    return ok and not any(re.search(p, a, re.I) for p in it.get("reject", []))


S = {"qa": {}, "pope": {}}
budgets = list(dict.fromkeys(r["budget"] for r in qa["answers"]))
for b in budgets:
    rs = [r for r in qa["answers"] if r["budget"] == b]
    per = {r["id"]: right(items[r["id"]], r["answer"]) for r in rs}
    kinds = {}
    for r in rs:
        k = items[r["id"]]["kind"]; kinds.setdefault(k, [0, 0]); kinds[k][0] += per[r["id"]]; kinds[k][1] += 1
    S["qa"][b] = {"right": sum(per.values()), "n": len(rs), "per_id": per, "by_kind": kinds,
                  "median_seconds": sorted(r["seconds"] for r in rs)[len(rs) // 2], "prompt_tokens_example": rs[0]["prompt_tokens"]}
yes = lambda a: bool(re.match(r"^\W*yes\b", a, re.I))
for b in list(dict.fromkeys(r["budget"] for r in pope["answers"])):
    rs = [r for r in pope["answers"] if r["budget"] == b]
    yr = {}
    for k in ("present", "absent_random", "absent_adversarial"):
        g = [r for r in rs if r["kind"] == k]; yr[k] = [sum(yes(r["answer"]) for r in g), len(g)]
    n_ab = yr["absent_random"][1] + yr["absent_adversarial"][1]; y_ab = yr["absent_random"][0] + yr["absent_adversarial"][0]
    acc = (yr["present"][0] + n_ab - y_ab) / len(rs)
    S["pope"][b] = {"yes": yr, "acc": acc, "yes_absent": y_ab, "n_absent": n_ab, "yes_present": yr["present"][0], "n_present": yr["present"][1],
                    "yes_rate": {k: v[0] / v[1] for k, v in yr.items()},
                    "unparsed": [r["answer"] for r in rs if not re.match(r"^\W*(yes|no)\b", r["answer"], re.I)],
                    "wrong": [[r["image"], r["obj"], r["kind"], r["answer"]] for r in rs if (r["kind"] == "present") != yes(r["answer"])]}
json.dump(S, open(os.path.join(OUT, "scores.json"), "w"), indent=1)
for b, v in S["qa"].items(): print("QA", b, v["right"], "/", v["n"], v["by_kind"], "median s", v["median_seconds"])
for b, v in S["pope"].items(): print("POPE", b, "acc %.3f" % v["acc"], v["yes"], "unparsed", v["unparsed"]); [print("   ", w) for w in v["wrong"]]

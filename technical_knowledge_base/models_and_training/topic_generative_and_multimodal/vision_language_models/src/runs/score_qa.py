"""Score the 30-question answers of both models two ways (CPU, no model) -> out/qa_scored.json

  strict   the root VLM lab's rule (src/vlm/score.py): an accept pattern of qa_set.json matches, no reject pattern does;
           most numeric patterns are anchored at the start (the question asks for "a number")
  content  the same patterns with the start anchor turned into a word boundary, searched in the first line of the
           answer with markdown asterisks removed: a sentence such as "There are **3** red circles" counts as 3
SmolVLM's answers are the root lab's recorded ones (src/vlm/out/qa_raw.json, read only); Qwen3.5's are out/qwen_qa.json.
"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); SRC = os.path.dirname(HERE); ROOT = os.path.join(SRC, "..", "..", "src", "vlm")
QS = {i["id"]: i for i in json.load(open(os.path.join(ROOT, "qa_set.json")))["qa"]}


def strict(it, a):
    a = a.strip()
    return any(re.search(p, a, re.I) for p in it["accept"]) and not any(re.search(p, a, re.I) for p in it.get("reject", []))


def content(it, a):
    line = a.replace("*", "").strip().split("\n")[0]
    pats = [p.replace("^\\W*", "\\b").replace("\\W*$", "") for p in it["accept"]]
    return any(re.search(p, line, re.I) for p in pats) and not any(re.search(p, line, re.I) for p in it.get("reject", []))


S = {}
smol = json.load(open(os.path.join(ROOT, "out", "qa_raw.json")))["answers"]
qwen = json.load(open(os.path.join(SRC, "out", "qwen_qa.json")))["answers"]
for who, rows in (("smol", smol), ("qwen", qwen)):
    S[who] = {}
    for b in dict.fromkeys(r["budget"] for r in rows):
        rs = [r for r in rows if r["budget"] == b]
        S[who][b] = {"n": len(rs), "image_tokens": rs[0]["image_tokens"],
                     "strict": sum(strict(QS[r["id"]], r["answer"]) for r in rs), "content": sum(content(QS[r["id"]], r["answer"]) for r in rs),
                     "per_id": {r["id"]: [strict(QS[r["id"]], r["answer"]), content(QS[r["id"]], r["answer"]), r["answer"][:120]] for r in rs}}
        print(who, b, S[who][b]["image_tokens"], "strict", S[who][b]["strict"], "content", S[who][b]["content"])
json.dump(S, open(os.path.join(SRC, "out", "qa_scored.json"), "w"), indent=1)

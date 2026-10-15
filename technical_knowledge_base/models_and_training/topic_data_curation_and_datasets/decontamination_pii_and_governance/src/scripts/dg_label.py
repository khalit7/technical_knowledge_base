"""Label every flagged (document, benchmark item) pair: what actually matched.

First a rule pass (below), then the agent read pairs (every "partial overlap" pair, and at least 10 per rule
category) and recorded overrides in labels/overrides.json. Labels are the agent's reading, not a human
annotator's. Categories:
  copy       the item's question is in the document (>= 80% of the question stem's tokens inside shared 8-grams;
             the stem is the question without answer options)
  source     HellaSwag: the WikiHow or ActivityNet text the item was built from, including the gold ending
  variant    the same problem with other numbers or names (>= 50% of the question covered, the rest mostly numbers)
  passage    a famous source text the item quotes (speech, novel, statute), not the question
  diagram    shared Asymptote diagram code (MATH problems reuse plotting preambles)
  phrase     a short common phrase: a question stem ("which of the following is not a symptom of"),
             an answer-format instruction ("express your answer as a common fraction") or a famous line
  partial    anything else (read by hand)

Output: ../data/labels.json (small, committed) and $DC_SCRATCH/data/dg/contam/labelled.jsonl.gz.
"""
import gzip
import json
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dg_common as C  # noqa: E402
import dg_contam as D  # noqa: E402

NUM = re.compile(r"^[0-9]+$|^[a-z]$")
OVR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "labels", "overrides.json")


PHRASE = re.compile(r"(Enter|Express|Write) (your|the) (answer|letter|equation)|relatively prime positive integers|"
                    r"Reminder:|in terms of the side lengths|int\(n ?\*\* ?0\.5\)|label\('|0, 1, 2, 3, 4, 5, 6, 7, 8, 9, A|"
                    r"0 1 2 3 4 5 6 7 8 9 A|which of the following is the most appropriate", re.I)


MATHY = ("gsm8k_test", "math500_test")


def stem(it):
    if it["bench"] in ("mmlu_test", "arc_challenge_test", "arc_easy_test"):
        return it["query"].split("\n")[0] if it["bench"] != "mmlu_test" else it["query"].rsplit("\n", 4)[0]
    return it["query"]


def rule(r, it):
    full_t, cov = D.item_coverage(it["full"], r["text"], 8)
    nq = len(D.norm_tokens(it["query"]))
    ns = len(D.norm_tokens(stem(it)))
    scov = float(cov[:ns].mean()) if ns else 0.0
    q = cov[:nq]
    qcov = float(q.mean()) if nq else 0.0
    unc = [t for t, c in zip(full_t[:nq], q) if not c]
    numeric = sum(bool(NUM.match(t)) for t in unc) / len(unc) if unc else 1.0
    lab = D.norm_tokens(it["label"])
    after = " ".join(D.norm_tokens(r["window"] + " " + r["ctx_after"]))
    ans = bool(lab) and (" ".join(lab) in after)
    w = r["window"]
    run = r["win"]["run_tokens"] if r["win"] else 0
    passage = it["bench"] == "mmlu_test" and (it["query"].startswith("This question refers to the following")
                                             or nq > 120)
    lab_cov = float(cov[nq:].mean()) if len(cov) > nq else 0.0
    if it["bench"] == "hellaswag_validation" and lab_cov >= 0.5:
        cat = "source"
    elif PHRASE.search(w) and scov < 0.8:
        cat = "phrase"
    elif ("[asy]" in w or 'label("' in w or "draw(" in w) and qcov < 0.8:
        cat = "diagram"
    elif scov >= 0.95 or (scov >= 0.8 and ns >= 12 and it["bench"] not in MATHY):
        cat = "copy"
    elif (qcov >= 0.5 and numeric >= 0.5) or (it["bench"] in ("math500_test", "gsm8k_test", "mmlu_test")
                                               and scov >= 0.35 and run >= 15 and not passage):
        cat = "variant"
    elif passage:
        cat = "passage"
    elif run < 15:
        cat = "phrase"
    else:
        cat = "partial"
    return cat, round(scov, 3), ans


def main():
    items = C.bench_items()
    od = C.out_dir("contam")
    R = [json.loads(x) for x in gzip.open(os.path.join(od, "flagged.jsonl.gz"), "rt")]
    texts = {}
    need = {(r["corpus"], r["doc"]) for r in R}
    for corpus in {c for c, _ in need}:
        for d, t in C.corpus_iter(corpus):
            if (corpus, d) in need:
                texts[(corpus, d)] = t
    ovr = json.load(open(OVR)) if os.path.exists(OVR) else {}
    out = []
    for r in R:
        r["text"] = texts[(r["corpus"], r["doc"])]
        it = items[r["item"]]
        cat, qcov, ans = rule(r, it)
        key = f'{r["corpus"]}|{r["doc"]}|{r["bench"]}|{r["bidx"]}'
        o = ovr.get(key)
        r.update(key=key, rule_cat=cat, cat=(o or {}).get("cat", cat), checked=bool(o), note=(o or {}).get("note", ""),
                 qcov=qcov, answer_near=ans)
        del r["text"]
        out.append(r)
    with gzip.open(os.path.join(od, "labelled.jsonl.gz"), "wt") as f:
        for r in out:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    c = Counter((r["corpus"], r["cat"]) for r in out)
    for k in sorted(c):
        print(k, c[k])
    print("checked", sum(r["checked"] for r in out), "agree", sum(r["checked"] and r["cat"] == r["rule_cat"] for r in out))


if __name__ == "__main__":
    main()

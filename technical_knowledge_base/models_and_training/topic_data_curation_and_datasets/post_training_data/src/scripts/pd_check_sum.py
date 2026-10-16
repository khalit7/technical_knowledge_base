"""Summarise the checker-lab verdicts (pd_check.py output) into data/out/check.json for the page.
Agreement matrices per view, accept counts by question type, versus the two published verdicts, trace statistics,
and a seeded set of disagreement examples with the answer part of the response (tail) and every extractor's output.
"""
import gzip
import json
import os
import random
import sys
from collections import Counter

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pd_common as C  # noqa: E402

EXS = ["last_number", "tulu_math", "minerva", "boxed_exact", "answer_is", "math_verify"]


def main():
    rows = [json.loads(x) for x in gzip.open(os.path.join(C.scratch(), "check_rows.jsonl.gz"), "rt")]
    d = C.frame("openr1_math")
    res = {"n": len(rows), "problems": len(d), "ex": EXS}
    cols = EXS + ["rec_mv"]
    for v in ("full", "answer"):
        V = {e: np.array([r[f"{v}:{e}"][1] for r in rows]) for e in EXS}
        V["rec_mv"] = np.array([bool(r["mv"]) for r in rows])
        res[v] = dict(ok={k: int(V[k].sum()) for k in cols},
                      agree={a: {b: int((V[a] == V[b]).sum()) for b in cols} for a in cols},
                      by_qtype={q: {k: int(V[k][[r["qtype"] == q for r in rows]].sum()) for k in cols}
                                for q in ("math-word-problem", "MCQ")})
    res["qtype_n"] = dict(Counter(r["qtype"] for r in rows))
    ll = [r for r in rows if r["llama"] is not None]
    res["llama"] = dict(n=len(ll), true=sum(r["llama"] for r in ll),
                        true_when_mv_false=sum(1 for r in ll if r["llama"] and not r["mv"]),
                        false_when_mv_true=sum(1 for r in ll if not r["llama"] and r["mv"]),
                        ours_mv_on_llama_true=sum(1 for r in ll if r["llama"] and r["answer:math_verify"][1]))
    any_ok = sum(1 for r in rows if any(r[f"answer:{e}"][1] for e in EXS) or r["mv"])
    all_ok = sum(1 for r in rows if all(r[f"answer:{e}"][1] for e in ("tulu_math", "math_verify")) and r["mv"])
    res["any_ok"], res["three_agree_ok"] = any_ok, all_ok
    res["mv_versions_disagree"] = dict(Counter(f"{r['answer:math_verify'][1]}|{r['mv']}" for r in rows
                                               if r["answer:math_verify"][1] != r["mv"]))
    toks = [r["tok"] for r in rows]
    res["trace"] = dict(tok=C.quantiles(toks), think_share=C.quantiles([r["think_tok_est"] / max(1, r["tok"]) for r in rows]),
                        no_think_end=sum(1 for r in rows if r["think_chars"] >= 0 and r["think_tok_est"] == r["tok"]),
                        length_stop=sum(1 for r in rows if r["finish"] == "length"), finish_known=sum(1 for r in rows if r["finish"]),
                        incomplete=sum(1 for r in rows if r["complete"] is False), wait=C.quantiles([r["wait"] for r in rows]),
                        cjk=sum(1 for r in rows if r["cjk"] > 0),
                        tok_hist=np.histogram(np.clip(toks, 0, 32768), bins=[0, 1024, 2048, 4096, 8192, 16384, 32769])[0].tolist(),
                        correct_tok=C.quantiles([r["tok"] for r in rows if r["mv"]]),
                        wrong_tok=C.quantiles([r["tok"] for r in rows if not r["mv"]]))
    # disagreement examples: categories, a few each, seeded
    rng = random.Random(0)
    cats = {
        "mv_only": lambda r: r["answer:math_verify"][1] and not r["answer:tulu_math"][1],
        "tulu_only": lambda r: r["answer:tulu_math"][1] and not r["answer:math_verify"][1],
        "versions": lambda r: r["answer:math_verify"][1] != r["mv"],
        "llama_rescue": lambda r: r["llama"] is True and not r["mv"],
        "thinking_vs_answer": lambda r: r["full:math_verify"][1] != r["answer:math_verify"][1],
        "mcq": lambda r: r["qtype"] == "MCQ" and r["answer:boxed_exact"][1] != r["answer:math_verify"][1],
        "all_reject": lambda r: not any(r[f"answer:{e}"][1] for e in EXS) and not r["mv"] and r["complete"],
    }
    res["cat_counts"] = {k: sum(1 for r in rows if f(r)) for k, f in cats.items()}
    ex = []
    for k, f in cats.items():
        cand = [r for r in rows if f(r) and r["tok"] < 12000]
        for r in rng.sample(cand, min(6, len(cand))):
            row = d.iloc[r["p"]]
            g = list(row.generations)[r["g"]]
            ans = g[g.rfind("</think>") + 8:] if "</think>" in g else g
            ex.append(dict(cat=k, problem=row.problem[:700], gold=str(row.answer), qtype=row.question_type,
                           tail=ans[-900:].strip(), think_tail=(g[:g.rfind("</think>")][-300:] if "</think>" in g else ""),
                           tok=r["tok"], rec_mv=r["mv"], llama=r["llama"],
                           v={e: r[f"answer:{e}"] for e in EXS}, vf={e: r[f"full:{e}"] for e in EXS}))
    res["examples"] = ex
    C.save_out("check.json", res)
    print(json.dumps({k: res[k] for k in ("cat_counts", "llama", "any_ok")}))


if __name__ == "__main__":
    main()

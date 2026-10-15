"""Checker lab: the same model answers through several answer extractors (DeepSeek-R1 traces from OpenR1-Math).

OpenR1-Math-220k (default split) stores 2 to 6 DeepSeek-R1 generations per problem with two published verdicts:
correctness_math_verify (Hugging Face's Math-Verify, version used by open-r1 in Feb 2025) and correctness_llama
(Llama-3.3-70B-Instruct as judge, run only on some rows). Here every generation of a 6,000-problem sample goes through
the root lab's six extractors (src/post/pt_checkers.py: Tulu 3's last-number and MATH verifiers, the strict Minerva
sentence, exact \\boxed{}, 'The answer is', math-verify 0.8.0), each on two views of the response: the whole text
(thinking included) and the answer after </think> only. Plus trace statistics (tokens in and after the thinking,
truncation, 'wait' count, CJK characters in the trace).
Output: data/out/check.json and $DC_SCRATCH/pd/check_rows.jsonl.gz (every verdict).
Needs PYTHONPATH=$DC_SCRATCH/post/pylib:$DC_SCRATCH/src/open-instruct (see run_check.sh); not run with -I.
"""
import gzip
import json
import os
import re
import sys
from collections import Counter
from multiprocessing import get_context

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pd_common as C  # noqa: E402
import pt_checkers as K  # noqa: E402  (root lab: EX extractors, Tulu 3 and math-verify code)

EXS = ["last_number", "tulu_math", "minerva", "boxed_exact", "answer_is", "math_verify"]
WORKERS = int(os.environ.get("PD_WORKERS", "2"))
CJK = re.compile(r"[぀-ヿ㐀-鿿가-힯]")
WAIT = re.compile(r"\bwait\b", re.I)


def views(g):
    k = g.rfind("</think>")
    ans = g[k + len("</think>"):] if k >= 0 else ""
    return {"full": g, "answer": ans}


def job(x):
    pid, gi, g, gt = x
    out = {"p": pid, "g": gi}
    for vn, txt in views(g).items():
        for e in EXS:
            try:
                a, ok = K.EX[e](txt, gt)
            except Exception as ex:  # noqa: BLE001
                a, ok = f"[error {type(ex).__name__}]", False
            out[f"{vn}:{e}"] = [str(a)[:60], bool(ok)]
    k = g.rfind("</think>")
    out["think_chars"] = k if k >= 0 else len(g)
    out["wait"] = len(WAIT.findall(g[:k] if k >= 0 else g))
    out["cjk"] = len(CJK.findall(g))
    return out


def main():
    d = C.frame("openr1_math")
    jobs = []
    meta = []
    for pid, r in enumerate(d.itertuples(index=False)):
        mv = list(r.correctness_math_verify)
        ll = list(r.correctness_llama) if r.correctness_llama is not None else [None] * len(mv)
        fin = list(r.finish_reasons) if r.finish_reasons is not None else [None] * len(mv)
        comp = list(r.is_reasoning_complete)
        for gi, g in enumerate(r.generations):
            jobs.append((pid, gi, g, str(r.answer)))
            meta.append(dict(p=pid, g=gi, mv=bool(mv[gi]) if gi < len(mv) else None,
                             llama=None if gi >= len(ll) or ll[gi] is None else bool(ll[gi]),
                             finish=fin[gi] if gi < len(fin) else None, complete=bool(comp[gi]) if gi < len(comp) else None,
                             qtype=r.question_type, ptype=r.problem_type, source=r.source))
    print("generations", len(jobs), flush=True)
    res = []
    with get_context("fork").Pool(WORKERS) as pool:
        for k, o in enumerate(pool.imap(job, jobs, chunksize=8)):
            res.append(o)
            if k % 1000 == 0:
                print(k, flush=True)
    toks = C.ntok([j[2] for j in jobs])
    rows = []
    for m, o, j, t in zip(meta, res, jobs, toks):
        o.update(m)
        o["tok"] = t
        o["think_tok_est"] = int(t * o["think_chars"] / max(1, len(j[2])))
        rows.append(o)
    with gzip.open(os.path.join(C.scratch(), "check_rows.jsonl.gz"), "wt") as f:
        for o in rows:
            f.write(json.dumps(o) + "\n")
    print("done", flush=True)


if __name__ == "__main__":
    main()

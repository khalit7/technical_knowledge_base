"""Offline difficulty filtering and checker re-runs on OLMo 3's RL prompts (Dolci-Think-RL-7B).

Each math, code and IF row of Dolci-Think-RL-7B stores up to 8 rollouts ('outputs') from an earlier OLMo 3
checkpoint, with Ai2's own count of correct ones (total_correct_rollouts, passrate); OLMo 3 removed prompts the model
already solved too often (the pass-rate cap). Here, on the 4,000-row sample:
  math rows: every rollout through the six extractors (root lab, pt_checkers.py) against ground_truth, and the count
             of accepted rollouts compared with Ai2's recorded count;
  IF rows:   every rollout through open-instruct's IFEvalVerifier (ground_truth_utils.py:310-355 @ 72f46040: the share
             of constraints met, thinking removed) and an all-constraints version, compared with the recorded count.
Plus the pass-rate distribution of every row (HF statistics, inputs/hf_statistics).
Output: data/out/rlcheck.json.  Needs PYTHONPATH with pd/pylib, post/pylib, open-instruct, the root's src/post, and
NLTK_DATA=$DC_SCRATCH/pd/nltk_data (see run_check.sh).
"""
import ast
import json
import os
import sys
from collections import Counter
from multiprocessing import get_context

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pd_common as C  # noqa: E402
import pt_checkers as K  # noqa: E402

EXS = ["last_number", "tulu_math", "minerva", "boxed_exact", "answer_is", "math_verify"]


def remove_thinking_section(prediction):
    """Copy of open-instruct ground_truth_utils.py:190-196 @ 72f46040 (that module imports tiktoken, not installed)."""
    prediction = prediction.replace("<|assistant|>", "").strip()
    prediction = prediction.split("</think>")[-1]
    prediction = prediction.replace("<answer>", "").replace("</answer>", "")
    return prediction.strip()


def if_score(pred, label):
    from open_instruct.IFEvalG import instructions_registry
    cd = ast.literal_eval(label)[0]
    if isinstance(cd, str):
        cd = json.loads(cd)
    ans = remove_thinking_section(pred)
    if not pred or not ans:
        return 0.0, []
    per = []
    for key, args in zip(cd["instruction_id"], cd["kwargs"]):
        args = {k: v for k, v in (args or {}).items() if v is not None}
        inst = instructions_registry.INSTRUCTION_DICT[key](key)
        inst.build_description(**args)
        try:
            per.append(bool(pred.strip() and inst.check_following(ans)))
        except Exception:  # noqa: BLE001
            per.append(False)
    return sum(per) / max(1, len(per)), per


def job(x):
    i, kind, outs, gt = x
    if kind == "math":
        acc = {e: 0 for e in EXS}
        for o in outs:
            ans = o.split("</think>")[-1]
            for e in EXS:
                try:
                    acc[e] += bool(K.EX[e](ans, gt)[1])
                except Exception:  # noqa: BLE001
                    pass
        return i, kind, acc
    sc = [if_score(o, gt) for o in outs]
    return i, kind, dict(partial_sum=sum(s for s, _ in sc), all_met=sum(1 for s, _ in sc if s == 1.0),
                         n_constraints=len(sc[0][1]) if sc else 0, per=[p for _, p in sc])


def main():
    d = C.frame("dolci_think_rl_s")
    jobs, meta = [], {}
    for i, r in enumerate(d.itertuples(index=False)):
        ds = list(r.dataset)[0] if r.dataset is not None and len(r.dataset) else ""
        outs = list(r.outputs) if r.outputs is not None else []
        gt = list(r.ground_truth)[0] if r.ground_truth is not None and len(r.ground_truth) else None
        if not outs or gt is None:
            continue
        kind = "math" if ds == "math" else "if" if ds == "ifeval" else None
        if kind:
            jobs.append((i, kind, outs, str(gt)))
            meta[i] = dict(rec=r.total_correct_rollouts, n=len(outs), pr=r.passrate, src=r.original_dataset)
    print("jobs", Counter(j[1] for j in jobs), flush=True)
    res_rows = []
    with get_context("fork").Pool(int(os.environ.get("PD_WORKERS", "2"))) as pool:
        for k, (i, kind, o) in enumerate(pool.imap_unordered(job, jobs, chunksize=4)):
            res_rows.append((i, kind, o))
            if k % 200 == 0:
                print(k, flush=True)
    out = {"sample_rows": len(d), "sources": dict(Counter(d.dataset_source)),
           "rollouts_per_row": dict(Counter(len(x) if x is not None else 0 for x in d.outputs))}
    m = [(i, o) for i, kind, o in res_rows if kind == "math"]
    rec = np.array([meta[i]["rec"] for i, _ in m])
    out["math"] = dict(rows=len(m), rollouts=int(sum(meta[i]["n"] for i, _ in m)), recorded=int(rec.sum()),
                       ours={e: int(sum(o[e] for _, o in m)) for e in EXS},
                       rows_equal={e: int(sum(o[e] == meta[i]["rec"] for i, o in m)) for e in EXS},
                       rows_zero_recorded=int((rec == 0).sum()),
                       rows_zero_but_ours={e: int(sum(1 for i, o in m if meta[i]["rec"] == 0 and o[e] > 0)) for e in EXS})
    f = [(i, o) for i, kind, o in res_rows if kind == "if"]
    rec = np.array([meta[i]["rec"] for i, _ in f])
    out["if"] = dict(rows=len(f), rollouts=int(sum(meta[i]["n"] for i, _ in f)), recorded=int(rec.sum()),
                     ours_all=int(sum(o["all_met"] for _, o in f)), ours_partial=float(sum(o["partial_sum"] for _, o in f)),
                     rows_equal_all=int(sum(o["all_met"] == meta[i]["rec"] for i, o in f)),
                     n_constraints=dict(Counter(o["n_constraints"] for _, o in f)),
                     rows_zero_recorded=int((rec == 0).sum()))
    # pass rate per source in the sample (and the cap)
    pr = {}
    for src, g in d.groupby("dataset_source"):
        v = g.passrate.dropna()
        pr[src] = dict(n=int(len(g)), with_rate=int(len(v)), hist=np.histogram(v, bins=[0, 1e-9, 0.126, 0.251, 0.376, 0.501, 0.626, 1.01])[0].tolist(),
                       max=float(v.max()) if len(v) else None)
    out["passrate"] = pr
    C.save_out("rlcheck.json", out)
    print(json.dumps(out)[:1500])


if __name__ == "__main__":
    main()

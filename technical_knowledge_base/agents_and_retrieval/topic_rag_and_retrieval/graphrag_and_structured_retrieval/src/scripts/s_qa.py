"""Multi-hop answers with graph retrieval, against plain retrieval and the agent loop, on the root's 200 HotpotQA questions.
Each system's top 5 paragraphs (s_ppr.py, $RAG_SCRATCH/gr/ppr_perq.json) go into the root Agentic lab's single-shot
prompt (src/agent/strategies.py PROMPTS_SINGLE, its tuned choice CHOICE["single"]) with the same generator settings,
so the answers are comparable with the Agentic lab's recorded runs: single-shot dense top 5 (test_<model>_single_k5)
and the ReAct agent (test_<model>_react), which are read from $RAG_SCRATCH/agt/runs, not regenerated.
Metrics: HotpotQA official EM and F1 (src/agent/common.py), gold paragraphs in the prompt, prompt tokens.
usage: python -I -B s_qa.py run <1.7b|4b> [system ...]   (GENERATOR: hold the bench lock)
       python -I -B s_qa.py offline <1.7b|4b>            (counts cached answers, no server)
       python -I -B s_qa.py summary                       (deterministic, from caches and the root's run files)
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grlib import L, ROOT_SRC, generator, hotpot, jl, r3, save, work  # noqa: E402

SYSTEMS = ["hybrid", "expand_title", "ppr_title_dense", "ppr_bipartite_pruned"]
G, mkcache = generator()
sys.path.insert(0, os.path.join(ROOT_SRC, "agent"))
import strategies as ST  # noqa: E402
from common import clean_answer, em, f1  # noqa: E402


def answer(q, pids, cache, model, offline):
    prompt = ST.PROMPTS_SINGLE[ST.CHOICE.get("single", "s2")].format(ctx=ST.fmt_paras(pids), q=q["question"])
    r = G.chat(prompt, cache, model, max_tokens=32, tag="single", offline=offline)
    return r


def run(model, systems, offline=False):
    qs, _, _ = hotpot()
    per = json.load(open(work("ppr_perq.json")))
    cache = mkcache("qa_" + model)
    t0, n, miss = time.time(), 0, 0
    for s in systems:
        for q in qs:
            r = answer(q, per[q["qid"]]["_top5"][s], cache, model, offline)
            n += r is not None; miss += r is None
        print(s, "done", round(time.time() - t0), "s", flush=True)
    print("answers", n, "missing", miss)


def summary():
    qs, _, _ = hotpot()
    per = json.load(open(work("ppr_perq.json")))
    out = {}
    for model in ("1.7b", "4b"):
        cache = mkcache("qa_" + model)
        res = {}
        for s in SYSTEMS:
            rows = []
            for q in qs:
                pids = per[q["qid"]]["_top5"][s]
                r = answer(q, pids, cache, model, True)
                if r is None:
                    break
                a = clean_answer(r["text"])
                rows.append({"qid": q["qid"], "em": em(a, q["answer"]), "f1": f1(a, q["answer"]), "gold": sum(g in pids for g in q["gold_pids"]),
                             "tok": r["n_in"], "s": r["seconds"], "ans": a})
            if len(rows) == len(qs):
                res[s] = rows
        for name, f in (("dense", "test_%s_single_k5" % model), ("agent", "test_%s_react" % model)):
            rr = jl(L.path("agt", "runs", f + ".jsonl"))
            if len(rr) == len(qs):
                res[name] = [{"qid": x["qid"], "em": x["em"], "f1": x["f1"], "gold": x["gold_seen"], "tok": x["tok_in"], "s": x["gen_s"], "ans": x["answer"]} for x in rr]
        if not res:
            continue
        agg = {k: {"em": r3(sum(x["em"] for x in v) / len(v)), "f1": r3(sum(x["f1"] for x in v) / len(v)),
                   "both_gold": sum(x["gold"] == 2 for x in v), "tok_in": round(sum(x["tok"] for x in v) / len(v)),
                   "gen_s": r3(sum(x["s"] for x in v) / len(v))} for k, v in res.items()}
        diffs = {}
        if "dense" in res:  # paired bootstrap of the F1 difference against dense single-shot, 10,000 resamples, seed 0
            import random
            dn = {x["qid"]: x["f1"] for x in res["dense"]}
            rnd = random.Random(0)
            for k, v in res.items():
                if k == "dense":
                    continue
                d = [x["f1"] - dn[x["qid"]] for x in v]
                bs = sorted(sum(rnd.choice(d) for _ in d) / len(d) for _ in range(10000))
                diffs[k] = [r3(sum(d) / len(d)), r3(bs[250]), r3(bs[9749])]
        out[model] = {"agg": agg, "diff_vs_dense": diffs, "examples": {k: {x["qid"]: [x["ans"], round(x["f1"], 2)] for x in v} for k, v in res.items()}}
        print(model, json.dumps(agg))
    save("qa.json", out)


if __name__ == "__main__":
    a = sys.argv[1:]
    if a[0] == "summary":
        summary()
    else:
        run(a[1], a[2:] or SYSTEMS, offline=a[0] == "offline")

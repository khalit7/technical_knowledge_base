"""Summarise whatever pending runs exist (this page's $RAG_SCRATCH/ar/runs/ and the root's position runs) into
../data/pending.json. A missing run stays null, and the page shows it as a dashed pending box; check_data.py lists
every null so nothing is filled by hand."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glob
from statistics import mean

import arlib as A

O = A.load_data("outcomes.json")
ix = {q: i for i, q in enumerate(O["qid"])}
RES = O["res"]


def summ(rows):
    if not rows:
        return None
    f = [r["f1"] for r in rows]
    return {"n": len(rows), "f1": A.r3(mean(f)), "f1_ci": A.boot_ci(f), "em": A.r3(mean(r["em"] for r in rows)),
            "tok": round(mean(r["tok_in"] + r["tok_out"] for r in rows), 1), "sec": A.r3(mean(r["wall_s"] for r in rows)),
            "srch": A.r3(mean(r["n_search"] for r in rows)), "both": sum(1 for r in rows if r.get("gold_seen") == 2),
            "one_search": sum(1 for r in rows if r["n_search"] == 1), "max_search": sum(1 for r in rows if r["n_search"] >= 4),
            "self_stop": sum(1 for r in rows if r["steps"] and r["steps"][-1].get("kind") == "finish"),
            "right": sum(1 for r in rows if r["f1"] >= 0.5),
            "right_given_both": A.r3(sum(1 for r in rows if r["f1"] >= 0.5 and r.get("gold_seen") == 2) / max(1, sum(1 for r in rows if r.get("gold_seen") == 2)))}


def run(name):
    p = A.L.path("ar", "runs", name + ".jsonl")
    return A.jl(p) if os.path.exists(p) else None


out = {}
for j in ("ircot", "selfask", "flare", "crag"):
    out[j] = summ(run(j + "_1.7b"))
    out[j + "_heldout"] = summ(run(j + ("_1.7b_prompti1_heldout" if j == "ircot" else "_1.7b_heldout")))
    out[j + "_4b"] = summ(run(j + "_4b"))
out["selfask_v1_heldout"] = summ(run("selfask_v1_1.7b_heldout"))
out["ircot_i2_heldout"] = summ(run("ircot_1.7b_prompti2_heldout"))
c = run("crag_1.7b")
out["crag_verdicts"] = {v: sum(1 for r in c if r.get("verdict") == v) for v in ("correct", "ambiguous", "incorrect")} if c else None
s = run("selfcheck_1.7b")
if s:
    pol = []
    for r in s:
        i = ix[r["qid"]]
        st = "single_k5" if r.get("supported") else "react"
        pol.append({"f1": RES[st]["f1"][i], "tok": RES[st]["tok"][i] + (r["tok_in"] + r["tok_out"] - RES["single_k5"]["tok"][i]) if st == "react" else r["tok_in"] + r["tok_out"]})
    out["selfcheck"] = {"n": len(s), "supported": sum(1 for r in s if r.get("supported")),
                        "supported_right": sum(1 for r in s if r.get("supported") and r["f1"] >= 0.5),
                        "unsupported_right": sum(1 for r in s if not r.get("supported") and r["f1"] >= 0.5),
                        "policy_f1": A.r3(mean(x["f1"] for x in pol)), "policy_tok": round(mean(x["tok"] for x in pol), 1)}
else:
    out["selfcheck"] = None
for b in ("budget1", "budget2", "budget3", "budget6", "k1", "k5"):
    out["react_" + b] = summ(run("react_b_1.7b_" + b))
pdiff = {}
for b in ("budget1", "budget2", "budget3", "budget6", "k1", "k5"):
    rr = run("react_b_1.7b_" + b)
    if rr:
        d = [r["f1"] - RES["react"]["f1"][ix[r["qid"]]] for r in rr]
        pdiff[b] = {"d": A.r3(mean(d)), "ci": A.boot_ci(d)}
out["react_vs_root"] = pdiff or None
for b in ("budget2", "budget6"):
    out["react_4b_" + b] = summ(run("react_b_4b_" + b))
out["memory"] = {h: summ(run("memory_1.7b_how" + h)) for h in ("all", "last", "top3")}
mq = run("memory_1.7b_howall")
if mq:  # the agent's own answers on the same trajectories (root's recorded react run)
    ids = [r["qid"] for r in mq]
    out["memory"]["react_same"] = {"n": len(ids), "f1": A.r3(mean(RES["react"]["f1"][ix[q]] for q in ids)),
                                   "tok": round(mean(RES["react"]["tok"][ix[q]] for q in ids), 1)}
lim = run("lim_1.7b_50") or run("lim_1.7b")
if lim:
    grid = {}
    for r in lim:
        grid.setdefault("%d" % r["N"], {}).setdefault("%.2f" % r["rel"], []).append(r["f1"])
    out["lim"] = {N: {rel: A.r3(mean(v)) for rel, v in d.items()} for N, d in grid.items()}
    out["lim_tok"] = {N: round(mean(r["n_in"] for r in lim if "%d" % r["N"] == N), 0) for N in grid}
    out["lim_n"] = len({r["qid"] for r in lim})
    out["lim_halfwidth"] = A.r3(mean((lambda ci: (ci[1] - ci[0]) / 2)(A.boot_ci(v)) for d in grid.values() for v in d.values()))
else:
    out["lim"] = out["lim_tok"] = out["lim_n"] = out["lim_halfwidth"] = None
# the root's own position run (20 paragraphs, 5 slots) when it lands
pos = {}
for m in ("1.7b", "4b"):
    p = A.L.path("agt", "runs", "position_%s.jsonl" % m)
    rows = A.jl(p) if os.path.exists(p) else []
    if rows:
        by = {}
        for r in rows:
            by.setdefault(str(r["slot"]), []).append(r["f1"])
        pos[m] = {"n": len({r["qid"] for r in rows}), "f1": {k: A.r3(mean(v)) for k, v in by.items()}}
out["root_position"] = pos or None
rt = run("router_1.7b")
if rt:
    lab = {r["qid"]: r["answer"] for r in rt}
    out["router_labels"] = {k: sum(1 for v in lab.values() if v == k) for k in ("NONE", "ONE", "MANY")}
    ch = [{"NONE": "closed", "ONE": "single_k5", "MANY": "react"}[lab.get(q, "MANY")] for q in O["qid"]]
    out["router_policy"] = {"f1": A.r3(mean(RES[c]["f1"][i] for i, c in enumerate(ch))),
                            "tok": round(mean(RES[c]["tok"][i] for i, c in enumerate(ch)), 1)}
else:
    out["router_labels"] = out["router_policy"] = None
out["root_4b"] = sorted(os.path.basename(p) for p in glob.glob(A.L.path("agt", "runs", "test_4b_*.jsonl"))) or None
A.save("pending.json", out)
print({k: ("ok" if v else None) for k, v in out.items()})

"""Format sensitivity: score the same 2,617 run0 documents after edits that change typography or layout but not content.
Classifiers: DCLM fastText (all docs, cheap) and, with 'edu', the FineWeb-Edu encoder on a seeded subset (CPU).
Output: ../data/out/perturb.json
usage: qc_perturb.py [edu <n>]"""
import json
import sys

import numpy as np

import qc_common as C

Q = C.Q
TYPO = {"‘": "'", "’": "'", "“": '"', "”": '"', "–": "-", "—": "-", "…": "..."}


def typo(t, keys):
    for k in keys:
        t = t.replace(k, TYPO[k])
    return t


P = {
    "quotes": lambda t: typo(t, "‘’“”"),
    "dashes": lambda t: typo(t, "–—"),
    "typography": lambda t: typo(t, TYPO.keys()),
    "lowercase": lambda t: t.lower(),
    "one_paragraph": lambda t: " ".join(t.split()),     # layout gone; for fastText identical to the space join
    "bullets": lambda t: "\n".join("- " + ln if ln.strip() else ln for ln in t.split("\n")),
}


def logit(p):
    p = np.clip(np.asarray(p, dtype=float), 1e-6, 1 - 1e-6)
    return np.log(p / (1 - p))


docs = C.run0_final()
texts = [d["text"] for d in docs]
base = np.array([d["dclm"] for d in docs])
cut = C.DCLM_CUT
res = {"n": len(docs), "dclm_cut": cut, "prevalence": {
    "curly_quotes": int(sum(any(c in t for c in "‘’“”") for t in texts)),
    "dashes": int(sum(any(c in t for c in "–—") for t in texts)),
    "ellipsis": int(sum("…" in t for t in texts))}, "dclm": {}}
for name, f in P.items():
    new = np.array(Q.dclm_scores([f(t) for t in texts]))
    changed = np.array([f(t) != t for t in texts])
    d = logit(new) - logit(base)
    res["dclm"][name] = {"docs_changed": int(changed.sum()), "mean_dlogit_changed": float(d[changed].mean()) if changed.any() else 0.0,
                         "median_dlogit_changed": float(np.median(d[changed])) if changed.any() else 0.0,
                         "share_up_changed": float((d[changed] > 0).mean()) if changed.any() else 0.0,
                         "keep_before": int((base >= cut).sum()), "keep_after": int((new >= cut).sum()),
                         "drop_to_keep": int(((base < cut) & (new >= cut)).sum()), "keep_to_drop": int(((base >= cut) & (new < cut)).sum())}
    print(name, res["dclm"][name], flush=True)

if len(sys.argv) > 2 and sys.argv[1] == "edu":
    n = int(sys.argv[2])
    rng = np.random.default_rng(0)
    idx = np.sort(rng.choice(len(docs), n, replace=False))
    sub = [texts[i] for i in idx]
    b = np.array([docs[i]["edu"] for i in idx])
    res["edu"] = {"n": n, "seed": 0}
    for name in ["typography", "lowercase", "one_paragraph", "bullets"]:
        new = np.array(Q.edu_scores([P[name](t) for t in sub]))
        d = new - b
        res["edu"][name] = {"mean_delta": float(d.mean()), "median_delta": float(np.median(d)), "share_up": float((d > 0).mean()),
                            "max_abs": float(np.abs(d).max()), "keep_before": int((b >= 2.5).sum()), "keep_after": int((new >= 2.5).sum()),
                            "flips": int(((b >= 2.5) != (new >= 2.5)).sum())}
        print("edu", name, res["edu"][name], flush=True)
C.dump("perturb.json", res)

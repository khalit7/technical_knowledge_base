"""Routers and retrieval evaluators over the recorded outcomes (../data/outcomes.json). Deterministic, CPU, seconds.

1. How well does each query-time signal predict that one search is enough? AUROC for two targets: both gold paragraphs
   in the bge top 5 (retrieval succeeded) and the single-shot pipeline's answer F1 >= 0.5 (the answer succeeded).
2. A learned router: logistic regression on the 8 query-time signals, 5-fold cross-validated (stratified, seed 0), so
   every question's probability comes from a model that never saw it. Target: the agent loop beats the top-5 pipeline
   on this question (F1 strictly higher).
3. Policies, each a function from a question to one recorded strategy, scored on the 200 questions with a paired
   bootstrap: always-X, oracle, rule, CRAG-style evaluator threshold, learned router. The page's Router lab recomputes
   the same policies in the browser from the same arrays; check_data.py asserts they agree.
Writes ../data/router.json."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import StratifiedKFold
from sklearn.preprocessing import StandardScaler

import arlib as A

O = A.load_data("outcomes.json")
R = O["res"]
n = len(O["qid"])
FEATS = ["cue_yesno", "cue_cmp", "s1", "gap", "ce1", "ce2", "ov", "ntok"]
X = np.array([[O[f][i] for f in FEATS] for i in range(n)], dtype=float)
single_ok = [int(x >= 0.5) for x in R["single_k5"]["f1"]]
react_gain = [int(a > b) for a, b in zip(R["react"]["f1"], R["single_k5"]["f1"])]

au = {}
for f in FEATS:
    au[f] = {"both5": A.r3(A.auroc(O[f], O["both5"])), "single_ok": A.r3(A.auroc(O[f], single_ok)),
             "react_gain": A.r3(A.auroc(O[f], react_gain))}


def cv_prob(y, seed=0):
    y = np.array(y)
    p = np.zeros(n)
    for tr, te in StratifiedKFold(5, shuffle=True, random_state=seed).split(X, y):
        sc = StandardScaler().fit(X[tr])
        m = LogisticRegression(C=1.0, max_iter=1000).fit(sc.transform(X[tr]), y[tr])
        p[te] = m.predict_proba(sc.transform(X[te]))[:, 1]
    return p


p_gain = cv_prob(react_gain)
p_ok = cv_prob(single_ok)
au["lr_cv"] = {"react_gain": A.r3(A.auroc(list(p_gain), react_gain)), "single_ok": A.r3(A.auroc(list(p_ok), single_ok))}
# coefficients of a model fit on all 200 (for reading only; the policy uses the CV probabilities)
sc = StandardScaler().fit(X)
m = LogisticRegression(C=1.0, max_iter=1000).fit(sc.transform(X), react_gain)
coef = {f: A.r3(c) for f, c in zip(FEATS, m.coef_[0])}


def score(choice):
    """choice: list of strategy names per question -> mean F1, EM, tokens, seconds, searches, with a CI on F1"""
    f1 = [R[c]["f1"][i] for i, c in enumerate(choice)]
    return {"f1": A.r3(np.mean(f1)), "f1_ci": A.boot_ci(f1), "em": A.r3(np.mean([R[c]["em"][i] for i, c in enumerate(choice)])),
            "tok": round(float(np.mean([R[c]["tok"][i] for i, c in enumerate(choice)])), 1),
            "sec": A.r3(np.mean([R[c]["sec"][i] for i, c in enumerate(choice)])),
            "srch": A.r3(np.mean([R[c]["srch"][i] for i, c in enumerate(choice)])),
            "share_exp": A.r3(np.mean([c != "single_k5" for c in choice]))}


S = O["strategies"]
pol = {}
for s in S:
    pol["always_" + s] = score([s] * n)
# oracle: highest F1, ties broken by fewer tokens
orc = [min(S, key=lambda s: (-R[s]["f1"][i], R[s]["tok"][i])) for i in range(n)]
pol["oracle_all"] = score(orc)
orc2 = ["react" if R["react"]["f1"][i] > R["single_k5"]["f1"][i] else "single_k5" for i in range(n)]
pol["oracle_single_react"] = score(orc2)
pol["rule_cmp_to_react"] = score(["react" if O["cue_cmp"][i] else "single_k5" for i in range(n)])
pol["rule_bridge_to_react"] = score(["react" if not O["cue_cmp"][i] else "single_k5" for i in range(n)])
# CRAG-style: escalate when the evaluator's best score is low; threshold at the median of ce1
med = float(np.median(O["ce1"]))
pol["crag_ce1_median"] = score(["react" if O["ce1"][i] < med else "single_k5" for i in range(n)])
pol["crag_ce1_median_k10"] = score(["single_k10" if O["ce1"][i] < med else "single_k5" for i in range(n)])
pol["lr_gain_0.5"] = score(["react" if p_gain[i] >= 0.5 else "single_k5" for i in range(n)])
pol["random_half"] = score(["react" if (i * 7919) % 2 else "single_k5" for i in range(n)])

# frontier sweep for the evaluator thresholds (share escalated vs F1), for the prose and the check
sweep = {}
for name, sig, hi in (("ce1", O["ce1"], False), ("s1", O["s1"], False), ("lr", list(p_gain), True)):
    pts = []
    for q in range(0, 101, 10):
        t = float(np.percentile(sig, q))
        ch = ["react" if ((sig[i] >= t) if hi else (sig[i] < t)) else "single_k5" for i in range(n)]
        if hi and q == 0:
            ch = ["react"] * n
        sc_ = score(ch)
        pts.append([q, sc_["share_exp"], sc_["f1"], sc_["tok"]])
    sweep[name] = pts

res = {"feats": FEATS, "auroc": au, "coef": coef, "p_gain": [A.r3(x) for x in p_gain], "p_ok": [A.r3(x) for x in p_ok],
       "react_gain_n": int(sum(react_gain)), "react_loss_n": int(sum(a < b for a, b in zip(R["react"]["f1"], R["single_k5"]["f1"]))),
       "single_ok_n": int(sum(single_ok)), "ce1_median": A.r3(med), "policies": pol, "sweep": sweep}
A.save("router.json", res)
for k, v in pol.items():
    print("%-26s F1 %.3f %s tok %7.1f sec %.2f exp %.2f" % (k, v["f1"], v["f1_ci"], v["tok"], v["sec"], v["share_exp"]))
print("AUROC", au)
print("coef", coef)

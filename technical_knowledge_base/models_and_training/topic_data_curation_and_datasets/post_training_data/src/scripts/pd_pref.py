"""Preference data, measured: length bias, ties, identical pairs, who wrote chosen and rejected, and how the
binarization rule changes the pairs built from the same UltraFeedback ratings.

Pair sets (rows): HH-RLHF helpful-base and harmless-base train (all), UltraFeedback binarized 5k (setup sample),
Argilla's cleaned UltraFeedback (all), Tulu 3 8B preference mixture 5k sample, OLMo 2 7B preference mix 5k sample
(plus the ratings and model columns of every row), Dolci-Instruct-DPO 5k sample (OLMo 3), Tulu 3 persona IF
preference set (all). Lengths in Qwen3 tokens of the final assistant turn.
Raw UltraFeedback (evol_instruct subset, every prompt with its 4 rated completions): rating against length within a
prompt, and four binarization rules applied to the same prompts.
Output: data/out/pref.json.   Run: nice -n 15, OMP_NUM_THREADS<=4.
"""
import math
import os
import random
import sys
from collections import Counter

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pd_common as C  # noqa: E402

RNG = random.Random(0)


def last_asst(x):
    m = C.msgs(x)
    a = [y["content"] for y in m if y["role"] == "assistant"]
    return a[-1] if a else ""


def first_user(x):
    m = C.msgs(x)
    u = [y["content"] for y in m if y["role"] == "user"]
    return u[0] if u else ""


def pair_sets():
    S = {}
    for k in ("hh_helpful", "hh_harmless"):
        d = C.frame(k)
        rows = []
        for c, r in zip(d.chosen, d.rejected):
            pc, ac = C.hh_parse(c)
            pr, ar = C.hh_parse(r)
            rows.append(dict(prompt=pc, chosen=ac, rejected=ar, same_context=pc == pr))
        S[k] = rows
    S["ufb_h4"] = [dict(prompt=r["prompt"], chosen=r["chosen"], rejected=r["rejected"], sc=r["score_chosen"],
                        sr=r["score_rejected"]) for r in C.P.records("pref")]
    d = C.frame("ufb_argilla")
    S["ufb_argilla"] = [dict(prompt=p, chosen=last_asst(c), rejected=last_asst(r), sc=float(a), sr=float(b),
                             cm=str(cm), rm=str(rm), source=str(s))
                        for p, c, r, a, b, cm, rm, s in zip(d.prompt, d.chosen, d.rejected, d["chosen-rating"],
                                                            d["rejected-rating"], d["chosen-model"], d["rejected-model"],
                                                            d.source)]
    d = C.frame("tulu3_pref")
    S["tulu3_pref"] = [dict(prompt=first_user(c), chosen=last_asst(c), rejected=last_asst(r), source=str(s))
                       for c, r, s in zip(d.chosen, d.rejected, d.source)]
    d = C.frame("olmo2_pref")
    S["olmo2_pref"] = [dict(prompt=first_user(c), chosen=last_asst(c), rejected=last_asst(r), source=str(s),
                            sc=_f(a), sr=_f(b), cm=str(cm), rm=str(rm))
                       for c, r, s, a, b, cm, rm in zip(d.chosen, d.rejected, d.source, d.chosen_rating,
                                                        d.rejected_rating, d.chosen_model, d.rejected_model)]
    d = C.frame("dolci_dpo")
    S["dolci_dpo"] = [dict(prompt=first_user(c), chosen=last_asst(c), rejected=last_asst(r), source=str(t),
                           cm=str(cm), rm=str(rm))
                      for c, r, t, cm, rm in zip(d.chosen, d.rejected, d.preference_type, d.chosen_model, d.rejected_model)]
    d = C.frame("if_pref_personas")
    S["if_personas"] = [dict(prompt=p, chosen=last_asst(c), rejected=last_asst(r), cm=str(cm), rm=str(rm),
                             constraints=list(k))
                        for p, c, r, cm, rm, k in zip(d.prompt, d.chosen, d.rejected, d.chonsen_model,
                                                      d.rejected_model, d.constraints)]
    return S


def _f(x):
    try:
        return float(x)
    except (TypeError, ValueError):
        return None


LABEL = {
    "hh_helpful": "HH-RLHF helpful-base (human labels)",
    "hh_harmless": "HH-RLHF harmless-base (human labels)",
    "ufb_h4": "UltraFeedback binarized, H4 (GPT-4 ratings)",
    "ufb_argilla": "UltraFeedback cleaned, Argilla (GPT-4 ratings)",
    "tulu3_pref": "Tulu 3 8B preference mixture (GPT-4o judge)",
    "olmo2_pref": "OLMo 2 7B preference mix (GPT-4o judge)",
    "dolci_dpo": "Dolci-Instruct-DPO (OLMo 3, delta learning)",
    "if_personas": "Tulu 3 persona IF preferences",
}


def measure(rows):
    lc = C.ntok([r["chosen"] for r in rows])
    lr = C.ntok([r["rejected"] for r in rows])
    lc, lr = np.array(lc), np.array(lr)
    ident = np.array([C.P.norm(r["chosen"]) == C.P.norm(r["rejected"]) for r in rows])
    diff = (lc != lr) & ~ident
    longer = int(((lc > lr) & diff).sum())
    ratio = np.log2((lc + 1) / (lr + 1))
    o = dict(n=len(rows), identical=int(ident.sum()), diff=int(diff.sum()), chosen_longer=longer,
             chosen_longer_share=longer / max(1, int(diff.sum())),
             log2_ratio=C.quantiles(ratio[~ident].tolist()), chosen_tok=C.quantiles(lc.tolist()),
             rejected_tok=C.quantiles(lr.tolist()),
             ratio_hist=np.histogram(np.clip(ratio[~ident], -4, 4), bins=np.linspace(-4, 4, 33))[0].tolist())
    # length baseline by length-difference bucket (does the bias grow with the gap?)
    buckets = [(0, 0.25), (0.25, 0.5), (0.5, 1), (1, 2), (2, 99)]
    o["by_gap"] = []
    a = np.abs(ratio)
    for lo, hi in buckets:
        m = diff & (a >= lo) & (a < hi)
        o["by_gap"].append([lo, hi, int(m.sum()), int(((lc > lr) & m).sum())])
    sc = [r.get("sc") for r in rows]
    if any(s is not None for s in sc):
        sc = np.array([np.nan if s is None else s for s in sc], dtype=float)
        sr = np.array([np.nan if r.get("sr") is None else r["sr"] for r in rows], dtype=float)
        ok = ~np.isnan(sc) & ~np.isnan(sr)
        mg = (sc - sr)[ok]
        o["ratings"] = dict(n=int(ok.sum()), ties=int((mg == 0).sum()), negative=int((mg < 0).sum()),
                            margin=C.quantiles(mg.tolist()), margin_counts=Counter(np.round(mg, 2).tolist()).most_common(12))
    src = [r.get("source") for r in rows]
    if any(src):
        o["by_source"] = {}
        for sname in sorted(set(x for x in src if x)):
            m = np.array([x == sname for x in src])
            dm = diff & m
            o["by_source"][sname] = dict(n=int(m.sum()), diff=int(dm.sum()), chosen_longer=int(((lc > lr) & dm).sum()),
                                         median_ratio=float(np.median(ratio[m & ~ident])) if (m & ~ident).any() else None)
    for k in ("cm", "rm", "source"):
        v = [r.get(k) for r in rows if r.get(k)]
        if v:
            o[k] = Counter(v).most_common(15)
    if any(r.get("cm") for r in rows):
        o["same_model"] = sum(1 for r in rows if r.get("cm") and r.get("cm") == r.get("rm"))
    return o, lc, lr


def ufb_raw():
    """Four binarization rules on the same prompts (evol_instruct subset of openbmb/UltraFeedback)."""
    d = C.frame("ufb_raw_evol")
    prompts = []
    for r in d.itertuples(index=False):
        comps = []
        for c in r.completions:
            ann = c.get("annotations") or {}
            asp = []
            for k in ("instruction_following", "honesty", "truthfulness", "helpfulness"):
                v = ann.get(k)
                v = v.get("Rating") if isinstance(v, dict) else (v[0].get("Rating") if isinstance(v, list) and v else None)
                try:
                    asp.append(float(v))
                except (TypeError, ValueError):
                    asp.append(None)
            comps.append(dict(model=c.get("model"), text=c.get("response") or "", overall=_f(c.get("overall_score")),
                              fg=_f(c.get("fine-grained_score")), asp=asp))
        if len(comps) == 4:
            prompts.append(dict(prompt=r.instruction, comps=comps))
    lens = C.ntok([c["text"] for p in prompts for c in p["comps"]])
    k = 0
    for p in prompts:
        for c in p["comps"]:
            c["tok"] = lens[k]
            k += 1
    return prompts


def mean_asp(c):
    v = [x for x in c["asp"] if x is not None]
    return sum(v) / len(v) if v else None


RULES = {
    "h4": "chosen = highest overall_score; rejected = a random one of the other three (ties allowed)",
    "argilla": "chosen = highest mean of the four aspect ratings; rejected = random among strictly lower; ties dropped",
    "maxmin": "chosen = highest mean aspect rating; rejected = lowest; ties dropped",
    "all_pairs": "every pair with different mean aspect rating (6 per prompt at most)",
}


def binarize(prompts):
    rng = random.Random(0)
    out = {k: [] for k in RULES}
    for pi, p in enumerate(prompts):
        cs = p["comps"]
        ov = [c["overall"] if c["overall"] is not None else -1 for c in cs]
        ma = [mean_asp(c) for c in cs]
        if all(x is not None for x in ov):
            ci = int(np.argmax(ov))
            ri = rng.choice([j for j in range(4) if j != ci])
            out["h4"].append((pi, ci, ri, ov[ci] - ov[ri]))
        if all(x is not None for x in ma):
            ci = int(np.argmax(ma))
            low = [j for j in range(4) if ma[j] < ma[ci]]
            if low:
                ri = rng.choice(low)
                out["argilla"].append((pi, ci, ri, ma[ci] - ma[ri]))
                rj = int(np.argmin(ma))
                out["maxmin"].append((pi, ci, rj, ma[ci] - ma[rj]))
            for a in range(4):
                for b in range(a + 1, 4):
                    if ma[a] != ma[b]:
                        c_, r_ = (a, b) if ma[a] > ma[b] else (b, a)
                        out["all_pairs"].append((pi, c_, r_, abs(ma[a] - ma[b])))
    return out


def rule_stats(prompts, pairs):
    s = {}
    for k, ps in pairs.items():
        lc = np.array([prompts[p]["comps"][c]["tok"] for p, c, r, m in ps])
        lr = np.array([prompts[p]["comps"][r]["tok"] for p, c, r, m in ps])
        mg = np.array([m for *_, m in ps])
        d = lc != lr
        s[k] = dict(n=len(ps), ties=int((mg == 0).sum()), chosen_longer=int(((lc > lr) & d).sum()), diff=int(d.sum()),
                    margin=C.quantiles(mg.tolist()), median_ratio=float(np.median(np.log2((lc + 1) / (lr + 1)))))
    h4c = {p: c for p, c, r, m in pairs["h4"]}
    agc = {p: c for p, c, r, m in pairs["argilla"]}
    both = set(h4c) & set(agc)
    s["same_chosen_h4_argilla"] = [sum(h4c[p] == agc[p] for p in both), len(both)]
    return s


def rating_vs_length(prompts):
    from scipy.stats import spearmanr
    rs, top_longest, n = [], 0, 0
    for p in prompts:
        ma = [mean_asp(c) for c in p["comps"]]
        t = [c["tok"] for c in p["comps"]]
        if any(x is None for x in ma) or len(set(ma)) < 2 or len(set(t)) < 2:
            continue
        r = spearmanr(ma, t).statistic
        if not math.isnan(r):
            rs.append(r)
        n += 1
        top = [j for j in range(4) if ma[j] == max(ma)]
        top_longest += int(np.argmax(t)) in top
    # per aspect: mean within-prompt Spearman of the aspect rating with length
    asp = {}
    for ai, nm in enumerate(("instruction_following", "honesty", "truthfulness", "helpfulness")):
        v = []
        for p in prompts:
            x = [c["asp"][ai] for c in p["comps"]]
            t = [c["tok"] for c in p["comps"]]
            if any(y is None for y in x) or len(set(x)) < 2 or len(set(t)) < 2:
                continue
            r = spearmanr(x, t).statistic
            if not math.isnan(r):
                v.append(r)
        asp[nm] = dict(n=len(v), mean=float(np.mean(v)))
    return dict(n=n, spearman_mean=float(np.mean(rs)), spearman_q=C.quantiles(rs), top_is_longest=top_longest,
                aspects=asp)


def examples(prompts, pairs, k=6):
    """Prompts for the binarization animation: short ones where the rules disagree, chosen by a fixed seed."""
    rng = random.Random(1)
    h4c = {p: (c, r) for p, c, r, m in pairs["h4"]}
    agc = {p: (c, r) for p, c, r, m in pairs["argilla"]}
    cand = [p for p in h4c if p in agc and h4c[p][0] != agc[p][0] and len(prompts[p]["prompt"]) < 220
            and max(c["tok"] for c in prompts[p]["comps"]) < 500]
    cand2 = [p for p in h4c if p in agc and h4c[p][0] == agc[p][0] and len(prompts[p]["prompt"]) < 200
             and max(c["tok"] for c in prompts[p]["comps"]) < 400]
    pick = sorted(rng.sample(cand, min(k, len(cand)))) + sorted(rng.sample(cand2, min(2, len(cand2))))
    out = []
    for p in pick:
        P_ = prompts[p]
        out.append(dict(prompt=P_["prompt"], comps=[dict(model=c["model"], tok=c["tok"], overall=c["overall"],
                                                         asp=c["asp"], text=c["text"][:700]) for c in P_["comps"]],
                        h4=list(h4c[p]), argilla=list(agc[p])))
    return out


def main():
    res = {"label": LABEL, "sets": {}, "rules": RULES}
    S = pair_sets()
    for k, rows in S.items():
        o, lc, lr = measure(rows)
        res["sets"][k] = o
        print(k, o["n"], round(o["chosen_longer_share"], 3), flush=True)
    prompts = ufb_raw()
    pairs = binarize(prompts)
    res["ufb_raw"] = dict(prompts=len(prompts), rule_stats=rule_stats(prompts, pairs),
                          rating_vs_length=rating_vs_length(prompts), examples=examples(prompts, pairs))
    C.save_out("pref.json", res)


if __name__ == "__main__":
    main()

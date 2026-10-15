"""Dialect test: does the classifier score British spelling lower than American spelling of the same text?

Pass rate by top-level domain on 50,000 FineWeb CC-MAIN-2024-30 rows (DCLM scores from the root's Quality lab), then a
controlled edit: the same documents with British spellings swapped for American ones (UK -> US) and the reverse
(US -> UK), using a fixed list of spelling pairs (SPELL below, written for this page; whole words, case kept).
Nothing else in the text changes, so any score change is caused by spelling alone.
usage: qc_dialect.py [models...]   (default: dclm; any fastText model name from qc_score_ft, or 'edu' for the encoder on 400 docs)
Output: ../data/out/dialect.json"""
import json
import os
import re
import sys

import numpy as np

import qc_common as C

SPELL = """colour color|colours colors|coloured colored|favourite favorite|favourites favorites|favour favor|honour honor|
honours honors|labour labor|behaviour behavior|behaviours behaviors|neighbour neighbor|neighbours neighbors|
neighbourhood neighborhood|harbour harbor|humour humor|rumour rumor|vapour vapor|flavour flavor|flavours flavors|
endeavour endeavor|centre center|centres centers|theatre theater|metre meter|metres meters|litre liter|litres liters|
fibre fiber|calibre caliber|organise organize|organised organized|organising organizing|organisation organization|
organisations organizations|realise realize|realised realized|recognise recognize|recognised recognized|
apologise apologize|emphasise emphasize|prioritise prioritize|minimise minimize|maximise maximize|summarise summarize|
customise customize|optimise optimize|optimisation optimization|specialise specialize|specialised specialized|
analyse analyze|analysed analyzed|paralyse paralyze|catalogue catalog|dialogue dialog|programme program|
programmes programs|defence defense|offence offense|licence license|practise practice|travelling traveling|
travelled traveled|traveller traveler|cancelled canceled|modelling modeling|labelled labeled|jewellery jewelry|
grey gray|tyre tire|tyres tires|cheque check|mum mom|aluminium aluminum|enrol enroll|fulfil fulfill|
ageing aging|judgement judgment|manoeuvre maneuver|paediatric pediatric|anaemia anemia|oestrogen estrogen|
haemoglobin hemoglobin|diarrhoea diarrhea|sceptical skeptical|plough plow|pyjamas pajamas|storey story""".replace("\n", "")
PAIRS = [p.split() for p in SPELL.split("|") if p.strip()]


def swap(text, direction):
    m = {a: b for a, b in PAIRS} if direction == "uk2us" else {b: a for a, b in PAIRS}
    if direction == "us2uk":
        m.pop("story", None); m.pop("check", None); m.pop("tire", None); m.pop("mom", None)  # ambiguous in US->UK
        m.pop("program", None); m.pop("license", None); m.pop("practice", None)  # US uses these for UK noun and verb alike
    rx = re.compile(r"\b(" + "|".join(sorted(map(re.escape, m), key=len, reverse=True)) + r")\b", re.I)

    def rep(mo):
        w = mo.group(0)
        t = m.get(w.lower())
        if t is None:
            return w
        return t.capitalize() if w[0].isupper() else t
    return rx.sub(rep, text)


def logit(p):
    p = np.clip(np.asarray(p, dtype=float), 1e-6, 1 - 1e-6)
    return np.log(p / (1 - p))


f = C.L.curated("fineweb_rand50k", columns=["url", "text"])
tld = f.url.map(lambda u: C.host(u).rsplit(".", 1)[-1]).values
dc = np.array([json.loads(l)["dclm"] for l in open(C.Q.qdir("fineweb_rand50k_dclm.jsonl"))])
res = {"n": len(f), "pairs": len(PAIRS), "by_tld": {}}
cut = C.DCLM_CUT
for t in ["com", "org", "net", "us", "uk", "au", "ca", "nz", "ie", "in", "za", "ng", "pk", "sg", "edu", "gov"]:
    m = tld == t
    res["by_tld"][t] = {"n": int(m.sum()), "dclm_pass": float((dc[m] >= cut).mean())}
uk_like = np.isin(tld, ["uk", "au", "nz", "ie"])
us_like = np.isin(tld, ["com", "us"])
rng = np.random.default_rng(0)
texts = f.text.values
sets = {"uk2us": [i for i in np.where(uk_like)[0] if swap(texts[i], "uk2us") != texts[i]],
        "us2uk": [i for i in rng.permutation(np.where(us_like)[0])[:20000] if swap(texts[i], "us2uk") != texts[i]]}
res["edited_docs"] = {k: len(v) for k, v in sets.items()}
wanted = sys.argv[1:] or ["dclm"]
SD = C.sdir("scores", "x")[:-1]
import qc_score_ft as S  # noqa: E402
ms = S.models()
for name in wanted:
    res.setdefault("models", {})[name] = {}
    for d, idx in sets.items():
        if name == "edu":
            idx = idx[:400]
            before = np.array(C.Q.edu_scores([texts[i] for i in idx]))
            after = np.array(C.Q.edu_scores([swap(texts[i], d) for i in idx]))
            delta = after - before
            kb, ka = before >= 2.5, after >= 2.5
        else:
            before = np.load(os.path.join(SD, f"{name}__fw50k.npy"))[idx] if name != "dclm" else dc[idx]
            after = S.score(ms[name], [swap(texts[i], d) for i in idx])
            delta = logit(after) - logit(before)
            thr = cut if name == "dclm" else float(np.quantile(np.load(os.path.join(SD, f"{name}__rw_hold.npy")), 0.9))
            kb, ka = before >= thr, after >= thr
        res["models"][name][d] = {"n": len(idx), "mean_delta": float(delta.mean()), "median_delta": float(np.median(delta)),
                                  "share_up": float((delta > 0).mean()), "keep_before": int(kb.sum()), "keep_after": int(ka.sum()),
                                  "drop_to_keep": int((~kb & ka).sum()), "keep_to_drop": int((kb & ~ka).sum())}
        print(name, d, res["models"][name][d], flush=True)
C.dump("dialect.json", res)

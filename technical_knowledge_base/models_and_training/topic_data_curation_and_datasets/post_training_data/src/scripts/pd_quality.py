"""Quality control across post-training sets: the same prompt reused across stages and datasets, exact duplicates,
and (after pd_contam.py) benchmark contamination of the extra sets.

1. Stage reuse: IF_multi_constraints_upto5 rows keep the id of the SFT row their base prompt came from ('key');
   counted by source subset, and joined with the Tulu 3 SFT sample's ids (prompt prefix checked).
2. Exact prompt overlap between sets (lower-case, whitespace collapsed; first user turn).
3. Contamination summaries from $DC_SCRATCH/pd/contam (pd_contam.py) and the IFEval check.
Output: data/out/quality.json
"""
import gzip
import json
import os
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pd_common as C  # noqa: E402


def first_user(x):
    for m in list(x):
        if m.get("role") == "user":
            return str(m.get("content") or "")
    return ""


def prompts():
    P = {}
    a = C.frame("alpaca")
    P["alpaca"] = [r.instruction + ("\n\n" + r.input if r.input else "") for r in a.itertuples()]
    d = C.frame("dolly")
    P["dolly"] = [r.instruction + ("\n\n" + r.context if r.context else "") for r in d.itertuples()]
    P["tulu3_sft"] = [r["prompt"] for r in C.P.records("sft")]
    P["dolci_sft"] = [first_user(m) for m in C.frame("dolci_instruct_sft_s").messages]
    P["ufb_h4"] = [r["prompt"] for r in C.P.records("pref")]
    P["ufb_argilla"] = list(C.frame("ufb_argilla").prompt)
    P["tulu3_pref"] = [first_user(m) for m in C.frame("tulu3_pref").chosen]
    P["olmo2_pref"] = [first_user(m) for m in C.frame("olmo2_pref").chosen]
    P["dolci_dpo"] = [first_user(m) for m in C.frame("dolci_dpo").chosen]
    P["rlvr"] = [r["question"] for r in C.P.records("rlvr")]
    P["openr1"] = list(C.frame("openr1_math").problem)
    return P


def main():
    res = {}
    # 1. stage reuse
    im = C.frame("if_multi")
    src = im.key.str.replace(r"_\d+$", "", regex=True).str.replace(r"^(personahub|personas_math_easy)_.*$", r"\1", regex=True)
    res["if_multi_sources"] = src.value_counts().head(20).to_dict()
    res["if_multi_n"] = len(im)
    sft = {r["id"]: r["prompt"] for r in C.P.records("sft")}
    hit = [(k, first_user(m)) for k, m in zip(im.key, im.messages) if k in sft]
    pref_ok = sum(1 for k, p in hit if C.P.norm(p).startswith(C.P.norm(sft[k])[:200]))
    res["if_multi_in_sft_sample"] = dict(ids=len(hit), prefix_match=pref_ok, sample=len(sft))
    res["if_multi_constraints"] = Counter(len(eval(g)[0]["instruction_id"]) if g else 0 for g in im.ground_truth).most_common()
    # 2. exact overlap
    P = prompts()
    N = {k: set(C.P.norm(x) for x in v if x and len(x) > 20) for k, v in P.items()}
    keys = list(N)
    res["sets"] = {k: dict(rows=len(P[k]), distinct=len(N[k]), dup=len(P[k]) - len(set(C.P.norm(x) for x in P[k]))) for k in keys}
    res["overlap"] = {a: {b: len(N[a] & N[b]) for b in keys if b != a} for a in keys}
    # 3. contamination summaries
    cd = os.path.join(C.scratch(), "contam")
    summ = {}
    if os.path.isdir(cd):
        for fn in sorted(os.listdir(cd)):
            if fn.endswith(".summary.json"):
                s = json.load(open(os.path.join(cd, fn)))
                pairs = [json.loads(x) for x in gzip.open(os.path.join(cd, fn.replace(".summary.json", ".pairs.jsonl.gz")), "rt")]
                s["flag_cov8"] = sum(1 for p in pairs if p["cov8"] > 0.5)
                s["flag_m13"] = sum(1 for p in pairs if p["m13"] > 0)
                summ[s["corpus"]] = s
        if os.path.exists(os.path.join(cd, "ifeval.json")):
            res["ifeval"] = json.load(open(os.path.join(cd, "ifeval.json")))
    res["contam"] = summ
    C.save_out("quality.json", res)
    print(json.dumps({k: res[k] for k in ("if_multi_in_sft_sample", "sets")})[:1500])


if __name__ == "__main__":
    main()

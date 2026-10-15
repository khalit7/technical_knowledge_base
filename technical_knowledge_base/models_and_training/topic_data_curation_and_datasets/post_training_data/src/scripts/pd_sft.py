"""SFT data, measured: the lineage from Alpaca to Dolci on the same metrics, and the mixtures' composition.

Sets (rows used): Alpaca 52k (all), Dolly 15k (all), Tulu 3 SFT 5k sample (setup agent's; 1,000 rows from each of 5
subsets), Dolci-Instruct-SFT 4k sample, Dolci-Think-SFT-7B 3k sample, OpenR1-Math 6k sample (problem + first
generation, as distillation SFT rows), SWE-Gym OpenHands SFT trajectories (all 491).
Per set: turns, prompt and response length (Qwen3 tokens), the share of tokens that get loss under the tulu chat
template with open-instruct's masking (at most 3,000 rows per set, seed 0), exact and near-duplicate prompts
(MinHash J >= 0.8, the root's near_dup_clusters), first-word distribution of prompts, English share (lid.176).
Mixtures: rows per source for Tulu 3 SFT, OLMo 2 SFT, Dolci-Instruct-SFT and Dolci-Think-SFT-7B (every row, source
column only; pd_get.py 'cols').
Output: data/out/sft.json.   Run: nice -n 15, OMP_NUM_THREADS<=4.
"""
import random
import re
import sys
import os
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pd_common as C  # noqa: E402

RNG = random.Random(0)
MASK_N = 3000


def conv_sets():
    """{key: list of conversations (list of {role, content})} plus labels."""
    S = {}
    a = C.frame("alpaca")
    S["alpaca"] = [[{"role": "user", "content": (r.instruction + ("\n\n" + r.input if r.input else ""))},
                    {"role": "assistant", "content": r.output}] for r in a.itertuples()]
    d = C.frame("dolly")
    S["dolly"] = [[{"role": "user", "content": (r.instruction + ("\n\n" + r.context if r.context else ""))},
                   {"role": "assistant", "content": r.response}] for r in d.itertuples()]
    S["tulu3"] = [x["messages"] for x in C.P.records("sft")]
    S["dolci_instruct"] = [C.msgs(m) for m in C.frame("dolci_instruct_sft_s").messages]
    S["dolci_think"] = [C.msgs(m) for m in C.frame("dolci_think_sft_s").messages]
    o = C.frame("openr1_math")
    S["openr1"] = [[{"role": "user", "content": r.problem}, {"role": "assistant", "content": list(r.generations)[0]}]
                   for r in o.itertuples()]
    S["swe_traj"] = [C.msgs(m) for m in C.frame("swe_gym_sft_traj").messages]
    return S


META = {
    "alpaca": dict(label="Alpaca", repo="tatsu-lab/alpaca", year=2023, author="model (text-davinci-003, self-instruct)"),
    "dolly": dict(label="Dolly 15k", repo="databricks/databricks-dolly-15k", year=2023, author="human (Databricks employees)"),
    "tulu3": dict(label="Tulu 3 SFT (5 subsets)", repo="allenai/tulu-3-sft-mixture", year=2024, author="mixed"),
    "dolci_instruct": dict(label="Dolci-Instruct-SFT (OLMo 3)", repo="allenai/Dolci-Instruct-SFT", year=2025, author="mixed"),
    "dolci_think": dict(label="Dolci-Think-SFT-7B (OLMo 3)", repo="allenai/Dolci-Think-SFT-7B", year=2025, author="model (reasoning traces)"),
    "openr1": dict(label="OpenR1-Math (R1 traces)", repo="open-r1/OpenR1-Math-220k", year=2025, author="model (DeepSeek-R1)"),
    "swe_traj": dict(label="SWE-Gym OpenHands trajectories", repo="SWE-Gym/OpenHands-SFT-Trajectories", year=2024, author="model (agent rollouts)"),
}

FIRST = re.compile(r"[A-Za-z']+")


def first_word(t):
    m = FIRST.search(t or "")
    return m.group(0).lower() if m else ""


def lid(texts):
    import fasttext
    m = fasttext.load_model(L_model())
    out = []
    for t in texts:
        lab, _ = m.predict(re.sub(r"\s+", " ", t)[:2000])
        out.append(lab[0].replace("__label__", ""))
    return out


def L_model():
    return C.L.path(C.L.MODELS["lid176"])


def measure(key, convs):
    users = [next((m["content"] for m in c if m["role"] in ("user", "human")), "") for c in convs]
    asst = [[m["content"] for m in c if m["role"] == "assistant"] for c in convs]
    turns = [sum(m["role"] in ("user", "human") for m in c) for c in convs]
    roles = Counter(m["role"] for c in convs for m in c)
    pt = C.ntok(users)
    rt = C.ntok(["\n".join(a) for a in asst])
    idx = list(range(len(convs)))
    sub = sorted(RNG.sample(idx, min(MASK_N, len(idx))))
    tot = trn = 0
    shares = []
    per_role = Counter()
    for i in sub:
        T, t, per = C.mask_stats(convs[i])
        tot += T
        trn += t
        per_role.update(per)
        shares.append(t / T if T else 0)
    norm = [C.P.norm(u) for u in users]
    exact = len(norm) - len(set(norm))
    nd_idx = sorted(RNG.sample(idx, min(20000, len(idx))))
    cid, pairs = C.P.near_dup_clusters([users[i] for i in nd_idx])
    near_rows = sum(1 for c in cid if c != -1)
    fw = Counter(first_word(u) for u in users)
    langs = Counter(lid(users))
    return dict(n=len(convs), roles=dict(roles), turns=C.quantiles(turns), prompt_tok=C.quantiles(pt),
                resp_tok=C.quantiles(rt), resp_tok_sum=int(sum(rt)), prompt_tok_sum=int(sum(pt)),
                mask=dict(n=len(sub), tokens=tot, trained=trn, share=trn / tot if tot else 0,
                          share_q=C.quantiles(shares), masked_by_role=dict(per_role)),
                exact_dup_prompts=exact, near=dict(n=len(nd_idx), rows_in_clusters=near_rows, pairs=len(pairs)),
                first_words=fw.most_common(15), first_word_distinct=len(fw),
                lang=langs.most_common(8), english=langs.get("en", 0))


def mixtures():
    import pandas as pd
    out = {}
    for key, col in [("tulu3_sft_src", "source"), ("olmo2_sft_src", "source"),
                     ("dolci_instruct_sft_src", "source_dataset"), ("dolci_think_sft_src", "dataset_source")]:
        try:
            d = pd.read_parquet(C.pd_file(key), columns=[col])
        except FileNotFoundError:
            continue
        vc = d[col].astype(str).value_counts()
        out[key] = dict(total=int(len(d)), sources=[[k, int(v)] for k, v in vc.items()])
    return out


def main():
    S = conv_sets()
    res = {"meta": META, "sets": {}}
    for k, convs in S.items():
        res["sets"][k] = measure(k, convs)
        print(k, res["sets"][k]["n"], round(res["sets"][k]["mask"]["share"], 3), flush=True)
    res["mixtures"] = mixtures()
    C.save_out("sft.json", res)


if __name__ == "__main__":
    main()

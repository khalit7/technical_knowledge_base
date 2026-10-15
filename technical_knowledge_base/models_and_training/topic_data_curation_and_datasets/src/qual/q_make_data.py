"""Assemble everything the Quality lab tab embeds into parts/33_js_q_0data.js, plus out/q_summary.json
(every number quoted in the tab's prose, checked by check_q.mjs). Reads the scoring outputs in $DC_SCRATCH/q/.
Privacy: only run0 final/ text (PII-scrubbed) is excerpted, 300 characters at most, URL reduced to its host;
excerpts are withheld for pages centred on a private individual (WITHHOLD)."""
import json
import os
import re
from collections import Counter
from urllib.parse import urlparse

import numpy as np
from scipy.stats import spearmanr
import q_common as Q

L = Q.L
qj = lambda n: [json.loads(x) for x in open(Q.qdir(n))]  # noqa: E731
chk = json.load(open(os.path.join(Q.OUT, "q_check_models.json")))
CUT = chk["dclm_baseline_50k_min_score"]
WITHHOLD = {11, 15, 16, 68}

run = qj("run0_final_scores.jsonl")
ids = [r["id"] for r in run]
edu = np.array([r["edu"] for r in run]); dc = np.array([r["dclm"] for r in run]); dc0 = np.array([r["dclm_dt_default"] for r in run])
words = np.array([r["words"] for r in run])
fwedu_ids = set(L.ids("fineweb_edu_kept")); fw_ids = set(L.ids("fineweb_kept"))
texts = {d["id"]: d["text"] for d in L.run0("final")}

# own fastText on run0 final
ftres = json.load(open(os.path.join(Q.OUT, "q_ft.json")))

import fasttext  # noqa: E402
import q_train_ft_norm as N  # noqa: E402
m = fasttext.load_model(Q.qdir("ft", "own_hq.bin"))
own = np.array([dict(zip(*m.predict(N.norm(texts[i]), k=-1))).get("__label__hq", 0.0) for i in ids])
OWN_T = ftres["test"]["thr"]

cc = {r["id"]: r for r in qj("ccnet_run0.jsonl")} if os.path.exists(Q.qdir("ccnet_run0.jsonl")) else {}
ppl = np.array([cc[i]["ppl"] if i in cc else np.nan for i in ids])

labels = [json.loads(x) for x in open(os.path.join(Q.HERE, "labels.jsonl"))]
lab_of = {r["id"]: r for r in labels}

S = {"dclm_cut": CUT, "n_run0": len(run), "dclm_q10": chk["dclm_baseline_50k_quantiles"]["0.1"], "dclm_median_baseline": chk["dclm_baseline_50k_quantiles"]["0.5"]}
ke, kd = edu >= 2.5, dc >= CUT
S.update({"keep_edu": int(ke.sum()), "keep_dclm": int(kd.sum()), "keep_both": int((ke & kd).sum()), "keep_either": int((ke | kd).sum()),
          "keep_edu_frac": float(ke.mean()), "keep_dclm_frac": float(kd.mean()), "jacc_published": float((ke & kd).sum() / (ke | kd).sum()),
          "spearman_edu_dclm": float(spearmanr(edu, dc).statistic), "spearman_edu_own": float(spearmanr(edu, own).statistic),
          "spearman_dclm_own": float(spearmanr(dc, own).statistic),
          "keep_own": int((own >= OWN_T).sum()), "own_thr": OWN_T,
          "words_kept_edu_frac": float(words[ke].sum() / words.sum()), "words_kept_dclm_frac": float(words[kd].sum() / words.sum())})
for k in (0.05, 0.1, 0.2):
    n = int(round(k * len(run)))
    A = set(np.argsort(-edu)[:n]); B = set(np.argsort(-dc)[:n])
    S[f"top{int(k*100)}_overlap"] = len(A & B) / n
    S[f"top{int(k*100)}_jacc"] = len(A & B) / len(A | B)
# datatrove newline trap
S.update({"dt_flip": int(((dc >= CUT) != (dc0 >= CUT)).sum()), "dt_meanabs": float(np.abs(dc - dc0).mean()),
          "dt_maxabs": float(np.abs(dc - dc0).max()), "dt_keep": int((dc0 >= CUT).sum()),
          "dclm_repro_maxabs": chk["dclm_space_maxabs"], "dclm_empty_meanabs_on_dclm": chk["dclm_empty_meanabs"],
          "dclm_empty_maxabs_on_dclm": chk["dclm_empty_maxabs"]})
# published FineWeb-Edu survivors of our WARC vs our scores
ine = np.array([i in fwedu_ids for i in ids])
S.update({"fwedu_in_run0": int(ine.sum()), "fwedu_in_run0_edu_ge25": int((ine & ke).sum()), "run0_edu_ge25_not_fwedu": int((~ine & ke).sum())})
nfw = np.array([i in fw_ids for i in ids])
S["run0_edu_ge25_not_in_fineweb"] = int((~nfw & ke).sum())

# second sample: 2,000 random FineWeb CC-MAIN-2024-30 rows
fw = qj("fw_sample_scores.jsonl")
fe = np.array([r["edu"] for r in fw]); fd = np.array([r["dclm"] for r in fw])
S.update({"fw_n": len(fw), "fw_keep_edu": float((fe >= 2.5).mean()), "fw_keep_dclm": float((fd >= CUT).mean()),
          "fw_jacc_published": float(((fe >= 2.5) & (fd >= CUT)).sum() / ((fe >= 2.5) | (fd >= CUT)).sum()),
          "fw_spearman": float(spearmanr(fe, fd).statistic)})
n = int(round(0.1 * len(fw))); A = set(np.argsort(-fe)[:n]); B = set(np.argsort(-fd)[:n])
S["fw_top10_jacc"] = len(A & B) / len(A | B)

# Nemotron-CC buckets
nemo = qj("nemo_scores.jsonl")
NB = ["high", "medium-high", "medium", "medium-low", "low"]
nemo_out = {b: {"edu": [round(r["edu"], 2) for r in nemo if r["bucket"] == b], "dclm": [round(r["dclm"], 5) for r in nemo if r["bucket"] == b]} for b in NB}
S["nemo_median"] = {b: {"edu": float(np.median(nemo_out[b]["edu"])), "dclm": float(np.median(nemo_out[b]["dclm"])),
                        "dclm_pass": float(np.mean(np.array(nemo_out[b]["dclm"]) >= CUT)), "edu_pass": float(np.mean(np.array(nemo_out[b]["edu"]) >= 2.5))} for b in NB}

S["nemo_spearman"] = float(spearmanr([r["edu"] for r in nemo], [r["dclm"] for r in nemo]).statistic)

# annotations: published classifier vs Llama 3 labels (1,500 rows), DCLM vs Llama 3 (232,000 rows)
an = qj("annot_sample_scores.jsonl")
ly = np.array([r["llama"] for r in an]); le = np.array([r["edu"] for r in an])
pi = np.array([Q.int_score(x) for x in le]); yt = np.clip(ly, 0, 5)


def f1b(pred, y):
    tp = int((pred & y).sum()); fp = int((pred & ~y).sum()); fn = int((~pred & y).sum()); tn = int((~pred & ~y).sum())
    p = tp / max(tp + fp, 1); r = tp / max(tp + fn, 1); f = 2 * p * r / max(p + r, 1e-9)
    p0 = tn / max(tn + fn, 1); r0 = tn / max(tn + fp, 1); f0 = 2 * p0 * r0 / max(p0 + r0, 1e-9)
    return {"precision": p, "recall": r, "f1": f, "macro_f1": (f + f0) / 2, "acc": (tp + tn) / len(y)}


from sklearn.metrics import f1_score  # noqa: E402
S["edu_vs_llama"] = {"n": len(an), "binary": f1b(pi >= 3, yt >= 3), "six_class_macro_f1": float(f1_score(yt, pi, average="macro")),
                     "six_class_acc": float((yt == pi).mean()), "spearman": float(spearmanr(le, ly).statistic),
                     "confusion": [[int(((yt == a) & (pi == b)).sum()) for b in range(6)] for a in range(6)]}
# our fastText on the same 1,500 rows
test_rows = np.load(Q.qdir("ft", "test_rows.npy")); test_probs = np.load(Q.qdir("ft", "test_probs.npy"))
pos = {int(r): p for r, p in zip(test_rows, test_probs)}
op = np.array([pos[r["row"]] for r in an])
S["own_vs_llama_1500"] = {"binary": f1b(op >= OWN_T, yt >= 3), "spearman": float(spearmanr(op, ly).statistic)}
S["dclm_vs_llama_1500"] = {"spearman": float(spearmanr([r["dclm"] for r in an], ly).statistic)}
aa = qj("annot_all_dclm.jsonl")
al = np.array([r["llama"] for r in aa]); ad = np.array([r["dclm"] for r in aa])
S["annot_all"] = {"n": len(aa), "spearman_dclm_llama": float(spearmanr(ad, al).statistic),
                  "by_score": [{"llama": s, "n": int((al == s).sum()), "dclm_pass": float((ad[al == s] >= CUT).mean()) if (al == s).any() else None,
                                "dclm_median": float(np.median(ad[al == s])) if (al == s).any() else None} for s in range(6)]}
# DCLM cut on FineWeb and FineWeb-Edu 50k samples (token weighted too)
for nm in ["fineweb_rand50k", "fineweb_edu_rand50k"]:
    rr = qj(f"{nm}_dclm.jsonl"); d = np.array([r["dclm"] for r in rr]); t = np.array([r["tokens"] for r in rr])
    S[nm] = {"n": len(rr), "dclm_pass_docs": float((d >= CUT).mean()), "dclm_pass_tokens": float(t[d >= CUT].sum() / t.sum())}
    if "edu" in nm:
        e = np.array([r["edu"] for r in rr])
        S[nm]["spearman"] = float(spearmanr(e, d).statistic)
        S[nm]["edu_ge35_dclm_pass"] = float((d[e >= 3.5] >= CUT).mean())

# Qwen3 perplexity smoke test (the full run is pending on the GPU queue)
sm = os.path.join(Q.OUT, "q_ppl_smoke.json")
if os.path.exists(sm):
    S["ppl_smoke"] = json.load(open(sm))

# GPU-queue results (run 2026-10-15 on the M1 Pro GPU): Qwen3-0.6B perplexity on run0, FineWeb-Edu classifier on 50k FineWeb rows
qp = Q.qdir("ppl_run0.jsonl")
qppl = None
if os.path.exists(qp):
    qq = {r["id"]: r for r in qj("ppl_run0.jsonl")}
    if len(qq) == len(ids):
        qppl = np.array([qq[i]["ppl"] for i in ids])
        lowq = qppl <= np.quantile(qppl, 0.3); lowc = ppl <= np.quantile(ppl, 0.3)
        S["qwen"] = {"n": len(qq), "median_ppl": float(np.median(qppl)), "spearman_edu": float(spearmanr(-qppl, edu).statistic),
                     "spearman_dclm": float(spearmanr(-qppl, dc).statistic), "spearman_ccnet": float(spearmanr(qppl, ppl).statistic),
                     "low30_jacc_ccnet": float((lowq & lowc).sum() / (lowq | lowc).sum()),
                     "low30_edu_keep": float(ke[lowq].mean()), "high30_edu_keep": float(ke[qppl >= np.quantile(qppl, 0.7)].mean()),
                     "low30_dclm_keep": float(kd[lowq].mean()), "high30_dclm_keep": float(kd[qppl >= np.quantile(qppl, 0.7)].mean())}
        gl = [(r["generated_like"], qppl[ids.index(r["id"])], ppl[ids.index(r["id"])]) for r in labels if r["stratum"] in ("S3", "S4", "S5")]
        S["qwen"]["gen_like_median"] = float(np.median([q for g, q, c in gl if g])); S["qwen"]["gen_like_n"] = sum(g for g, q, c in gl)
        S["qwen"]["other_median"] = float(np.median([q for g, q, c in gl if not g])); S["qwen"]["other_n"] = sum(1 - g for g, q, c in gl)
        S["qwen"]["gen_like_ccnet_median"] = float(np.median([c for g, q, c in gl if g])); S["qwen"]["other_ccnet_median"] = float(np.median([c for g, q, c in gl if not g]))
        S["qwen"]["lowest12"] = [round(float(x), 1) for x in np.sort(qppl)[:12]]
if os.path.exists(Q.qdir("fw50k_edu.jsonl")):
    e5 = np.array([r["edu"] for r in qj("fw50k_edu.jsonl")]); d5 = np.array([r["dclm"] for r in qj("fineweb_rand50k_dclm.jsonl")])
    t5 = np.array([r["tokens"] for r in qj("fw50k_edu.jsonl")])
    assert len(e5) == len(d5) == 50000
    k5e, k5d = e5 >= 2.5, d5 >= CUT
    n10 = 5000; A = set(np.argsort(-e5)[:n10]); B = set(np.argsort(-d5)[:n10])
    S["fw50k"] = {"n": 50000, "keep_edu": float(k5e.mean()), "keep_edu_tokens": float(t5[k5e].sum() / t5.sum()), "keep_dclm": float(k5d.mean()),
                  "jacc_published": float((k5e & k5d).sum() / (k5e | k5d).sum()), "spearman": float(spearmanr(e5, d5).statistic),
                  "top10_jacc": len(A & B) / len(A | B), "both": int((k5e & k5d).sum())}

# CCNet buckets
if cc:
    ok = ~np.isnan(ppl)
    S["ccnet"] = {"n": int(ok.sum()), "head": int((ppl < 340).sum()), "middle": int(((ppl >= 340) & (ppl < 520)).sum()), "tail": int((ppl >= 520).sum()),
                  "median_ppl": float(np.nanmedian(ppl)), "spearman_edu": float(spearmanr(-ppl[ok], edu[ok]).statistic),
                  "spearman_dclm": float(spearmanr(-ppl[ok], dc[ok]).statistic)}
    for b, msk in [("head", ppl < 340), ("tail", ppl >= 520)]:
        S["ccnet"][b + "_edu_keep"] = float(ke[msk].mean()); S["ccnet"][b + "_dclm_keep"] = float(kd[msk].mean())

# hand labels: per stratum and population estimates
sizes = json.load(open(os.path.join(Q.OUT, "q_sample_ids.json")))["stratum_sizes"]
st = {}
for s in sizes:
    rs = [r for r in labels if r["stratum"] == s]
    st[s] = {k: sum(r["keep"] == k for r in rs) for k in "ynu"}; st[s]["no"] = st[s].pop("n"); st[s]["n"] = len(rs); st[s]["N"] = sizes[s]


def est(strata):
    num = sum(sizes[s] * st[s]["y"] / st[s]["n"] for s in strata); den = sum(sizes[s] for s in strata)
    num_n = sum(sizes[s] * st[s]["no"] / st[s]["n"] for s in strata)
    return {"yes_share": num / den, "no_share": num_n / den, "docs": den}


S["labels"] = {"strata": st, "edu_dropped": est(["S1", "S2", "S4"]), "dclm_dropped": est(["S1", "S2", "S3"]), "both_dropped": est(["S1", "S2"]),
               "edu_kept": est(["S3", "S5"]), "dclm_kept": est(["S4", "S5"])}
wrong = [r for r in labels if r["keep"] == "y" and r["stratum"] in ("S1", "S2")]
S["labels"]["both_dropped_yes_formats"] = dict(Counter(r["format"] for r in wrong).most_common())
S["labels"]["gen_like_by_stratum"] = {s: sum(r["generated_like"] for r in labels if r["stratum"] == s) for s in sizes}
S["labels"]["news_by_stratum"] = {s: sum(r["format"] == "news" for r in labels if r["stratum"] == s) for s in sizes}
S["labels"]["dclm_kept_no"] = [r["n"] for r in labels if r["stratum"] in ("S4", "S5") and r["keep"] == "n"]

# --------------------------------------------------------- the page's data
r2 = lambda a, d: [round(float(x), d) for x in a]  # noqa: E731
docs = {"edu": r2(edu, 4), "dclm": [float(f"{x:.5g}") for x in dc], "dclm_dt": [float(f"{x:.5g}") for x in dc0],
        "own": r2(own, 4), "qppl": None if qppl is None else [round(float(x), 1) for x in qppl], "ppl": [None if np.isnan(x) else round(float(x)) for x in ppl], "words": [int(x) for x in words],
        "fwedu": [int(i in fwedu_ids) for i in ids], "lab": [lab_of[i]["n"] if i in lab_of else -1 for i in ids]}


def excerpt(t, n=300):
    t = re.sub(r"\s*\n\s*", " / ", t.strip())
    return t if len(t) <= n else t[:n].rsplit(" ", 1)[0] + " ..."


lab_out = []
for r in labels:
    i = ids.index(r["id"])
    lab_out.append({"n": r["n"], "s": r["stratum"], "k": r["keep"], "f": r["format"], "g": r["generated_like"], "note": r["note"],
                    "i": i, "host": urlparse(run[i]["url"]).hostname, "w": int(words[i]),
                    "x": None if r["n"] in WITHHOLD else excerpt(texts[r["id"]])})
# rounding must not move any document across a cut-off
assert sum(x >= 2.5 for x in docs["edu"]) == S["keep_edu"] and sum(x >= CUT for x in docs["dclm"]) == S["keep_dclm"]
assert sum(x >= OWN_T for x in docs["own"]) == S["keep_own"] and sum(x >= CUT for x in docs["dclm_dt"]) == S["dt_keep"]
D = {"asof": "2026-10-14", "cut": CUT, "own_thr": OWN_T, "docs": docs, "fw": {"edu": r2(fe, 4), "dclm": [float(f"{x:.5g}") for x in fd]},
     "nemo": nemo_out, "labels": lab_out, "S": S, "ft": {k: ftres[k] for k in ("n_train", "n_val", "n_test", "pos_rate_test", "best_cfg", "test", "test_spearman_vs_llama", "curve", "configs", "model_bytes")}}
js = "// generated by src/qual/q_make_data.py on " + D["asof"] + "; do not edit\nwindow.QD=" + json.dumps(D, separators=(",", ":")) + ";\n"
open(os.path.join(Q.HERE, "..", "parts", "33_js_q_0data.js"), "w").write(js)
Q.dump("q_summary.json", S, indent=1)
print(len(js), "bytes of page data")
print(json.dumps({k: v for k, v in S.items() if not isinstance(v, (dict, list))}, indent=0))

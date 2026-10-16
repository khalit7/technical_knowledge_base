"""Assemble everything the page embeds (../data/qc_data.json -> window.QC) and every number its prose quotes
(../data/facts.json, filled into @@key@@ by build.sh), from the recorded runs in $DC_SCRATCH/qc and ../data/out.
A fact whose run has not happened is left out, so build.sh reports it as unfilled.
Privacy: excerpts only from run0 final/ (PII-scrubbed), at most 220 characters, host reduced to its top-level domain,
none for pages about a private individual (format "About (Pers.)" or WITHHOLD). Em dashes in quoted web text are shown
as "[U+2014]" (the knowledge base never prints the character)."""
import json
import os
import re
from collections import Counter, defaultdict

import numpy as np
from scipy.stats import spearmanr

import qc_common as C

SD = C.sdir("scores", "x")[:-1]
EXP = C.sdir("explain", "x")[:-1]
OUTD = os.path.normpath(os.path.join(C.HERE, "..", "data"))
F = {}      # facts for the prose
Q = {}      # data for the page
ROOT = json.load(open(os.path.join(C.ROOT_SRC, "qual", "out", "q_summary.json")))
DASH = {"—": "[U+2014]"}


def nodash(s):
    for k, v in DASH.items():
        s = s.replace(k, v)
    return s


def npy(name, st):
    p = os.path.join(SD, f"{name}__{st}.npy")
    return np.load(p) if os.path.exists(p) else None


def pct(x, d=0):
    return f"{100 * x:.{d}f}%"


def num(x):
    return f"{x:,}"


def rank_desc(v):
    """rank 0 = highest score; ties broken by position"""
    o = np.argsort(-np.asarray(v, dtype=float), kind="stable")
    r = np.empty(len(v), dtype=int)
    r[o] = np.arange(len(v))
    return r


def logit(p):
    p = np.clip(np.asarray(p, dtype=float), 1e-7, 1 - 1e-7)
    return np.log(p / (1 - p))


def auc(score, y):
    from scipy.stats import rankdata
    r = rankdata(score)
    n1 = int(y.sum()); n0 = len(y) - n1
    return float((r[y].sum() - n1 * (n1 + 1) / 2) / (n1 * n0))


# ------------------------------------------------------------------ run0 and labels
docs = C.run0_final()
N = len(docs)
ids = [d["id"] for d in docs]
idx_of = {i: k for k, i in enumerate(ids)}
words = np.array([d["words"] for d in docs])
edu = np.array([d["edu"] for d in docs]); dclm = np.array([d["dclm"] for d in docs])
labs = [json.loads(l) for l in open(os.path.join(C.HERE, "..", "labels", "labels_qc.jsonl"))]
root_labs = [json.loads(l) for l in open(os.path.join(C.ROOT_SRC, "qual", "labels.jsonl"))]
F["n_run0"] = num(N)
yes = Counter(l["keep"] for l in labs)
F["lab_yes"] = str(yes["y"]); F["lab_unsure"] = str(yes["u"]); F["lab_no"] = str(yes["n"])
F["lab_yes_pct"] = pct(yes["y"] / len(labs)); F["lab_no_pct"] = pct(yes["n"] / len(labs))
F["lab_gen"] = str(sum(l["generated_like"] for l in labs))
F["edu_f1_pos"] = pct(ROOT["edu_vs_llama"]["binary"]["f1"]); F["edu_f1_macro"] = pct(ROOT["edu_vs_llama"]["binary"]["macro_f1"])
F["jacc_published"] = pct(ROOT["jacc_published"], 1)
F["keep_edu"] = num(ROOT["keep_edu"]); F["keep_dclm"] = num(ROOT["keep_dclm"])
F["keep_dclm_frac"] = pct(ROOT["keep_dclm_frac"]); F["fw50_dclm"] = pct(ROOT["fineweb_rand50k"]["dclm_pass_docs"])

# ------------------------------------------------------------------ the scorers (higher = keep)
ccnet = {json.loads(l)["id"]: json.loads(l) for l in open(C.Q.qdir("ccnet_run0.jsonl"))}
rw_hold = {}
REG = []  # (key, label, family, run0 scores, published-cut keep share on run0, cut description)


def add(key, label, fam, sc, pub, pub_desc, desc):
    if sc is None:
        print("missing", key)
        return
    REG.append({"key": key, "label": label, "fam": fam, "sc": np.asarray(sc, dtype=float), "pub_keep": pub, "pub_desc": pub_desc, "desc": desc})


add("edu", "FineWeb-Edu (published)", "LLM-graded", edu, float((edu >= 2.5).mean()), "rounded score ≥ 3",
    "HuggingFaceFW/fineweb-edu-classifier: arctic-embed-m encoder plus a regression head trained on Llama-3-70B grades of educational value. Cut: rounded score ≥ 3.")
add("dclm", "DCLM fastText (published)", "reference set", dclm, float((dclm >= C.DCLM_CUT).mean()), "P(hq) ≥ 0.018112",
    "mlfoundations/fasttext-oh-eli5: OpenHermes 2.5 + ELI5 against RefinedWeb, 200k + 200k. Cut 0.018112 = top 10% of DCLM's pool.")
FT_MODELS = [("oh_eli5_200k", "OH-2.5 + ELI5, 200k (rebuilt here)", "DCLM's recipe at DCLM's size: 100k OpenHermes 2.5 + 100k ELI5 answers against 200k RefinedWeb pages, DCLM's hyperparameters."),
             ("oh_eli5_50k", "OH-2.5 + ELI5, 50k (here)", "DCLM's reference set at a quarter of the size: 25k + 25k positives against 50k RefinedWeb pages."),
             ("wiki_50k", "Wikipedia, 50k (here)", "50k English Wikipedia articles (2023-11 dump, section titles removed as DCLM did) against 50k RefinedWeb pages."),
             ("owt2_50k", "OpenWebText, 50k (here)", "50k OpenWebText pages (outbound Reddit links with 3+ karma, the 2019 open WebText) against 50k RefinedWeb pages; stands in for DCLM's OpenWebText2."),
             ("gpt3_50k", "GPT-3 approx, 50k (here)", "Wikipedia + OpenWebText + Project Gutenberg book chunks in thirds against RefinedWeb pages: DCLM's 'GPT-3 Approx' recipe.")]
rwq = {}
for k, lab, d in FT_MODELS:
    s = npy(k, "run0"); h = npy(k, "rw_hold")
    if s is None or h is None:
        print("missing", k); continue
    cut = float(np.quantile(h, 0.9)); rwq[k] = cut
    add(k, lab, "reference set", s, float((s >= cut).mean()), f"top 10% of held-out RefinedWeb (P ≥ {cut:.3g})", d + f" Cut: P(hq) ≥ {cut:.3g}, the top 10% of 18,478 held-out RefinedWeb pages.")
g = npy("gpt3_lr", "run0")
if g is not None:
    add("gpt3_lr", "GPT-3-style logistic regression (here)", "reference set", g, float(np.mean((2 - g) ** -9.0)), "expected keep under the Pareto rule",
        "Spark-style hashed features + logistic regression, Wikipedia + OpenWebText + books against raw English Common Crawl (WET); GPT-3 keeps stochastically with P = (2 - s)^-9, so the 'published cut' is the expected keep share.")
ef = npy("edu_ft", "run0")
if ef is not None:
    add("edu_ft", "fastText on Llama 3 grades (root)", "LLM-graded", ef, float((ef >= ROOT["own_thr"]).mean()), f"P ≥ {ROOT['own_thr']}",
        "The root Quality lab's fastText trained on 187,920 FineWeb-Edu annotation pages (Llama 3 score ≥ 3 as positive). Cut chosen by best F1 on validation.")
for k, lab, d in [("nemo_mixtral", "Nemotron-CC Mixtral grader (NVIDIA)", "nvidia/nemocurator-fineweb-mixtral-edu-classifier: FineWeb-Edu-style regressor trained on Mixtral 8x22B grades."),
                  ("nemo_nemotron", "Nemotron-CC Nemotron-4 grader (NVIDIA)", "nvidia/nemocurator-fineweb-nemotron-4-edu-classifier: the same on Nemotron-4-340B grades.")]:
    s = npy(k, "run0")
    if s is not None:
        add(k, lab, "LLM-graded", s, float((s >= 2.5).mean()), "score ≥ 2.5 (NeMo Curator's high_quality label)", d + " Cut: 2.5, NeMo Curator's high_quality label.")
eb = npy("nemo_ensemble_bucket", "run0")
if eb is not None and npy("nemo_mixtral", "run0") is not None:
    tie = (npy("nemo_mixtral", "run0") + npy("nemo_nemotron", "run0")) / 10 + logit(dclm) / 100
    add("nemo_ens", "Nemotron-CC ensemble (rebuilt)", "LLM-graded", eb + 0.01 * (tie - tie.min()) / (np.ptp(tie) + 1e-9), float((eb >= 18).mean()), "levels high + medium-high",
        "Maximum of three rank buckets (Mixtral grader, Nemotron-4 grader, DCLM fastText), section 5. Ties inside a bucket broken by the mean score. Cut: the top two levels.")
add("ccnet", "CCNet 5-gram perplexity (root)", "perplexity", np.array([-ccnet[i]["ppl"] for i in ids]),
    float(np.mean([ccnet[i]["bucket"] == "head" for i in ids])), "head bucket (below the 30th percentile of CCNet's English perplexity)",
    "cc_net's English Wikipedia 5-gram KenLM model and SentencePiece tokenizer, run by the root's Quality lab. Lower perplexity ranks higher.")
pn = npy("pythia160m_nll", "run0")
if pn is not None:
    add("pythia", "Pythia-160M perplexity (here)", "perplexity", -np.nan_to_num(pn, nan=99), None, "",
        "EleutherAI/pythia-160m (trained on the Pile), mean token loss over the first 512 tokens. Lower perplexity ranks higher; no published cut.")
for k, lab in [("dsir_wiki", "DSIR toward Wikipedia (here)"), ("dsir_oh_eli5", "DSIR toward OH-2.5 + ELI5 (here)"), ("dsir_fwedu", "DSIR toward FineWeb-Edu (here)")]:
    s = npy(k, "run0")
    if s is not None:
        add(k, lab, "importance resampling", s, None, "", "Log importance weight from hashed unigram and bigram counts (10,000 buckets), raw distribution fitted on 50,000 FineWeb rows. Ranked without Gumbel noise here (top-k by weight).")
print("scorers", [r["key"] for r in REG])
F["n_scorers"] = str(len(REG))

# ------------------------------------------------------------------ hand labels on run0 indices
LAB = []
for l in labs:
    LAB.append({"i": idx_of[l["id"]], "keep": l["keep"], "src": "random"})
for l in root_labs:
    if l["id"] in idx_of:
        LAB.append({"i": idx_of[l["id"]], "keep": {"y": "y", "n": "n"}.get(l["keep"], "u"), "src": "strat"})
rand = [x for x in LAB if x["src"] == "random"]
ry = np.array([x["keep"] == "y" for x in rand]); rn = np.array([x["keep"] == "n" for x in rand]); ri = np.array([x["i"] for x in rand])


def hand_at(sc, k=0.10):
    r = rank_desc(sc); kept = r[ri] < round(k * N)
    return {"kept": int(kept.sum()), "prec": float(ry[kept].mean()) if kept.any() else float("nan"),
            "no": float(rn[kept].mean()) if kept.any() else float("nan"), "rec": float(kept[ry].mean())}


# ------------------------------------------------------------------ annotation set (232k Llama grades)
import qc_score_ft as SF  # noqa: E402
annot_llama = np.array([json.loads(l)["llama"] for l in open(C.Q.qdir("annot_all_dclm.jsonl"))])
AIDX = SF.annot_idx(len(annot_llama))
ay = annot_llama[AIDX] >= 3
RATES = [0.01, 0.02, 0.05, 0.08, 0.1, 0.15, 0.2, 0.3, 0.4, 0.5, 0.6]


def annot_curve(s):
    o = np.argsort(-s, kind="stable")
    cy = np.cumsum(ay[o])
    pr, rc = [], []
    for r in RATES:
        k = int(round(r * len(s)))
        pr.append(float(cy[k - 1] / k)); rc.append(float(cy[k - 1] / ay.sum()))
    return {"rates": RATES, "prec": pr, "rec": rc, "auc": auc(s, ay), "base": float(ay.mean())}


ANNOT = {}
for k in ["dclm", "oh_eli5_200k", "oh_eli5_50k", "wiki_50k", "owt2_50k", "gpt3_50k", "gpt3_lr", "edu_ft"]:
    a = npy(k, "annot")
    if a is not None and len(a) == len(annot_llama):  # DCLM was scored on all 232,000 before the subsample was introduced
        a = a[AIDX]
    if a is not None and len(a) == len(ay):
        ANNOT[k] = annot_curve(a)
# FineWeb-Edu classifier: only the root's 1,500-row sample (encoder on 232k = GPU)
ss = [json.loads(l) for l in open(C.Q.qdir("annot_sample_scores.jsonl"))]
s_e = np.array([x["edu"] for x in ss]); s_y = np.array([x["llama"] >= 3 for x in ss])
ANNOT_EDU_AUC = auc(s_e, s_y)
F["edu_auc_1500"] = f"{ANNOT_EDU_AUC:.3f}"

# ------------------------------------------------------------------ threshold explorer data
TH = {"n": N, "words": [int(w) for w in words], "lab": LAB, "models": [], "rank": {}}
for r in REG:
    m = {"key": r["key"], "label": r["label"], "pub_keep": r["pub_keep"], "pub_desc": r["pub_desc"],
         "desc": r["desc"]}
    if r["key"] in ANNOT:
        m["annot"] = ANNOT[r["key"]]
    elif r["key"] == "edu":
        m["why_no_annot"] = "encoder: only the root's 1,500-row sample, AUC " + f"{ANNOT_EDU_AUC:.3f}" + "; all 232,000 rows is a GPU job"
    TH["models"].append(m)
    TH["rank"][r["key"]] = [int(x) for x in rank_desc(r["sc"])]
Q["th"] = TH

# ------------------------------------------------------------------ agreement (Jaccard of top 10% of run0) and reference table
K10 = round(0.10 * N)
top = {r["key"]: set(np.argsort(-r["sc"], kind="stable")[:K10]) for r in REG}


def jac(a, b):
    return len(top[a] & top[b]) / len(top[a] | top[b])


REFKEYS = [k for k in ["dclm", "oh_eli5_200k", "oh_eli5_50k", "wiki_50k", "owt2_50k", "gpt3_50k", "gpt3_lr"] if k in top]
ref_rows = []
for k in REFKEYS:
    r = next(x for x in REG if x["key"] == k)
    h = hand_at(r["sc"])
    ref_rows.append({"key": k, "label": r["label"], "pub_keep": r["pub_keep"], "j_dclm": jac(k, "dclm"), "j_edu": jac(k, "edu"),
                     "hand_prec": h["prec"], "hand_no": h["no"], "hand_kept": h["kept"], "annot_auc": ANNOT.get(k, {}).get("auc"),
                     "sp_dclm": float(spearmanr(r["sc"], dclm).statistic)})
Q["reftab"] = ref_rows
Q["jacc"] = {"keys": [r["key"] for r in REG], "labels": [r["label"] for r in REG],
             "m": [[round(jac(a["key"], b["key"]), 3) for b in REG] for a in REG]}
if "oh_eli5_200k" in top:
    s200 = next(x for x in REG if x["key"] == "oh_eli5_200k")["sc"]
    F["sp_full_pub"] = f"{spearmanr(s200, dclm).statistic:.2f}"; F["j_full_pub"] = pct(jac("oh_eli5_200k", "dclm"))
small = [k for k in ["oh_eli5_50k", "wiki_50k", "owt2_50k", "gpt3_50k"] if k in top]
if len(small) >= 2:
    js = [jac(a, b) for i, a in enumerate(small) for b in small[i + 1:]]
    F["ref_jacc_range"] = f"{pct(min(js))} to {pct(max(js))}"
hp = {r["key"]: r for r in ref_rows}
if all(k in hp for k in ["oh_eli5_50k", "wiki_50k", "owt2_50k", "gpt3_50k", "dclm", "oh_eli5_200k"]):
    F["hp_oh"] = f"{pct(min(hp[k]['hand_prec'] for k in ['dclm', 'oh_eli5_200k', 'oh_eli5_50k']))} to {pct(max(hp[k]['hand_prec'] for k in ['dclm', 'oh_eli5_200k', 'oh_eli5_50k']))}"
    F["hp_other"] = f"{pct(min(hp[k]['hand_prec'] for k in ['wiki_50k', 'owt2_50k', 'gpt3_50k']))} to {pct(max(hp[k]['hand_prec'] for k in ['wiki_50k', 'owt2_50k', 'gpt3_50k']))}"
    F["auc_oh"] = f"{min(hp[k]['annot_auc'] for k in ['dclm', 'oh_eli5_200k', 'oh_eli5_50k']):.2f} to {max(hp[k]['annot_auc'] for k in ['dclm', 'oh_eli5_200k', 'oh_eli5_50k']):.2f}"
    F["auc_other"] = f"{min(hp[k]['annot_auc'] for k in ['wiki_50k', 'owt2_50k', 'gpt3_50k']):.2f} to {max(hp[k]['annot_auc'] for k in ['wiki_50k', 'owt2_50k', 'gpt3_50k']):.2f}"
    F["hk_min"] = str(min(hp[k]["hand_kept"] for k in hp)); F["hk_max"] = str(max(hp[k]["hand_kept"] for k in hp))
if "gpt3_lr" in top:
    F["gpt3_median"] = f"{np.median(next(x for x in REG if x['key'] == 'gpt3_lr')['sc']):.2f}"
pa, pb = npy("oh_eli5_50k_dclmparams", "run0"), npy("oh_eli5_50k", "run0")
if pa is not None and pb is not None:
    F["param_sp"] = f"{spearmanr(pa, pb).statistic:.3f}"
    ta, tb = set(np.argsort(-pa)[:K10]), set(np.argsort(-pb)[:K10])
    F["param_j"] = pct(len(ta & tb) / len(ta | tb))
tr = json.load(open(os.path.join(C.OUT, "train_ref.json"))) if os.path.exists(os.path.join(C.OUT, "train_ref.json")) else {}
sm = [v["train_secs_rough"] for k, v in tr.items() if k.endswith("_50k")]
if sm:
    F["train_small_secs"] = f"{min(sm):.0f} to {max(sm):.0f}"
if "oh_eli5_200k" in tr:
    F["train_full_secs"] = f"{tr['oh_eli5_200k']['train_secs_rough']:.0f}"

# ------------------------------------------------------------------ format edits (perturb.json) and dialect (dialect.json)
PT = C.load_out("perturb.json")
for k, nm in [("quotes", "quotes"), ("dashes", "dashes"), ("typography", "typo"), ("lowercase", "lower"), ("bullets", "bul")]:
    d = PT["dclm"][k]
    F[f"pt_{nm}_n"] = num(d["docs_changed"]); F[f"pt_{nm}_kb"] = num(d["keep_before"]); F[f"pt_{nm}_ka"] = num(d["keep_after"])
    F[f"pt_{nm}_in"] = num(d["drop_to_keep"]); F[f"pt_{nm}_out"] = num(d["keep_to_drop"])
F["pt_quotes_rise"] = pct(PT["dclm"]["quotes"]["keep_after"] / PT["dclm"]["quotes"]["keep_before"] - 1)
E = PT["edu"]
F["perturb_n_edu"] = num(E["n"]); F["edu_lower_maxabs"] = f"{E['lowercase']['max_abs']:.1e}"
F["edu_typo_maxabs"] = f"{E['typography']['max_abs']:.2f}"; F["edu_bullets_up"] = pct(E["bullets"]["share_up"])
F["edu_bullets_flips"] = num(E["bullets"]["flips"])
DI = C.load_out("dialect.json")
for t in ["com", "us", "uk", "au", "nz", "ie", "ca", "in"]:
    F[f"tld_{t}"] = pct(DI["by_tld"][t]["dclm_pass"])
F["spell_pairs"] = str(DI["pairs"])
dd = DI["models"]["dclm"]
F["sp_uk2us_n"] = num(dd["uk2us"]["n"]); F["sp_uk2us_up"] = pct(dd["uk2us"]["share_up"]); F["sp_uk2us_in"] = num(dd["uk2us"]["drop_to_keep"])
F["sp_us2uk_out"] = num(dd["us2uk"]["keep_to_drop"]); F["sp_us2uk_n"] = num(dd["us2uk"]["n"])
de = DI["models"]["edu"]
F["edu_spell_maxabs"] = f"{max(abs(de['uk2us']['mean_delta']), abs(de['us2uk']['mean_delta'])):.3f} points of a 0 to 5 score"
EDITS = []
for k, lab in [("quotes", "curly quotes → straight"), ("dashes", "en/em dashes → hyphens"), ("typography", "all typographic punctuation → ASCII"),
               ("lowercase", "lowercase"), ("bullets", "every line a bullet")]:
    d = PT["dclm"][k]
    EDITS.append({"set": "run0, 2,617", "edit": lab, "model": "DCLM fastText", "delta": f"{d['mean_dlogit_changed']:+.2f} logit", "up": d["share_up_changed"],
                  "kb": d["keep_before"], "inn": d["drop_to_keep"], "out": d["keep_to_drop"]})
for k, lab in [("typography", "all typographic punctuation → ASCII"), ("lowercase", "lowercase"), ("bullets", "every line a bullet")]:
    d = E[k]
    EDITS.append({"set": f"run0, {E['n']} (seed 0)", "edit": lab, "model": "FineWeb-Edu", "delta": f"{d['mean_delta']:+.3f} score", "up": d["share_up"],
                  "kb": d["keep_before"], "inn": max(0, d["keep_after"] - d["keep_before"]) if d["flips"] else 0, "out": 0 if d["keep_after"] >= d["keep_before"] else d["flips"]})
for mk, ml in [("dclm", "DCLM fastText"), ("edu", "FineWeb-Edu")]:
    for dk, dl, sl in [("uk2us", "British → American spelling", ".uk .au .nz .ie"), ("us2uk", "American → British spelling", ".com .us")]:
        d = DI["models"][mk][dk]
        EDITS.append({"set": f"FineWeb {sl}, {d['n']:,}", "edit": dl, "model": ml, "delta": f"{d['mean_delta']:+.3f} " + ("logit" if mk == "dclm" else "score"),
                      "up": d["share_up"], "kb": d["keep_before"], "inn": d["drop_to_keep"], "out": d["keep_to_drop"]})

# ------------------------------------------------------------------ vocabulary of DCLM's classifier
V = C.load_out("vocab_dclm.json")
F["dclm_nwords"] = num(V["nwords"]); F["dclm_common_words"] = num(V["n_common_words"])
Q["vtop"] = [[nodash(w), round(s)] for w, s, f in V["top_words"][:24]]
Q["vbot"] = [[nodash(w), round(s)] for w, s, f in V["bottom_words"][:24]]

# ------------------------------------------------------------------ token-level explanations (Reading animation + replay tab)
want = json.load(open(os.path.join(C.HERE, "..", "labels", "explain_docs.json")))
texts = {d["id"]: d["text"] for d in docs}
EXM = [("dclm", "DCLM (OH-2.5 + ELI5, published)"), ("oh_eli5_200k", "OH-2.5 + ELI5 (rebuilt, 200k)"), ("wiki_50k", "Wikipedia (50k)"),
       ("owt2_50k", "OpenWebText (50k)"), ("gpt3_50k", "GPT-3 approx (50k)"), ("oh_eli5_50k", "OH-2.5 + ELI5 (50k)")]
EXM = [(k, l) for k, l in EXM if os.path.exists(os.path.join(EXP, k + ".json"))]
ex = {}
for k, _ in EXM:
    e = json.load(open(os.path.join(EXP, k + ".json")))
    for w in want:
        x = e[w["id"]]
        x["toks"] = [nodash(t) for t in x["toks"]]
        ex.setdefault(w["n"], {})[k] = x
Q["ex"] = {str(n): v for n, v in ex.items()}
allp = [abs(u) for v in ex.values() for x in v.values() for u in x["uni"] if u is not None]
Q["ex_scale"] = float(np.quantile(allp, 0.9)) if allp else 100.0
cutlog = {"dclm": float(logit(C.DCLM_CUT))}
for k in rwq:
    cutlog[k] = float(logit(rwq[k]))


def excerpt(t, n=420):
    t = nodash(" ".join(t.split()))
    return t[:n] + (" ..." if len(t) > n else "")


A1D = [w for w in want if w["n"] in (96, 73, 3)]
Q["a1"] = {"docs": [{"key": str(w["n"]), "label": w["label"].split(":")[0], "text": excerpt(texts[w["id"]], 600)} for w in A1D],
           "models": [{"key": k, "label": l, "cut": float(C.DCLM_CUT if k == "dclm" else rwq.get(k, 0.5))} for k, l in EXM if k in ("dclm", "wiki_50k", "gpt3_50k")],
           "ex": {str(w["n"]): {k: ex[w["n"]][k] for k, _ in EXM if k in ("dclm", "wiki_50k", "gpt3_50k")} for w in A1D}, "scale": Q["ex_scale"]}
F["ft_rebuild_maxdiff"] = f"{max(abs(x['p'] - x['p_fasttext']) for v in ex.values() for x in v.values()):.1e}"


def refs(name, n=1, seed=0):
    lines = []
    with open(C.sdir("ref", name + ".txt")) as f:
        for i, line in enumerate(f):
            if i >= 2000:
                break
            lines.append(line)
    rng = np.random.default_rng(seed)
    return [excerpt(lines[i], 260) for i in rng.choice(len(lines), n, replace=False)]


REFS = {"dclm": refs("oh", 2) + refs("eli5", 1), "oh_eli5_200k": refs("oh", 2, 1) + refs("eli5", 1, 1), "oh_eli5_50k": refs("oh", 1, 2) + refs("eli5", 2, 2),
        "wiki_50k": refs("wiki", 3), "owt2_50k": refs("owt2", 3), "gpt3_50k": refs("wiki", 1, 3) + refs("owt2", 1, 3) + refs("books", 1, 3)}
TRM = []
for k, l in EXM:
    vf = os.path.join(C.OUT, f"vocab_{k}.json")
    if not os.path.exists(vf):
        continue
    v = json.load(open(vf))
    sc = next(x for x in REG if x["key"] == k)["sc"]
    TRM.append({"key": k, "label": l, "desc": next(x for x in REG if x["key"] == k)["desc"], "refs": REFS.get(k, []),
                "top": [[nodash(w), round(s)] for w, s, f in v["top_words"][:20]], "bot": [[nodash(w), round(s)] for w, s, f in v["bottom_words"][:20]],
                "cut_logit": cutlog[k]})
    Q.setdefault("tr_logits", {})[k] = [round(float(x), 2) for x in logit(sc)]
Q["tr"] = {"models": TRM, "logits": Q.pop("tr_logits", {}),
           "docs": [{"key": str(w["n"]), "label": w["label"], "i": idx_of[w["id"]], "lab": {"y": "worth training on", "u": "unsure", "n": "not worth it"}[w["keep"]], "labnote": w["note"]} for w in want]}

# ------------------------------------------------------------------ perplexity, DSIR, Nemotron, costs
def sc_of(k):
    r = next((x for x in REG if x["key"] == k), None)
    return None if r is None else r["sc"]


if sc_of("pythia") is not None:
    nll = npy("pythia160m_nll", "run0")
    F["ppl_median"] = f"{np.exp(np.nanmedian(nll)):.1f}"
    F["sp_ppl_ccnet"] = f"{spearmanr(sc_of('pythia'), sc_of('ccnet')).statistic:.2f}"
    F["sp_ppl_edu"] = f"{spearmanr(sc_of('pythia'), edu).statistic:.2f}"; F["sp_ppl_dclm"] = f"{spearmanr(sc_of('pythia'), dclm).statistic:.2f}"
    r = rank_desc(sc_of("pythia"))
    low = r[ri] < round(0.1 * N); mid = (r[ri] >= round(0.45 * N)) & (r[ri] < round(0.55 * N))
    F["ppl_low_hand_no"] = f"{int(rn[low].sum())} of {int(low.sum())}"; F["ppl_mid_hand_no"] = f"{int(rn[mid].sum())} of {int(mid.sum())}"
QW = C.sdir("qwen17_fw2k.jsonl")
if os.path.exists(QW):
    qw = [json.loads(l) for l in open(QW)]
    if len(qw) == 2000:
        qn = np.array([r["nll"] for r in qw]); qp = np.exp(qn)
        fs = [json.loads(l) for l in open(C.Q.qdir("fw_sample_scores.jsonl"))]
        fe = np.array([r["edu"] for r in fs]); fd = np.array([r["dclm"] for r in fs])
        F["qwen17_median"] = f"{np.median(qp):.1f}"
        F["sp_qwen17_edu"] = f"{spearmanr(-qn, fe).statistic:.2f}"; F["sp_qwen17_dclm"] = f"{spearmanr(-qn, fd).statistic:.2f}"
        nm = npy("nemo_mixtral", "fw2k")
        if nm is not None:
            F["sp_qwen17_mix"] = f"{spearmanr(-qn, nm).statistic:.2f}"
        lo, hi = qp <= np.quantile(qp, 0.3), qp >= np.quantile(qp, 0.7)
        F["qwen17_low30_edu"] = pct((fe[lo] >= 2.5).mean()); F["qwen17_high30_edu"] = pct((fe[hi] >= 2.5).mean())
        F["qwen17_low30_dclm"] = pct((fd[lo] >= C.DCLM_CUT).mean()); F["qwen17_high30_dclm"] = pct((fd[hi] >= C.DCLM_CUT).mean())
        o = np.argsort(qp)[:12]
        F["qwen17_low12"] = f"{qp[o[0]]:.1f} to {qp[o[-1]]:.1f}"
        Q["qwen17_hist"] = np.histogram(np.log10(qp), bins=30, range=(0, 3))[0].tolist()
QR = C.Q.qdir("ppl_run0.jsonl")
if os.path.exists(QR) and sc_of("pythia") is not None:
    q6 = {json.loads(l)["id"]: json.loads(l)["nll"] for l in open(QR)}
    if len(q6) == N:
        F["sp_pythia_qwen06"] = f"{spearmanr(sc_of('pythia'), [-q6[i] for i in ids]).statistic:.2f}"
if os.path.exists(os.path.join(C.OUT, "dsir.json")):
    DS = C.load_out("dsir.json")
    T = DS["targets"]
    F["dsir_len_sp"] = f"{T['wiki']['spearman_logw_length']:.2f}"; F["dsir_len_sp_oh"] = f"{T['oh_eli5']['spearman_logw_length']:.2f}"
    F["dsir_len_sp_edu"] = f"{T['fwedu']['spearman_logw_length']:.2f}"
    F["dsir_sel_len_wiki"] = num(int(T["wiki"]["selected_median_tokens"])); F["dsir_sel_len_oh"] = num(int(T["oh_eli5"]["selected_median_tokens"]))
    F["dsir_sel_len_edu"] = num(int(T["fwedu"]["selected_median_tokens"])); F["dsir_pool_len"] = num(int(T["wiki"]["pool_median_tokens"]))
    F["dsir_pertok_sp"] = f"{T['wiki']['spearman_logw_per_token_length']:.2f}"
    sel = np.load(os.path.join(SD, "dsir_oh_eli5__fw50k_sel.npy"))
    ft = npy("oh_eli5_50k", "fw50k")
    if ft is not None:
        topft = set(np.argsort(-ft)[:len(sel)]); s2 = set(sel.tolist())
        F["dsir_vs_ft_jacc"] = pct(len(s2 & topft) / len(s2 | topft))
    Q["dsir"] = DS
if os.path.exists(os.path.join(C.OUT, "nemotron.json")):
    NM = C.load_out("nemotron.json")
    v = NM["variants"]
    F["nemo_exact"] = pct(v["ensemble"]["exact"]); F["nemo_within1"] = pct(v["ensemble"]["within_one"])
    singles = [v[k]["exact"] for k in ["mixtral", "nemotron", "dclm"]]
    F["nemo_single_range"] = f"{pct(min(singles))} to {pct(max(singles))}"
    am = NM["ensemble_argmax_share"]
    F["nemo_argmax"] = ", ".join(f"{ {'mixtral': 'the Mixtral grader', 'nemotron': 'the Nemotron-4 grader', 'dclm': 'DCLM'}[k]} for {pct(x)}" for k, x in sorted(am.items(), key=lambda z: -z[1])) + " of documents"
    F["sp_mix_nem"] = f"{NM['spearman_run0']['mixtral_nemotron']:.2f}"; F["sp_mix_dclm"] = f"{NM['spearman_run0']['mixtral_dclm']:.2f}"
    rl = NM["run0_levels"]
    F["run0_nemo_high"] = num(rl["high"]); F["run0_nemo_hq"] = num(rl["high"] + rl["medium-high"])
    Q["nemo"] = {"levels": ["high", "medium-high", "medium", "medium-low", "low"], "conf": v["ensemble"]["confusion_true_rows_pred_cols"],
                 "single": {k: v[k]["exact"] for k in v}}
chk = json.load(open(os.path.join(C.ROOT_SRC, "qual", "out", "q_check_models.json")))
F["cost_ft_ms"] = f"{chk['dclm_secs_per_1000_rough']:.1f}"
F["cost_enc_s"] = f"{chk['edu_secs_per_doc_rough']:.2f}"
F["cpu_hours_ft"] = num(int(round(15e9 * chk["dclm_secs_per_1000_rough"] / 1000 / 3600, -3)))
F["cost_ppl_s"] = "0.3"  # replaced below when the Pythia log has a timing
lg = os.path.join(C.L.scratch(), "qc", "logs", "chain2.log")
if os.path.exists(lg):
    m = re.search(r"run0 2617 ([0-9.]+) s/doc", open(lg).read())
    if m:
        F["cost_ppl_s"] = m.group(1)
hold = npy("dclm", "rw_hold")
if hold is not None:
    F["dclm_rw_p90"] = f"{np.quantile(hold, 0.9):.3f}"; F["dclm_rw_keep"] = pct((hold >= C.DCLM_CUT).mean(), 1); F["rw_hold_n"] = num(len(hold))
g = sc_of("gpt3_lr")
if g is not None:
    Q["gpt3_hist"] = {"counts": np.histogram(g, bins=20, range=(0, 1))[0].tolist()}
rng = np.random.default_rng(0)
sim = [(rng.pareto(9, 200000) > 1 - s).mean() for s in (0.0, 0.5)]
F["pareto_sim"] = f"200,000 draws: {pct(sim[0], 2)} kept at s = 0, {pct(sim[1], 1)} at s = 0.5"
F["code_out"] = f"{dclm[idx_of[want[0]['id']]]:.4f} {bool(dclm[idx_of[want[0]['id']]] >= C.DCLM_CUT)}   # run0's Reuters gas-rationing story"

# ------------------------------------------------------------------ bias browser
WO_T = ['Adult', 'Art & Design', 'Software Dev.', 'Crime & Law', 'Education & Jobs', 'Hardware', 'Entertainment', 'Social Life', 'Fashion & Beauty',
        'Finance & Business', 'Food & Dining', 'Games', 'Health', 'History', 'Home & Hobbies', 'Industrial', 'Literature', 'Politics', 'Religion',
        'Science & Tech.', 'Software', 'Sports & Fitness', 'Transportation', 'Travel']
WO_F = ['Academic Writing', 'Content Listing', 'Creative Writing', 'Customer Support', 'Comment Section', 'FAQ', 'Truncated', 'Knowledge Article',
        'Legal Notices', 'Listicle', 'News Article', 'Nonfiction Writing', 'About (Org.)', 'News (Org.)', 'About (Pers.)', 'Personal Blog', 'Product Page',
        'Q&A Forum', 'Spam / Ads', 'Structured Data', 'Documentation', 'Audio Transcript', 'Tutorial', 'User Review']
BCOLS = [(k, l) for k, l in [("edu", "FineWeb-Edu"), ("dclm", "DCLM"), ("oh_eli5_200k", "OH+ELI5 rebuilt"), ("wiki_50k", "Wikipedia ref."),
                             ("gpt3_lr", "GPT-3 style"), ("nemo_ens", "Nemotron ens. (top 2)"), ("ccnet", "CCNet head")] if sc_of(k) is not None]
KEPT = {}
for k, _ in BCOLS:
    r = next(x for x in REG if x["key"] == k)
    KEPT[k] = rank_desc(r["sc"]) < round(r["pub_keep"] * N)
lab_by_i = {idx_of[l["id"]]: l for l in labs}
WITHHOLD_FMT = {"About (Pers.)"}
WITHHOLD_N = {49, 101, 136, 158, 175}  # pages centred on a private person (biography, family, personal story)
NAMEY = re.compile(r"\b(Mr|Mrs|Ms|Miss|Dr)\.?\s+[A-Z]")
BI = {"cols": [{"key": k, "label": l} for k, l in BCOLS], "docs": {}}
for i, l in lab_by_i.items():
    t = texts[ids[i]]
    x = "" if (l["format"] in WITHHOLD_FMT or l["n"] in WITHHOLD_N or NAMEY.search(t[:300])) else excerpt(t, 220)
    BI["docs"][str(i)] = {"tld": C.host(docs[i]["url"]).rsplit(".", 1)[-1], "keep": {"y": "worth training on", "u": "unsure", "n": "not worth it"}[l["keep"]],
                          "topic": l["topic"], "format": l["format"], "note": l["note"], "x": x, "v": {k: bool(KEPT[k][i]) for k, _ in BCOLS}}
for dim, names, f in [("topic", WO_T, "wo_topic"), ("format", WO_F, "wo_format")]:
    P = npy(f, "run0")
    if P is None:
        print("missing", f); continue
    am = P.argmax(1)
    rows = []
    for j, nm in enumerate(names):
        m = am == j
        if m.sum() < 15:
            continue
        rows.append({"name": nm, "n": int(m.sum()), "keep": {k: float(KEPT[k][m].mean()) for k, _ in BCOLS},
                     "docs": [str(i) for i in lab_by_i if am[i] == j]})
    rows.sort(key=lambda r: -r["n"])
    BI[dim] = {"n": N, "rows": rows, "overall": {k: float(KEPT[k].mean()) for k, _ in BCOLS},
               "note": f"WebOrganizer's {dim} classifier (argmax of 24 classes, first 512 tokens, URL included), categories with at least 15 of run0's documents. Each column keeps at its own published cut, so columns keep different shares; 'lift' divides by the column's overall rate. Cells with few documents are noisy (a category of 20 has a binomial standard error of about 10 points)."}
    # agreement of WebOrganizer with the hand labels
    hl = [(am[i], l[dim]) for i, l in lab_by_i.items()]
    norm = lambda s: "Software" if s in ("Software", "Software Dev.") else s  # noqa: E731
    agree = np.mean([norm(names[a]) == norm(h) for a, h in hl])
    F[f"wo_{dim}_agree"] = pct(agree)
    Q[f"wo_{dim}_counts"] = {nm: int((am == j).sum()) for j, nm in enumerate(names)}
# country domains on 50,000 FineWeb rows
fwu = C.L.curated("fineweb_rand50k", columns=["url"]).url.map(lambda u: C.host(u).rsplit(".", 1)[-1]).values
dfw = np.array([json.loads(l)["dclm"] for l in open(C.Q.qdir("fineweb_rand50k_dclm.jsonl"))])
tcols = {"dclm": dfw >= C.DCLM_CUT}
FWE = C.Q.qdir("fw50k_edu.jsonl")  # the root Quality lab's GPU run (2026-10-15): FineWeb-Edu classifier on the same 50,000 rows
if os.path.exists(FWE):
    fids = C.L.curated("fineweb_rand50k", columns=["id"]).id.tolist()
    ev = {json.loads(l)["id"]: json.loads(l)["edu"] for l in open(FWE)}
    if all(i in ev for i in fids[:100]):
        tcols["edu"] = np.array([ev.get(i, -1) for i in fids]) >= 2.5
        F["fw50_edu"] = pct(tcols["edu"].mean(), 1)
        for t in ["com", "us", "uk", "au", "nz", "in"]:
            F[f"tld_edu_{t}"] = pct(tcols["edu"][fwu == t].mean(), 1)
for k in ["oh_eli5_200k", "wiki_50k", "gpt3_lr"]:
    a = npy(k, "fw50k")
    if a is not None:
        cut = rwq.get(k)
        tcols[k] = (a >= cut) if cut is not None else (rng.random(len(a)) < (2 - a) ** -9.0)
rows = []
for t in ["com", "org", "net", "uk", "au", "ca", "in", "edu", "za", "de", "nz", "info", "gov", "ie", "io", "us", "ng", "pk", "sg"]:
    m = fwu == t
    rows.append({"name": "." + t, "n": int(m.sum()), "keep": {k: float(v[m].mean()) for k, v in tcols.items()}})
BI["tld"] = {"n": len(fwu), "rows": rows, "overall": {k: float(v.mean()) for k, v in tcols.items()},
             "note": "50,000 random FineWeb rows of CC-MAIN-2024-30 (already filtered by FineWeb's heuristics). DCLM at its published cut; classifiers trained here at the top-10%-of-RefinedWeb cut; GPT-3 style by its random Pareto rule (seed 0). A domain is a weak proxy for a country and a dialect: .com mixes everything."}
BI["edits"] = EDITS
for dim in ("topic", "format"):
    if dim not in BI:
        continue
    for k in ("edu", "dclm"):
        o = BI[dim]["overall"][k]
        rr = [r for r in BI[dim]["rows"] if r["n"] >= 30]
        rr.sort(key=lambda r: -r["keep"][k])
        F[f"bias_{dim}_{k}_up"] = "; ".join(f"{r['name']} {pct(r['keep'][k])}" for r in rr[:3])
        F[f"bias_{dim}_{k}_down"] = "; ".join(f"{r['name']} {pct(r['keep'][k])}" for r in rr[::-1][:3])
        F[f"bias_{dim}_{k}_all"] = pct(o)
    F[f"bias_{dim}_min30"] = str(sum(r["n"] >= 30 for r in BI[dim]["rows"]))
PR = os.path.join(C.OUT, "pairs_scores.json")
if os.path.exists(PR):
    BI["pairs"] = json.load(open(PR))
    rows = BI["pairs"]["rows"]
    F["pairs_n"] = str(sum(r["n"] for r in rows)); F["pairs_kinds"] = str(len(rows))
    F["pairs_table"] = "; ".join(f"{r['kind']} ({r['n']} pages): FineWeb-Edu {r['edu_b']:.2f} to {r['edu_a']:.2f}, higher for {pct(r['edu_up'])}; DCLM higher for {pct(r['dc_up'])}" for r in rows)
    allw = sum(r["n"] for r in rows)
    F["pairs_edu_up"] = pct(sum(r["edu_up"] * r["n"] for r in rows) / allw); F["pairs_dc_up"] = pct(sum(r["dc_up"] * r["n"] for r in rows) / allw)
Q["bi"] = BI

# ------------------------------------------------------------------ predict-then-reveal answers, published bars, calculator defaults
tw = {w: s for w, s, f in V["top_words"]}
Q["pr"] = {
    "qc-pr1": {"right": 2, "html": f"Three backticks, the Markdown code fence: push +{tw['```']:.0f}, the largest of {V['n_common_words']:,} common words. Next come \"Why\" (+{tw['Why']:.0f}) and \"Answer:\" (+{tw['Answer:']:.0f}). OpenHermes conversations are full of code blocks and question-answer framing; that, not encyclopaedic vocabulary, is what this reference set rewards. All four lists are in the <a href='#' data-tab='t-qctr'>Classifier replay</a> tab."},
    "qc-pr2": {"right": 1, "html": f"{F['fw50_dclm']} of documents and {pct(ROOT['fineweb_rand50k']['dclm_pass_tokens'])} of tokens (the root's Quality lab): FineWeb's own filters already removed much of what DCLM's classifier dislikes, so its fixed cut keeps more. On real RefinedWeb pages the same cut keeps {F.get('dclm_rw_keep', 'about 15%')}."},
    "qc-pr3": {"right": 3, "html": f"{F['pt_quotes_in']} documents, a {F['pt_quotes_rise']} rise in DCLM's keep set, and none leave it. Curly quotes push toward \"crawl\" because the positives (chat-model output, Reddit posts) are typed with straight quotes."},
}
Q["t5"] = [{"name": "OH-2.5 + ELI5, top 10%", "core": 41.0, "mmlu": 29.2}, {"name": "Wikipedia, top 10%", "core": 35.7, "mmlu": 27.0},
           {"name": "OpenWebText2, top 10%", "core": 34.7, "mmlu": 25.0}, {"name": "GPT-3 Approx, top 10%", "core": 37.5, "mmlu": 24.4},
           {"name": "OH-2.5 + ELI5, top 15%", "core": 39.8, "mmlu": 27.2}, {"name": "OH-2.5 + ELI5, top 20%", "core": 38.7, "mmlu": 24.2}]
Q["rep"] = {"pool_T": 15.0, "rstar": 15.387756}

# ------------------------------------------------------------------ write
def clean(o):
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [clean(v) for v in o]
    if isinstance(o, (np.floating, float)):
        return None if not np.isfinite(o) else round(float(o), 5)
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, np.bool_):
        return bool(o)
    return o


Q = clean(Q)
os.makedirs(OUTD, exist_ok=True)
with open(os.path.join(OUTD, "qc_data.json"), "w") as f:
    json.dump(Q, f, ensure_ascii=False, separators=(",", ":"), allow_nan=False, default=lambda o: None)
with open(os.path.join(OUTD, "facts.json"), "w") as f:
    json.dump(F, f, ensure_ascii=False, indent=0)
print("qc_data.json", os.path.getsize(os.path.join(OUTD, "qc_data.json")), "facts", len(F))

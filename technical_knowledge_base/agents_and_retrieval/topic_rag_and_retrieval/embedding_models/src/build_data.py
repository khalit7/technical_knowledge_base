"""Turn src/data/*.json into parts/22_emb_data.js (what the page's JavaScript reads) and facts.json (every number
written in the prose as @@key@@, filled in by build.sh), so prose and data cannot disagree.
A result whose GPU run has not been made yet is written as a visible "pending run" marker, never guessed; the list of
pending keys is printed and stored in facts.json under _pending.
Also reads a committed output of the parent page: ../../src/vec/out/models.json (cost records of the setup's models).
(The parent's contrastive.json fed the "who gets pushed" widget, removed 2026-10-19: the Contrastive and
self-supervised learning page owns InfoNCE's gradient split; check_data.py still checks its batch-size sweep.)
usage: python3 build_data.py"""
import json
import os

H = os.path.dirname(os.path.abspath(__file__))
DEV = os.environ.get("EMB_DEV")  # path to a development lab file (from e_lab.py --smoke), never committed


DD = os.environ.get("EMB_DATA_DIR") or os.path.join(H, "data")


def D(n):
    p = os.path.join(DD, n)
    return json.load(open(p)) if os.path.exists(p) else None


def R(n):
    return json.load(open(os.path.join(H, "..", "..", "src", "vec", "out", n)))


F, PEND = {}, []
PM = '<span class="emb-pend">pending run</span>'


def pend(key, what):
    F[key] = PM + " " + what if what else PM
    PEND.append(key)


def f3(x):
    return "%.3f" % x


def pct(x, nd=1):
    return ("%." + str(nd) + "f") % (100 * x)


def pts(x):
    return "%.1f" % (100 * x)


def ci(p):
    return "%+.3f to %+.3f" % (p["lo"], p["hi"])


def pw(x):
    """percent for 'same winner' shares: never print 100 for a share below 1."""
    v = 100 * x
    return ("%.2f" % v) if 99.5 <= v < 100 else ("%.0f" % v)


def ordn(n):
    return str(n)


def comma(x):
    return "{:,}".format(int(round(x)))


EMB = {}
# ---------------------------------------------------------------- pooling, code
po, code, anim = D("pooling.json"), D("code.json"), D("anim.json")
F["st_version"] = po["st_version"]
F["pool_maxdiff"] = "%.0e" % max(m["max_abs_diff"] for m in po["models"].values()) if max(m["max_abs_diff"] for m in po["models"].values()) > 0 else "0.0"
F["code_pool_file"] = code["pooling_file"]; F["code_norm_file"] = code["normalize_file"]; F["code_mnrl_file"] = code["mnrl_file"]
for k, n in (("cls", "cls"), ("mean", "mean"), ("last", "last"), ("normalize", "norm"), ("mnrl_loss", "mnrl")):
    F["code_%s_lines" % n] = "%d to %d" % (code[k]["start"], code[k]["end"])
EMB["code"] = {k: dict(start=code[k]["start"], text=code[k]["text"]) for k in ("cls", "mean", "last", "normalize", "mnrl_loss")}
# the core of e_train.py (loss and gradient cache), quoted with line numbers
tsrc = open(os.path.join(H, "scripts", "e_train.py")).read().split("\n")
a = next(i for i, l in enumerate(tsrc) if l.startswith("def loss_fn"))
b = next(i for i in range(a, len(tsrc)) if "return F.cross_entropy" in tsrc[i])
c = next(i for i, l in enumerate(tsrc) if "# gradient cache: 1)" in l)
d = next(i for i in range(c, len(tsrc)) if "opt.step()" in tsrc[i])
EMB["code"]["train"] = dict(start=a + 1, text="\n".join(tsrc[a:b + 1]) + "\n    ...\n" + "\n".join(x[8:] for x in tsrc[c:d + 1]), start2=c + 1)
EMB["pool"] = po["models"]
EMB["anim"] = anim
mm = anim["models"]["minilm-l6"]["cos"]
F["pa_mini_own"] = f3(mm["mean"]); F["pa_mini_cls"] = f3(mm["cls"])
lg = D("long.json") or {}
emb = lg.get("embed") or {}
if "bge-small|scifact|512" in emb and "minilm-l6|scifact|512" in emb:
    b5, m5 = emb["bge-small|scifact|512"], emb["minilm-l6|scifact|512"]
    n5 = emb["bge-small|nfcorpus|512"]; mn5 = emb["minilm-l6|nfcorpus|512"]
    F["wrongpool_sentence"] = ("How much the wrong pooling costs in retrieval depends on the model, measured over whole corpora with queries pooled the same wrong way (512 tokens): "
                               "bge-small read with mean pooling loses almost nothing (SciFact nDCG@10 %s instead of %s; NFCorpus %s instead of %s), "
                               "while MiniLM-L6 read with CLS pooling drops from %s to %s on SciFact and from %s to %s on NFCorpus. Nothing in the code warns you either way. "
                               '<span class="meas">measured here</span>') % (f3(b5["wrong_ndcg10"]), f3(b5["ndcg10"]), f3(n5["wrong_ndcg10"]), f3(n5["ndcg10"]),
                                                                              f3(m5["ndcg10"]), f3(m5["wrong_ndcg10"]), f3(mn5["ndcg10"]), f3(mn5["wrong_ndcg10"]))
else:
    pend("wrongpool_sentence", "What it does to retrieval over the whole SciFact corpus (bge-small read with mean pooling, MiniLM read with CLS) is measured by <code>e_long.py embed</code>.")
# ---------------------------------------------------------------- loss check, mining
lc, mi = D("losscheck.json"), D("mine.json")
F["loss_mine"] = "%.4f" % lc["loss_mine"]; F["loss_st"] = "%.4f" % lc["loss_st_mnrl"]
F["loss_diff"] = "%.0e" % lc["loss_abs_diff"]; F["gc_diff"] = "%.0e" % lc["gradcache_rel_diff"]
F["n_pairs"] = str(mi["n_pairs"]); F["n_claims"] = str(mi["n_claims"])
F["above_both"] = pts(mi["above_pos_both"]); F["filt_share"] = pts(mi["filtered_top10_share"])
F["root_fn_bge"] = pts(mi["root_check_per_claim"]["bge-small"]); F["root_fn_qw"] = pts(mi["root_check_per_claim"]["qwen3-emb-0.6b"])
F["same_top"] = str(mi["same_top_both"]); F["ov_bm_dense"] = "%.0f" % (100 * mi["overlap_bm25_dense_top10"])
F["kept_rank"] = "%d" % mi["dense_f_first_rank_median"]
F["shared_abs"] = str(mi["shared_pos"]["abstracts"]); F["shared_pairs"] = str(mi["shared_pos"]["pairs"])
F["p_clash"] = "%.0f" % (100 * mi["shared_pos"]["p_batch32"])
F["empty_pool"] = str(mi["dense_f_empty"])
EMB["fn"] = dict(bars=[["positive ranked first (bge-small)", mi["pos_rank_bge"]["first"]],
                       ["unlabelled abstract above the positive, bge-small", mi["above_pos_bge"]],
                       ["same, Qwen3-Embedding", mi["above_pos_qwen3"]],
                       ["both models", mi["above_pos_both"]]],
                 examples=[e for i, e in enumerate(mi["examples"]) if e["neg"] not in [x["neg"] for x in mi["examples"][:i]]][:3])
# ---------------------------------------------------------------- choose, domain shift, subsample
ch = D("choose.json")
S = ch["sets"]
sf, nf = S["scifact"], S["nfcorpus"]
F["ci_half"] = "%.2f" % (max((v["hi"] - v["lo"]) / 2 for v in sf["systems"].values()))
sub = {x["n"]: x for x in sf["subsample"]}; subn = {x["n"]: x for x in nf["subsample"]}
F["sub100_sf"] = pw(sub[100]["same_winner"]); F["sub50_sf"] = pw(sub[50]["same_winner"])
F["sub100_nf"] = pw(subn[100]["same_winner"]); F["ord200_nf"] = "%.0f" % (100 * subn[200]["same_order"])
F["hw100_sf"] = "%.3f" % sub[100]["ci_halfwidth"]
sfv = sorted((v["ndcg10"] for k, v in sf["systems"].items() if k in ("minilm-l6", "bge-small", "gte-modernbert", "qwen3-emb-0.6b")), reverse=True)
nfv = sorted((v["ndcg10"] for k, v in nf["systems"].items() if k in ("minilm-l6", "bge-small", "gte-modernbert", "qwen3-emb-0.6b")), reverse=True)
F["sf_gap"] = "%.3f" % (sfv[0] - sfv[1]); F["nf_gap"] = "%.3f" % (nfv[0] - nfv[1])
p1 = sf["pairs"]["bge-small|gte-modernbert"]; p2 = nf["pairs"]["bge-small|gte-modernbert"]
F["d_gte_bge_sf"] = "%+.3f" % -p1["diff"]; F["d_gte_bge_sf_ci"] = "%+.3f to %+.3f" % (-p1["hi"], -p1["lo"])
F["d_gte_bge_nf"] = "%+.3f" % -p2["diff"]; F["d_gte_bge_nf_ci"] = "%+.3f to %+.3f" % (-p2["hi"], -p2["lo"])
tp = ch["train_protocol"]
pt = tp["pairs"]["bge-small|gte-modernbert"]
F["n_train"] = str(tp["n_train"]); F["d_tr"] = "%.3f" % pt["diff"]; F["d_tr_ci"] = ci(pt); F["d_te"] = "%.3f" % -p1["diff"]
ck = ch["claim_kinds"]
F["te_ev_gte"] = f3(ck["test"]["evidence"]["gte-modernbert"]); F["tr_ev_gte"] = f3(ck["train"]["evidence"]["gte-modernbert"])
EMB["ds"] = {k: dict(n=v["n"], systems=v["systems"]) for k, v in S.items()}
EMB["ch"] = {k: dict(n=v["n"], systems=v["systems"], best=v["best"], vs_best=v["vs_best"], subsample=v["subsample"]) for k, v in S.items()}
mods = {r["key"]: r for r in R("models.json")["rows"]}
EMB["cost"] = {k: dict(name=r["name"], params=r["params"], dim=r["dim"], bytes=r["bytes_per_vector"], q_ms=r["q_ms_mps"],
                       docs_s=r["docs_per_s_first"], weights=r["weights_bytes"], lic=r["lic"], pool=r["pool"], max_len=r["max_len"]) for k, r in mods.items()}
EMB["cost"]["bm25"] = dict(name="BM25 (bm25s)", params="none", dim=None, bytes=None, q_ms=0.25, docs_s=None, weights=0, lic="MIT", pool="", max_len=None)
EMB["cost"]["colbert-small"] = dict(name="answerai-colbert-small-v1", params="33 M", dim=96, bytes=45245, q_ms=62.0, docs_s=82.5, weights=133610664, lic="Apache 2.0", pool="late interaction", max_len=300)
F["ce_all_s"] = "%.1f" % (5183 / 236.8)
# ---------------------------------------------------------------- MTEB
mt = D("mteb.json")
F["mteb_n"] = str(mt["n_models_both"]); F["mteb_tasks"] = str(mt["n_tasks"]); F["mteb_ver"] = mt["mteb"]
F["mteb_types"] = ", ".join("%d %s" % (v, k.replace("PairClassification", "pair classification").replace("STS", "semantic similarity (STS)").lower() if k != "STS" else "semantic similarity (STS)") for k, v in sorted(mt["task_types"].items(), key=lambda x: -x[1]))
F["mteb_top10"] = str(mt["top10"]["mean_scifact"]); F["top10_sf"] = F["mteb_top10"]; F["top10_nf"] = str(mt["top10"]["mean_nfcorpus"])
F["rho_sf"] = "%.2f" % mt["rho"]["mean_scifact"]; F["rho_nf"] = "%.2f" % mt["rho"]["mean_nfcorpus"]
F["close_n"] = str(mt["close_pairs"]["n"]); F["close_disc"] = "%.0f" % (100 * mt["close_pairs"]["discordant_scifact"] / mt["close_pairs"]["n"])
F["lead_mean"] = mt["leader_mean"]["model"]; F["lead_mean_sf"] = str(mt["leader_mean"]["rank_scifact"])
F["lead_sf"] = mt["leader_scifact"]["model"]; F["lead_sf_mean"] = str(mt["leader_scifact"]["rank_mean"])
qs, bs = mt["setup"]["Qwen/Qwen3-Embedding-0.6B"], mt["setup"]["BAAI/bge-small-en-v1.5"]
F["qw_rank_mean"] = str(qs["rank_mean"]); F["qw_rank_sf"] = str(qs["rank_scifact"])
F["bge_rank_mean"] = str(bs["rank_mean"]); F["bge_rank_sf"] = str(bs["rank_scifact"])
F["decl_sf"] = str(mt["declared_training"]["scifact"]); F["decl_nf"] = str(mt["declared_training"]["nfcorpus"]); F["decl_none"] = str(mt["declared_training"]["none"])
EMB["mt"] = dict(points=mt["points"], setup=[m for m in mt["setup"] if mt["setup"][m].get("rank_mean")], rho=mt["rho"], top10=mt["top10"])
# ---------------------------------------------------------------- prefixes
pf = D("prefix.json")
V, P = pf["variants"], pf.get("paired_vs_documented", {})


def pv(m, ds, name):
    return V["%s|%s|%s" % (m, ds, name)]["ndcg10"]


F["bge_p_sf"] = f3(pv("bge-small", "scifact", "documented prefix")); F["bge_np_sf"] = f3(pv("bge-small", "scifact", "none"))
F["bge_p_nf"] = f3(pv("bge-small", "nfcorpus", "documented prefix")); F["bge_np_nf"] = f3(pv("bge-small", "nfcorpus", "none"))
F["bge_np_sf_ci"] = ci(P["bge-small|scifact|none"]); F["bge_np_nf_ci"] = ci(P["bge-small|nfcorpus|none"])
for ds, s in (("scifact", "sf"), ("nfcorpus", "nf")):
    t = pv("qwen3-emb-0.6b", ds, "task instruction")
    F["qw_task_" + s] = f3(t); F["qw_gen_" + s] = f3(pv("qwen3-emb-0.6b", ds, "generic instruction"))
    F["qw_oth_" + s] = f3(pv("qwen3-emb-0.6b", ds, "other set's instruction"))
    for vn, kk in (("generic instruction", "qw_gen_%s_ci"), ("other set's instruction", "qw_oth_%s_ci")):
        F[kk % s] = ci(P["qwen3-emb-0.6b|%s|%s" % (ds, vn)])
    F["qw_none_" + s] = f3(pv("qwen3-emb-0.6b", ds, "none"))
    F["qw_none_drop_" + s] = "%.1f" % (100 * (t - pv("qwen3-emb-0.6b", ds, "none")))
e5 = {k: v for k, v in V.items() if k.startswith("e5-small-v2")}
if len(e5) == 8:
    g = lambda ds, n: V["e5-small-v2|%s|%s" % (ds, n)]["ndcg10"]
    pk = lambda ds, n: P["e5-small-v2|%s|%s" % (ds, n)]
    e5m = mt["setup"].get("intfloat/e5-small-v2", {})
    F["e5_sentence"] = ("<b>e5-small-v2</b> (each corpus re-embedded with and without \"passage: \", on MPS): with both prefixes %s on SciFact (the MTEB results repository has %s) and %s on NFCorpus; "
                        "with neither, %s and %s (paired 95%% interval of the difference: %s and %s); with only the query prefix, %s and %s. Its card's warning is right in direction but small here: under one nDCG@10 point, "
                        "and both intervals include zero. <span class=\"meas\">measured here</span>") % (
        f3(g("scifact", "query yes / passage yes")), f3(e5m["scifact"]) if e5m.get("scifact") else "no entry", f3(g("nfcorpus", "query yes / passage yes")),
        f3(g("scifact", "query no / passage no")), f3(g("nfcorpus", "query no / passage no")),
        ci(pk("scifact", "query no / passage no")), ci(pk("nfcorpus", "query no / passage no")),
        f3(g("scifact", "query yes / passage no")), f3(g("nfcorpus", "query yes / passage no")))
else:
    pend("e5_sentence", "<b>e5-small-v2</b> with \"query: \" and \"passage: \" on both, either or neither side needs its corpus re-embedded twice per set (<code>e_prefix.py e5</code>).")
EMB["pf"] = dict(variants=V, pairs=P)
# ---------------------------------------------------------------- long inputs
ev = lg["evidence"]
F["ev_256"] = pts(ev["end_beyond"]["256"]); F["ev_512"] = pts(ev["end_beyond"]["512"]); F["ev_pair_256"] = pts(ev["pair_first_beyond"]["256"])
EMB["ln"] = dict(lengths=lg["lengths"], evidence=ev, embed=emb or None)
if emb and len(emb) == 16:
    gl = lambda m, ds, T: emb["%s|%s|%d" % (m, ds, T)]["ndcg10"]
    F["long_embed_text"] = ("<p>What the cut costs, measured by re-embedding each corpus at four limits with the stored queries <span class=\"meas\">measured here</span>:</p>"
                            "<div class=\"tw\"><table><tr><th>model, set</th><th class=\"num\">64 tokens</th><th class=\"num\">128</th><th class=\"num\">256</th><th class=\"num\">512</th></tr>%s</table></div>"
                            "<p>On SciFact the curve climbs to 512 for both models: bge-small gains %s points from 128 to 512, and MiniLM-L6, whose default is 256, scores %s at 512 against %s at 256 "
                            "(its card: \"The sequence length was limited to 128 tokens\" in training, and input \"longer than 256 word pieces is truncated\" by default; it still uses text beyond both). On NFCorpus the limit barely matters past 128 (MiniLM is even slightly lower at 512): "
                            "likely because the opening of these documents already carries their topic. Measure on your own documents before raising or lowering a limit.</p>") % (
        "".join("<tr><td>%s, %s</td>%s</tr>" % (m, ds, "".join("<td class=\"num\">%s</td>" % f3(gl(m, ds, T)) for T in (64, 128, 256, 512)))
                for m in ("bge-small", "minilm-l6") for ds in ("scifact", "nfcorpus")),
        "%.1f" % (100 * (gl("bge-small", "scifact", 512) - gl("bge-small", "scifact", 128))), f3(gl("minilm-l6", "scifact", 512)), f3(gl("minilm-l6", "scifact", 256)))
else:
    pend("long_embed_text", "What the cut costs in retrieval quality (bge-small and MiniLM-L6 re-embedding each corpus at 64, 128, 256 and 512 tokens) is measured by <code>e_long.py embed</code>.")
    F["long_embed_text"] = "<p>" + F["long_embed_text"] + "</p>"
# ---------------------------------------------------------------- fine-tune
tr = D("train_runs.json")
F["tr_epochs"] = str(tr["runs"][1]["epochs"]) if tr and len(tr["runs"]) > 1 else "2"
EMB["ft"] = None
if tr and len([r for r in tr["runs"] if r["variant"] != "base"]) >= 12 and tr.get("paired"):
    import statistics as st
    base = [r for r in tr["runs"] if r["variant"] == "base"][0]
    arms = {}
    for r in tr["runs"]:
        if r["variant"] != "base":
            arms.setdefault(r["variant"], []).append(r)
    PR = tr["paired"]
    EMB["ft"] = dict(base=base, arms={k: [dict(seed=r["seed"], scifact=r["scifact"]["ndcg10"], nfcorpus=r["nfcorpus"]["ndcg10"], steps=r["steps"], train_s=r["train_s"]) for r in v] for k, v in arms.items()},
                     paired=PR)
    m = {k: {ds: st.mean(x[ds]["ndcg10"] for x in v) for ds in ("scifact", "nfcorpus")} for k, v in arms.items()}
    AN = {"inbatch": "in-batch only", "bm25": "+BM25 negatives", "dense": "+dense negatives", "dense_f": "+dense negatives, filtered",
          "inbatch8": "in-batch, batch 8", "inbatch128": "in-batch, batch 128"}
    main = [k for k in ("inbatch", "bm25", "dense", "dense_f") if k in arms]
    best = max(main, key=lambda k: m[k]["scifact"])
    b0 = base["scifact"]["ndcg10"]
    F["tr_onescreen"] = ("Fine-tuning bge-small on SciFact's %s train pairs moves its test nDCG@10 from %s to %s (%s, mean of %d seeds; paired interval of the gain %s; seeds spread over %s)"
                         % (F["n_pairs"], f3(b0), f3(m[best]["scifact"]), AN[best], len(arms[best]), ci(PR[best]["scifact"]["vs_base"]), "%.3f" % PR[best]["scifact"]["seed_range"]))
    rows = "".join("<tr><td>%s</td><td class=\"num\">%s</td><td class=\"num\">%s</td><td class=\"num\">%s</td><td class=\"num\">%s</td><td class=\"num\">%s</td><td class=\"num\">%s</td></tr>" % (
        AN[k], f3(m[k]["scifact"]), "%.3f" % PR[k]["scifact"]["seed_range"], ci(PR[k]["scifact"]["vs_base"]),
        ci(PR[k]["scifact"]["vs_inbatch"]) if "vs_inbatch" in PR[k]["scifact"] else "reference", f3(m[k]["nfcorpus"]), ci(PR[k]["nfcorpus"]["vs_base"])) for k in AN if k in arms)
    F["tr_text"] = ("<div class=\"tw\"><table><tr><th>arm</th><th class=\"num\">SciFact nDCG@10 (seed mean)</th><th class=\"num\">seed range</th><th class=\"num\">gain over the starting model (paired 95%%)</th>"
                    "<th class=\"num\">against in-batch only (paired 95%%)</th><th class=\"num\">NFCorpus nDCG@10</th><th class=\"num\">NFCorpus change (paired 95%%)</th></tr>"
                    "<tr><td>starting model</td><td class=\"num\">%s</td><td></td><td></td><td></td><td class=\"num\">%s</td><td></td></tr>%s</table></div>"
                    "<p class=\"small mute\">Measured on Apple M1 Pro (MPS), %s; per-query nDCG@10 averaged over seeds before the paired bootstrap (10,000 resamples of the test queries). <span class=\"meas\">measured here</span></p>") % (
        f3(b0), f3(base["nfcorpus"]["ndcg10"]), rows, tr.get("when", "October 2026"))
    def mm(k, ds="scifact"):
        return f3(m[k][ds])
    def vi(k):
        return ci(PR[k]["scifact"]["vs_inbatch"])
    st_ = {k: arms[k][0]["steps"] for k in arms}
    nf_lo = min(PR[k]["nfcorpus"]["vs_base"]["diff"] for k in arms); nf_hi = max(PR[k]["nfcorpus"]["vs_base"]["diff"] for k in arms)
    sr = max(PR[k]["scifact"]["seed_range"] for k in arms)
    F["tr_reading"] = ("<p><b>What it says.</b> (1) <b>In-domain training helps</b> even at this size: in-batch negatives alone take SciFact from %s to %s, and every arm's paired interval against the starting model is clear of zero. "
                       "(2) <b>Mined hard negatives add about one point</b> over in-batch only: BM25-mined %s (paired difference against in-batch %s), bge-mined %s (%s). "
                       "This is the opposite of the sibling cross-encoder run, where random negatives beat BM25-mined ones; the bi-encoder here also keeps its in-batch negatives, so the mined one is an addition, not a replacement. "
                       "(3) <b>The false-negative filter took the gain away</b>: %s, against in-batch %s. It removed %s%% of the top-10 candidates and pushed the first kept candidate to rank %s, so the negatives left were easier. "
                       "Whether the removed abstracts were truly relevant cannot be checked without new labels; on this set, keeping them helped. "
                       "(4) <b>Batch size, at a fixed number of epochs, went the other way from the large-batch advice</b>: batch 8 %s (%d steps), 32 %s (%d steps), 128 %s (%d steps). With 919 pairs, a bigger batch means far fewer updates, and that dominates; the large-batch recipes (BGE's 19,200) train on millions of pairs, where the trade between negatives per step and number of steps may differ; this run cannot test that regime. "
                       "(5) <b>No forgetting</b>: every arm also gains %s to %s on NFCorpus, a domain it never saw. "
                       "(6) <b>The noise floor</b>: seeds move an arm's mean by at most %s, less than the effects in (1), (2) and (4), while the filtered arm's %s over in-batch is inside it; the test set adds a paired interval of about &plusmn;%s for differences between arms.</p>") % (
        f3(b0), mm("inbatch"), mm("bm25"), vi("bm25"), mm("dense"), vi("dense"), mm("dense_f"), mm("inbatch"), F["filt_share"], F["kept_rank"],
        mm("inbatch8"), st_["inbatch8"], mm("inbatch"), st_["inbatch"], mm("inbatch128"), st_["inbatch128"], "%+.3f" % nf_lo, "%+.3f" % nf_hi, "%.3f" % sr,
        "%+.3f" % PR["dense_f"]["scifact"]["vs_inbatch"]["diff"],
        "%.3f" % (sum((PR[k]["scifact"]["vs_inbatch"]["hi"] - PR[k]["scifact"]["vs_inbatch"]["lo"]) / 2 for k in arms if "vs_inbatch" in PR[k]["scifact"]) / sum(1 for k in arms if "vs_inbatch" in PR[k]["scifact"])))
else:
    F["tr_reading"] = ""
    pend("tr_onescreen", "Fine-tuning bge-small on SciFact's train pairs with four kinds of negatives, three batch sizes and three seeds each: script written and tested at toy size on CPU, GPU run waiting for a slot")
    F["tr_text"] = ('<div class="emb-pendbox"><b>Pending run.</b> The script (<code>scripts/e_train.py</code>) is written, its loss is checked against sentence-transformers and its gradient cache against plain back-propagation (section 4), and it ran end to end on CPU at toy size (64 pairs, 8 steps). The full run needs the shared GPU (about 18 trainings of a few minutes each) and is waiting for a slot. No result is shown until it has run.</div>')
    PEND.append("tr_text")
# ---------------------------------------------------------------- training lab
lab = D("lab.json")
if lab is None and DEV:
    lab = json.load(open(DEV))
EMB["lab"] = lab
if lab is None:
    PEND.append("lab")
    F["lab_note"] = ""
else:
    import statistics as st2
    def labstat(A, f):
        r = [c for g, fr in zip(lab["groups"], A["frames"][f]) for k, c in zip(g["kinds"], fr) if k == "rand"]
        p = [fr[0] for fr in A["frames"][f]]
        mg = sum(1 for g, fr in zip(lab["groups"], A["frames"][f]) if fr[0] - max(c for k, c in zip(g["kinds"], fr) if k != "pos") > 0)
        return st2.mean(r), st2.mean(p), mg
    A = lab["arms"]["dense_f"]; r0, p0, m0 = labstat(A, 0); r1, p1, m1 = labstat(A, -1)
    F["lab_note"] = ("<p class=\"small\"><b>What to watch.</b> Training spreads the whole space: with filtered dense negatives the mean cosine of a claim to the random abstracts falls from %s to %s, "
                     "and to its own labelled abstract from %s to %s. Absolute cosines fall; what retrieval needs is the gap between the labelled abstract and everything else. "
                     "On these 12 claims the labelled abstract wins before training for %d and after for %d: a sample this small does not show the gain that the 300-claim nDCG@10 measures "
                     "(section 6 of Reading), which is why the lab is for seeing the mechanism, and the table below is for judging it. <span class=\"meas\">measured here</span></p>") % (
        f3(r0), f3(r1), f3(p0), f3(p1), m0, m1)

F["_pending"] = PEND
json.dump(F, open(os.path.join(H, "facts.json"), "w"), indent=1)
js = "window.EMB=" + json.dumps(EMB, separators=(",", ":")) + ";\n"
open(os.path.join(H, "parts", "22_emb_data.js"), "w").write(js)
print("facts", len(F), "data bytes", len(js), "pending", PEND, "DEV" if DEV else "")

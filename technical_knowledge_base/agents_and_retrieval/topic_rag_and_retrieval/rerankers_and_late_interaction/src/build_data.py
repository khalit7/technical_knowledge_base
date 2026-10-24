"""Turn src/data/*.json into parts/22_rr_data.js (what the page's JavaScript reads) and facts.json (every number
written in the prose as @@key@@, filled in by build.sh), so prose and data cannot disagree.
A missing measurement leaves its keys as PENDING (check_data.py fails on any PENDING in the built page).
usage: python3 build_data.py"""
import json
import math
import os

H = os.path.dirname(os.path.abspath(__file__))


def D(n):
    p = os.path.join(H, "data", n)
    return json.load(open(p)) if os.path.exists(p) else None


F = {}
P = "PENDING"


def f3(x):
    return "%.3f" % x


def pct(x, nd=0):
    return ("%." + str(nd) + "f") % (100 * x)


def comma(x):
    return "{:,}".format(int(round(x)))


dep = D("depth.json"); sc = D("scores.json"); cb = D("colbert.json"); pl = D("plaid.json"); tk = D("tokens.json")
cm = D("ce_manual.json"); mx = D("maxsim_pairs.json"); ex = D("examples.json"); tm = D("timings.json") or {}
llm = D("llm.json"); tr = D("train.json")
S = dep["sweep"]; FI = dep["first"]
# ---- depth
F["bm25_ndcg"] = f3(FI["bm25"]["ndcg10"]); F["hy_ndcg"] = f3(FI["hybrid"]["ndcg10"]); F["de_ndcg"] = f3(FI["dense"]["ndcg10"])
F["bm25_ce100"] = f3(S["bm25"]["ce-minilm-l6"]["100"]["ndcg10"])
F["hy_ce100"] = f3(S["hybrid"]["ce-minilm-l6"]["100"]["ndcg10"])
F["hy_ce_k3"] = f3(S["hybrid"]["ce-minilm-l6"]["3"]["ndcg10"]); F["hy_ce_k30"] = f3(S["hybrid"]["ce-minilm-l6"]["30"]["ndcg10"])
hq = S["hybrid"]["qwen3-reranker-0.6b"]
F["hy_qw_best"] = f3(max(v["ndcg10"] for v in hq.values()))
F["hy_qw_k20"] = f3(hq["20"]["ndcg10"])
F["hy_qw_k100"] = f3(hq["100"]["ndcg10"]) if "100" in hq else P
hb = S["hybrid"]["bge-reranker-v2-m3"]
F["hy_bge_k20"] = f3(hb["20"]["ndcg10"]); F["hy_bge_k100"] = f3(hb["100"]["ndcg10"]) if "100" in hb else P
F["qw30_hy"] = f3(hq["30"]["ndcg10"]); F["bge30_hy"] = f3(S["hybrid"]["bge-reranker-v2-m3"]["30"]["ndcg10"])
F["gain_qw"] = "%.2f" % (hq["20"]["ndcg10"] - FI["hybrid"]["ndcg10"])
rk = FI["hybrid"]["recallK"]
for k in ("10", "20", "30", "100"):
    F["hy_rec" + k] = f3(rk[k])
F["bm25_rec100"] = f3(FI["bm25"]["recallK"]["100"])
F["win_qw"] = str(hq["30"]["win"]); F["loss_qw"] = str(hq["30"]["loss"])
F["win_ce"] = str(S["hybrid"]["ce-minilm-l6"]["30"]["win"]); F["loss_ce"] = str(S["hybrid"]["ce-minilm-l6"]["30"]["loss"])
F["root_cells"] = str(dep["check_root"]["cells_equal"]) if not dep["check_root"].get("cells_differ") else P
dx = dep.get("deep_extra_pairs", {})
F["deep_pairs"] = comma(sum(dx.values())) if dx and all(dx.values()) else P
# ---- scores
F["pool_pairs"] = comma(sc["n_pairs"]); F["pool_rel"] = str(sc["n_rel_in_pool"])
names = ["ce-minilm-l6", "bge-reranker-v2-m3", "qwen3-reranker-0.6b"]
short = {"ce-minilm-l6": "ce", "bge-reranker-v2-m3": "bge", "qwen3-reranker-0.6b": "qw"}
for n in names:
    c = sc["calib"][n]
    F["ece_" + short[n]] = "%.3f" % c["ece_raw"]; F["ece_" + short[n] + "_p"] = "%.3f" % c["ece_platt"]
    top = [b for b in c["raw"] if b["lo"] == 0.9][0]
    F["top_" + short[n]] = pct(top["acc"])
F["base_rate"] = pct(sc["calib"]["ce-minilm-l6"]["base_rate"], 1)
F["raw_ce_lo"] = "%.1f" % sc["raw_range"]["ce-minilm-l6"][0]; F["raw_ce_hi"] = "%.1f" % sc["raw_range"]["ce-minilm-l6"][1]
F["abst_qw"] = "%.2f" % sc["abstain"]["qwen3-reranker-0.6b"]["auroc"]
F["abst_ce"] = "%.2f" % sc["abstain"]["ce-minilm-l6"]["auroc"]
F["abst_cos"] = "%.2f" % sc["abstain"]["qwen3-cosine"]["auroc"]; F["abst_bm25"] = "%.2f" % sc["abstain"]["bm25"]["auroc"]
F["n_ans"] = str(sc["abstain"]["qwen3-reranker-0.6b"]["n_ans"])
sw90 = [x for x in sc["abstain"]["qwen3-reranker-0.6b"]["sweep"] if x["kept_ans"] >= 0.9][-1]
F["abst_at90"] = pct(1 - sw90["abstain_none"])
T = sc["transfer"]
F["nf_rel_med"] = "%.1f" % T["nfcorpus_rel_median"]
import statistics
F["nf_above0"] = pct(T["share_rel_above_0_nfcorpus"]); F["sf_above0"] = pct(T["share_rel_above_0_scifact"])
F["sf_rel_med"] = "%.1f" % sc["hist"]["ce-minilm-l6"]["rel_median"]
# ---- tokens and cost
M = tk["models"]
F["tok_ce"] = "%d" % round(M["ce-minilm-l6"]["tokens_mean"]); F["tok_qw"] = "%d" % round(M["qwen3-reranker-0.6b"]["tokens_mean"])
F["gf_ce"] = "%.1f" % M["ce-minilm-l6"]["gflop_per_pair"]; F["gf_qw"] = "%d" % round(M["qwen3-reranker-0.6b"]["gflop_per_pair"])
F["gf_ratio"] = "%d" % round(M["qwen3-reranker-0.6b"]["gflop_per_pair"] / M["ce-minilm-l6"]["gflop_per_pair"])
F["tf_ce"] = "%.1f" % M["ce-minilm-l6"]["achieved_tflops"]; F["tf_bge"] = "%.1f" % M["bge-reranker-v2-m3"]["achieved_tflops"]
F["tf_qw"] = "%.1f" % M["qwen3-reranker-0.6b"]["achieved_tflops"]
F["trunc_ce"] = pct(M["ce-minilm-l6"]["truncated_share"]); F["trunc_qw"] = pct(M["qwen3-reranker-0.6b"]["truncated_share"], 1)
F["ce_pps"] = "%.1f" % M["ce-minilm-l6"]["pairs_per_s_measured"]; F["qw_pps"] = "%.1f" % M["qwen3-reranker-0.6b"]["pairs_per_s_measured"]
F["ce_all_s"] = "%d" % round(5183 / M["ce-minilm-l6"]["pairs_per_s_measured"])
F["qwen_all_min"] = "%d" % round(5183 / M["qwen3-reranker-0.6b"]["pairs_per_s_measured"] / 60)
F["qw30_pred_s"] = "%.1f" % (30 * M["qwen3-reranker-0.6b"]["gflop_per_pair"] / (M["qwen3-reranker-0.6b"]["achieved_tflops"] * 1000))
F["qenc_ms"] = "51"  # setup: Qwen3-Embedding query encode p50 on MPS (parent's src/data/README.md)
# ---- timings
def tget(m, k):
    return tm.get(m, {}).get("K", {}).get(str(k))
for key, m, k in (("t_ce30", "ce-minilm-l6", 30), ("t_bge30", "bge-reranker-v2-m3", 30), ("t_qw30", "qwen3-reranker-0.6b", 30), ("t_ms100", "maxsim", 100)):
    t = tget(m, k)
    F[key] = comma(t["p50_ms"]) if t and t["p50_ms"] >= 100 else ("%.1f" % t["p50_ms"] if t else P)
t = tget("qwen3-reranker-0.6b", 30)
F["t_qw30_s"] = "%.1f" % (t["p50_ms"] / 1000) if t else P
# ---- ce manual and the pair view
ch = cm["checks"]
F["ce_check_diff"] = "%.4f" % max(max(abs(c["predict"] - c["by_hand"]), abs(c["predict"] - c["recorded_mps"]), abs(c["predict"] - c["by_model"])) for c in ch)
F["ce_check_lo"] = "%.2f" % min(c["predict"] for c in ch); F["ce_check_hi"] = "%.2f" % max(c["predict"] for c in ch)
rel = [c for c in ch if c["doc"] == "31272411"][0]
F["be_ce"] = "%.2f" % rel["predict"]; F["be_ntok"] = str(rel["n_tokens"])
bi = cm["bi"]; brel = [b for b in bi if b["doc"] == "31272411"][0]
F["be_cos"] = "%.3f" % brel["cos"]; F["be_rank"] = str(1 + sum(b["cos"] > brel["cos"] for b in bi))
F["be_heads"] = str(cm["view"]["heads"]); F["be_share"] = pct(cm["view"]["share_to_doc_mean"])
assert 1 + sum(c["predict"] > rel["predict"] for c in ch) == 1
# ---- ColBERT
F["cb_ndcg"] = f3(cb["exhaustive"]["setup_run"]["ndcg@10"]); F["cb_all"] = f3(cb["exhaustive"]["all32"]["ndcg@10"])
F["cb_real"] = f3(cb["exhaustive"]["real_only"]["ndcg@10"]); F["mask_share"] = pct(cb["mask_share_of_top_score"])
F["q_real"] = "%.1f" % cb["query_real_mean"]; F["q_mask_pct"] = pct(1 - cb["query_real_mean"] / 32)
F["cb_ntok"] = comma(cb["n_tokens"]); F["cb_tok_mean"] = "%.1f" % cb["tok_mean"]; F["cb_tok_mean_r"] = "%d" % round(cb["tok_mean"])
F["cb_bytes_doc"] = comma(cb["bytes_per_doc_fp16"]); F["cb_bytes_doc_kb"] = "%.0f" % (cb["bytes_per_doc_fp16"] / 1000)
F["cb_x_bge"] = "%d" % round(cb["bytes_per_doc_fp16"] / 1536)
F["sz_bge_mb"] = "%.1f" % (cb["corpus_bytes_single"]["bge-small fp32"] / 1e6)
F["sz_qw_mb"] = "%.1f" % (cb["corpus_bytes_single"]["qwen3-emb-0.6b fp32"] / 1e6)
F["sz_cb_mb"] = "%.1f" % (cb["bytes_fp16_total"] / 1e6)
F["cb_rr_hy20"] = f3(cb["rerank"]["hybrid"]["sweep"]["20"]["ndcg10"]); F["cb_rr_bm100"] = f3(cb["rerank"]["bm25"]["sweep"]["100"]["ndcg10"])
F["ms_mflop"] = "%.1f" % (32 * cb["tok_mean"] * 96 * 2 / 1e6)
F["ce_vs_ms"] = comma(M["ce-minilm-l6"]["gflop_per_pair"] * 1e3 / (32 * cb["tok_mean"] * 96 * 2 / 1e6))
p0 = mx["pairs"][0]
bs = {t: s for t, s in zip(p0["qtok"], p0["best_sim"])}
F["ms_md"] = "%.2f, %.2f and %.2f" % (bs["md"], bs["##a"], bs["##5"]); F["ms_sensor"] = "%.2f" % bs["sensor"]
F["mx_check"] = "%.4f" % min(min(p["check_cos_min_query"], p["check_cos_min_doc"]) for p in mx["pairs"])
# ---- PLAID
fl2 = pl["indexes"]["2"]["files"]
def essential(files):
    return sum(v for k, v in files.items() if not k.startswith("merged_") and k.endswith((".npy", ".json")))
e2 = essential(fl2)
F["pl2_mb"] = "%.1f" % (e2 / 1e6); F["pl2_doc"] = comma(e2 / 5183); F["pl2_x"] = "%.1f" % (cb["bytes_fp16_total"] / e2)
F["pl2_disk_mb"] = "%.1f" % (pl["indexes"]["2"]["bytes"] / 1e6)
F["pl2_tok"] = "%d" % round(fl2["0.residuals.npy"] / pl["n_tokens"])
F["pl_cent"] = comma(pl["indexes"]["2"]["centroids_shape"][0])
g2 = {(g["probe"], g["full"]): g for g in pl["indexes"]["2"]["grid"]}; g4 = {(g["probe"], g["full"]): g for g in pl["indexes"]["4"]["grid"]}
F["pl2_best"] = f3(g2[(8, 4096)]["ndcg10"]); F["pl4_best"] = f3(g4[(8, 4096)]["ndcg10"])
F["pl2_ov"] = pct(g2[(8, 4096)]["top10_overlap"]); F["pl4_ov"] = pct(g4[(8, 4096)]["top10_overlap"])
F["pl_full_lo"] = "32"; F["pl_full_hi"] = "256"
F["pl2_lo"] = f3(g2[(8, 32)]["ndcg10"]); F["pl2_lo_ov"] = pct(g2[(8, 32)]["top10_overlap"])
# ---- training
if tr and len([r for r in tr["runs"] if r["variant"] != "zero-shot"]) >= 4:
    F["tr_claims"] = str(tr["train_claims"])
    z = [r for r in tr["runs"] if r["variant"] == "zero-shot"][0]
    def avg(v, f):
        rs = [r[f] for r in tr["runs"] if r["variant"] == v]
        return sum(rs) / len(rs)
    F["tr_note"] = ("Zero-shot (the MS MARCO model as released, scored in this run): %s on BM25's top 30, %s on the hybrid top 30 "
                    "(the recorded-score sweep gives %s and %s). Fine-tuned with hard negatives: %s and %s; with random negatives: %s and %s "
                    "(means of 2 seeds). Training took about %d s per run on MPS. Both fine-tunes beat the released model: three minutes of in-domain training bring the 22 M model on the hybrid top 30 level with the "
                    "568 M bge-reranker-v2-m3 (%s), though not with Qwen3-Reranker (%s). Hard negatives did not beat random ones here. Likely reasons, not tested here: SciFact's labels are sparse, so some BM25 'hard negatives' "
                    "are unlabelled relevant abstracts (false negatives, which RocketQA-style denoising and teacher scores address), and the "
                    "MS MARCO starting point already ranks near misses; at one epoch and one learning rate the comparison is tiny." % (
                        f3(z["bm25"]), f3(z["hybrid"]), f3(S["bm25"]["ce-minilm-l6"]["30"]["ndcg10"]), f3(S["hybrid"]["ce-minilm-l6"]["30"]["ndcg10"]),
                        f3(avg("hard", "bm25")), f3(avg("hard", "hybrid")), f3(avg("random", "bm25")), f3(avg("random", "hybrid")),
                        round(avg("hard", "train_s")), f3(S["hybrid"]["bge-reranker-v2-m3"]["30"]["ndcg10"]), f3(S["hybrid"]["qwen3-reranker-0.6b"]["30"]["ndcg10"])))
else:
    F["tr_claims"] = "809"; F["tr_note"] = P
# ---- LLM rerankers
if llm:
    F["llm_summary"] = llm["summary"]; F["llm_note"] = llm["note"]; F["pair_passes"] = str(llm["pair_passes"])
    F["list_missing"] = llm["list_missing"]; F["sw_claim_id"] = llm["sw"]["qid"] if llm.get("sw") else P
else:
    for k in ("llm_summary", "llm_note", "pair_passes", "list_missing", "sw_claim_id"):
        F[k] = P
json.dump(F, open(os.path.join(H, "facts.json"), "w"), indent=0, sort_keys=True)

# ---- learned sparse retrieval: the sibling Retrieval pipeline page's run, copied into inputs/ (not rerun here)
spr = json.load(open(os.path.join(H, "inputs", "sparse_rp.json")))
SS = spr["scifact"]
F["sp_ndcg"] = f3(SS["sparse"]["ndcg10"]); F["sp_rrf"] = f3(SS["rrf(sparse, qwen3)"]["ndcg10"])
F["sp_nnz_d"] = "%d" % round(SS["doc_nonzeros_mean"]); F["sp_nnz_q"] = "%d" % round(SS["query_nonzeros_mean"])
F["sp_bytes_doc"] = comma(8 * SS["doc_nonzeros_mean"])  # derived: 4-byte term id + 4-byte float32 weight per non-zero
F["sp_dps"] = "%.0f" % spr["timing"]["scifact"]["docs_per_s"]
F["sp_nexp"] = "%d" % sum(1 for t in SS["example_doc"]["top_terms"] if not t[2])

# ---------------------------------------------------------------- data for the JavaScript
R = {"depth": dep, "colbert_rerank": cb["rerank"], "colbert": {k: cb[k] for k in ("exhaustive", "tok_mean", "n_tokens")},
     "hist": sc["hist"], "calib": {n: {"raw": sc["calib"][n]["raw"], "platt": sc["calib"][n]["platt"]} for n in names},
     "abstain": sc["abstain"], "tokens": M, "timings": tm, "plaid": {nb: pl["indexes"][nb]["grid"] for nb in ("2", "4")},
     "ce_view": cm["view"], "sparse": {"ex": SS["example_doc"], "model": spr["model"]}, "ce_checks": cm["checks"], "bi": cm["bi"], "train": tr, "llm": llm}
# MaxSim pairs: similarities as integers (x100)
R["mx"] = [{k: v for k, v in p.items() if k != "sim"} | {"sim": [[int(round(100 * x)) for x in row] for row in p["sim"]]} for p in mx["pairs"]]
# examples: drop per-list first-stage scores (not shown), keep everything else
R["ex"] = ex
js = "window.RR=" + json.dumps(R, separators=(",", ":")) + ";\n"
open(os.path.join(H, "parts", "22_rr_data.js"), "w").write(js)
print("facts", len(F), "pending", sorted(k for k, v in F.items() if v == P), "data js", len(js), "bytes")
# ---- the root Pipeline lab's own timing of the same stages (other claims), for the agreement note
rl = os.path.normpath(os.path.join(H, "..", "..", "src", "pipe", "out", "latency.json"))
if os.path.exists(rl):
    RL = json.load(open(rl))["stages"]
    g = lambda k: RL[k]["p50_ms"]
    F["root_lat"] = ("The root's Pipeline lab timed the same models on 40 other claims (p50): MiniLM %d ms at K = 30 and %d ms at K = 100, "
                     "bge-reranker-v2-m3 %s ms and Qwen3-Reranker %s ms at K = 30. The K = 100 MiniLM batch varied most between repeats here (%s ms per-repeat medians)." % (
                         round(g("rerank-ce-minilm-l6-30")), round(g("rerank-ce-minilm-l6-100")), comma(g("rerank-bge-reranker-v2-m3-30")),
                         comma(g("rerank-qwen3-reranker-0.6b-30")), ", ".join("%d" % x for x in tm["ce-minilm-l6"]["K"]["100"]["median_per_repeat_ms"])))
else:
    F["root_lat"] = P
json.dump(F, open(os.path.join(H, "facts.json"), "w"), indent=0, sort_keys=True)

"""Numbers quoted in the page's prose, computed from out/*.json (and the root lab's out/*.json): facts.json.
build.sh replaces every @@key@@ in the HTML with facts[key]; a key missing here is reported by build.sh.
usage: python3 build_facts.py   (standard library only)"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
ROOT_OUT = os.path.normpath(os.path.join(HERE, "..", "..", "src", "pipe", "out"))


def J(name, root=False):
    p = os.path.join(ROOT_OUT if root else OUT, name)
    return json.load(open(p)) if os.path.exists(p) else {}


f3 = lambda x: "%.3f" % x
pc = lambda x, d=1: ("%." + str(d) + "f%%") % (100 * x)
F = {}
# ---- chunking internals
CI = J("chunk_internals.json")
F["ci_chars"] = "{:,}".format(CI["chars"])
T = CI["truncation"]
F["trunc_tok256_minilm"] = pc(T["lc-rec-tok256"]["MiniLM-L6 (256)"]["share_over"])
F["trunc_c4000_minilm_seen"] = pc(T["lc-rec-char4000"]["MiniLM-L6 (256)"]["share_of_tokens_seen"])
F["trunc_c4000_bge_seen"] = pc(T["lc-rec-char4000"]["bge-small (512)"]["share_of_tokens_seen"])
F["trunc_c4000_median"] = str(T["lc-rec-char4000"]["MiniLM-L6 (256)"]["median_tokens"])
FX = CI["formula"]
F["ovh_128"], F["ovh_256"], F["ovh_512"] = (pc(FX[k]["overhead"]) for k in ("fixed-128-16", "fixed-256-32", "fixed-512-64"))
S = CI["sentences"]
F["sent_regex_n"] = "{:,}".format(S["regex"]["sentences"]); F["sent_regex_bad"] = str(S["regex"]["split_after_abbreviation"])
F["sent_pysbd_n"] = "{:,}".format(S["pysbd 0.3.4"]["sentences"]); F["sent_pysbd_bad"] = str(S["pysbd 0.3.4"]["split_after_abbreviation"])
CR = J("chunking_rp.json")
F["lc_tok_intact"] = str(CR["lc-rec-tok256"]["intact"]); F["lc_tok_bm1024"] = f3(CR["lc-rec-tok256"]["bm25"]["budget"]["1024"])
F["lc_c1000_intact"] = str(CR["lc-rec-char1000"]["intact"]); F["lc_c4000_intact"] = str(CR["lc-rec-char4000"]["intact"])
F["lc_c4000_bm1024"] = f3(CR["lc-rec-char4000"]["bm25"]["budget"]["1024"])
F["lc_md_intact"] = str(CR["lc-md+rec-tok256"]["intact"]); F["lc_md_bm1024"] = f3(CR["lc-md+rec-tok256"]["bm25"]["budget"]["1024"])
PCh = J("parent_child.json"); P = PCh["strategies"]
g = lambda k, m="budget": f3(P[k][m]["1024"])
F["pc_sent_par_1024"] = g("sentence -> parent paragraph"); F["pc_struct_1024"] = g("structure-256 (retrieve = return)")
F["pc_par_1024"] = g("paragraph (retrieve = return)"); F["pc_win_1024"] = g("sentence window: return the 3-sentence window")
F["pc_win_ans_1024"] = g("sentence window: return the 3-sentence window", "answer"); F["pc_par_ans_1024"] = g("paragraph (retrieve = return)", "answer")
F["pc_sec_1024"] = g("structure-256 -> parent section"); F["pc_n_ext"] = str(PCh["n_extractive"])
MX = J("mixed.json")
F["mx_b_mixed"] = f3(MX["mixed (half 128, half 512)"]["recall"]["group B (512 in mixed)"]["1024"])
F["mx_b_u512"] = f3(MX["uniform 512"]["recall"]["group B (512 in mixed)"]["1024"])
# ---- BM25
B = J("bm25.json")
for ds, s in (("scifact", "sf"), ("nfcorpus", "nf")):
    R = B[ds]
    F["bm_%s_def" % s] = f3(R["default"]["test"]["ndcg10"])
    F["bm_%s_tuned" % s] = f3(R["best_on_tune"]["test"]["ndcg10"])
    F["bm_%s_tuned_k1b" % s] = "k1 %s, b %s" % tuple(R["best_on_tune"]["k1b"].split("|"))
    F["bm_%s_besttest" % s] = f3(R["best_on_test"]["test"]["ndcg10"])
    F["bm_check_%s" % s] = str(R["check_top10_scores_identical"])
    tv = R["tokenisation"]
    F["stem_gain_%s" % s] = "%.1f" % (100 * (tv["stem+stop (default)"]["ndcg10"] - tv["no stemming"]["ndcg10"]))
    F["onechar_gain_%s" % s] = "%.1f" % (100 * (tv["keep 1-char tokens"]["ndcg10"] - tv["stem+stop (default)"]["ndcg10"]))
    mv = [v["ndcg10"] for v in R["methods"].values()]
    F["bmvar_range_%s" % s] = "%s to %s" % (f3(min(mv)), f3(max(mv)))
    F["bm25f_%s" % s] = f3(R["bm25f_best_on_tune"]["test"]["ndcg10"])
    F["bm25f_%s_w" % s] = R["bm25f_best_on_tune"]["w_title|b_title"].split("|")[0]
F["bm_1char_n"] = str(B["scifact"]["queries_with_1char_token"])
F["title_len_sf"] = "%.0f" % B["scifact"]["title_len_mean"]; F["body_len_sf"] = "%.0f" % B["scifact"]["body_len_mean"]
EX = J("bm25_example.json")
k1, b = 1.2, 0.75
F["bmex_tfc7"] = "%.2f" % (7 / (7 + k1 * (1 - b + b * 111 / EX["avgdl"]))) if EX else "?"
F["bmex_tfc1"] = "%.2f" % (1 / (1 + k1 * (1 - b + b * 111 / EX["avgdl"]))) if EX else "?"
# ---- fusion
FD = J("fusion_deep.json")
M = lambda ds, m, meth: FD[ds]["models"][m]["methods"][meth]
F["fu_sf_q_rrf"] = f3(M("scifact", "qwen3-emb-0.6b", "rrf")["test"]["ndcg10"])
F["fu_sf_q_z"] = f3(M("scifact", "qwen3-emb-0.6b", "zscore")["test"]["ndcg10"])
F["fu_sf_q_mnz"] = f3(M("scifact", "qwen3-emb-0.6b", "combmnz")["test"]["ndcg10"])
F["fu_nf_q_rrf"] = f3(M("nfcorpus", "qwen3-emb-0.6b", "rrf")["test"]["ndcg10"])
F["fu_nf_q_z"] = f3(M("nfcorpus", "qwen3-emb-0.6b", "zscore")["test"]["ndcg10"])
raw = M("scifact", "qwen3-emb-0.6b", "raw")
F["raw05_sf_q"] = f3(raw["curve_test"]["0.5"]); F["raw_best_sf_q"] = f3(raw["test"]["ndcg10"]); F["raw_best_sf_q_w"] = str(raw["best_on_tune"])
ag = FD["scifact"]["models"]["qwen3-emb-0.6b"]["agreement"]; an = FD["nfcorpus"]["models"]["qwen3-emb-0.6b"]["agreement"]
F["agree_both_sf"], F["agree_bm_sf"], F["agree_de_sf"] = (pc(ag[k]["share"]) for k in ("both", "bm25_only", "dense_only"))
F["agree_both_nf"], F["agree_bm_nf"], F["agree_de_nf"] = (pc(an[k]["share"]) for k in ("both", "bm25_only", "dense_only"))
F["three_sf"] = f3(FD["scifact"]["three_lists_rrf60"]["ndcg10"]); F["two_dense_sf"] = f3(FD["scifact"]["two_dense_rrf60"]["ndcg10"])
TR = FD["scifact"]["fuse_then_rerank"]
F["ftr_rrf20"] = f3(TR["rrf k60|20"]["after"]["ndcg10"]); F["ftr_z20"] = f3(TR["z-score a0.6|20"]["after"]["ndcg10"])
F["ftr_rrf30"] = f3(TR["rrf k60|30"]["after"]["ndcg10"]); F["ftr_z30"] = f3(TR["z-score a0.6|30"]["after"]["ndcg10"])
F["ftr_rrf_before"] = f3(TR["rrf k60|10"]["before"]["ndcg10"]); F["ftr_z_before"] = f3(TR["z-score a0.6|10"]["before"]["ndcg10"])
# BM25 top-1 score range on SciFact (recorded run is not committed; the example file is): from bm25.json? use example + note
SR = J("score_ranges.json")
F["bm_top1_lo"], F["bm_top1_hi"] = "%.1f" % SR["bm25"]["top1_p5"], "%.1f" % SR["bm25"]["top1_p95"]
F["de_top1_lo"], F["de_top1_hi"] = "%.2f" % SR["qwen3-emb-0.6b"]["top1_p5"], "%.2f" % SR["qwen3-emb-0.6b"]["top1_p95"]
# ---- router
RT = J("router.json")
for ds, s in (("scifact", "sf"), ("nfcorpus", "nf")):
    R = RT[ds]
    F["rt_%s_router" % s] = f3(R["router"]); F["rt_%s_hybrid" % s] = f3(R["hybrid"]); F["rt_%s_dense" % s] = f3(R["dense"])
    F["rt_%s_oracle3" % s] = f3(R["oracle_of_three"]); F["rt_%s_auc" % s] = "%.2f" % R["router_auc_test"]
F["rt_sf_bm_better"] = str(RT["scifact"]["test_bm25_better"]); F["rt_sf_de_better"] = str(RT["scifact"]["test_dense_better"]); F["rt_sf_tie"] = str(RT["scifact"]["test_tie"])
idl = RT["scifact"]["identifier_like"]; F["rt_sf_ident_n"] = str(idl["n"]); F["rt_sf_ident_de"] = f3(idl["dense"]); F["rt_sf_ident_bm"] = f3(idl["bm25"])
# ---- MMR and duplicates
MM = J("mmr.json")
hp = MM["hotpotqa_bge-small"]
F["mmr_hp_10_5"] = str(hp["1.0"]["both_gold@5"]); F["mmr_hp_08_5"] = str(hp["0.8"]["both_gold@5"]); F["mmr_hp_05_5"] = str(hp["0.5"]["both_gold@5"])
Q = MM["qasper_fixed-256-32_bge"]
F["ov_plain"] = f3(Q["plain"]["1024"]); F["ov_drop"] = f3(Q["drop overlapping"]["1024"]); F["ov_merge"] = f3(Q["merge overlapping, pay once"]["1024"]); F["ov_mmr07"] = f3(Q["MMR 0.7"]["1024"])
F["dup_nf_995"] = str(MM["near_duplicates"]["nfcorpus"]["0.995"]["pairs"])
ex = MM["nfcorpus_dup_examples"][0]
F["dup_ex_title"] = ex["title_a"]; F["dup_ex_ids"] = "%s and %s" % (ex["a"], ex["b"])

# ---- generator-based and model-based results (filled when their out files exist)
QR = J("qrewrite.json")
if QR:
    SQ = QR["selfq"]; H = SQ["hit_at_1024_tokens"]; FC = SQ["filter_correct"]
    F["sq_n"] = str(SQ["n"])
    tot = lambda m: sum(H[m].values())
    F["sq_summary"] = "found within 1,024 tokens: %d of %d with no filter, %d with the generator's filter, %d with the right paper as the filter" % (
        tot("no filter"), SQ["n"], tot("extracted filter"), tot("oracle filter (right paper)"))
    FV = SQ["filter_correct_validated"]
    F["sq_summary"] = ("the generator added a month to all %d year-only requests, so its filter dropped the right paper for %d of them; "
                       "checking each extracted value against the request fixed that (found within 1,024 tokens, year-only requests: %d with no filter, %d raw filter, %d checked)") % (
        SQ["month_invented_in_year_requests"], FC["year"]["n"] - FC["year"]["right_paper_kept"], H["no filter"]["year"], H["extracted filter"]["year"], H["extracted filter, validated"]["year"])
    F["sq_reading"] = ("What the numbers say. The generator always produced parseable JSON (%d of %d) and resolved titles well (the right paper alone for %d of %d title requests). "
        "But it invented values: every one of the %d year-only requests came back with a month as well (always 12, December), which the request never stated, so the raw filter kept the right paper for only %d of them and found less than no filter at all (%d against %d). "
        "Dropping any extracted value that the request does not literally state (a schema check, no model) keeps the right paper for %d of %d and lifts the month-and-year requests from %d to %d found. "
        "For title requests a filter adds little (%d without, %d with): the title words in the query already pull the embedding to the right paper. "
        "The oracle row (the right paper as the filter) shows how much a correct filter is worth when the request only gives a date: %d and %d found.") % (
        SQ["json_parsed"], SQ["n"], FC["title"]["right_paper_kept"], FC["title"]["n"], SQ["month_invented_in_year_requests"], FC["year"]["right_paper_kept"],
        H["extracted filter"]["year"], H["no filter"]["year"], FV["year"]["right_paper_kept"], FV["year"]["n"], H["no filter"]["month_year"], H["extracted filter, validated"]["month_year"],
        H["no filter"]["title"], H["extracted filter"]["title"], H["oracle filter (right paper)"]["month_year"], H["oracle filter (right paper)"]["year"])
    SB = QR["step_back"]; q = SB["qwen3-emb-0.6b"]; bg = SB["bge-small"]; bm = SB["bm25"]
    k1_, k2_ = "step-back", "original + step-back (RRF)"
    F["sb_reading"] = ("Step-back hurt every retriever: alone it scores %s (Qwen3), %s (bge-small) and %s (BM25) against %s, %s and %s for the claim, and fused with the claim it still loses (%s, %s, %s). "
        "The general question retrieves general abstracts, and a SciFact claim needs the one specific study. Step-back is designed for questions that need background principles (the paper tested STEM, time-sensitive knowledge and multi-hop questions), not for specific claims.") % tuple(
        "%.3f" % x for x in (q[k1_]["ndcg10"], bg[k1_]["ndcg10"], bm[k1_]["ndcg10"], q["original"]["ndcg10"], bg["original"]["ndcg10"], bm["original"]["ndcg10"], q[k2_]["ndcg10"], bg[k2_]["ndcg10"], bm[k2_]["ndcg10"]))
    DC = QR["decomp"]; a_, b_ = DC["bge-small | question"], DC["bge-small | sub-questions + question (RRF)"]
    F["dec_reading"] = ("The 1.7 B generator mostly returned the question unchanged (%.2f sub-questions per question on average), and where it did split, fusing the lists hurt: with bge-small, questions with both gold paragraphs in the top 5 fell from %d to %d (bridge) and from %d to %d (comparison); BM25 fell the same way.") % (
        DC["n_subq_mean"], a_["bridge"]["5"], b_["bridge"]["5"], a_["comparison"]["5"], b_["comparison"]["5"])
    F["sb_sec_per"] = "%.1f" % (QR["cost"]["seconds"]["step_back"] / QR["cost"]["n"]["step_back"])
    F["dec_sec_per"] = "%.1f" % (QR["cost"]["seconds"]["decomp"] / QR["cost"]["n"]["decomp"])
PA = J("prompt_asm.json")
PA_CITE1 = PA.get("cite1_counts", {}) if PA else {}
if PA:
    R = PA["results"]; b = R["budget"]; po = R["pos"]; o = R["order"]; c = R["cite"]
    F["pa_order_first"] = "%d of %d" % (o["best-first"]["strict"], o["best-first"]["n"])
    F["pa_order_last"] = "%d" % o["best-last"]["strict"]
    F["pa_budget_reading"] = ("Strictly right answers barely move with k: %d of 188 with only the top abstract, %d at k 3, %d at k 5 and %d at k 10, while the prompt grows from {:,} to {:,} tokens on average. "
        "The reranked top 3 already holds the evidence for 178 of the 188 claims (root lab), so more abstracts add little to find; this 1.7 B model's limit is reading, not finding (it never answered CONTRADICT in any of these runs, the same failure the root lab found).") % (
        b["k1"]["strict"], b["k3"]["strict"], b["k5"]["strict"], b["k10"]["strict"])
    F["pa_budget_reading"] = F["pa_budget_reading"].format(int(b["k1"]["prompt_tokens_mean"]), int(b["k10"]["prompt_tokens_mean"]))
    P_ = lambda k: po[k]["strict"]
    F["pa_pos_summary"] = "gold abstract first, middle or last among 10: %d, %d and %d of 188 strictly right (the right label alone: %d, %d, %d)" % (
        P_("k10-first"), P_("k10-middle"), P_("k10-last"), po["k10-first"]["lenient"], po["k10-middle"]["lenient"], po["k10-last"]["lenient"])
    F["pa_pos_reading"] = ("Position matters a lot here, but not as a U: the evidence first gives %d (k 5) and %d (k 10) strictly right of 188; in the middle %d and %d; last %d and %d. "
        "Look at what changes, though: the right label barely moves (%d to %d of 188 across all six placements), the citation does. With the evidence elsewhere, the model still cites abstract [1] in %d of 188 answers at k 10 (gold in the middle) "
        "and %d (gold last), a pull toward the first abstract shown. So for this model, put the best chunk first, and treat citations to the first position with suspicion.") % (
        P_("k5-first"), P_("k10-first"), P_("k5-middle"), P_("k10-middle"), P_("k5-last"), P_("k10-last"),
        min(po[k]["lenient"] for k in po), max(po[k]["lenient"] for k in po), PA_CITE1["pos|k10-middle"], PA_CITE1["pos|k10-last"])
    q_ = c["number+quote"]
    F["pa_cite_reading"] = ("All three formats could be parsed and resolved to an abstract in the prompt for every answer (%d, %d, %d of 188), so labels the model can copy are what matters, not their style; corpus ids did as well as numbers (%d against %d strictly right). "
        "Asking for a quote changed the answers themselves: the model never answered NOT ENOUGH INFO (%d times, against %d with numbers), which raised strictly right answers to %d, "
        "but only %d of its %d quotes were found word for word in the cited abstract; the rest paraphrased or quoted the claim back. Strictly right with a verified quote: %d.") % (
        c["number"]["citation_resolved"], c["doc-id"]["citation_resolved"], q_["citation_resolved"], c["doc-id"]["strict"], c["number"]["strict"],
        q_["answered_nei"], c["number"]["answered_nei"], q_["strict"], q_["quote_verbatim"], q_["quote_given"], q_["strict_and_quote_verbatim"])
LT = J("late.json")
if LT:
    st_, fx_ = LT["strategies"]["structure-256"], LT["strategies"]["fixed-256-32"]
    g_ = lambda d, m, b: f3(d[m]["budget"][b])
    F["late_summary"] = "hurt here: paragraph-aware chunks found within 1,024 tokens %s &#8594; %s, fixed windows %s &#8594; %s (modernbert-embed-base)" % (
        g_(st_, "naive", "1024"), g_(st_, "late", "1024"), g_(fx_, "naive", "1024"), g_(fx_, "late", "1024"))
    tm = LT.get("timing_s", {})
    F["late_detail"] = ("<b>it did not help</b>. Within each question's own paper, at a 1,024-token budget, paragraph-aware chunks found %s of questions embedded one by one and %s with late chunking; "
        "fixed 256-token windows %s against %s; the top-1 chunk is right for %s against %s (paragraph-aware) <span class=\"meas\">measured</span>. "
        "The setting explains it: every chunk competing here comes from the same paper, so the document-wide context late chunking adds is shared by all of them and makes them more alike, "
        "not easier to tell apart. The published gains come from search across many documents (BEIR), where knowing which document a chunk belongs to is exactly what separates it. "
        "Cost: one pass over each whole paper (%d of 281 papers were longer than 8,192 tokens and went through in overlapping windows) took %.0f s against %.0f s for embedding the chunks one by one on MPS, because attention over long sequences costs more than over many short ones. "
        "The root lab's contextual prefixes showed the same within-paper pattern.") % (
        g_(st_, "naive", "1024"), g_(st_, "late", "1024"), g_(fx_, "naive", "1024"), g_(fx_, "late", "1024"),
        f3(st_["naive"]["k"]["1"]), f3(st_["late"]["k"]["1"]), tm.get("papers_over_8192", 0), tm.get("structure-256 late", 0), tm.get("structure-256 naive", 0))
SPJ = J("sparse.json")
if SPJ:
    a, b = SPJ["scifact"], SPJ["nfcorpus"]; tm = SPJ["timing"]
    F["sparse_detail"] = ("opensearch-neural-sparse-encoding-doc-v3-distill (67 M parameters, Apache 2.0) through sentence-transformers' SparseEncoder, documents encoded on MPS (%.0f and %.0f documents per second, load average about 11 to 18 from other jobs). "
        "nDCG@10: SciFact %s against %s for BM25 and %s for Qwen3-Embedding; NFCorpus %s against %s and %s <span class=\"meas\">measured</span>. "
        "Fused with Qwen3-Embedding by RRF it scores %s (SciFact) and %s (NFCorpus), level with BM25 + Qwen3 (%s, %s). "
        "A document keeps %.0f non-zero terms on average and a query %.0f (SciFact) or %.0f (NFCorpus), so the index stays an inverted index. "
        "<b>Caveat:</b> the model card lists SciFact and NFCorpus among its training sets, so these scores are in-domain and flatter it against BM25 and the dense models, which never saw these sets.") % (
        tm["scifact"]["docs_per_s"], tm["nfcorpus"]["docs_per_s"], f3(a["sparse"]["ndcg10"]), f3(a["bm25"]["ndcg10"]), f3(a["qwen3"]["ndcg10"]),
        f3(b["sparse"]["ndcg10"]), f3(b["bm25"]["ndcg10"]), f3(b["qwen3"]["ndcg10"]), f3(a["rrf(sparse, qwen3)"]["ndcg10"]), f3(b["rrf(sparse, qwen3)"]["ndcg10"]),
        f3(a["rrf(bm25, qwen3)"]["ndcg10"]), f3(b["rrf(bm25, qwen3)"]["ndcg10"]), a["doc_nonzeros_mean"], a["query_nonzeros_mean"], b["query_nonzeros_mean"])

json.dump(F, open(os.path.join(HERE, "facts.json"), "w"), indent=0, ensure_ascii=False)
print(len(F), "facts")

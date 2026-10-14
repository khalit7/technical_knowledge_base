"""Turn src/data/*.json (measured here) and inputs/*.json (published prices, the constructed corpus) into
parts/22_prd_data.js (what the page's JavaScript reads) and facts.json (every number the prose writes as @@key@@,
filled in by build.sh), so prose and data cannot disagree. Files that a timed run has not produced yet are skipped,
and their facts are left unfilled (build.sh reports them). usage: python3 build_data.py"""
import json
import os
import sys

sys.dont_write_bytecode = True

H = os.path.dirname(os.path.abspath(__file__))


def D(n, sub="data"):
    p = os.path.join(H, sub, n)
    return json.load(open(p)) if os.path.exists(p) else None


f2 = lambda x: "%.2f" % x
f3 = lambda x: "%.3f" % x
comma = lambda x: "{:,}".format(int(round(x)))
pct = lambda x: "%.0f" % (100 * x)
F = {}
E = {}  # embedded data

# ---------------- semantic cache on SciFact claims
C = D("cache_scifact.json")
E["cache"] = C
q = C["models"]["qwen3-emb-0.6b"]
F["c_n"] = comma(C["n_claims"])
F["c_opp_pairs"] = comma(q["pairs"]["opposite_n"])
F["c_same_pairs"] = comma(q["pairs"]["same_n"])
F["c_opp_med"] = f3(q["pairs"]["opposite_sim_pct"][2])
F["c_same_med"] = f3(q["pairs"]["same_sim_pct"][2])
r90 = {r["t"]: r for r in q["answer_cache"]}
for t, k in ((0.95, "95"),):
    r = r90[t]
    F["c_hits_" + k] = comma(r["hits"])
    F["c_opp_" + k] = comma(r["opposite"])
    F["c_same_" + k] = comma(r["same"])
    F["c_oppshare_" + k] = pct(r["opposite"] / r["hits"])
F["c_oppshare_90"] = pct(r90[0.9]["opposite"] / r90[0.9]["hits"])
for m, key in (("minilm-l6", "mini"), ("bge-small", "bge"), ("gte-modernbert", "gte")):
    r = {x["t"]: x for x in C["models"][m]["answer_cache"]}[0.9]
    F["c_oppshare_90_" + key] = pct(r["opposite"] / r["hits"])
rc = q["result_cache"]
F["rc_n"] = comma(rc["n_test"])
F["rc_none"] = f3(rc["ndcg_no_cache"])
rr = {x["t"]: x for x in rc["rows"]}
F["rc_hits_90"] = comma(rr[0.9]["hits"])
F["rc_ndcg_90"] = f3(rr[0.9]["ndcg"])
F["rc_worse_90"] = comma(rr[0.9]["hits_worse"])
F["rc_better_90"] = comma(rr[0.9]["hits_better"])
ex = q["examples"][0]

# ---------------- access control in pgvector
A = D("acl_pg.json")
E["aclpg"] = {k: v for k, v in A.items() if k != "plans"}
E["aclpg"]["plans"] = {k: A["plans"][k] for k in ("hr", "contractor")}
U = A["users"]
F["pg_ver"] = A["info"]["pg"].replace("PostgreSQL ", "").split(" ")[0]
F["pgv_ver"] = A["info"]["pgvector"]
F["acl_ndocs"] = comma(A["info"]["n_docs"])
for u in [x for x in U if x != "admin"]:
    F["sh_" + u] = "%.1f" % (100 * U[u]["share"])
    md = U[u]["modes"]
    F["leakq_" + u] = f2(md["unfiltered"]["leaked_per_query"])
F["leak_contr_rows"] = comma(U["contractor"]["modes"]["unfiltered"]["leaked_rows"])
for u in ("hr",):
    m = U[u]["modes"]
    F["prep_rows_" + u] = f2(m["rls_prepared"]["rows_mean"])  # (legal's row count below)
    F["prep_empty_" + u] = comma(m["rls_prepared"]["queries_empty"])
    F["prep_rec_" + u] = f3(m["rls_prepared"]["recall10"])
    F["relax_rec_" + u] = f3(m["rls_hnsw_relaxed"]["recall10"])
    F["strict_rec_" + u] = f3(m["rls_hnsw_strict"]["recall10"])
    F["plan_rec_" + u] = f3(m["rls_planner"]["recall10"])
F["prep_rows_legal"] = f2(U["legal"]["modes"]["rls_prepared"]["rows_mean"])
F["owner_leak_contr"] = comma(U["contractor"]["modes"]["owner"]["leaked_rows"])
F["forced_leaks"] = comma(sum(U[u]["modes"]["owner_forced"]["leaked_rows"] for u in U))
F["rls_leaks"] = comma(sum(U[u]["modes"][m]["leaked_rows"] for u in U for m in U[u]["modes"] if m.startswith("rls")))
F["setgroups_rows"] = comma(A["user_can_set_groups"])
for g, n in A["info"]["group_share"].items():
    F["g_" + g] = "%.0f" % (100 * n / A["info"]["n_docs"])
F["g_hr_n"] = comma(A["info"]["group_share"]["hr"])
VX = json.load(open(os.path.join(H, "..", "..", "vector_indexes", "src", "facts.json")))  # sibling's published facts
F["vix_del_tomb"] = VX["del50_tomb_nd"]; F["vix_del_reb"] = VX["del50_reb_nd"]

# ---------------- backfill
B = D("backfill.json")
E["backfill"] = B
rows = {r["f"]: r for r in B["rows"]}
F["bf_old"] = f3(rows[0.0]["ndcg_old_query"])
F["bf_new"] = f3(rows[1.0]["ndcg_new_query"])
F["bf_half_old"] = f3(rows[0.5]["ndcg_old_query"])
F["bf_half_new"] = f3(rows[0.5]["ndcg_new_query"])
F["bf_cross_no"] = f3(B["cross"]["new_query_old_index"])
F["bf_cross_on"] = f3(B["cross"]["old_query_new_index"])
F["bf_10_new"] = f3(rows[0.1]["ndcg_new_query"])
F["bf_scale_bge"] = f3(B["scale"]["bge-small"]["all_median"])
F["bf_scale_mini"] = f3(B["scale"]["minilm-l6"]["all_median"])

# ---------------- monitoring
M = D("monitor.json")
E["monitor"] = M
ci = M["ci"]
F["ci_base"] = f3(M["baseline_ndcg"])
F["ci_ivf8_ndcg"] = f3(ci["IVF nprobe 8"]["ndcg"])
F["ci_ivf8_p50"] = pct(ci["IVF nprobe 8"]["power"]["50"])
F["ci_ivf8_p100"] = pct(ci["IVF nprobe 8"]["power"]["100"])
F["ci_ivf8_p25"] = pct(ci["IVF nprobe 8"]["power"]["25"])
F["ci_hnsw16_ndcg"] = f3(ci["HNSW efSearch 16"]["ndcg"])
F["ci_hnsw16_changed"] = comma(ci["HNSW efSearch 16"]["changed_queries"])
F["ci_hnsw16_p300"] = pct(ci["HNSW efSearch 16"]["power"]["300"])
F["ci_ivf1_p10"] = pct(ci["IVF nprobe 1"]["power"]["10"])
F["ci_ivf1_ndcg"] = f3(ci["IVF nprobe 1"]["ndcg"])
F["ci_nopref_ndcg"] = f3(ci["prefix dropped"]["ndcg"])
F["ci_nopref_changed"] = comma(ci["prefix dropped"]["changed_queries"])
dr = M["drift"]
F["dr_sci"] = f3(dr["scifact"]["pct"][2]); F["dr_nf"] = f3(dr["nfcorpus"]["pct"][2]); F["dr_hp"] = f3(dr["hotpotqa"]["pct"][2])
F["dr_sci_p10"] = f3(dr["scifact"]["pct"][0]); F["dr_hp_p90"] = f3(dr["hotpotqa"]["pct"][4])

# ---------------- purge
P = D("purge_pg.json")
P = {k: v for k, v in P.items() if k != "marker"}
E["purge"] = P

# ---------------- prices
PR = D("prices.json", "inputs")
E["prices"] = PR
E["aclcorpus"] = D("acl_corpus.json", "inputs")

# ---------------- cost model defaults (cost_model.py; the page's JS repeats the formulas)
import importlib.util
spec = importlib.util.spec_from_file_location("cost_model", os.path.join(H, "cost_model.py")); CM = importlib.util.module_from_spec(spec); spec.loader.exec_module(CM)
E["costdef"] = CM.DEFAULTS
c0 = CM.cost(CM.DEFAULTS)
usd = lambda x: "$%.5f" % x if x < 0.001 else "$%.4f" % x
F["co_total"] = usd(c0["total"]); F["co_gen"] = usd(c0["generate"]); F["co_rerank"] = usd(c0["rerank"])
F["co_month"] = "$" + comma(c0["total"] * CM.DEFAULTS["queries_month"])
F["co_rerank_share"] = pct(c0["rerank"] / c0["total"]); F["co_gen_share"] = pct(c0["generate"] / c0["total"])
F["co_gb"] = "%.0f" % c0["gb"]; F["co_init"] = "$%.0f" % c0["initial_embed"]; F["co_storage_month"] = "$%.0f" % (c0["storage"] * CM.DEFAULTS["queries_month"])
hk = dict(CM.DEFAULTS, p_in=0.10, p_cached=0.01, p_out=0.50)
F["co_gen_haiku"] = usd(CM.cost(hk)["generate"])
l4 = [x for x in PR["instances_usd_per_hour"] if "g6.xlarge" in x["name"]][0]["usd"]
F["l4_month"] = "$" + comma(l4 * 730); F["l4_hour"] = "$%.4f" % l4
F["be_rerank"] = "%.1f million" % (l4 * 730 / c0["rerank"] / 1e6)
F["rerank_tok"] = comma(CM.DEFAULTS["q_tok"] * CM.DEFAULTS["K"] + CM.DEFAULTS["K"] * CM.DEFAULTS["chunk_tok"])
F["gen_in_tok"] = comma(CM.DEFAULTS["sys_tok"] + CM.DEFAULTS["k"] * CM.DEFAULTS["chunk_tok"] + CM.DEFAULTS["q_tok"])

# ---------------- the constructed-corpus retrieval (generation not run yet: bench lock)
CX = D("acl_contexts.json")
E["aclctx"] = CX
F["ctx_n"] = comma(len(CX["restricted"])); F["ctx_in4"] = comma(sum(r["target"] in r["top4"] for r in CX["restricted"]))
F["inj_n"] = comma(len(CX["injection"])); F["inj_in4"] = comma(sum("P5" in r["top4"] for r in CX["injection"]))
G = D("acl_llm.json")
if G:
    # A leak counts only markers that do not already appear in the question (a model repeating "improvement plan" from
    # the question reveals nothing); the strict count is kept beside it.
    MK = {q: it["marker"] for it in D("acl_corpus.json", "inputs")["questions"] for q in it["q"]}
    sfx = D("acl_corpus.json", "inputs")["authority_suffix"]
    for name, mm in G["models"].items():
        for r in mm["rows"]:
            base = r["q"].replace(sfx, "")
            r["leak_new"] = any(m.lower() in r["text"].lower() and m.lower() not in base.lower() for m in MK[base])
        for c, sm in mm["summary"].items():
            sm["leaks_new"] = sum(1 for r in mm["rows"] if r["cond"] == c and r["leak_new"])
    E["aclllm"] = G
    mk = D("acl_corpus.json", "inputs")["injection_marker"]
    for name, key in (("qwen3-1.7b", "17"), ("qwen3-4b", "4")):
        F["spill_" + key] = comma(sum(mk in r["text"] for r in G["models"][name]["rows"]))
    F["acl_rows_n"] = comma(len(G["models"]["qwen3-1.7b"]["rows"]))
    F["p5_in_filt"] = comma(sum("P5" in r["top4_filtered"] for r in CX["restricted"]))
    for name, key in (("qwen3-1.7b", "17"), ("qwen3-4b", "4")):
        if name not in G["models"]:
            continue
        sm = G["models"][name]["summary"]; i = G["models"][name]["injection_summary"]
        F["pl_" + key] = comma(sm["prompt_rule"]["leaks_new"]); F["plc_" + key] = comma(sm["prompt_rule_claim"]["leaks_new"])
        F["rf_" + key] = comma(sm["retrieval_filter"]["leaks_new"]); F["pl_n"] = comma(sm["prompt_rule"]["n"])
        F["inj_plain_" + key] = comma(i["plain"]["followed"]); F["inj_spot_" + key] = comma(i["spotlight"]["followed"])

T = D("ttft.json")
if T:
    E["ttft"] = T
    import statistics as st
    for name, key in (("qwen3-1.7b", "17"), ("qwen3-4b", "4")):
        sw = T["models"][name]["sweep"]
        for tgt in (256, 8192):
            F["tt%s_%d" % (key, tgt)] = comma(st.median([r["ttft_ms"] for r in sw if r["target"] == tgt]))
        F["tt%s_8192_n" % key] = comma(st.median([r["prompt_n"] for r in sw if r["target"] == 8192]))
        pre = T["models"][name]["prefix"]
        F["pre%s_first" % key] = comma(pre[0]["ttft_ms"]); F["pre%s_hit" % key] = comma(st.median([r["ttft_ms"] for r in pre[1:]]))
        F["dec%s" % key] = "%.0f" % st.median([r["gen_tps"] for r in sw if r["gen_tps"]])
    F["pre_n"] = comma(T["models"]["qwen3-1.7b"]["prefix"][0]["prompt_n"])
    F["tt_load"] = "%s to %s" % (T["loadavg_start"][0], T["loadavg_end"][0])
E2 = D("e2e_latency.json")
if E2:
    E["e2e"] = {k: v for k, v in E2.items() if k != "passes"}
    s2 = E2["summary"]
    for k in ("embed", "search", "rerank", "ttft", "wall_to_first_token", "gen_total"):
        for p_ in (("p50", "p90") if k in ("ttft", "wall_to_first_token", "search") else ("p50",)):
            v = s2[k][p_]
            F["e2e_%s_%s" % (k, p_)] = comma(v) if v >= 10 else "%.1f" % v
    F["e2e_prompt_n"] = comma(s2["prompt_n"]["p50"])
    F["e2e_load"] = "%s to %s" % (E2["loadavg"][0][1][0], E2["loadavg"][-1][1][0])

# ---------------- latency inputs reused from the running example and siblings (with their sources)
E["lat"] = {
    "embed": {"src": "root src/data/README.md, single-query encode, batch 1, 100 test queries after warm-up, 2026-10-13/14",
              "models": {"minilm-l6": [5.9, 8.2, 7.1, 8.1], "bge-small": [10.0, 10.7, 12.8, 15.3],
                         "gte-modernbert": [19.4, 32.0, 32.9, 50.7], "qwen3-emb-0.6b": [51.3, 68.4, 545.8, 868.8]}},
    "embed_load": {"minilm-l6": "3.0 to 2.7", "bge-small": "2.7 to 1.5", "gte-modernbert": "4.0 to 6.4", "qwen3-emb-0.6b": "6.1 to 11.8"},
    "rerank_load": {"ce-minilm-l6": "4.2 to 4.0 and 2.9 to 3.3", "bge-reranker-v2-m3": "1.8 to 1.0", "qwen3-reranker-0.6b": "12.7 to 1.4"},
    "rerank_pairs_per_s": {"src": "root src/data/README.md, MPS, fp16 for the two large models",
                           "ce-minilm-l6": 232.4, "bge-reranker-v2-m3": 14.5, "qwen3-reranker-0.6b": 5.0},
    "search_other": {"src": "Vector indexes page (FACTS.md, vix), one thread, bench lock: Quora 522,931 x 384",
                     "exact_quora_ms": 22.0, "hnsw_quora_ms": 0.19},
    "abstract_tokens": round(1.70e6 / 5183),
    "scan_gbps": float(VX["exact_gbps"]),
}
PG = D("pip_gen_summary.json")
if PG:
    E["pipgen"] = PG
    F["pip_prefill"] = comma(PG["run"]["prompt_tps_median"]); F["pip_decode"] = "%.1f" % PG["run"]["gen_tps_median"]
    F["pip_answers"] = comma(PG["run"]["answers"]); F["pip_load"] = "%s to %s" % (PG["run"]["loadavg_before"][0], PG["run"]["loadavg_after"][0])
    rate = lambda n: [r for r in PG["rows"] if r["tokens"][0] <= n < r["tokens"][1]][0]["prefill_tps_p50"]
    nk = lambda k: 80 + k * round(1.70e6 / 5183)
    F["tt_k5"] = comma(1000 * nk(5) / rate(nk(5))); F["tt_k5_n"] = comma(nk(5))
    F["tt_k1"] = comma(1000 * nk(1) / rate(nk(1))); F["tt_k10"] = comma(1000 * nk(10) / rate(nk(10))); F["tt_k10_n"] = comma(nk(10))
    F["scan_gbps"] = VX["exact_gbps"]
    F["exact_sci_ms"] = "%.1f" % (5183 * 1024 * 4 / (float(VX["exact_gbps"]) * 1e9) * 1000)
E["f"] = F
with open(os.path.join(H, "parts", "22_prd_data.js"), "w") as f:
    f.write("// generated by build_data.py from src/data and src/inputs; do not edit\n")
    f.write("window.PRD=" + json.dumps(E, separators=(",", ":"), ensure_ascii=False) + ";\n")
json.dump(F, open(os.path.join(H, "facts.json"), "w"), indent=1)
print(len(F), "facts;", os.path.getsize(os.path.join(H, "parts", "22_prd_data.js")), "bytes of data")

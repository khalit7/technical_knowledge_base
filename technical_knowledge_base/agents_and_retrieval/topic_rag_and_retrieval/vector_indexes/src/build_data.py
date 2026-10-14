"""Turn src/data/*.json into parts/22_vix_data.js (what the page's JavaScript reads) and facts.json (every number
written in the prose as @@key@@, filled in by build.sh), so prose and data cannot disagree.
usage: python3 build_data.py"""
import json
import math
import os

H = os.path.dirname(os.path.abspath(__file__))
D = lambda n: json.load(open(os.path.join(H, "data", n)))
R = D("results.json")
hn = D("hnsw_anim.json")
pq = D("ivfpq_anim.json")
pcx = R["port_check"]
hn["check"] = "%d of %d neighbour lists identical to hnswlib's" % (pcx["identical_order"], pcx["lists"])


def f3(x):
    return "%.3f" % x


def f2(x):
    return "%.2f" % x


def comma(x):
    return "{:,}".format(int(round(x)))


F = {}
# ---- exact search
bq = R["bench"]["quora"]; ba = R["bench"]["all4"]
es = {r["n"]: r for r in bq["exact_scaling"]}
med = lambda a: sorted(a)[len(a) // 2]
qrow = es[522931]
q_ms = med(qrow["ms_per_query_passes"])
gbps = 522931 * 384 * 4 / (q_ms / 1000) / 1e9
F["exact_gbps"] = "%.0f" % gbps
F["exact_quora_ms"] = "%.0f" % q_ms
F["exact_quora_batch_ms"] = "%.0f" % qrow["ms_batched_200"]
F["exact_1m1024_ms"] = "%.0f" % (1e6 * 1024 * 4 / (gbps * 1e9) * 1000)
arow = {r["n"]: r for r in ba["exact_scaling"]}[25039]
a_ms = med(arow["ms_per_query_passes"])
F["exact_all4_ms"] = f2(a_ms)
F["exact_all4_batch_ms"] = f2(arow["ms_batched_200"])
F["exact_batch_x"] = "%.0f" % (a_ms / arow["ms_batched_200"])
# ---- recall vs nDCG on SciFact
ex = R["ivf"]["scifact_exact"]["ndcg@10"]
F["exact_ndcg"] = f3(ex)
pts = []
for g in R["hnsw"]["scifact_qwen3"]["grid"]:
    for r in g["rows"]:
        pts.append((r["recall10"], r["ndcg@10"]))
for g in R["ivf"]["scifact_qwen3"]:
    for r in g["rows"]:
        pts.append((r["recall10"], r["ndcg@10"]))
band = [n for rc, n in pts if 0.88 <= rc <= 0.92]
F["ndcg_at90_lo"] = f3(min(band)); F["ndcg_at90_hi"] = f3(max(band))
F["ndcg_at90_pct"] = "%.0f to %.0f%%" % (100 * min(band) / ex, 100 * max(band) / ex)
g1620 = [g for g in R["hnsw"]["scifact_qwen3"]["grid"] if g["M"] == 16 and g["efc"] == 200][0]
r40 = [r for r in g1620["rows"] if r["ef"] == 40][0]
pass  # (r40 kept for reference)
# ---- IVF
iv = R["ivf"]
cr = iv["cell_rank_of_true_neighbours"]
F["ivf_rank1_pct"] = "%.0f" % (100 * cr["hist"]["1"] / cr["total"])
g72 = [g for g in iv["scifact_qwen3"] if g["nlist"] == 72][0]
row = lambda g, p: [r for r in g["rows"] if r["nprobe"] == p][0]
F["ivf72_np1"] = f3(row(g72, 1)["recall10"]); F["ivf72_np8"] = f3(row(g72, 8)["recall10"]); F["ivf72_np32"] = f3(row(g72, 32)["recall10"])
ts = {t["train_n"]: t for t in iv["train_sample"]}
t5, t100 = ts[min(ts)], ts[max(ts)]
F["ivf_tr100"] = f3([r for r in t100["rows"] if r["nprobe"] == 8][0]["recall10"]); F["ivf_tr5"] = f3([r for r in t5["rows"] if r["nprobe"] == 8][0]["recall10"])
F["ivf_tr5_cv"] = f2(t5["list_cv"]); F["ivf_tr100_cv"] = f2(t100["list_cv"])
F["ivf_seed_a"] = f3(row(g72, 1)["recall10"]); F["ivf_seed_b"] = f3([r for r in t100["rows"] if r["nprobe"] == 1][0]["recall10"])
dr = iv["drift"]
F["drift_nlist"] = str(dr["nlist"])
F["drift_old_max"] = comma(dr["trained_on_scifact_only"]["list_sizes"]["max"]); F["drift_new_max"] = comma(dr["retrained_on_all"]["list_sizes"]["max"])
o16 = [r for r in dr["trained_on_scifact_only"]["rows"] if r["nprobe"] == 16][0]; n16 = [r for r in dr["retrained_on_all"]["rows"] if r["nprobe"] == 16][0]
F["drift_old_16"] = f3(o16["recall10"]); F["drift_new_16"] = f3(n16["recall10"])
F["drift_old_ndis16"] = comma(o16["ndis"]); F["drift_new_ndis16"] = comma(n16["ndis"])
# ---- quantization (SciFact)
qs = {r["name"]: r for r in R["quant"]["scifact"]["rows"]}
F["sq8_rec"] = f3(qs["Scalar int8 (SQ8)"]["recall10"]); F["sq4_rec"] = f3(qs["Scalar int4 (SQ4)"]["recall10"])
F["pq16_rec"] = f3(qs["PQ m=16"]["recall10"]); F["pq16_rs_rec"] = f3(qs["PQ m=16 + rescore x10"]["recall10"]); F["pq16_rs40_rec"] = f3(qs["PQ m=16 + rescore x40"]["recall10"])
F["pq8_mse"] = f3(qs["PQ m=8"]["mse"]); F["pq256_mse"] = f3(qs["PQ m=256"]["mse"])
F["opq16_rec"] = f3(qs["OPQ m=16"]["recall10"]); F["pq64_rec"] = f3(qs["PQ m=64"]["recall10"]); F["opq64_rec"] = f3(qs["OPQ m=64"]["recall10"])
F["bin_rec"] = f3(qs["Binary (1 bit), no rescoring"]["recall10"]); F["bin100_rec"] = f3(qs["Binary (1 bit), rescore 100"]["recall10"])
F["rabitq_rec"] = f3(qs["RaBitQ (1 bit)"]["recall10"]); F["rabitq_rs_rec"] = f3(qs["RaBitQ + rescore x10"]["recall10"])
F["ivfpq32_plateau"] = f2(max(qs["IVF72,PQ32 nprobe %d" % p]["recall10"] for p in (1, 4, 8, 16, 32)))
F["ivfpq32_rs32"] = f3(qs["IVF72,PQ32 nprobe 32 + rescore x10"]["recall10"])
# ---- HNSW
F["port_same"] = comma(pcx["identical_order"]); F["port_lists"] = comma(pcx["lists"])
gr = {(g["M"], g["efc"]): g for g in R["hnsw"]["scifact_qwen3"]["grid"]}
F["m4_unreach"] = str(gr[(4, 16)]["graph"]["unreachable_layer0"]); F["m8_unreach"] = str(gr[(8, 16)]["graph"]["unreachable_layer0"])
ef = lambda g, e: [r for r in g["rows"] if r["ef"] == e][0]
F["m16_efc40"] = f3(ef(gr[(16, 40)], 40)["recall10"]); F["m16_efc100"] = f3(ef(gr[(16, 100)], 40)["recall10"]); F["m16_efc200"] = f3(ef(gr[(16, 200)], 40)["recall10"])
F["m16_ef10"] = f3(ef(gr[(16, 200)], 10)["recall10"]); F["m16_ef10_nd"] = comma(ef(gr[(16, 200)], 10)["ndis"])
F["m16_ef100"] = f3(ef(gr[(16, 200)], 100)["recall10"]); F["m16_ef100_nd"] = comma(ef(gr[(16, 200)], 100)["ndis"])
F["hnswlib_pg"] = f3([r for r in R["hnsw"]["hnswlib_bge"][1]["rows"] if r["ef"] == 40][0]["recall10"])
va = R["variants"]["all4"]["variants"]
v40 = lambda k: [r for r in va[k]["rows"] if r["ef"] == 40][0]["recall10"]
F["var_hnsw_40"] = f3(v40("hnsw")); F["var_flat_40"] = f3(v40("flat")); F["var_simple_40"] = f3(v40("simple"))
F["var_simple_gap"] = "%.0f" % (100 * (v40("hnsw") - v40("simple")))
# ---- Vamana
vm = R["vamana"]; vr = {r["alpha"]: r for r in vm["rows"]}
L40 = lambda a: [x for x in vr[a]["search"] if x["L"] == 40][0]
F["vam_a12_l40_hops"] = "%.0f" % L40(1.2)["hops"]; F["vam_a12_l40"] = f3(L40(1.2)["recall10"])
h40 = [x for x in vm["hnsw_same_vectors"]["rows"] if x["ef"] == 40][0]
F["hnsw_cmp_40_hops"] = "%.0f" % h40["hops"]; F["hnsw_cmp_40"] = f3(h40["recall10"])
F["vam_a1_deg"] = "%.1f" % vr[1.0]["deg_mean"]
F["vam_a1_rank"] = "%.0f" % vr[1.0]["edge_ranks"]["median_rank"]; F["vam_a12_rank"] = "%.0f" % vr[1.2]["edge_ranks"]["median_rank"]
F["vam_a1_far"] = "%.0f%%" % (100 * vr[1.0]["edge_ranks"]["share_rank_gt50"]); F["vam_a12_far"] = "%.0f%%" % (100 * vr[1.2]["edge_ranks"]["share_rank_gt50"])
F["vam_nn10"] = f2(vm["median_10nn_dist"]); F["vam_a1_len"] = f2(vr[1.0]["edge_len_median"])
# ---- ScaNN
sc = R["scann"]["sets"]["scifact"]["rows"]
pick = lambda cb, an: [r for r in sc if r["tree"] is None and r["code_bytes"] == cb and r["anisotropic"] == an and r["reorder"] == 0][0]["recall10"]
F["scann_ani_256"] = f3(pick(256, True)); F["scann_iso_256"] = f3(pick(256, False)); F["scann_ani_64"] = f3(pick(64, True)); F["scann_iso_64"] = f3(pick(64, False))
F["scann_tree16"] = f3([r for r in sc if r["tree"] and r["leaves_to_search"] == 16 and r["anisotropic"]][0]["recall10"])
# ---- filters
fq = R["filter"]["qasper"]
gs = lambda rows, s, st: [r for r in rows if r["strategy"] == s and r["setting"] == st][0]
F["filt_q_share"] = "%.2f" % (100 * fq["own_share"])
F["post_own_rec"] = f2(gs(fq["own"], "post-filter", "k'=100")["recall10"]); F["post_own_ret"] = "%.1f" % gs(fq["own"], "post-filter", "k'=100")["returned"]
F["post_other_rec"] = f2(gs(fq["other"], "post-filter", "k'=100")["recall10"]); F["post_other_empty"] = str(gs(fq["other"], "post-filter", "k'=100")["empty"])
F["ingraph_own_ndis"] = comma(gs(fq["own"], "in-graph (hnswlib rule)", "ef=100")["ndis"]); F["pre_own_ndis"] = "%.0f" % gs(fq["own"], "pre-filter + exact", "")["ndis"]
sel = {x["s"]: x for x in R["filter"]["all4"]["selectivity"]}
F["pre_s01"] = comma(gs(sel[0.01]["rows"], "pre-filter + exact", "")["ndis"]); F["pre_s10"] = comma(gs(sel[0.1]["rows"], "pre-filter + exact", "")["ndis"])
F["pre_s005"] = comma(gs(sel[0.005]["rows"], "pre-filter + exact", "")["ndis"])
F["ing_s01"] = comma(gs(sel[0.01]["rows"], "in-graph (hnswlib rule)", "ef=100")["ndis"]); F["ing_s10"] = comma(gs(sel[0.1]["rows"], "in-graph (hnswlib rule)", "ef=100")["ndis"])
ss = sorted(sel)
cross = next(s for s in ss if gs(sel[s]["rows"], "in-graph (hnswlib rule)", "ef=100")["ndis"] < gs(sel[s]["rows"], "pre-filter + exact", "")["ndis"])
prev = ss[ss.index(cross) - 1]
F["filt_cross"] = "%g to %g" % (100 * prev, 100 * cross)
ac = {x["s"]: x["rows"] for x in R["acorn"]["all4"]["selectivity"]}
a100 = lambda s: gs(ac[s], "ACORN-1 (unpruned graph)", "ef=100")
F["acorn_s01"] = f3(a100(0.01)["recall10"]); F["acorn_s01_nd"] = comma(a100(0.01)["ndis"])
F["acorn_s10"] = f3(a100(0.1)["recall10"]); F["acorn_s10_nd"] = comma(a100(0.1)["ndis"]); F["acorn_s001"] = f3(a100(0.001)["recall10"]); F["acorn_s100"] = f3(a100(1.0)["recall10"])
F["twohop_own"] = f3(gs(fq["own"], "ACORN-1-style", "ef=100")["recall10"])
F["acorn_own"] = f3(gs(R["acorn"]["qasper"]["own"], "ACORN-1 (unpruned graph)", "ef=100")["recall10"])
F["twohop_s01"] = f3(gs(sel[0.01]["rows"], "ACORN-1-style", "ef=100")["recall10"])
F["qd_own_16"] = f3([r for r in R["qdrant"]["rows"] if r["collection"] == "vix_qasper_graph" and r["filter"] == "own paper" and r["hnsw_ef"] == 16][0]["recall10"])
# ---- updates
up = {r["deleted_share"]: r for r in R["updates"]["rows"]}
F["del50_tomb_nd"] = comma(up[0.5]["tomb_ef40"]["ndis"]); F["del50_reb_nd"] = comma(up[0.5]["rebuilt_ef40"]["ndis"])
rp = R["updates"]["replace_deleted"]
F["repl_ef10"] = f3(rp["ef10_recall10"]); F["fresh_ef10"] = f3(rp["fresh_ef10_recall10"]); F["repl_ef40"] = f3(rp["ef40_recall10"]); F["fresh_ef40"] = f3(rp["fresh_ef40_recall10"])
# ---- builds and Frontier facts
bl = lambda s, lab: [b for b in R["bench"][s]["builds"] if b["label"] == lab][0]["build_s"]
F["b_hnsw_sci"] = f2(bl("scifact", "FAISS HNSW16 efC100")); F["b_hnsw_all4"] = "%.1f" % bl("all4", "FAISS HNSW16 efC100"); F["b_hnsw_quora"] = "%.0f" % bl("quora", "FAISS HNSW16 efC100")
F["b_hnswlib_sci"] = "%.1f" % bl("scifact", "hnswlib M16 efC200 (defaults)"); F["b_hnswlib_all4"] = "%.0f" % bl("all4", "hnswlib M16 efC200 (defaults)")
ivl = lambda s: [b for b in R["bench"][s]["builds"] if b["family"] == "ivf"][0]["build_s"]
ivpl = lambda s: [b for b in R["bench"][s]["builds"] if b["family"] == "ivfpq"][0]["build_s"]
F["b_ivf_all4"] = f2(ivl("all4")); F["b_ivf_quora"] = "%.1f" % ivl("quora"); F["b_ivfpq_all4"] = "%.0f" % ivpl("all4")
hq = [r for r in bq["rows"] if r["label"] == "FAISS HNSW M16 ef 64"][0]
F["hnsw_quora_rec"] = f3(hq["recall10"]); F["hnsw_quora_ms"] = f2(hq["ms_p50"])
F["hnswlib_quora_40"] = f3([r for r in bq["rows"] if r["label"] == "hnswlib M16 ef 40"][0]["recall10"])
F["ivf_np1_ms"] = "%.3f" % [r for r in R["bench"]["scifact"]["rows"] if r["label"] == "IVF72,Flat nprobe 1"][0]["ms_p50"]

if R.get("scale"):
    sr = {r["n"]: r for r in R["scale"]["rows"]}
    F["sc_ivf95_a"] = comma(sr[10000]["at_0.95"]["ivf_ndis"]); F["sc_ivf95_b"] = comma(sr[522931]["at_0.95"]["ivf_ndis"])
    F["sc_hnsw95_a"] = comma(sr[10000]["at_0.95"]["hnsw_ndis"]); F["sc_hnsw95_b"] = comma(sr[522931]["at_0.95"]["hnsw_ndis"])
    F["sc_ivf99_a"] = comma(sr[10000]["at_0.99"]["ivf_ndis"]); F["sc_ivf99_b"] = comma(sr[522931]["at_0.99"]["ivf_ndis"])
js = "window.VIX=" + json.dumps({"hnsw": hn, "pq": pq, "r": R, "f": F}, separators=(",", ":")) + ";\n"
open(os.path.join(H, "parts", "22_vix_data.js"), "w").write("// generated by build_data.py from data/*.json; do not edit\n" + js)
json.dump(F, open(os.path.join(H, "facts.json"), "w"), indent=1)
print("facts", len(F), "data js bytes", len(js))

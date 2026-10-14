"""Turn data/*.json (written by scripts/) into parts/22_gr_data.js (what the page's JavaScript reads, as window.GR) and
facts.json (the numbers the prose quotes as @@key@@, filled by build.sh). Results of runs that are still pending are
absent from data/; their facts read "pending" and the labs show a pending box until the files exist.
Also reads the root Agentic lab's committed results (../../src/agent/out/strategies.json) for the dense single-shot and
agent rows. Run: python3 build_data.py   (plain Python 3, no third-party packages)
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
D = os.path.join(HERE, "data")
ROOT_OUT = os.path.normpath(os.path.join(HERE, "..", "..", "src", "agent", "out"))
PEND = '<span class="gr-pend">pending</span>'


def ld(name, root=D):
    p = os.path.join(root, name)
    return json.load(open(p)) if os.path.exists(p) else None


def f0(x):
    return "{:,}".format(int(round(x)))


def f1(x):
    return "{:,.1f}".format(x)


def f3(x):
    return "%.3f" % x


def pct(a, b):
    return "%d%%" % round(100.0 * a / b)


def main():
    G = {}
    F = {}
    nlp = ld("nlp.json"); G["nlp"] = {k: v for k, v in nlp.items()}
    F.update(nlp_paras=f0(nlp["paragraphs"]), nlp_wall=f1(nlp["wall_s"]), nlp_phr=f0(nlp["phrases"]), nlp_distinct=f0(nlp["distinct"]),
             nlp_once=f0(nlp["in_one_paragraph"]), nlp_once_pct=pct(nlp["in_one_paragraph"], nlp["distinct"]), nlp_med=f0(nlp["median_per_paragraph"]),
             nlp_top1=nlp["top"][0][0].title(), nlp_top1_n=f0(nlp["top"][0][1]),
             nlp_ms=f1(1000.0 * nlp["wall_s"] / nlp["paragraphs"]))
    cm = ld("communities.json"); G["comm"] = cm
    s, fu = cm["subset"], cm["full"]
    lv = lambda L: ", ".join(f0(v) for k, v in sorted(L.items(), key=lambda x: int(x[0])))  # noqa: E731
    F.update(sub_units=f0(s["units"]), sub_nodes=f0(s["nodes"]), sub_edges=f0(s["edges"]), sub_pn=f0(s["pruned_nodes"]), sub_pe=f0(s["pruned_edges"]),
             sub_lcc=f0(s["lcc_nodes"]), sub_levels=lv(s["levels"]), sub_nlev=str(len(s["levels"])), sub_l0=f0(s["leiden_l0"]),
             sub_l0_max=f0(s["leiden_l0_sizes"][0]), sub_louv=f0(s["louvain"]),
             full_nodes=f0(fu["nodes"]), full_edges=f0(fu["edges"]), full_pn=f0(fu["pruned_nodes"]), full_pe=f0(fu["pruned_edges"]),
             full_levels=lv(fu["levels"]), full_nlev=str(len(fu["levels"])), full_l0=f0(fu["leiden_l0"]), full_louv=f0(fu["louvain"]),
             full_keep_pct=pct(fu["pruned_nodes"], fu["nodes"]), louv_disc=f0(s["louvain_disconnected"] + fu["louvain_disconnected"]),
             leid_disc=f0(s["leiden_l0_disconnected"] + fu["leiden_l0_disconnected"]))
    en = ld("entities.json"); G["ent"] = {k: {h: {kk: vv for kk, vv in m.items() if kk != "sample"} for h, m in v.items()} for k, v in en.items()}
    lab = json.load(open(os.path.join(HERE, "inputs", "merge_labels.json")))
    G["labels"] = {h: [[x["mention"], x["title"], x["correct"], x["borderline"]] for x in v] for h, v in lab["items"].items()}
    for h in ("exact", "norm", "subset", "embed"):
        for sc in ("subset", "full"):
            m = en[sc][h]
            F["ent_%s_%s_title" % (sc, h)] = f0(m["title_recall"])
            F["ent_%s_%s_link" % (sc, h)] = f0(m["bridge_link"])
            F["ent_%s_%s_merge" % (sc, h)] = f0(m["new_merges"])
            F["ent_%s_%s_amb" % (sc, h)] = f0(m["ambiguous"])
        if h in G["labels"]:
            F["lab_%s" % h] = "%d of 30" % sum(1 for x in G["labels"][h] if x[2])
    F.update(ent_sub_paras=f0(en["subset"]["exact"]["paragraphs"]), ent_sub_bq=f0(en["subset"]["exact"]["bridge_q"]),
             ent_full_paras=f0(en["full"]["exact"]["paragraphs"]), ent_full_bq=f0(en["full"]["exact"]["bridge_q"]),
             ent_full_exact_title_pct=pct(en["full"]["exact"]["title_recall"], en["full"]["exact"]["paragraphs"]))
    pp = ld("ppr.json"); G["ppr"] = pp
    for n, v in pp["systems"].items():
        for k in ("2", "5", "10"):
            F["ppr_%s_%s" % (n, k)] = f0(v["both"][k])
        F["ppr_%s_b5" % n] = f0(v["by_type"]["bridge"]["5"])
        F["ppr_%s_c5" % n] = f0(v["by_type"]["comparison"]["5"])
        F["ppr_%s_win" % n] = f0(pp["wins_vs_dense_at5"][n]["win"]); F["ppr_%s_loss" % n] = f0(pp["wins_vs_dense_at5"][n]["loss"])
    m = pp["meta"]
    F.update(ppr_phrases=f0(m["phrases"]), ppr_cooc=f0(m["phrase_cooc_edges"]), ppr_syn=f0(m["synonym_edges"]), ppr_hub=f0(m["hub_phrases"]),
             ppr_hubcut=f0(m["hub_cutoff"]), ppr_title_edges=f0(m["title_edges_directed"]), ppr_title_out=f0(m["paragraphs_with_title_link_out"]),
             ppr_qph=f0(m["question_phrases"]), ppr_qph_exact=f0(m["question_phrases_exact"]))
    pt = ld("prompt_tokens.json"); G["prompts"] = pt
    for k, v in pt.items():
        if isinstance(v, dict):
            F["pt_%s" % k] = f0(v["o200k"]); F["ptq_%s" % k] = f0(v["qwen3"])
    ed = ld("extract_dry.json"); G["extract_dry"] = ed
    F.update(ex_first_med=f0(ed["first_call_median"]), ex_para_med=f0(ed["paragraph_tokens_median"]), ex_first_total=f0(ed["first_call_total"]),
             ex_para_total=f0(ed["paragraph_tokens_total"]), ex_ratio=f1(ed["first_call_total"] / ed["paragraph_tokens_total"]))
    ls = ld("lightrag_stub.json"); G["lr_stub"] = ls
    F.update(lr_calls=f0(ls["insert"]["calls"]), lr_paras=f0(ls["insert"]["paragraphs"]), lr_tok=f0(ls["insert"]["tok_in"]),
             lr_tok_para=f0(ls["insert"]["tok_in"] / ls["insert"]["paragraphs"]))
    sq = ld("sql_set.json"); G["sql"] = sq
    sm = sq["meta"]
    F.update(sql_dev=f0(sm["dev_questions"]), sql_dbs=f0(sm["databases"]), sql_tables=f0(sm["tables"]), sql_n=f0(sm["sample"]),
             sql_all_tok=f0(sm["schema_tokens_all20"]), sql_own_tok=f0(sm["schema_tokens_own_median"]), sql_agg=f0(sm["aggregate_q"]),
             sql_agg10=f0(sm["aggregate_over_10_rows"]), sql_agg20=f0(sm["aggregate_over_20_rows"]),
             sql_agg_max=f0(max(r["support_rows"] or 0 for r in sq["rows"])))
    sr = ld("schema_ret.json")
    G["schema_ret"] = {"tables": sr["tables"], "systems": sr["systems"], "doc_example": sr["doc_example"],
                       "top5": {str(r["i"]): r["top5_bge"] for r in sr["per_q"]}}
    G["schema"] = ld("spider_schema.json")
    for n, v in sr["systems"].items():
        k_ = n.replace("-", "")
        for k in ("1", "3", "5", "10"):
            F["sr_%s_all%s" % (k_, k)] = f0(v["all_gold_at"][k]); F["sr_%s_tok%s" % (k_, k)] = f0(v["tokens_at"][k])
        F["sr_%s_db1" % k_] = f0(v["db_top1"])
    kz = ld("kuzu.json"); G["kuzu"] = kz
    c = kz["counts"]
    F.update(kz_st=f0(c["Stadium"]), kz_si=f0(c["Singer"]), kz_co=f0(c["Concert"]), kz_held=f0(c["HELD_AT"]), kz_perf=f0(c["PERFORMED_IN"]),
             sr_doc=sr["doc_example"])
    F.update(kz_ok="%d of %d" % (sum(e["equal"] for e in kz["examples"]), len(kz["examples"])), kz_ver=kz["kuzu"])
    ba = ld("ba.json")
    keep = ["dense", "hybrid", "expand_title", "ppr_bipartite_pruned"]
    G["ba"] = {"titles": ba["titles"], "systems": keep,
               "rows": [{"id": r["id"], "q": r["q"], "t": r["t"], "a": r["a"], "g": r["g"], "top": [r["top"][k] for k in keep], "lk": r["lk"]} for r in ba["rows"]]}
    G["build"] = ld("build.json")
    G["agt_graph"] = ld("graphrag.json", ROOT_OUT)  # the root Agentic lab's small graph, when its run has landed
    st = ld("strategies.json", ROOT_OUT) or {}
    G["agent_root"] = {m: {k: st[m][k] for k in st[m] if k in ("closed", "single_k5", "react", "decomp", "single_k5_bm25")} for m in st}
    a = st.get("1.7b", {})
    for key, name in (("single_k5", "dense"), ("react", "agent"), ("closed", "closed")):
        r = a.get(key)
        F["root_%s_f1" % name] = f3(r["f1"]) if r else PEND
        F["root_%s_em" % name] = f3(r["em"]) if r else PEND
        F["root_%s_tok" % name] = f0(r["tok_in"]) if r else PEND
        F["root_%s_both" % name] = f0(r["both_gold"] * 200) if r and r["both_gold"] <= 1 else (f0(r["both_gold"]) if r else PEND)
    # pending results: present only after scripts/run_pending.sh
    for name in ("qa", "sql_runs", "cypher_runs", "extract_1.7b", "extract_4b", "global_4b", "global_1.7b", "lightrag_4b",
                 "entities_agt", "entities_1.7b_394", "entities_4b_100", "communities_agt", "communities_1.7b_394"):
        G[name.replace(".", "_")] = ld(name + ".json")
    F["pending_runs"] = str(sum(1 for k in ("qa", "sql_runs", "cypher_runs", "extract_1_7b", "global_4b") if G[k] is None))
    js = "window.GR=" + json.dumps(G, separators=(",", ":"), ensure_ascii=False) + ";\n"
    open(os.path.join(HERE, "parts", "22_gr_data.js"), "w").write(js)
    json.dump(F, open(os.path.join(HERE, "facts.json"), "w"), indent=0, ensure_ascii=False)
    print("22_gr_data.js", len(js), "bytes;", len(F), "facts;", F["pending_runs"], "core runs pending")


if __name__ == "__main__":
    main()

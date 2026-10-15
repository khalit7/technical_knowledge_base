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
             nlp_ms=f1(1000.0 * nlp["wall_s"] / nlp["paragraphs"]), nlp_load=f1(nlp["load_before"][0]))
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
                 "entities_agt", "entities_1.7b_150", "entities_4b_40", "communities_agt", "communities_1.7b_150"):
        G[name.replace(".", "_")] = ld(name + ".json")
    ea, ca, ag = G["entities_agt"], G["communities_agt"], G["agt_graph"]
    if ea:
        e = ea["subset"]
        F.update(agt_title_exact=f0(e["exact"]["title_recall"]), agt_title_norm=f0(e["norm"]["title_recall"]), agt_link_exact=f0(e["exact"]["bridge_link"]),
                 agt_link_embed=f0(e["embed"]["bridge_link"]), agt_bq=f0(e["exact"]["bridge_q"]))
    if ca:
        c = ca["subset"]
        F.update(agt_nodes=f0(c["nodes"]), agt_pn=f0(c["pruned_nodes"]), agt_lcc=f0(c["lcc_nodes"]), agt_l0=f0(c["leiden_l0"]))
    if ag:
        i = ag["index"]
        F.update(agt_tin=f0(i["tok_in"]), agt_tout=f0(i["tok_out"]), agt_secs=f0(i["gen_seconds"]), agt_spp=f1(i["gen_seconds"] / i["paragraphs"]))
    for k in ("entities_agt", "entities_1_7b_150", "entities_4b_40"):  # merge samples are not shown on the page
        if G[k]:
            G[k] = {sk: {h: {kk: vv for kk, vv in m.items() if kk != "sample"} for h, m in sv.items()} for sk, sv in G[k].items()}
    for k in ("extract_1_7b", "extract_4b"):  # the page shows counts and a short sample: keep 4 paragraphs, short descriptions
        if G[k]:
            G[k]["sample"] = [{"title": x["title"], "entities": [[e[0], e[1], e[2][:90]] for e in x["entities"][:8]],
                               "relations": [[r[0], r[1], r[2][:90]] for r in x["relations"][:6]]} for x in G[k]["sample"][:4]]
    if G["agt_graph"]:  # only the indexing meta and local-hop counts are used
        G["agt_graph"] = {"index": G["agt_graph"]["index"], "local": {k: v for k, v in G["agt_graph"]["local"].items() if k != "examples"}}
    sr_ = G["sql_runs"]
    for m in ("1.7b", "4b"):
        r = (sr_ or {}).get(m)
        t = m.replace(".", "")
        for c in ("none", "all20", "retrieved", "oracle"):
            F["sql%s_%s" % (t, c)] = f0(r[c]["ex"]) if r and c in r else PEND
            F["sql%s_%s_len" % (t, c)] = f0(r[c]["ex_lenient"]) if r and c in r else PEND
            F["sql%s_%s_runs" % (t, c)] = f0(r[c]["runs"]) if r and c in r else PEND
        F["sql%s_all20_db" % t] = f0(r["all20"]["db_ok"]) if r and "all20" in r else PEND
        F["sql%s_all20_tok" % t] = f0(r["all20"]["tok_in"]) if r and "all20" in r else PEND
        F["sql%s_all20_new" % t] = f0(r["all20"]["tok_new"]) if r and "all20" in r else PEND
        cy = (G["cypher_runs"] or {}).get(m)
        F["cy%s_sql" % t] = f0(cy["sql"]["ex"]) if cy else PEND
        F["cy%s_cy" % t] = f0(cy["cypher"]["ex"]) if cy else PEND
        F["cy%s_cyruns" % t] = f0(cy["cypher"]["runs"]) if cy else PEND
    for k in ("global_1_7b", "global_4b"):  # the lab shows report summaries and answers, trimmed
        if G[k]:
            for r in G[k]["reports"]:
                r["summary"] = r["summary"][:450]
            for x in G[k]["answers"]:
                x["global"], x["naive"] = x["global"][:1500], x["naive"][:900]
    if G["global_1_7b"] and G["global_4b"]:  # the lab shows the 4B run; the 1.7B run only as totals
        g = G["global_1_7b"]
        G["global_1_7b"] = {"reports": [{"parsed": r["parsed"]} for r in g["reports"]], "report_cost": g["report_cost"], "n_paragraphs": g["n_paragraphs"],
                            "answers": [{k: x[k] for k in ("q", "cost_global", "cost_naive", "paragraphs_behind_points")} for x in g["answers"]]}
    for k, t in (("global_1_7b", "g17"), ("global_4b", "g4")):
        g = G[k]
        if not g:
            continue
        a = g["answers"]; n = len(a)
        av = lambda f, x: sum(y[f][x] for y in a) / n  # noqa: E731
        F.update({t + "_rep": f0(len(g["reports"])), t + "_json": f0(sum(1 for r in g["reports"] if r["parsed"])),
                  t + "_calls": f0(av("cost_global", "calls")), t + "_in": f0(av("cost_global", "in")), t + "_nin": f0(av("cost_naive", "in")),
                  t + "_s": f0(av("cost_global", "s")), t + "_ns": f1(av("cost_naive", "s")), t + "_ratio": f0(av("cost_global", "in") / av("cost_naive", "in")),
                  t + "_paras": f0(sum(x["paragraphs_behind_points"] for x in a) / n), t + "_repin": f0(g["report_cost"]["report_in"]),
                  t + "_reps": f0(g["report_cost"]["report_s"])})
    x = G["extract_1_7b"]
    if x:
        m_ = x["meta"]
        F.update(x17_n=f0(m_["paragraphs"]), x17_tin=f0(m_["tok_in"]), x17_tout=f0(m_["tok_out"]), x17_new=f0(m_["tok_in_new"]),
                 x17_newpct=pct(m_["tok_in_new"], m_["tok_in"]), x17_s=f0(m_["gen_seconds"]), x17_spp=f1(m_["gen_seconds"] / m_["paragraphs"]),
                 x17_rec=f0(m_["entities"]), x17_rec1=f0(m_["entities_first_call"]), x17_d1="%.2f" % m_["distinct_per_paragraph_first"],
                 x17_dall="%.2f" % m_["distinct_per_paragraph_all"], x17_tinpp=f0(m_["tok_in"] / m_["paragraphs"]), x17_toutpp=f0(m_["tok_out"] / m_["paragraphs"]))
    x = G["extract_4b"]
    if x:
        m_ = x["meta"]
        F.update(x4_n=f0(m_["paragraphs"]), x4_spp=f1(m_["gen_seconds"] / m_["paragraphs"]), x4_d1="%.2f" % m_["distinct_per_paragraph_first"],
                 x4_dall="%.2f" % m_["distinct_per_paragraph_all"], x4_newpct=pct(m_["tok_in_new"], m_["tok_in"]))
    e4 = G["entities_4b_40"]
    if e4:
        F.update(e40_gr_t=f0(e4["subset"]["exact"]["title_recall"]), e40_agt_t=f0(e4["agt_same"]["exact"]["title_recall"]), e40_nlp_t=f0(e4["nlp_same"]["exact"]["title_recall"]))
    lr = G["lightrag_4b"]
    if lr:
        i = lr["insert"]; A = lr["answers"]
        F.update(lr4_n=f0(i["paragraphs"]), lr4_calls=f0(i["calls"]), lr4_tin=f0(i["tok_in"]), lr4_tout=f0(i["tok_out"]), lr4_wall=f0(i["wall_s"]),
                 lr4_tinpp=f0(i["tok_in"] / i["paragraphs"]), lr4_nodes=f0(lr["nodes"]), lr4_q=f0(len(A)),
                 **{"lr4_" + m: f0(sum(1 for a in A if a[m]["contains_gold"])) for m in ("naive", "local", "global", "hybrid", "mix")})
    e = G["entities_1_7b_150"]
    if e:
        F.update(e150_nlp_t=f0(e["nlp_same"]["exact"]["title_recall"]), e150_agt_t=f0(e["agt_same"]["exact"]["title_recall"]),
                 e150_gr_t=f0(e["subset"]["exact"]["title_recall"]), e150_nlp_l=f0(e["nlp_same"]["exact"]["bridge_link"]),
                 e150_agt_l=f0(e["agt_same"]["exact"]["bridge_link"]), e150_gr_l=f0(e["subset"]["exact"]["bridge_link"]), e150_bq=f0(e["subset"]["exact"]["bridge_q"]))
    if G["sql_runs"]:  # the lab shows the 1.7B's SQL per question; other models only as totals
        G["sql_runs"] = {m: {c: dict({k: v for k, v in r.items() if k != "rows"},
                                     rows=[{"i": x["i"], "strict": x["strict"], "lenient": x["lenient"], "err": (x["err"] or "")[:60] or None, "sql": x["sql"][:220]}
                                           for x in r["rows"]] if m == "1.7b" else [])
                             for c, r in v.items()} for m, v in G["sql_runs"].items()}
    if G["cypher_runs"]:
        G["cypher_runs"] = {m: {k: {kk: vv for kk, vv in r.items() if kk != "rows"} for k, r in v.items()} for m, v in G["cypher_runs"].items()}
    if G["qa"]:  # the labs show 1.7B answers for the four Before/after systems only; aggregates for all
        q = G["qa"]
        G["qa"] = {m: {"agg": v["agg"], "diff": v.get("diff_vs_dense", {}), "examples": ({k: {i: [a[0][:40], a[1]] for i, a in ex.items()} for k, ex in v["examples"].items()
                                                      if k in ("dense", "hybrid", "expand_title", "ppr_bipartite_pruned")} if m == "1.7b" else {})}
                   for m, v in q.items()}
        a = q["1.7b"]["agg"]
        F.update(qa_dense_f1=f3(a["dense"]["f1"]), qa_hybrid_f1=f3(a["hybrid"]["f1"]), qa_expand_f1=f3(a["expand_title"]["f1"]),
                 qa_ppr_f1=f3(a["ppr_bipartite_pruned"]["f1"]), qa_pprt_f1=f3(a["ppr_title_dense"]["f1"]), qa_agent_f1=f3(a["agent"]["f1"]),
                 qa_expand_em=f3(a["expand_title"]["em"]), qa_dense_em=f3(a["dense"]["em"]), qa_expand_tok=f0(a["expand_title"]["tok_in"]), qa_agent_tok=f0(a["agent"]["tok_in"]))
        if "4b" in q and "expand_title" in q["4b"]["agg"]:
            b4, d4 = q["4b"]["agg"], q["4b"].get("diff_vs_dense", {})
            F.update(qa4_dense_f1=f3(b4["dense"]["f1"]), qa4_expand_f1=f3(b4["expand_title"]["f1"]), qa4_agent_f1=f3(b4["agent"]["f1"]),
                     qa4_hybrid_f1=f3(b4["hybrid"]["f1"]), qa4_pprt_f1=f3(b4["ppr_title_dense"]["f1"]), qa4_ppr_f1=f3(b4["ppr_bipartite_pruned"]["f1"]),
                     qa4_expand_lo=f3(d4["expand_title"][1]), qa4_expand_hi=f3(d4["expand_title"][2]), qa4_agent_lo=f3(d4["agent"][1]), qa4_agent_hi=f3(d4["agent"][2]),
                     qa4_pprt_lo=f3(d4["ppr_title_dense"][1]), qa4_pprt_hi=f3(d4["ppr_title_dense"][2]), qa4_agent_tok=f0(b4["agent"]["tok_in"]))
        dd = q["1.7b"].get("diff_vs_dense", {}).get("expand_title")
        if dd:
            F.update(qa_expand_d=f3(dd[0]), qa_expand_lo=f3(dd[1]), qa_expand_hi=f3(dd[2]))
    F["pending_runs"] = str(sum(1 for k in ("qa", "sql_runs", "cypher_runs", "extract_1_7b", "global_4b") if G[k] is None))
    js = "window.GR=" + json.dumps(G, separators=(",", ":"), ensure_ascii=False) + ";\n"
    open(os.path.join(HERE, "parts", "22_gr_data.js"), "w").write(js)
    json.dump(F, open(os.path.join(HERE, "facts.json"), "w"), indent=0, ensure_ascii=False)
    print("22_gr_data.js", len(js), "bytes;", len(F), "facts;", F["pending_runs"], "core runs pending")


if __name__ == "__main__":
    main()

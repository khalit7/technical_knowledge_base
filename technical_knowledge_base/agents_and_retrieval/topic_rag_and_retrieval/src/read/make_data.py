"""Build the Reading tab's data (parts/22_js_rd_data.js) from the other tabs' and children's recorded results.

Nothing is measured here: every value is read from a committed result file of another tab or child page
(listed in SOURCES), so the Reading tab cannot disagree with them. Run from anywhere: python3 make_data.py
"""
import json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)            # root src/
ROOT = os.path.dirname(SRC)            # root page folder
J = lambda *p: json.load(open(os.path.join(*p)))

SOURCES = {
    "e2e": "src/pipe/out/e2e.json",
    "fusion": "src/pipe/out/fusion.json",
    "rerank": "src/pipe/out/rerank.json",
    "latency": "src/pipe/out/latency.json",
    "chunking": "src/pipe/out/chunking.json",
    "filter": "src/pipe/out/filter.json",
    "models": "src/vec/out/models.json",
    "metric": "src/vec/out/metric.json",
    "hops": "src/agent/out/hops.json",
    "bm25ex": "retrieval_pipeline/src/out/bm25_example.json",
    "prd": "rag_in_production/src/facts.json",
}

e2e = J(SRC, "pipe/out/e2e.json")
conds = e2e["conds"]
i_on, i_off = conds.index("rr30@3"), conds.index("first@3")
KS = e2e["KS"]
ki = KS.index(30)

# Per-claim fate, for the 188 claims with annotated evidence.
# 0 lost at retrieval (evidence not in the first stage's top K), 1 lost at ranking (in top K, not in the top k
# that reach the prompt), 2 lost at generation (in the prompt, answer wrong or citing no evidence), 3 correct.
fates_on, fates_off, labels = [], [], []
for q, lab, fr, rr, res in e2e["claims"]:
    if lab == "N":
        continue
    labels.append(lab)
    if not fr or fr > 30:
        f = 0
    elif not rr[ki] or rr[ki] > 3:
        f = 1
    else:
        f = 3 if res[i_on] == 2 else 2
    fates_on.append(f)
    # reranker off: the first stage's top 3 go straight into the prompt (K = k = 3)
    if not fr or fr > 3:
        g = 0
    else:
        g = 3 if res[i_off] == 2 else 2
    fates_off.append(g)

agg_on, agg_off = e2e["agg"]["rr30@3"], e2e["agg"]["first@3"]
n = len(labels)
assert n == e2e["n_labelled"] == 188
assert sum(f > 0 for f in fates_on) == agg_on["in_K"] == 186
assert sum(f > 1 for f in fates_on) == agg_on["in_k"] == 178
assert sum(f == 3 for f in fates_on) == agg_on["correct_strict"] == 96
assert sum(f > 1 for f in fates_off) == agg_off["in_k"] == 171
assert sum(f == 3 for f in fates_off) == agg_off["correct_strict"] == 90
# every CONTRADICT claim that reached the prompt is a generation miss
assert all(not (l == "C" and f == 3) for l, f in zip(labels, fates_on))
contra_in_prompt = sum(1 for l, f in zip(labels, fates_on) if l == "C" and f >= 2)

fusion = J(SRC, "pipe/out/fusion.json")["scifact"]
models_order = ["minilm-l6", "bge-small", "qwen3-emb-0.6b", "colbert-small", "gte-modernbert"]
names = {"minilm-l6": "MiniLM-L6", "bge-small": "bge-small", "qwen3-emb-0.6b": "Qwen3-Emb-0.6B",
         "colbert-small": "ColBERT-small", "gte-modernbert": "gte-modernbert"}
hybrid = {"bm25": fusion["single"]["bm25"]["ndcg10"],
          "rows": [{"key": m, "name": names[m], "alone": fusion["single"][m]["ndcg10"],
                    "rrf": fusion["rrf"][m]["60"]["ndcg10"]} for m in models_order]}

rr = J(SRC, "pipe/out/rerank.json")
rsw = rr["sweep"]["hybrid"]
rerank = {"first": rr["first"]["hybrid"]["ndcg10"], "recall30": rr["first"]["hybrid"]["recallK"]["30"],
          "rows": [{"key": k, "name": nm, "params": p, "k20": rsw[k]["20"]["ndcg10"], "k30": rsw[k]["30"]["ndcg10"],
                    "k100": rsw[k].get("100", {}).get("ndcg10")}
                   for k, nm, p in [("ce-minilm-l6", "MiniLM-L6 CE", "22 M"),
                                    ("bge-reranker-v2-m3", "bge-reranker-v2-m3", "568 M"),
                                    ("qwen3-reranker-0.6b", "Qwen3-Reranker-0.6B", "0.6 B")]]}

mrows = J(SRC, "vec/out/models.json")["rows"]
# multi-hop nDCG@10 from the running example's baseline table (src/data/README.md); checked against the file below
readme = open(os.path.join(SRC, "data/README.md")).read()
mh = {}
for key, label in [("bm25", "BM25"), ("minilm-l6", "MiniLM-L6"), ("bge-small", "bge-small"),
                   ("gte-modernbert", "gte-modernbert"), ("qwen3-emb-0.6b", "Qwen3-Emb-0.6B")]:
    m = re.search(r"^\| " + re.escape(label) + r" \| ([0-9.]+) \| ([0-9.]+) \| ([0-9.]+) \|", readme, re.M)
    mh[key] = float(m.group(1))
bm25_nf = float(re.search(r"^\| nfcorpus \| bm25 \| ([0-9.]+) \|", readme, re.M).group(1))
models = [{"key": "bm25", "name": "BM25", "params": "no model", "scifact": hybrid["bm25"], "nfcorpus": bm25_nf,
           "hotpot": mh["bm25"]}]
for r in mrows:
    models.append({"key": r["key"], "name": names[r["key"]], "params": r["params"], "scifact": round(r["scifact_ndcg10"], 3),
                   "nfcorpus": round(r["nfcorpus_ndcg10"], 3), "hotpot": mh[r["key"]], "dim": r["dim"],
                   "docs_s": r["docs_per_s_first"], "q_ms": r["q_ms_mps"]})

lat = J(SRC, "pipe/out/latency.json")["stages"]
prd = J(ROOT, "rag_in_production/src/facts.json")
num = lambda s: float(str(s).replace(",", "").replace("$", ""))
latency = {
    "isolated": {"embed": lat["embed"]["p50_ms"], "search": lat["search"]["p50_ms"],
                 "rerank": lat["rerank-ce-minilm-l6-30"]["p50_ms"], "gen": num(prd["tt_k5"])},
    "inproc": {"embed": num(prd["e2e_embed_p50"]), "search": num(prd["e2e_search_p50"]),
               "rerank": num(prd["e2e_rerank_p50"]), "gen": num(prd["e2e_ttft_p50"])},
    "wall_p50": num(prd["e2e_wall_to_first_token_p50"]), "wall_p90": num(prd["e2e_wall_to_first_token_p90"]),
    "gen_tokens_isolated": num(prd["tt_k5_n"]), "gen_tokens_inproc": num(prd["e2e_prompt_n"]),
}

hops = J(SRC, "agent/out/hops.json")
hop = {k: {"both": hops["systems"][k]["both"], "any": hops["systems"][k]["any"],
           "bridge": hops["systems"][k]["both_by_type"]["bridge"],
           "comparison": hops["systems"][k]["both_by_type"]["comparison"]} for k in ["bm25", "bge-small", "qwen3-emb-0.6b"]}
hop["n"] = hops["n"]; hop["types"] = hops["by_type"]

bm = J(ROOT, "retrieval_pipeline/src/out/bm25_example.json")

ch = J(SRC, "pipe/out/chunking.json")
filt = J(SRC, "pipe/out/filter.json")
met = J(SRC, "vec/out/metric.json")["metrics"]

data = {
    "fates": {"on": fates_on, "off": fates_off, "label": labels, "n": n,
              "agg_on": {k: agg_on[k] for k in ("in_K", "in_k", "correct_strict", "r_K", "p_k_given_K", "g", "A")},
              "agg_off": {k: agg_off[k] for k in ("in_K", "in_k", "correct_strict", "r_K", "g", "A")},
              "oracle": e2e["agg"]["oracle"]["strict"], "closed_label": e2e["agg"]["closed"]["lenient"],
              "contra": labels.count("C"), "support": labels.count("S"), "contra_in_prompt": contra_in_prompt},
    "bm25": {"claim": bm["claim"], "tokens": bm["tokens"], "N": bm["N"], "avgdl": bm["avgdl"],
             "docs": [{"id": d["id"], "title": d["title"], "rel": d["relevant"], "len": d["len"], "rank": d["rank"],
                       "score": d["score"], "terms": [{"t": t["t"], "df": t["df"], "tf": t["tf"]} for t in d["terms"]]}
                      for d in bm["docs"]]},
    "models": models,
    "hybrid": hybrid,
    "rerank": rerank,
    "latency": latency,
    "hops": hop,
    "chunk": {"fixed512_top3": ch["fixed-512-64"]["bm25"]["k"]["3"], "struct256_top3": ch["structure-256"]["bm25"]["k"]["3"],
              "fixed512_b1024": ch["fixed-512-64"]["bm25"]["budget"]["1024"],
              "struct256_b1024": ch["structure-256"]["bm25"]["budget"]["1024"]},
    "metric": {"cos": round(met["cosine"]["ndcg@10"], 3), "dot": round(met["dot"]["ndcg@10"], 3), "l2": round(met["l2"]["ndcg@10"], 3)},
    "filter10": {"post_returned": filt["groups"]["10"]["post"]["10"]["returned_mean"],
                 "post_empty": filt["groups"]["10"]["post"]["10"]["empty"],
                 "post_hit": filt["groups"]["10"]["post"]["10"]["hit10"], "pre_hit": filt["groups"]["10"]["pre"]["hit10"]},
}

js = "// generated by src/read/make_data.py from the other tabs' and children's recorded results; do not edit\nwindow.RD_DATA=" + \
     json.dumps(data, separators=(",", ":")) + ";\n"
open(os.path.join(SRC, "parts/22_js_rd_data.js"), "w").write(js)
json.dump(data, open(os.path.join(HERE, "rd_data.json"), "w"), indent=1)
print("wrote parts/22_js_rd_data.js", len(js), "bytes; claims", n, "contra in prompt", contra_in_prompt)
print("chunk", data["chunk"], "filter", data["filter10"], "metric", data["metric"])

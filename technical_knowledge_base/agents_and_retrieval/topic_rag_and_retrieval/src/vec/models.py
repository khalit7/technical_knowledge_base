"""The embedding model comparison on the running example, assembled from the setup agent's records of record
($RAG_SCRATCH/setup/baseline.json, embed_timings.jsonl, embed_repeat.jsonl, colbert_timings.jsonl) and the root's
src/data/manifest.json. No model runs here. Also adds recall@10 on SciFact from the stored runs.
Writes out/models.json."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
from common import L, save

S = lambda *p: L.path("setup", *p)
base = json.load(open(S("baseline.json")))
emb = [json.loads(l) for l in open(S("embed_timings.jsonl"))]
rep = {json.loads(l)["model"]: json.loads(l) for l in open(S("embed_repeat.jsonl"))}
col = [json.loads(l) for l in open(S("colbert_timings.jsonl"))]
man = L.manifest()
wbytes = {m["local"].split("/")[-1]: sum(w["bytes"] for w in m["weights"]) for m in man["models"]}

_, _, qrels = L.beir("scifact")
_, _, qn = L.beir("nfcorpus")

# published (MTEB results repo, fetched 2026-10-13 by the setup agent; see scratchpad FACTS.md "setup")
MTEB = {"minilm-l6": (0.6451, 0.3159), "bge-small": (0.7127, 0.3426), "gte-modernbert": (0.7641, 0.3432),
        "qwen3-emb-0.6b": (0.6972, 0.3671)}
INFO = {
    "minilm-l6": dict(name="all-MiniLM-L6-v2", params="22 M", family="6-layer MiniLM (BERT-style encoder)", pool="mean", dim=384, max_len=256, lic="Apache 2.0", year=2021, prompt="none"),
    "bge-small": dict(name="bge-small-en-v1.5", params="33 M", family="BERT encoder", pool="CLS", dim=384, max_len=512, lic="MIT", year=2023, prompt="query prefix"),
    "gte-modernbert": dict(name="gte-modernbert-base", params="149 M", family="ModernBERT encoder", pool="CLS", dim=768, max_len=1024, lic="Apache 2.0", year=2025, prompt="none"),
    "qwen3-emb-0.6b": dict(name="Qwen3-Embedding-0.6B", params="0.6 B", family="Qwen3 decoder turned embedder", pool="last token", dim=1024, max_len=1024, lic="Apache 2.0", year=2025, prompt="task instruction"),
}
DIRS = {"minilm-l6": "all-MiniLM-L6-v2", "bge-small": "bge-small-en-v1.5", "gte-modernbert": "gte-modernbert-base",
        "qwen3-emb-0.6b": "Qwen3-Embedding-0.6B"}

rows = []
for key in ("minilm-l6", "bge-small", "gte-modernbert", "qwen3-emb-0.6b"):
    i = INFO[key]
    e = [x for x in emb if x["model"] == key and x["dataset"] == "scifact"][0]
    r10 = L.evaluate(L.run("scifact", key), qrels["test"], ("recall_10",))["recall@10"]
    rows.append(dict(key=key, **i, weights_bytes=wbytes[DIRS[key]],
                     scifact_ndcg10=round(base["scifact/" + key]["ndcg@10"], 4),
                     scifact_recall10=round(r10, 4),
                     scifact_recall100=round(base["scifact/" + key]["recall@100"], 4),
                     nfcorpus_ndcg10=round(base["nfcorpus/" + key]["ndcg@10"], 4),
                     nfcorpus_recall100=round(base["nfcorpus/" + key]["recall@100"], 4),
                     mteb_scifact=MTEB[key][0], mteb_nfcorpus=MTEB[key][1],
                     bytes_per_vector=4 * i["dim"], scifact_index_bytes=4 * i["dim"] * 5183,
                     docs_per_s=rep[key]["scifact_docs_per_s_mps_x3"], docs_per_s_first=e["docs_per_s"],
                     dtype=e["dtype"], batch=e["batch"],
                     corpus_s=e["corpus_s"], doc_tokens=e["doc_tokens"],
                     q_ms_mps=rep[key]["query_ms_mps"]["p50"], q_ms_mps_p90=rep[key]["query_ms_mps"]["p90"],
                     q_ms_cpu=rep[key]["query_ms_cpu"]["p50"],
                     load=[rep[key]["loadavg_before"][0], rep[key]["loadavg_after"][0]], when=rep[key]["when"]))
c = [x for x in col if x["dataset"] == "scifact"][0]
cn = [x for x in col if x["dataset"] == "nfcorpus"][0]
r10c = L.evaluate(L.run("scifact", "colbert-small"), qrels["test"], ("recall_10",))["recall@10"]
colbert = dict(key="colbert-small", name="answerai-colbert-small-v1", params="33 M", family="late interaction (ColBERT)",
               dim=96, per="token", tokens=c["doc_tokens"], weights_bytes=wbytes["answerai-colbert-small-v1"],
               scifact_ndcg10=round(c["ndcg@10"], 4), scifact_recall10=round(r10c, 4), scifact_recall100=round(c["recall@100"], 4),
               nfcorpus_ndcg10=round(cn["ndcg@10"], 4), card_scifact=0.7477, card_nfcorpus=0.373,
               scifact_index_bytes=c["token_store_bytes_fp16"], bytes_per_doc=round(c["token_store_bytes_fp16"] / 5183),
               docs_per_s=c["docs_per_s"], maxsim_ms_per_query=round(1000 * c["maxsim_all_queries_s"] / 300, 1))
r10b = L.evaluate(L.run("scifact", "bm25"), qrels["test"], ("recall_10",))["recall@10"]
bm25 = dict(key="bm25", name="BM25 (bm25s, k1 1.2, b 0.75)", scifact_ndcg10=round(base["scifact/bm25"]["ndcg@10"], 4),
            scifact_recall10=round(r10b, 4), scifact_recall100=round(base["scifact/bm25"]["recall@100"], 4),
            nfcorpus_ndcg10=round(base["nfcorpus/bm25"]["ndcg@10"], 4))
save("models.json", dict(asof="2026-10-14", machine="Apple M1 Pro, MPS", rows=rows, colbert=colbert, bm25=bm25))
for r in rows:
    print(r["key"], r["scifact_ndcg10"], r["scifact_recall10"], r["docs_per_s"], r["q_ms_mps"], r["weights_bytes"])
print(colbert)

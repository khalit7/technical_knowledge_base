"""Check that the Tool map embeds exactly the recorded data and that numbers written in prose match it.
Run after build: python3 src/map/validate.py   (plain Python 3)."""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
html = open(os.path.join(ROOT, "index.html")).read()
js = open(os.path.join(HERE, "..", "parts", "34_js_map_0data.js")).read()
D = json.loads(js[js.index("window.MAPD=") + 12:].rstrip().rstrip(";"))
I = lambda f: json.load(open(os.path.join(HERE, "inputs", f)))
bad = []
def ok(c, m):
    if not c:
        bad.append(m)

# 1. the page embeds the generated data file byte for byte
ok(js.strip() in html or js[js.index("window.MAPD="):].strip() in html, "data file not embedded verbatim")
# 2. embedded data equals the inputs
dr = I("defaults_real.json")
ok([r["ann_recall10"] for r in D["defaults"]["runs"]] == [r["ann_recall10"] for r in dr["runs"]], "defaults runs differ from inputs")
ok(D["mteb"]["models"] and all(m["zsr"] == I("checks_frameworks.json")["mteb_meta"][m["m"]]["zero_shot_eng_v2_retrieval"] for m in D["mteb"]["models"]), "mteb zero-shot differs")
R = {r["key"]: r for r in dr["runs"]}
part = lambda f: open(os.path.join(HERE, "..", "parts", f)).read()
prose = part("34_tab_map_a.html") + part("34_tab_map_b.html") + part("34_tab_map_c.html") + part("34_tab_map_d.html")
atl = open(os.path.join(HERE, "atlas_a.py")).read() + open(os.path.join(HERE, "atlas_b.py")).read() + open(os.path.join(HERE, "atlas_c.py")).read()
# 3. numbers in prose and atlas text
cs, cf = I("checks_stores.json"), I("checks_frameworks.json")
claims = [
 ("5,183", dr["data"]["n"] == 5183), ("300 test", dr["n_queries"] == 300), ("384-number", dr["data"]["dim"] == 384),
 ("0.59 of the exact top 10", round(R["lance_ivfpq_def"]["ann_recall10"], 2) == 0.59),
 ("0.88 of the exact top 10", round(R["hnswlib_def"]["ann_recall10"], 2) == 0.88),
 ("<code>ef = 10</code>", R["hnswlib_def"]["cfg"]["ef"] == 10), ("<code>efSearch = 16</code>", R["faiss_hnsw_def"]["cfg"]["efSearch"] == 16),
 ("<code>ef_search = 100</code>", R["chroma_def"]["cfg"]["ef_search"] == 100), ("72 clusters", R["faiss_ivf_def"]["cfg"]["nlist"] == 72),
 ("0.998 and 0.996", round(R["chroma_def"]["ann_recall10"], 3) in (0.998, 0.996)), ("0.598 and 0.591", round(R["lance_ivfpq_def"]["ann_recall10"], 3) in (0.598, 0.591)),
 ("Retrieval is 10 of the 41", cf["mteb_meta"]["n_tasks"] == 41 and len(cf["mteb_meta"]["retrieval_tasks"]) == 10),
 ("only 80% zero-shot", sum(1 for k, v in cf["mteb_meta"].items() if isinstance(v, dict) and v.get("zero_shot_eng_v2_retrieval") == 80) >= 7),
 ("0.7127, measured here", round(dr["exact_ndcg10"], 4) == 0.7127),
 ("returned 0.59", True),
]
for txt, cond in claims:
    found = txt in prose or txt in atl
    ok(found, "claim text not found: " + txt)
    ok(cond, "claim does not match data: " + txt)
ok(cs["milvus_lite_hard"]["milvus_lite_recall"] == 1.0 and cs["milvus_lite_hard"]["faiss_hnsw_recall"] < 0.2, "milvus lite hard check")
ok(cf["llamaindex"]["DEFAULT_SIMILARITY_TOP_K"] == 2 and cf["haystack"]["InMemoryDocumentStore"]["bm25_algorithm"] == "'BM25L'" and cf["langchain"]["TextSplitter"]["chunk_size"] == "4000", "framework defaults")
ok(cf["dspy"]["Embeddings"]["brute_force_threshold"] == "20000" and cf["dspy"]["Embeddings"]["k"] == "5", "dspy defaults")
# 4. hygiene
for pat in ["/Users/", "Users-", "glpat", "sk-ant", "\u2014"] + ([os.environ["USER"]] if os.environ.get("USER") else []):
    ok(pat not in html and pat not in prose and pat not in js, "found forbidden text: " + repr(pat))
print("validate:", "OK" if not bad else "FAIL")
for b in bad:
    print("  ", b)
sys.exit(1 if bad else 0)

"""Merge the curated atlas (atlas_a/b/c.py, timeline.py) with the recorded inputs into ../parts/34_js_map_0data.js and
check every date and version against the inputs. Run: python3 src/map/gen_data.py  (plain Python 3, no packages)."""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from atlas_a import A
from atlas_b import B
from atlas_c import C
from timeline import T
I = os.path.join(HERE, "inputs")
L = lambda f: json.load(open(os.path.join(I, f)))
pypi, gh, ghapi, hf, stc = L("pypi.json"), L("github_repos.json"), L("github_release_api.json"), L("hf_models.json"), L("hf_st_configs.json")
arx, cs, cf, dr = L("arxiv_meta.json"), L("checks_stores.json"), L("checks_frameworks.json"), L("defaults_real.json")
ASOF = "2026-10-13"
ERR = []

FW = cf
ALGO = {
 "llamaindex": "Defaults read in llama-index-core %s: SentenceSplitter chunk_size 1024 and chunk_overlap 200 (llama_index/core/node_parser/text/sentence.py); retrievers return similarity_top_k = 2 unless you change it (constants.py, DEFAULT_SIMILARITY_TOP_K); the in-memory SimpleVectorStore scores every stored embedding in a loop (indices/query/embedding_utils.py, get_top_k_embeddings): exact search, no ANN index." % FW["llamaindex"]["version"],
 "langchain": "Defaults read in langchain-core %s and langchain-text-splitters %s: TextSplitter chunk_size 4000 characters (len) and chunk_overlap 200 (langchain_text_splitters/base.py); RecursiveCharacterTextSplitter splits on paragraph, line, space, then character; VectorStore.similarity_search k = 4, and as_retriever() returned 4 documents in the check here; InMemoryVectorStore computes cosine similarity against every vector." % (FW["langchain"]["version_core"], FW["langchain"]["version_splitters"]),
 "haystack": "Defaults read in haystack-ai %s: InMemoryDocumentStore ranks with BM25L, not Okapi BM25 (bm25_algorithm='BM25L'), and dot_product for embeddings (document_stores/in_memory/document_store.py); BM25 and embedding retrievers top_k 10; DocumentSplitter splits by word, 200 words, overlap 0." % FW["haystack"]["version"],
 "dspy": "Defaults read in dspy %s: dspy.retrievers.Embeddings returns k = 5 and scans exhaustively below 20,000 passages, building a FAISS index above that (retrievers/embeddings.py); a ColBERTv2 client calls a remote ColBERT server." % FW["dspy"]["version"],
 "txtai": "Read in txtai %s: the dense index backend defaults to Faiss when installed, otherwise NumPy (ann/dense/factory.py); other backends include hnsw, annoy, pgvector, sqlite, torch and rabitq; a 'scoring' index adds BM25 or TF-IDF for keyword, sparse and hybrid search (embeddings/base.py)." % FW["txtai"]["version"],
}


def stable(v):
    return not re.search(r"(a|b|rc|dev|alpha|beta)\d*", v.split("+")[0].lower().replace("post", ""))


def resolve_ver(e):
    v = e.get("ver")
    if isinstance(v, list):
        return v[0], v[1], v[2]
    p = e.get("pypi")
    if v is None or (isinstance(v, str) and v.startswith("pypi:")):
        p = v[5:] if isinstance(v, str) else p
        if p and p in pypi and "version" in pypi[p]:
            return pypi[p]["version"], pypi[p]["date"], "https://pypi.org/project/%s/" % p
        if e.get("hf") and e["hf"] in hf:
            h = hf[e["hf"]]
            return "card revision", h["lastModified"], "https://huggingface.co/" + e["hf"]
        return "", "", ""
    if v.startswith("ghapi:") or v.startswith("ghrel:"):
        r = v[6:]
        rows = [x for x in ghapi.get(r, []) if not x[2] and re.match(r"^v?\d", x[0])]
        if rows:
            rows.sort(key=lambda x: x[1], reverse=True)
            t, d = rows[0][0], rows[0][1]
            return t.lstrip("v"), d, "https://github.com/%s/releases/tag/%s" % (r, t)
        rel = L("github_releases.json").get(r, {}).get("entries", [])
        if rel:
            return rel[0][1].split()[-1].lstrip("v"), rel[0][0][:7], "https://github.com/%s/releases" % r
    return "", "", ""


atlas = []
for e in A + B + C:
    e = dict(e)
    e["ver"], e["date"], e["verSrc"] = resolve_ver(e)
    if e.get("algo", "").startswith("@@"):
        e["algo"] = ALGO[e["algo"].strip("@")]
    r = e.get("repo")
    if r and r in gh and "error" not in gh[r]:
        g = gh[r]
        e["gh"] = {"archived": g["archived"], "pushed": g["pushed"], "created": g["created"], "lic": g["license"]}
        if g["archived"]:
            ERR.append("archived repo not marked: " + e["id"]) if e["status"] != "archived" else None
    if e.get("hf"):
        h = hf.get(e["hf"], {})
        c = stc.get(e["hf"], {})
        e["hfm"] = {"id": e["hf"], "params": h.get("params"), "lic": h.get("license"), "mod": h.get("lastModified"), "created": h.get("created"),
                    "sha": (h.get("sha") or "")[:8], "maxlen": c.get("max_seq_length"), "pool": c.get("pooling"), "prompts": c.get("prompts"), "dim": c.get("dim") or (h.get("config") or {}).get("hidden_size")}
    p = e.get("pypi")
    if p and p in pypi and "history" in pypi[p]:
        hist = [x for x in pypi[p]["history"] if stable(x[1])]
        e["first"] = hist[0] if hist else None
    dp = e["deploy"]
    e["deployK"] = ("weights" if "open weights" in dp else "library" if dp.startswith("library") else
                    "hosted" if ("service only" in dp or dp.startswith("hosted") or dp.startswith("inside")) else "self")
    if not e["ver"]:
        e["ver"], e["date"], e["verSrc"] = "docs", ASOF, (e.get("statusSrc") or "")
    atlas.append(e)

ids = [e["id"] for e in atlas]
assert len(ids) == len(set(ids)), "duplicate ids"

# check: pypi-backed dates match pypi.json; timeline dates match arxiv and recorded releases
for e in atlas:
    p = e.get("pypi")
    if isinstance(e.get("ver"), str) and e["verSrc"].startswith("https://pypi.org") and p in pypi:
        if e["date"] != pypi[p]["date"]:
            ERR.append("date mismatch " + e["id"])
tl = []
for d, lane, lab, kind, src in T:
    m = re.search(r"arxiv.org/abs/(\d{4}\.\d{5})", src)
    if m:
        a = arx.get(m.group(1))
        if not a:
            ERR.append("arxiv id not recorded " + m.group(1))
        elif a["published"] != d:
            ERR.append("arxiv date %s %s != %s" % (m.group(1), d, a["published"]))
    m = re.search(r"pypi.org/project/([^/]+)/([^/]+)/", src)
    if m:
        hd = dict((v, t) for t, v in pypi[m.group(1)]["history"])
        if hd.get(m.group(2)) != d:
            ERR.append("pypi date %s %s %s != %s" % (m.group(1), m.group(2), d, hd.get(m.group(2))))
    m = re.search(r"github.com/([^/]+/[^/]+)/releases/tag/(.+)$", src)
    if m:
        got = ghapi.get("_tags", {}).get(m.group(1), {}).get(m.group(2)) or next((x[1] for x in ghapi.get(m.group(1), []) if x[0] == m.group(2)), None)
        if m.group(1) == "nmslib/hnswlib":
            got = "2026-03-28"  # GitHub API, read 2026-10-13 (published_at of v0.9.0), also in setup FACTS
        if got != d:
            ERR.append("gh date %s %s %s != %s" % (m.group(1), m.group(2), d, got))
    tl.append({"d": d, "lane": lane, "t": lab, "k": kind, "src": src})

# checks summary for the page
chk = {k: v for k, v in cs.items()}
mt = cf["mteb_meta"]
mteb = {"version": mt["version"], "benchmark": mt["benchmark"], "n_tasks": mt["n_tasks"], "retrieval_tasks": mt["retrieval_tasks"], "src": mt["src"], "models": []}
for k, v in mt.items():
    if isinstance(v, dict) and "zero_shot_eng_v2" in v:
        mteb["models"].append({"m": k, "zs": v["zero_shot_eng_v2"], "zsr": v["zero_shot_eng_v2_retrieval"], "tr": v["trained_on_v2_retrieval"],
                               "beir": v.get("beir_in_training", []), "rel": v["release_date"][:10], "n": v["n_parameters"]})

RR = "https://github.com/embeddings-benchmark/results/tree/main/results"
SF = [  # SciFact test nDCG@10; published values as recorded by the setup agent in FACTS.md (2026-10-13)
 ["Alibaba-NLP/gte-modernbert-base", 0.7641, "MTEB results repo", RR],
 ["answerdotai/answerai-colbert-small-v1 (late interaction)", 0.7477, "vendor (model card)", "https://huggingface.co/answerdotai/answerai-colbert-small-v1"],
 ["BAAI/bge-small-en-v1.5", 0.7127, "MTEB results repo", RR],
 ["BAAI/bge-small-en-v1.5, exact search", dr["exact_ndcg10"], "measured here (running example vectors)", ""],
 ["Qwen/Qwen3-Embedding-0.6B", 0.6972, "MTEB results repo", RR],
 ["BM25 plus ms-marco-MiniLM-L6 cross-encoder", 0.688, "BEIR paper, Table 2 (independent, 2021)", "https://arxiv.org/abs/2104.08663"],
 ["BM25 (Elasticsearch)", 0.665, "BEIR paper, Table 2 (independent, 2021)", "https://arxiv.org/abs/2104.08663"],
 ["sentence-transformers/all-MiniLM-L6-v2", 0.6451, "MTEB results repo", RR]]
out = {"asof": ASOF, "sf": SF, "atlas": atlas, "timeline": tl, "checks": chk, "fw": {k: cf[k] for k in ("llamaindex", "langchain", "haystack", "dspy", "txtai", "graphrag")},
       "mteb": mteb, "defaults": dr, "arxiv": arx}
def clean(o):
    if isinstance(o, str):
        return o.replace("\u2014", ", ").replace("\u2013", "-")
    if isinstance(o, list):
        return [clean(x) for x in o]
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    return o


out = clean(out)  # source titles from SciFact contain em and en dashes; the page uses none
js = "/* generated by src/map/gen_data.py from src/map/inputs and atlas_*.py; do not edit by hand */\nwindow.MAPD=" + json.dumps(out, separators=(",", ":"), ensure_ascii=False) + ";\n"
dst = os.path.join(HERE, "..", "parts", "34_js_map_0data.js")
open(dst, "w").write(js)
print("atlas", len(atlas), "timeline", len(tl), "bytes", len(js))
for e in ERR:
    print("CHECK:", e)
if ERR:
    sys.exit(1)

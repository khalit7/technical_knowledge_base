"""Fetch dated metadata for the Tool map atlas: PyPI (versions, dates, licences, release history),
GitHub (licence, archived, last push, release feed) and Hugging Face (model licence, revision, size, config).
Run: python3 src/map/fetch_meta.py [pypi|gh|rel|hf]   (plain Python 3; writes src/map/inputs/*.json).
GitHub's unauthenticated API allows 60 calls an hour, so repo metadata is one call per repo and releases come
from the public Atom feeds (github.com/<repo>/releases.atom), which are not rate limited."""
import json, os, re, sys, time, urllib.request, xml.etree.ElementTree as ET
HERE = os.path.dirname(os.path.abspath(__file__))
I = os.path.join(HERE, "inputs")
UA = {"User-Agent": "kb-tool-map/1.0"}

PYPI = ["qdrant-client", "pymilvus", "weaviate-client", "chromadb", "lancedb", "pinecone", "turbopuffer", "pyvespa",
        "elasticsearch", "opensearch-py", "redis", "redisvl", "faiss-cpu", "hnswlib", "pgvector", "diskannpy", "usearch",
        "sentence-transformers", "FlagEmbedding", "colbert-ai", "pylate", "ragatouille", "colpali-engine", "rerankers",
        "llama-index-core", "llama-index", "langchain", "langchain-core", "haystack-ai", "dspy", "dspy-ai", "txtai",
        "graphrag", "lightrag-hku", "nano-graphrag", "ragas", "deepeval", "trulens", "trulens-eval", "ares-ai", "ranx",
        "pytrec-eval-terrier", "ir-measures", "beir", "mteb", "bm25s", "rank-bm25", "pyserini", "tantivy",
        "openai", "cohere", "voyageai", "google-genai", "jina", "mixedbread", "llama-index-vector-stores-qdrant", "langchain-community"]

GH = ["pgvector/pgvector", "qdrant/qdrant", "milvus-io/milvus", "weaviate/weaviate", "chroma-core/chroma", "lancedb/lancedb",
      "lancedb/lance", "vespa-engine/vespa", "elastic/elasticsearch", "opensearch-project/OpenSearch", "opensearch-project/k-NN",
      "redis/redis", "RediSearch/RediSearch", "facebookresearch/faiss", "nmslib/hnswlib", "microsoft/DiskANN", "unum-cloud/usearch",
      "timescale/pgvectorscale", "UKPLab/sentence-transformers", "FlagOpen/FlagEmbedding", "stanford-futuredata/ColBERT",
      "lightonai/pylate", "AnswerDotAI/RAGatouille", "illuin-tech/colpali", "run-llama/llama_index", "langchain-ai/langchain",
      "deepset-ai/haystack", "stanfordnlp/dspy", "neuml/txtai", "microsoft/graphrag", "HKUDS/LightRAG", "gusye1234/nano-graphrag",
      "explodinggradients/ragas", "confident-ai/deepeval", "truera/trulens", "stanford-futuredata/ARES", "AmenRa/ranx",
      "beir-cellar/beir", "embeddings-benchmark/mteb", "xhluca/bm25s", "dorianbrown/rank_bm25", "castorini/pyserini",
      "castorini/anserini", "quickwit-oss/tantivy", "QwenLM/Qwen3-Embedding", "AnswerDotAI/rerankers", "apache/lucene"]

HF = ["Qwen/Qwen3-Embedding-0.6B", "Qwen/Qwen3-Embedding-4B", "Qwen/Qwen3-Embedding-8B", "Qwen/Qwen3-Reranker-0.6B",
      "Qwen/Qwen3-Reranker-8B", "BAAI/bge-small-en-v1.5", "BAAI/bge-large-en-v1.5", "BAAI/bge-m3", "BAAI/bge-reranker-v2-m3",
      "intfloat/e5-small-v2", "intfloat/multilingual-e5-large-instruct", "Alibaba-NLP/gte-modernbert-base",
      "Alibaba-NLP/gte-multilingual-base", "nomic-ai/nomic-embed-text-v1.5", "nomic-ai/nomic-embed-text-v2-moe",
      "jinaai/jina-embeddings-v3", "jinaai/jina-embeddings-v4", "jinaai/jina-reranker-v2-base-multilingual",
      "jinaai/jina-reranker-m0", "jinaai/jina-colbert-v2", "sentence-transformers/all-MiniLM-L6-v2",
      "mixedbread-ai/mxbai-embed-large-v1", "mixedbread-ai/mxbai-rerank-base-v2", "mixedbread-ai/mxbai-rerank-large-v2",
      "cross-encoder/ms-marco-MiniLM-L6-v2", "colbert-ir/colbertv2.0", "answerdotai/answerai-colbert-small-v1",
      "vidore/colpali-v1.3", "vidore/colqwen2.5-v0.2", "google/embeddinggemma-300m", "Snowflake/snowflake-arctic-embed-l-v2.0",
      "lightonai/GTE-ModernColBERT-v1", "nvidia/llama-embed-nemotron-8b", "intfloat/e5-mistral-7b-instruct",
      "Qwen/Qwen3-VL-Embedding-2B", "Qwen/Qwen3-VL-Reranker-2B", "jinaai/jina-embeddings-v5-text-small", "jinaai/jina-embeddings-v5-text-nano",
      "jinaai/jina-reranker-v3.5", "jinaai/jina-reranker-v3", "voyageai/voyage-4-nano", "google/embeddinggemma-2", "perplexity-ai/pplx-embed-v1-0.6b",
      "BAAI/bge-reranker-v2.5-gemma2-lightweight", "nomic-ai/colnomic-embed-multimodal-3b", "mixedbread-ai/mxbai-edge-colbert-v0-32m"]


def get(url, binary=False):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        b = r.read()
    return b if binary else b.decode("utf-8", "replace")


def save(name, d):
    json.dump(d, open(os.path.join(I, name), "w"), indent=1, sort_keys=True)


def load(name):
    p = os.path.join(I, name)
    return json.load(open(p)) if os.path.exists(p) else {}


def pypi():
    out = load("pypi.json")
    for p in PYPI:
        try:
            d = json.loads(get(f"https://pypi.org/pypi/{p}/json"))
        except Exception as e:
            out[p] = {"error": str(e)}; continue
        info = d["info"]
        hist = []
        for v, files in d["releases"].items():
            if files:
                t = min(f["upload_time"] for f in files)
                hist.append([t[:10], v])
        hist.sort()
        rel_files = d["releases"].get(info["version"]) or d.get("urls") or []
        cls = [c for c in info.get("classifiers") or [] if c.startswith("License") or c.startswith("Development Status")]
        out[p] = {"version": info["version"], "date": min([f["upload_time"] for f in rel_files] or [""])[:10],
                  "license": (info.get("license_expression") or info.get("license") or "")[:200], "classifiers": cls,
                  "summary": info.get("summary"), "home": info.get("home_page") or (info.get("project_urls") or {}).get("Homepage"),
                  "requires_python": info.get("requires_python"), "yanked": info.get("yanked"),
                  "history": hist, "fetched": time.strftime("%Y-%m-%d")}
        print(p, out[p]["version"], out[p]["date"], out[p]["license"][:40])
    save("pypi.json", out)


def gh():
    out = load("github_repos.json")
    for r in GH:
        if r in out and "error" not in out[r]:
            continue
        try:
            d = json.loads(get(f"https://api.github.com/repos/{r}"))
        except Exception as e:
            print(r, "ERR", e); out[r] = {"error": str(e)}
            if "403" in str(e) or "429" in str(e):
                break
            continue
        out[r] = {"full_name": d["full_name"], "license": (d.get("license") or {}).get("spdx_id"), "archived": d["archived"],
                  "pushed": d["pushed_at"][:10], "created": d["created_at"][:10], "stars": d["stargazers_count"],
                  "desc": d.get("description"), "owner_type": d["owner"]["type"], "fetched": time.strftime("%Y-%m-%d")}
        print(r, out[r]["license"], out[r]["archived"], out[r]["pushed"], out[r]["stars"])
    save("github_repos.json", out)


def rel():
    ns = {"a": "http://www.w3.org/2005/Atom"}
    out = load("github_releases.json")
    for r in GH:
        ent = []
        for kind in ("releases", "tags"):
            try:
                x = ET.fromstring(get(f"https://github.com/{r}/{kind}.atom", binary=True))
            except Exception as e:
                continue
            for e in x.findall("a:entry", ns):
                t = e.find("a:title", ns).text or ""
                u = e.find("a:updated", ns).text or ""
                link = e.find("a:link", ns).attrib.get("href", "")
                ent.append([u[:10], t.strip()[:80], link.rsplit("/", 1)[-1]])
            if ent:
                out[r] = {"kind": kind, "entries": ent[:12], "fetched": time.strftime("%Y-%m-%d")}
                break
        print(r, (out.get(r) or {}).get("kind"), (out.get(r) or {}).get("entries", [[None]])[:1])
    save("github_releases.json", out)


def hf():
    out = load("hf_models.json")
    for m in HF:
        if m in out and "error" not in out[m]:
            continue
        try:
            d = json.loads(get(f"https://huggingface.co/api/models/{m}?expand[]=safetensors&expand[]=cardData&expand[]=lastModified&expand[]=createdAt&expand[]=sha&expand[]=downloads&expand[]=gated&expand[]=library_name&expand[]=pipeline_tag&expand[]=tags"))
        except Exception as e:
            out[m] = {"error": str(e)}; print(m, "ERR", e); continue
        cfg = {}
        try:
            c = json.loads(get(f"https://huggingface.co/{m}/resolve/main/config.json"))
            cfg = {k: c.get(k) for k in ("model_type", "hidden_size", "num_hidden_layers", "max_position_embeddings", "vocab_size", "architectures") if k in c}
        except Exception:
            pass
        st = d.get("safetensors") or {}
        card = d.get("cardData") or {}
        lic = card.get("license") or next((t[8:] for t in d.get("tags", []) if t.startswith("license:")), None)
        out[m] = {"sha": d.get("sha"), "lastModified": (d.get("lastModified") or "")[:10], "created": (d.get("createdAt") or "")[:10],
                  "license": lic, "license_name": card.get("license_name"), "params": st.get("total"), "downloads": d.get("downloads"),
                  "gated": d.get("gated"), "library": d.get("library_name"), "pipeline": d.get("pipeline_tag"), "config": cfg,
                  "fetched": time.strftime("%Y-%m-%d")}
        print(m, lic, out[m]["params"], out[m]["lastModified"], cfg.get("hidden_size"))
    save("hf_models.json", out)


if __name__ == "__main__":
    {"pypi": pypi, "gh": gh, "rel": rel, "hf": hf}[sys.argv[1]]()

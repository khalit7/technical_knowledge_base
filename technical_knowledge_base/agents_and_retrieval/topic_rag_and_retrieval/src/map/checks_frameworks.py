"""Read the retrieval defaults of each framework from the installed package (signatures and source), and run a
tiny in-memory retrieval with each where no model download is needed. No network, no timing.
Run: <mapenv>/bin/python -I checks_frameworks.py <out json>"""
import inspect, json, os, sys, importlib.metadata as md


def ver(p):
    try:
        return md.version(p)
    except Exception:
        return None


def sig_defaults(obj, names):
    sig = inspect.signature(obj)
    return {n: (repr(sig.parameters[n].default) if n in sig.parameters else "absent") for n in names}


def where(obj):
    f = inspect.getsourcefile(obj)
    ln = inspect.getsourcelines(obj)[1]
    return f.split("site-packages/")[-1] + ":" + str(ln)


def field_default(cls, name):
    f = getattr(cls, "model_fields", {}).get(name)
    return repr(f.default) if f is not None else "absent"


O = {}


def run(k, fn):
    try:
        O[k] = fn()
    except Exception as e:
        O[k] = {"error": repr(e)[:300]}
    print(k, json.dumps(O[k])[:600])


def llamaindex():
    from llama_index.core.node_parser import SentenceSplitter
    from llama_index.core.indices.vector_store.retrievers import VectorIndexRetriever
    from llama_index.core import constants, Settings
    from llama_index.core.vector_stores import SimpleVectorStore
    r = {"version": ver("llama-index-core"),
         "SentenceSplitter": {k: field_default(SentenceSplitter, k) for k in ("chunk_size", "chunk_overlap")}, "SentenceSplitter_at": where(SentenceSplitter),
         "DEFAULT_CHUNK_SIZE": constants.DEFAULT_CHUNK_SIZE, "DEFAULT_CHUNK_OVERLAP": getattr(constants, "SENTENCE_CHUNK_OVERLAP", None),
         "DEFAULT_SIMILARITY_TOP_K": constants.DEFAULT_SIMILARITY_TOP_K, "constants_at": constants.__file__.split("site-packages/")[-1],
         "VectorIndexRetriever.similarity_top_k": sig_defaults(VectorIndexRetriever.__init__, ["similarity_top_k"]), "retriever_at": where(VectorIndexRetriever)}
    src = inspect.getsource(SimpleVectorStore.query)
    r["SimpleVectorStore.query_calls"] = [n for n in ("get_top_k_embeddings", "get_top_k_mmr_embeddings", "get_top_k_embeddings_learner") if n in src]
    r["SimpleVectorStore_at"] = where(SimpleVectorStore.query)
    return r


def langchain():
    from langchain_text_splitters import RecursiveCharacterTextSplitter, TextSplitter
    from langchain_core.vectorstores import VectorStore, InMemoryVectorStore
    r = {"version_core": ver("langchain-core"), "version_splitters": ver("langchain-text-splitters"), "version_langchain": ver("langchain"),
         "TextSplitter": sig_defaults(TextSplitter.__init__, ["chunk_size", "chunk_overlap", "length_function"]), "TextSplitter_at": where(TextSplitter.__init__),
         "Recursive_separators_default": repr(RecursiveCharacterTextSplitter()._separators)}
    src = inspect.getsource(VectorStore.as_retriever) + inspect.getsource(VectorStore.similarity_search)
    r["as_retriever_doc_mentions_k4"] = "k: Amount of documents to return (Default: 4)" in inspect.getsource(VectorStore.as_retriever)
    r["similarity_search_k"] = sig_defaults(VectorStore.similarity_search, ["k"])
    r["as_retriever_at"] = where(VectorStore.as_retriever)
    from langchain_core.embeddings import DeterministicFakeEmbedding
    vs = InMemoryVectorStore(DeterministicFakeEmbedding(size=16))
    vs.add_texts(["a cat", "a dog", "a bird", "a fish", "a cow", "a hen"])
    r["inmemory_default_results"] = len(vs.as_retriever().invoke("a cat"))
    r["inmemory_search_src_uses"] = [n for n in ("cosine_similarity", "maximal_marginal_relevance") if n in inspect.getsource(InMemoryVectorStore)]
    return r


def haystack():
    from haystack.document_stores.in_memory import InMemoryDocumentStore
    from haystack.components.retrievers.in_memory import InMemoryBM25Retriever, InMemoryEmbeddingRetriever
    from haystack.components.preprocessors import DocumentSplitter
    from haystack import Document
    ds = InMemoryDocumentStore()
    ds.write_documents([Document(content=t) for t in ["the cat sat on the mat", "dogs bark", "the mat was red", "cats and dogs"]])
    res = InMemoryBM25Retriever(ds).run(query="cat mat")
    return {"version": ver("haystack-ai"), "InMemoryDocumentStore": sig_defaults(InMemoryDocumentStore.__init__, ["bm25_algorithm", "bm25_parameters", "embedding_similarity_function"]),
            "store_at": where(InMemoryDocumentStore.__init__),
            "BM25Retriever.top_k": sig_defaults(InMemoryBM25Retriever.__init__, ["top_k"])["top_k"], "EmbeddingRetriever.top_k": sig_defaults(InMemoryEmbeddingRetriever.__init__, ["top_k"])["top_k"],
            "DocumentSplitter": sig_defaults(DocumentSplitter.__init__, ["split_by", "split_length", "split_overlap"]), "splitter_at": where(DocumentSplitter.__init__),
            "bm25_tiny_top": [d.content for d in res["documents"][:2]]}


def dspy_chk():
    import dspy
    r = {"version": ver("dspy")}
    try:
        from dspy.retrievers import Embeddings
        r["Embeddings"] = sig_defaults(Embeddings.__init__, ["k", "brute_force_threshold"])
        src = inspect.getsource(Embeddings)
        r["uses_faiss"] = "faiss" in src
        r["Embeddings_at"] = where(Embeddings.__init__)
    except Exception as e:
        r["Embeddings"] = repr(e)[:200]
    r["has_ColBERTv2"] = hasattr(dspy, "ColBERTv2")
    return r


def txtai_chk():
    from txtai.embeddings import Embeddings
    import txtai.ann
    src = inspect.getsource(sys.modules["txtai.ann.factory"]) if "txtai.ann.factory" in sys.modules else ""
    import txtai.ann.dense.factory as f2
    s2 = inspect.getsource(f2)
    return {"version": ver("txtai"), "ann_factory_default_mentions": [b for b in ("faiss", "hnsw", "annoy", "numpy", "torch", "pgvector", "sqlite") if b in s2][:8],
            "factory_at": f2.__file__.split("site-packages/")[-1]}


def graphrag_chk():
    import graphrag, pkgutil, os
    root = os.path.dirname(graphrag.__file__)
    hits = []
    for dp, dn, fn in os.walk(root):
        for f in fn:
            if f.endswith(".py"):
                t = open(os.path.join(dp, f), errors="ignore").read().lower()
                if "lazy" in t and "graphrag" in t and "lazygraphrag" in t.replace("_", "").replace(" ", ""):
                    hits.append(os.path.join(dp, f).split("site-packages/")[-1])
    return {"version": ver("graphrag"), "files_mentioning_lazygraphrag": hits}


def mteb_meta():
    """Declared training data (ModelMeta.get_training_datasets, which follows adapted_from) and mteb's own zero-shot
    percentage on MTEB(eng, v2) and on its 10 retrieval tasks (ModelMeta.zero_shot_percentage)."""
    import mteb
    b = mteb.get_benchmark("MTEB(eng, v2)")
    ts = list(b.tasks)
    ret = [t for t in ts if t.metadata.type == "Retrieval"]
    out = {"version": ver("mteb"), "benchmark": "MTEB(eng, v2)", "n_tasks": len(ts), "retrieval_tasks": [t.metadata.name for t in ret],
           "src": where(mteb.models.model_meta.ModelMeta.zero_shot_percentage)}
    names = ["BAAI/bge-small-en-v1.5", "sentence-transformers/all-MiniLM-L6-v2", "Qwen/Qwen3-Embedding-0.6B", "Alibaba-NLP/gte-modernbert-base",
             "intfloat/e5-small-v2", "nomic-ai/nomic-embed-text-v1.5", "mixedbread-ai/mxbai-embed-large-v1", "BAAI/bge-m3", "google/embeddinggemma-300m",
             "Snowflake/snowflake-arctic-embed-l-v2.0", "intfloat/e5-mistral-7b-instruct", "nvidia/llama-embed-nemotron-8b", "jinaai/jina-embeddings-v3",
             "Qwen/Qwen3-Embedding-8B"]
    beir = ["SciFact", "NFCorpus", "HotpotQA", "FiQA2018", "MSMARCO", "NQ", "FEVER", "ArguAna", "TRECCOVID", "SCIDOCS", "Touche2020", "QuoraRetrieval", "ClimateFEVER", "DBPedia"]
    for n in names:
        try:
            m = mteb.get_model_meta(n)
            td = m.get_training_datasets()
            r = {"release_date": str(getattr(m, "release_date", "")), "n_parameters": getattr(m, "n_parameters", None),
                 "zero_shot_eng_v2": m.zero_shot_percentage(ts), "zero_shot_eng_v2_retrieval": m.zero_shot_percentage(ret),
                 "trained_on_v2_retrieval": [t.metadata.name for t in ret if not m.is_zero_shot_on([t])]}
            if td is not None:
                r["n_training_datasets"] = len(td)
                r["beir_in_training"] = sorted(t for t in beir if any(k == t or k.startswith(t) for k in td))
            out[n] = r
        except Exception as e:
            out[n] = {"error": repr(e)[:160]}
    return out


for k, f in [("llamaindex", llamaindex), ("langchain", langchain), ("haystack", haystack), ("dspy", dspy_chk), ("txtai", txtai_chk), ("graphrag", graphrag_chk), ("mteb_meta", mteb_meta)]:
    if len(sys.argv) > 2 and k not in sys.argv[2:]:
        continue
    run(k, f)
p = sys.argv[1]
old = json.load(open(p)) if os.path.exists(p) else {}
old.update(O)
json.dump(old, open(p, "w"), indent=1)

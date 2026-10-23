# Vector indexes from the inside: flat, IVF, PQ, HNSW, DiskANN, filtered search

Notion: https://app.notion.com/p/3f85c17b0d0d81f29707c130b2ebcfb1 (child of Topic: rag-and-retrieval)
Site: https://khalit7.github.io/technical_knowledge_base/agents_and_retrieval/topic_rag_and_retrieval/vector_indexes/

HTML-only page: `index.html` is the whole page (Reading, HNSW lab, IVF-PQ lab, Frontier, Filter lab, Further reading). Built from `src/` (see `src/README.md`): experiments on the topic's running example (SciFact, NFCorpus, HotpotQA, QASPER with Qwen3-Embedding; BEIR Quora with MiniLM for scale) on an Apple M1 Pro, source read at faiss v1.15.1 and hnswlib v0.8.0, a Python port of hnswlib checked against it, Vamana and ACORN-1 written from their papers, Qdrant v1.19.2 and ScaNN 1.4.2 in containers. Data as of October 2026.

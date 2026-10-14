# Topic: rag-and-retrieval

Notion: https://app.notion.com/p/3c65c17b0d0d81b89145c37dfe8a3b0b

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`). How a system finds the right passages and answers from them, taught from zero on one running example (SciFact and NFCorpus for retrieval, QASPER for chunking, 200 HotpotQA questions for multi-hop; embedding models, rerankers and Qwen3 1.7B/4B generators run locally): words and vectors, BM25 and embeddings, vector indexes, hybrid search and reranking, where an answer gets lost (A = r_K x p_k|K x g), and agentic retrieval. Tabs: Reading (`src/read/`), Pipeline lab (`src/pipe/`), Vector search lab (`src/vec/`), Agentic lab (`src/agent/`: five strategies on Qwen3 1.7B and 4B, tokens per step, routers, lost in the middle, a small GraphRAG index), Tool map (`src/map/`), Further reading. Shared running example and loaders in `src/data/`.
Real runs on an Apple M1 Pro (CPU and MPS), 2026-10-13 to 15; published numbers kept apart and dated.
Eight child pages, each in its own folder: embedding_models, vector_indexes, retrieval_pipeline, rerankers_and_late_interaction, document_ingestion_and_multimodal, agentic_retrieval, graphrag_and_structured_retrieval, rag_in_production.

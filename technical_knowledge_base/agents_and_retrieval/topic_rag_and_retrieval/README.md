# Topic: rag-and-retrieval

Notion: https://app.notion.com/p/3c65c17b0d0d81b89145c37dfe8a3b0b
Site: https://khalit7.github.io/technical_knowledge_base/agents_and_retrieval/topic_rag_and_retrieval/

Interactive page: `index.html`, built from `src/` (`sh src/build.sh`). Rebuilt on 2026-10-24 as a map of the topic: the stages from a document to a cited answer with the child page that owns each, four ways to score a passage compared, the one lesson of each stage, where an answer gets lost (A = r_K x p_k|K x g) and the two recalls, who decides what to read, what changes after launch, the tools, and the child cards. Tabs: Reading, Tool map (`src/map/`), Further reading. The topic's shared runs stay in `src/pipe`, `src/vec` and `src/agent` (the children read them); the retired Pipeline lab, Vector search lab and Agentic lab parts are in `src/retired/`. Shared running example and loaders in `src/data/`; the method is in `src/README.md`.
Real runs on an Apple M1 Pro (CPU and MPS), 2026-10-13 to 15; published numbers kept apart and dated.
Eight child pages, each in its own folder: embedding_models, vector_indexes, retrieval_pipeline, rerankers_and_late_interaction, document_ingestion_and_multimodal, agentic_retrieval, graphrag_and_structured_retrieval, rag_in_production.

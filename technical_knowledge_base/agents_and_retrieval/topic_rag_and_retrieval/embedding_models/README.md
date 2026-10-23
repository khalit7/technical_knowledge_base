# Embedding models: training, choosing and fine-tuning

Notion: https://app.notion.com/p/3c65c17b0d0d81508f99e1fa78c2bb41 (child of Topic: rag-and-retrieval; reuses the old page "Embeddings and vector search", to be retitled; its index material moved to Vector indexes from the inside)
Site: https://khalit7.github.io/technical_knowledge_base/agents_and_retrieval/topic_rag_and_retrieval/embedding_models/

HTML-only page: `index.html` is built from `src/` (`python3 src/build_data.py && sh src/build.sh`). Tabs: Reading, Training lab, Model chooser, Further reading. Everything measured on an Apple M1 Pro in October 2026 on the topic's running example (SciFact, NFCorpus, the multi-hop set); experiments in `src/scripts/`, results in `src/data/`; see `src/README.md`. All runs are done (the tiny fine-tune ran on 2026-10-15). The old page text is saved in `src/live.md` and checked claim by claim in `src/coverage.md`.

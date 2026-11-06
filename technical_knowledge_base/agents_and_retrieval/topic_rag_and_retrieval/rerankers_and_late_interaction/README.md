# Rerankers and late interaction: cross-encoders, ColBERT, LLM rerankers

Notion: https://app.notion.com/p/3f85c17b0d0d813fba53fc883f8a2c8f (child of Topic: rag-and-retrieval)
Site: https://khalit7.github.io/technical_knowledge_base/agents_and_retrieval/topic_rag_and_retrieval/rerankers_and_late_interaction/

HTML-only page: `index.html` is built from `src/` (`python3 src/build_data.py && sh src/build.sh`). Tabs: Reading (split layout; the idea with a 3D hero, eleven sections with four 3D stages: scorers, bi-encoder against cross-encoder, a candidate list reranked, MaxSim token by token; learned sparse retrieval), Depth chooser, Further reading. Rebuilt to the teaching contract on 2026-10-24 and to the split layout with renderer v2 stages on 2026-11-06 (see `src/README.md`). Everything measured on an Apple M1 Pro in October 2026 on the topic's SciFact running example; scripts in `src/scripts/`, results in `src/data/`; the learned-sparse run is the Retrieval pipeline page's (`src/inputs/sparse_rp.json`).

# The retrieval pipeline: chunking, query rewriting, hybrid search, filtering

Notion: https://app.notion.com/p/3c65c17b0d0d819899fde889e1e8b782 (child of Topic: rag-and-retrieval; reuses the old page "The retrieval pipeline: chunking, hybrid search, query transformation, reranking", to be retitled)

HTML-only page: `index.html` is built from `src/` (`$RAG_SCRATCH/venv/bin/python -I -B src/exp/make_data.py && python3 src/build_facts.py && sh src/build.sh`). Tabs: Reading, Chunking workbench, Fusion lab, Query-rewrite lab, Further reading. Everything measured on an Apple M1 Pro in October 2026 on the topic's running example (SciFact, NFCorpus, QASPER, HotpotQA); experiments in `src/exp/`, results in `src/out/`; see `src/README.md`. The old page text is saved in `src/live.md` and checked claim by claim in `src/coverage.md`.

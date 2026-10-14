# Coverage: Document ingestion and multimodal retrieval

This is a new page. Its Notion page held only the placeholder "Being built: the interactive page will replace this text." (fetched 2026-10-13), so there is no old text to carry and no `live.md`.

The old children of Topic: rag-and-retrieval were checked for ingestion material (fetched read-only 2026-10-14):
- **The retrieval pipeline** (3c65c17b0d0d819899fde889e1e8b782): no parsing, OCR, table or multimodal content. One related claim, "mixed strategies across ingestion runs can cost ~8 points of recall", is unsourced; it is about chunking consistency and belongs to the retrieval_pipeline child, which should verify or drop it. This page does not repeat it.
- The old root, "Embeddings and vector search", "Advanced and agentic RAG" and "RAG evaluation" were not reused; nothing in their subjects overlaps this page's (parsing, OCR, tables, figures, metadata at ingestion, re-indexing, page-image retrieval).

Corrections found while building (for other pages):
- The root's `src/data/README.md` says QASPER validation has "53 with evidence only in figures or tables". Counted from the raw evidence strings (`scripts/qasper_stats.py`), the 53 dropped answerable questions are 35 whose only evidence is a table or figure (`FLOAT SELECTED`) plus 18 whose annotators gave no evidence string at all. A further 129 answerable questions cite a table or figure alongside text; the root keeps them with their text evidence only. In total 164 of 945 answerable questions (17.4%) cite a float.

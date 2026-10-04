# Visualisation ideas: Search and vector databases

Scored 1 to 5 on teaching value (T), data reality (D), fit to the page (F). Built ones first.

| # | Idea | T | D | F | Placement | Status |
|---|---|---|---|---|---|---|
| 1 | One query, four ways on a toy vector space: brute force, IVF 1 probe, IVF 2 probes, HNSW (layered greedy walk then beam search), distance computations and recall counted | 5 | 3 (toy, but the real HNSW and k-means algorithms, exact counts) | 5 | Reading 9, before/after animation | built (`23_js_toy.js`, `31_js_rd_ann.js`) |
| 2 | Filtered search on the same toy: post-filter, iterative scan, pre-filter | 5 | 3 | 5 | Reading 12, animation | built (`32_js_rd_filt.js`) |
| 3 | Inverted index built question by question from real Postgres lexemes, then the query answered from postings, against a LIKE scan | 5 | 5 (real to_tsvector output) | 5 | Reading 3, before/after animation | built (`24_js_rd_inv.js`) |
| 4 | BM25 worked on six real questions with k1 and b sliders, idf table, and the tf saturation curve | 5 | 5 | 5 | Reading 4, inline | built (`25_js_rd_bm25.js`) |
| 5 | RRF of the BM25 and real cosine rankings with a k slider, formula shown per row | 4 | 5 | 5 | Reading 13, inline | built |
| 6 | ANN lab: recall against latency (log 1-recall axis, log ms) for every measured setting (HNSW m 8/16/32, IVFFlat 523/2000 lists, halfvec, binary with re-ranking, exact), knob slider, median/p95 toggle, size and build stat tiles | 5 | 5 (measured) | 5 | Tab | built (`41_js_ann.js`) |
| 7 | Memory calculator from the measured bytes per vector (vector part exact, link part from the measured index) | 4 | 4 (estimate stated) | 5 | ANN lab tab | built |
| 8 | Retrievers side by side: real labelled questions, five retrievers' top 5, relevant marked, plus averages | 5 | 5 | 5 | Tab | built (`45_js_side.js`) |
| 9 | Measured tables (index settings, quantisation, filters, hybrid) drawn from the inputs | 4 | 5 | 5 | Reading 10 to 13 | built (`26_js_rd_tables.js`) |
| 10 | 2D projection (UMAP/PCA) of the real 522,931 embeddings | 2 | 4 | 2 | | rejected: projections distort neighbourhoods, so the picture would teach the wrong lesson about "near" |
| 11 | Live Lucene segment merge simulator | 3 | 2 | 3 | | rejected: the storage sibling's LSM lab already teaches the merge pattern; linked instead |
| 12 | Product quantisation codebook animation | 3 | 2 | 3 | | rejected for now: pgvector has no PQ to measure; the arithmetic is given in prose |
| 13 | Running a dedicated vector DB (Qdrant) locally for a measured comparison | 4 | 5 | 4 | | not done: time budget; the page says the dedicated-store numbers are vendor-run and tells the reader to measure |

What the methodology lacked: guidance for toys whose algorithm is real but whose data is illustrative (2D). Here the toy is labelled illustrative, the counts are exact for the toy, and the real numbers sit in the same section.

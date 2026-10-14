# Coverage and corrections

This is a new page: no old Notion page is carried over. The old child "The retrieval pipeline" (Notion 3c65c17b0d0d819899fde889e1e8b782, fetched read-only 2026-10-14, last edited 2026-09-30) had a Reranking section; its claims were treated as unverified notes and checked here. The verdicts are input for the retrieval_pipeline child and the root, which own that text.

| Old claim | Verdict on this page | Evidence |
|---|---|---|
| "Rerank the top 50 to 150 fused candidates, and pass the top 5 to 20" | Corrected: depth depends on the corpus and the reranker. On SciFact, quality peaks at K about 20 to 30 for the strong rerankers on the hybrid list and does not improve at K = 100; the MiniLM cross-encoder gets worse as K grows. Measure recall@K and quality at several K. | data/depth.json (e_depth.py, e_rerank_deep.py); Reading section 4, Depth chooser |
| The reranker "is consistently the highest-leverage single addition to a RAG stack" | Corrected: a reranker helps only when it judges better than the first stage. MiniLM-L6 lowered the hybrid list from 0.724 to 0.689 nDCG@10 at K = 100. | data/depth.json; Reading section 4 |
| A cross-encoder "sees every interaction between query and chunk tokens ... cannot precompute anything" | Kept, with the code (sentence-transformers 6.1.0, transformers 5.19.0) and a by-hand recomputation | e_ce_manual.py; section 2 |
| Cross-encoder rerank costs "hundreds of milliseconds per query" | Qualified: it ranges from tens of milliseconds (22 M MiniLM, K = 30) to seconds (0.6 B Qwen3-Reranker on this laptop); the cost is a formula in parameters, tokens and K | data/timings.json, data/tokens.json; section 1 |
| Cohere Rerank 4 "released December 2025", Fast and Pro, 32K context | Model names and 32K context confirmed in Cohere's docs (read 2026-10-14); the release date was not confirmed here and is not repeated | section 10 |
| Voyage rerank-2.5 as Voyage's current model | Outdated: Voyage's docs (2026-10-14) list rerank-3 and rerank-3-lite as current; rerank-2.5 is the older generation | section 10 |
| Qwen3-Reranker-8B "averages 61.81 nDCG@10 on BEIR" | Not confirmed: the Qwen3 Embedding report's reranker table uses MTEB-R and others (8B: 69.02 MTEB-R); the BEIR figure was not found in the report; dropped | section 7 note |
| bge-reranker-v2.5-gemma2-lightweight 63.67 vs bge-reranker-v2-m3 55.36 on BEIR (BAAI) | Not checked here (models not used); not repeated | |
| Jina Reranker v3 listwise, 0.6 B, 61.94 BEIR | Not checked here; not repeated | |
| "Self-hosting breaks even around 1M queries/day" | No source; dropped. The page gives a FLOPs formula instead | section 1, interview |
| Particula latency figures (hosted 600 ms, self-hosted Jina 188 ms) | Third-party, not reproduced; not repeated | |
| Anthropic contextual retrieval: reranking cut top-20 failures to 1.9% | Belongs to the retrieval pipeline child (contextual retrieval); not repeated here | |
| "Expecting the reranker to fix recall" (mistake) | Kept and measured: first-stage recall@K is drawn as the ceiling on every depth chart | section 4, mistakes |

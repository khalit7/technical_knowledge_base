# Coverage of the old page (src/live.md), claim by claim

The old page "The retrieval pipeline: chunking, hybrid search, query transformation, reranking" (Notion, last edited 2026-09-30) was treated as unverified notes. Each claim below is carried (with where), corrected, moved to the page that owns it, or dropped, with the reason. "Root" = Topic: rag-and-retrieval and its Pipeline lab tab; "rr" = Rerankers and late interaction.

## What it is, definitions
| claim | verdict | where now |
|---|---|---|
| Index time vs query time; chunk, metadata, two indexes; rewrite, filtered search, fuse, rerank, top chunks into the prompt | carried | Reading, intro and pipeline strip |
| First stage tuned for recall, second for precision; nothing downstream recovers a missed chunk | carried (root owns the funnel; measured there as A = r x p x g) | intro links the root's Pipeline lab |
| "Production default by 2026": contextualised chunks, rewrite where needed, hybrid with filter inside each search, RRF, rerank top 50 to 150, top 5 to 20 into the prompt | partly corrected: filter inside each search (kept, section 6); RRF suffices when a reranker follows (measured, section 4.5); "contextualised chunks" as a default is not supported here (root: no clear gain with a 1.7 B writer; section 1.8); depth 50 to 150 moved to rr (the hybrid list peaked at K 20 here) | section 1.8, section 4.5, section 6, rr |
| Definitions: chunk, sparse/lexical, BM25, inverted index, dense, bi-encoder, ANN/HNSW, hybrid, cross-encoder, first/second stage, recall@k, nDCG@k, pre/post/filtered search | carried (terms defined at first use; ANN and cross-encoders link to their pages) | intro, section 2, section 6 |

## Chunking
| claim | verdict | where now |
|---|---|---|
| Chunking decisions move retrieval quality more than embedding-model choice | verified on QASPER (root lab): fixed to structure-aware +13 points at 1,024 tokens with bge-small; bge-small to Qwen3-Emb on fixed chunks +2.6 | section 1 intro (root numbers), corrections box |
| "Mixed strategies across ingestion runs can cost ~8 points of recall" | no source found (two web searches); tested (section 1.9, out/mixed.json): the re-chunked half lost about 5 points; number dropped | section 1.9, corrections box |
| Fixed or recursive splitting with overlap; "256 to 512 tokens with 10 to 20% overlap is the most reliable default; hard to beat" | corrected: fixed windows of 128 to 512 lost 13 to 24 points to paragraph-aware chunks at equal budget (root lab); recursive splitting read in source and measured | section 1.2, section 1.3, corrections box |
| Structure-aware: Markdown headers, code (tree-sitter), tables | carried with sources: LangChain MarkdownHeaderTextSplitter measured; per-language separators read in source (LangChain uses separator lists, not tree-sitter, in RecursiveCharacterTextSplitter.from_language); tables belong to the ingestion page | section 1.4, link to ingestion |
| Semantic chunking: modest gains, ingestion cost, helps on unstructured prose | corrected with the root's measurement (worst at equal budget on QASPER) | section 1.6 |
| Late chunking: whole document through a long-context embedder, mean-pool per span; jina-embeddings-v2-small-en, 8,192 tokens; NFCorpus 23.46 to 29.98 | verified (Jina blog 2024-08-22; paper Table 2 23.5 to 30.0) and qualified: gains shrink to 1.1 and 0 points with jina-v3 and nomic-embed; run here with modernbert-embed-base | section 1.7, corrections box |
| "Cheap and underused" | replaced by the measured cost and result | section 1.7 |
| Contextual retrieval: 50 to 100 tokens of context; $1.02 per million document tokens with caching; 5.7% to 3.7% / 2.9% / 1.9%; "quality ceiling for static pipelines" | numbers verified on the Anthropic post (2024-09-19), assumptions added (800-token chunks, 8k documents, 100 context tokens); "quality ceiling" dropped (opinion; root's run showed no clear gain with a small writer) | section 1.8 |
| Merola and Singh: contextual retrieval preserves coherence better, costs more; late chunking more efficient, loses relevance and completeness | verified on the arXiv abstract (2504.19754, 2025-04-28), quoted | section 1.7 |
| n = ceil((L - o)/(c - o)), T = L + (n - 1) o; worked example 10,000 / 512 / 64 gives 23 chunks, 11,408 tokens, 14% | verified: arithmetic recomputed; formula matches all 281 papers at three settings | section 1.3 |

## Query transformation
| claim | verdict | where now |
|---|---|---|
| Transformations trade latency for recall; gate on difficulty or let an agent decide | carried with measured costs (root: HyDE 2.2 s, multi-query 0.8 s; here step-back and decomposition timed) | section 5.3 |
| Conversational rewriting mandatory in chat | carried with the root's eight constructed chats | section 5.3 |
| HyDE (Gao et al. 2022) closes the query-document gap; helps most zero-shot; "largely superseded by instruction-aware embedders"; hallucinated details only used for matching | mechanism carried; "superseded" corrected (HyDE lifted the instruction-aware Qwen3-Emb by 1.8 points, root lab) | section 5.3, corrections box |
| Multi-query: 3 to 5 paraphrases fused with RRF, cheap recall boost for ambiguous queries | carried with the root's result (no gain on specific claims) | section 5.3 |
| Decomposition for multi-hop, usually done by the agent loop by 2026 | measured on HotpotQA (bridge vs comparison) and linked to the agentic page | section 5.3 |

## Hybrid search
| claim | verdict | where now |
|---|---|---|
| Dense misses identifiers, BM25 misses synonyms; production runs both and fuses | carried; the identifier rule tested (dense still wins on identifier-like SciFact claims) | section 4, section 5.1 |
| BM25 formula, k1 1.2 to 2.0, b 0.75 | carried with the Lucene variant read in bm25s source; k1 and b swept on both sets | section 2.1, section 2.2 |
| Scores on different scales cannot be added | refined: equal-weight addition fails; a learned weight works (measured) | section 4.1 |
| RRF formula, k = 60 (Cormack et al. 2009) | verified (Crossref DOI) | section 4.2 |
| RRF worked example C, A, D, B, E | verified (recomputed) | section 4.2 predict drill |
| "Weighting variants rarely beat plain RRF plus a reranker" | verified on SciFact with recorded Qwen3-Reranker scores (section 4.5); without a reranker, tuned score fusion beats RRF by 1 to 1.6 points | section 4.4, section 4.5 |
| Qdrant, Weaviate, Vespa, Elasticsearch, pgvector + tsvector or ParadeDB do hybrid natively | moved: the root's Tool map tab owns engine features | link to root |
| Learned sparse (SPLADE, bge-m3 sparse) is a drop-in upgrade over BM25 | qualified: run here with an inference-free sparse model (in-domain caveat); BGE-M3 not run | section 3 |
| The effort is analyzer/tokenizer configuration, consistent chunking, evaluation | carried and measured (tokenisation variants) | section 2.3 |

## Metadata filtering
| claim | verdict | where now |
|---|---|---|
| Attach tenant, source, date, ACL, type at index time; filter inside each first-stage search; never after a top-k cut, including after RRF | carried; post-fusion filtering as a predict drill | section 6 |
| E[kept] = K s; pgvector README: ef_search 40, 10% gives 4 rows | verified in the README at v0.8.7 (line 450); compared with the root's measured post-filter counts | section 6.2 |
| pgvector iterative scans from 0.8.0, strict_order / relaxed_order, max_scan_tuples 20,000 | verified (README lines 480, 527) | section 6.2 |
| Qdrant payload indexes, filterable HNSW, planner switches to payload index scan | carried briefly; measured on the vector indexes page | section 6.2 link |
| Filtered-search benchmarks reorder the vector DB table | dropped: no source given | none |
| ACL in retrieval, never in the prompt | carried; measured on RAG in production | section 6.1 |

## Reranking (moved)
| claim | verdict | where now |
|---|---|---|
| Reranker is the highest-leverage addition; depth 50 to 150, top 5 to 20; Anthropic 150 to 20; Particula 50 to 100; Digital Applied 50 to 200 | moved to rr, which measures depth on this data (Qwen3-Reranker peaked at K 20 on the hybrid list); Anthropic's 150 to 20 and "20 chunks beat 5 or 10" verified on the post and quoted in section 1.8 context | rr; section 4.5 |
| Cohere Rerank 4, Voyage rerank-2.5, Jina Reranker v3 (61.94 BEIR), Qwen3-Reranker 8B (61.81), bge-reranker-v2.5-gemma2 (63.67 vs 55.36), self-hosting breaks even at 1M queries/day, listwise and reasoning rerankers, Particula latencies | moved to rr (owner); "1M queries/day" unsourced, flagged for rr and RAG in production to verify or drop | rr |

## Worked example, trade-offs, mistakes, connections, resources
| claim | verdict | where now |
|---|---|---|
| Illustrative support-assistant query through the pipeline (ERR_CONN_RESET, tenant Acme) | replaced by real measured examples (one claim's BM25 terms, the Fusion and Query-rewrite labs); the root's funnel shows one real claim end to end | section 2.1, labs, root |
| Trade-offs table (stage, buys, costs, use when) | replaced by the measured "In one screen" table | section 0 |
| Mistakes: filtering after retrieval; ACL in the prompt; expecting the reranker to fix recall; adding BM25 and cosine; re-chunking part of the corpus; default BM25 tokenisation; transforming every query | all carried, each with this page's measurement (reranker-recall point lives on rr and root) | section 9 |
| How it connects (root, embeddings page, evaluation page, agentic page) | carried with the new page ids (embedding_models, vector_indexes, RAG and retrieval evaluation, agentic retrieval) | Further reading |
| Best resources and further reading (Anthropic, Jina, Digital Applied, arXiv 2504.19754, Particula, Cormack, HyDE, pgvector README, Qdrant filtering guide, jina-reranker-v3) | kept: Anthropic, Jina (via the paper), 2504.19754, Cormack, HyDE, pgvector; reranker sources moved to rr; Digital Applied and Particula dropped here (vendor blogs with numbers not reproduced; rr may keep Particula's latencies) | Further reading |

Rows: 41 (a row may group several closely related claims). No claim was dropped silently: each row says carried, verified, corrected, moved or dropped.

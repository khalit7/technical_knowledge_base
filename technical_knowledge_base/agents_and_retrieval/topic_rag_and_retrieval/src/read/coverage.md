# Coverage of the old pages (Reading and Further reading tabs of Topic: rag-and-retrieval)

Saved verbatim on 2026-10-14 with read-only Notion fetches (`old/`, copied by script from the fetch results, not retyped):

| File | Notion page | Last edited |
|---|---|---|
| `old/root_topic_rag_and_retrieval.md` | Topic: rag-and-retrieval `3c65c17b0d0d81b89145c37dfe8a3b0b` | 2026-10-01 |
| `old/embeddings_and_vector_search.md` | Embeddings and vector search `3c65c17b0d0d81508f99e1fa78c2bb41` | 2026-09-30 |
| `old/the_retrieval_pipeline.md` | The retrieval pipeline `3c65c17b0d0d819899fde889e1e8b782` | 2026-09-30 |
| `old/advanced_and_agentic_rag.md` | Advanced and agentic RAG `3c65c17b0d0d8105a68cfb504ed4b0e8` | 2026-09-30 |
| `old/rag_evaluation.md` | TO DELETE: RAG evaluation `3c65c17b0d0d8165a5e7ca3deb4a468d` | 2026-10-13 |

Tags on the live root that must stay when the page is published: an `<embed ... name=topic-rag-and-retrieval.html>` (the old interactive, to be replaced by the new one), a `# Video` heading with a `<video ... name=topic_rag_and_retrieval_overview.mp4>` ("a pipeline you build, or a tool the agent calls", re-cut 23 September 2026; it describes the old page: ask Khalid whether to keep it), and ten `<page>` tags (the eight children plus the old "Advanced and agentic RAG" and "TO DELETE: RAG evaluation" titles, which are the reused and retired ids).

Verdicts: **verified** (re-read in a primary source, or reproduced by a measurement on this page or a child), **corrected** (the old claim is wrong or misleading; the new page says what holds), **unconfirmed** (not re-read here; not carried as a fact, or carried with its label), **replaced** (superseded by a measured number on the new page). "Where" names the Reading section (`rd-sN`), a tab, or a child page.

## 1. The old root, claim by claim

| # | Old claim | Verdict | Where, and evidence |
|---|---|---|---|
| 1 | RAG = find passages, put in prompt, answer from them; grounding, freshness, citations | verified (definition) | rd-s0 lead, rd-s1 with measured closed-book 45/188 and oracle 112/188 |
| 2 | Only practical way to give a model private or per-tenant data; access control at retrieval, not in the prompt | verified | rd-s1 predict: 17/18 leaks with the rule in the prompt, 0 with the filter (production child, constructed corpus) |
| 3 | The funnel: cheap first stage for recall, expensive second stage for precision, generator reads the handful | verified | rd-s0 fates animation on 188 measured claims |
| 4 | Frontier models decide natively when handed a search tool; OpenAI, Google, Anthropic deep research follow the agentic shape | unconfirmed | rd-s7 says "deep research products are the same loop with a budget of minutes" without attributing internals |
| 5 | Definitions: chunk, index/query time, sparse/BM25, dense, hybrid/RRF, bi/cross-encoder, ANN/HNSW, first/second stage, gold chunk, golden set, recall@k, nDCG@k, faithfulness | verified | rd-s2 to rd-s6 define each at first use; faithfulness by link to RAG and retrieval evaluation |
| 6 | Five components: knowledge base, retriever, ranker, integration layer, generator | covered (reframed) | rd-s5 (index time vs query time stages); rd-s9 (the stack of choices) |
| 7 | Index built before the query: right for documents, wrong default for an agent's own history | covered, with correction to the JitMem part (row 27) | rd-s7 memory paragraph |
| 8 | Mermaid taxonomy (corpus, embeddings, pipeline, architectures, evaluation, tool names) | covered (restructured) | sections 1 to 9 and the Tool map; tool names verified there (dated atlas) |
| 9 | A = r_K p_{k\|K} g, its assumptions (one gold chunk, no credit for memory answers), the three bucket formulas adding to N(1 - A) | verified | rd-s0 formula with measured values; rd-s6 bucket formulas and the citation-check point |
| 10 | Upstream loss caps everything downstream: A <= r_K | verified | rd-s0 caption, rd-s6 |
| 11 | Worked example N 200, r 0.9, p 0.833, g 0.9: A 0.675, buckets 20/30/15, perfect-factor A 0.75/0.75/0.81, ranking bucket largest | verified (arithmetic) | rd-s6 lever calculator preset reproduces every number; set beside the measured run, where generation dominates |
| 12 | Ownership of factors by pages (pipeline, embeddings, evaluation) | replaced | rd-s10 child map (eight children; old RAG evaluation retired) |
| 13 | pgvector example: ef_search 40 with a 10% filter leaves about 4 rows | verified | pgvector v0.8.7 README line 450 (rp child, FACTS); rd-s4 uses the measured post-filter instead (1.73 of 10) |
| 14 | Two recalls: ANN recall vs retrieval recall; a perfect index cannot fix the model | verified | rd-s4 predict with measured 0.959 ANN / 0.827 retrieval vs 0.845 exact |
| 15 | Anthropic contextual retrieval: 5.7% -> 3.7% / 2.9% / 1.9%; $1.02 per M document tokens | verified (vendor) | rd-s5, labelled vendor; plus the measured local run (no clear gain with a 1.7 B writer) |
| 16 | Faithfulness checks answer vs context, not context vs truth | verified (definition) | rd-s6 points to RAG and retrieval evaluation; mistakes list |
| 17 | Corpus layer: Astra for Law, GPT-6 Astra + 230 M URL legal index on CourtListener, 99.9% of precedential case law, 54% vs 38.7% on Vals AI Legal Research Bench, 15 points, 40% relative, "entirely attributable to the retrieval layer" | **corrected** | rd-s1: per the Topic: benchmarks check (2026-10-04) the product also adds legal instructions and was scored on OpenAI's private validation set, so the index effect is not isolated; Vals AI's public leaderboard lists GPT-6 Astra at 39.42% with no Astra for Law entry. 54 / 38.7 / 230 M kept as vendor figures |
| 18 | Astra for Law apparatus: zero data retention, Latham & Watkins ethical walls, 26 + 9 plugins, 47 skills, Trusted Access, `gpt-6-astra-law` API later | unconfirmed, dropped | product details, not retrieval knowledge; the benchmarks topic owns the Astra case |
| 19 | Rule: a retrieval-sensitive number without a named index carries no information | verified (kept, softened) | rd-s1 "carries little information" |
| 20 | Chunks 256 to 512 tokens with 10 to 20% overlap is the reliable default; structure-aware when headings exist | **corrected** | rd-s5: structure-aware (recursive) keeps evidence intact 93.9% vs 68.0% for fixed 256; overlap is a weak patch (546 -> 607) at 14% more tokens; compare at equal token budget |
| 21 | Chunking moves quality more than embedding-model choice | verified on QASPER | rd-s5: fixed vs structure 56.8% vs 70.0% (bge-small) while Qwen3-Embedding shows the same gap (59.4% vs 70.3%) |
| 22 | Filter inside each search; rerank top 50 to 150; top 5 to 20 to the prompt | partly **corrected** | filter inside: verified (rd-s4, rd-s5). Depth: on SciFact the large rerankers peak at K 20 and a weak reranker worsens with K; a 1.7 B generator does worse with more abstracts (g 0.626 at k 1, 0.539 at k 3). Ranges are setup-specific: sweep K and k |
| 23 | Reranker latency: Cohere Rerank 3.5 and Voyage rerank-2.5 about 600 ms hosted, Jina Reranker v3 188 ms self-hosted (Particula) | **corrected / replaced** | Particula (2026-05-22, re-read 2026-10-14): Cohere 595 to 603 ms including the network; Voyage only "the same latency band", no own figure; Jina 188 ms local on an unnamed GPU; candidate count and method not stated ("directional"). Not carried; rd-s5 gives measured K 30 latencies (155 ms, 2.18 s, 6.62 s on M1 Pro) |
| 24 | Reranker is the addition that most consistently pays for itself | **corrected** | only if stronger than the first stage: MiniLM CE lowers the fused list (0.724 -> 0.689 at K 100) (rd-s5) |
| 25 | MTEB is a prior, not a verdict; few hundred labelled queries settle it | verified | rd-s3 chart (order changes across three sets); zero-shot share from the Tool map |
| 26 | Changing the model means re-embedding everything; two models' vectors live in unrelated spaces | verified | rd-s8: half-migrated index 0.374 to 0.379 vs 0.645 / 0.713 (production child) |
| 27 | HNSW default; IVF, PQ, DiskANN at larger scale | verified | rd-s4 with measured anchors |
| 28 | 10 M chunks x 1,024 float32 = 40.96 GB; binary 1.28 GB | verified (arithmetic) | rd-s4 memory calculator (10 M, 1,024, float32 / binary) |
| 29 | pgvector enough more often than vendors admit; below about 1 M vectors store and index barely matter | partly **corrected** | rd-s4: exact scan 112 ms per 1 M x 1,024 on one core (measured); but rd-s9: defaults (hnswlib ef 10, IVF nprobe 1, LanceDB IVF_PQ) change recall even at 5,183 vectors, so "barely matter" holds only once the knobs are set |
| 30 | Naive / advanced / agentic ladder; ReAct loop; routers | verified | rd-s7 |
| 31 | GraphRAG pipeline: LLM extraction, Leiden communities, summaries, map-reduce global answers; for corpus-global questions | verified | rd-s7 (arXiv 2404.16130 v2 re-read by the Agentic lab; Leiden hierarchical via graspologic) |
| 32 | LazyGraphRAG / LightRAG get most of it far cheaper | partly **corrected** | LazyGraphRAG: vendor claim (indexing = vector RAG, 0.1% of GraphRAG, > 700x lower query cost), Microsoft products only (Tool map checked graphrag 3.3.0). LightRAG: its own paper shows near parity with GraphRAG (wins 3 of 4 datasets narrowly, loses Mix 49.6 vs 50.4); the "70 to 90% of quality at 1/100 cost" figure (Paperclipped) has no stated source or method, dropped |
| 33 | Long context: every query pays for every token, prefill takes seconds, lost in the middle, no per-tenant filtering | verified | rd-s7 with measured prefill (9.3 s for 7,611 tokens, 1.7 B) and Liu et al. Table 6 values |
| 34 | Proactive Memory Agent: Meta AI, Terminal-Bench 2.0 37.6% -> 45.9% for Sonnet 4.5, no retraining of the worker, selective reminding beats every-step | verified, with **corrections** carried from the paper page | rd-s7: arXiv 2607.08716 (July 2026, the paper itself, not The Batch's coverage); the 45.9% has Opus 4.6 as the memory agent |
| 35 | JitMem: read-time curation; even an untrained curator beats the write-time methods | **corrected** | rd-s7: +16.2 ALFWorld over RL-trained SkillOS verified, but most of the headline gain comes from RL training of the curator; "untrained beats write-time" holds untrained-vs-untrained (15 of 17 cells), not for the headline (paper page) |
| 36 | Cost table: agentic loop 3.3x input, 1.9x output, 1.5x latency, up to 3.6x cost (Ferrazzi et al. arXiv 2601.07711) | **corrected** (quoted from the table) | rd-s7 (arXiv HTML v2 re-read 2026-10-14): Table 9 ratios are 2.7 and 3.6x input (about 3.15x), 1.7 and 1.8x output (about 1.75x), about 1.5x time; the text's 3.3x / 1.9x do not match. The FEVER 64.6 vs 87.9 is user-intent (whether to retrieve) F1 in Table 3, not fact-verification accuracy; the old agentic page called it fact verification |
| 37 | Input tokens grow quadratically with searches | verified (formula) | rd-s7 animation; reproduces the old agentic page's 18,000 and 52,500 |
| 38 | Full GraphRAG: 500-page corpus, under $5 to embed, 45 min and $50 to $200 at GPT-4 pricing (Paperclipped) | unconfirmed, dropped | Paperclipped (2026-03-22) gives no corpus, method or pricing date; rd-s7 says so. Published instead: Edge et al., 281 min to index about 1 M tokens with gpt-4-turbo |
| 39 | Long context illustrative: $3.009 uncached, $0.309 cached, vs $0.021 RAG (143x, 15x) | verified (arithmetic) | rd-s7 |
| 40 | LightOn: RAG 8 to 82 times cheaper | unconfirmed, dropped | the cited URL returns 404 (2026-10-14) |
| 41 | Trade-offs list (factoid -> pipeline; multi-hop -> loop with router; global -> LazyGraphRAG/GraphRAG/LightRAG; fits window -> long context; agent history -> fact store / read-time curation; regulated domain -> invest in index; infra below 1 M) | covered | rd-s7 and rd-s9; interview question "when would you use an agent loop..." |
| 42 | Mistakes: tuning generator when evidence never arrived; one end-to-end number; reranker fixes recall; post-filter or prompt ACL; two recalls; faithfulness = correctness; "long context killed RAG" etc.; score without index; choosing the DB first | verified | rd-mis (each with a measured number) |
| 43 | Papers: RAG (Lewis et al. 2020, joint training of query encoder, frozen document encoder), ReAct | covered by link | Further reading (paper pages carry the verified details) |
| 44 | Related topics: evaluation and judges; agentic frameworks, LangGraph state machines, LlamaIndex | covered by link | rd-s6, rd-s9, Further reading |
| 45 | Header "22 min read, +1h 30m resources"; video note | replaced | the new Reading tab is about 45 min (about 9,000 words, not counting the folded mistakes and interview answers); per-link times in Further reading |

## 2. The four old children

**The retrieval pipeline** (reused as `retrieval_pipeline/`): every claim is checked in `../../retrieval_pipeline/src/coverage.md` (its own `src/live.md` is the same text). Claims the root now carries: RRF with k 60 (verified, Cormack et al.), post-filter loss (verified), contextual retrieval (verified, vendor), late chunking (Jina 23.46 -> 29.98 verified by the rp child; not run on the root), "mixed strategies across ingestion runs cost about 8 points of recall" (unconfirmed and not reproduced by the rp child: 0.216 vs 0.269), rerank depth 50 to 150 (corrected as row 22), managed reranker latencies (corrected as row 23).

**RAG evaluation** (retired): merged into RAG and retrieval evaluation (`3ef5c17b0d0d8194a914d1843ee26f13`); all 56 facts mapped in `technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/rag_and_retrieval_evaluation/src/old_rag_evaluation_merge.md`. The root carries only the comparison-level part (rd-s6: golden sets, recall@K at the rerank depth, nDCG, the decomposition) and links the rest.

**Embeddings and vector search** (reused as `embedding_models/`, its index material now on `vector_indexes/`). The full claim-by-claim coverage belongs to the Embedding models child when it is built. Claims the root touches:

| Old claim | Verdict | Where |
|---|---|---|
| Similarity identities; normalisation makes dot, cosine, L2 agree | verified | rd-s3; measured on raw gte-modernbert (0.767 / 0.740 / 0.767) |
| InfoNCE with in-batch and hard negatives; temperature | verified | rd-s3 (SimCSE tau 0.05; C-Pack batches to 19,200 in the Vector search lab) |
| Query instructions or input types; leaving them out silently costs recall | **corrected** | not always: bge-small scores 0.720 without its prefix vs 0.713 with it on SciFact (rd-s3) |
| OpenAI text-embedding-3: 3,072 / 1,536 dims, 8,192 tokens, $0.02 / $0.13 per M | verified | FACTS (map, prd): prices read 2026-10-14 |
| Cohere Embed v4 (128K, 256 to 1,536 dims) | **corrected** | current models are embed-v5.0-pro / -fast (128K) per the Tool map (2026-10-13) |
| Gemini Embedding 2 multimodal, 8,192 tokens, 3,072 default | verified | Tool map (gemini-embedding-2 and -001) |
| Voyage 4 family, shared space, prices $0.12 / $0.06 / $0.02 | verified | FACTS prices (2026-10-14); 32,000-token context per the Tool map |
| Qwen3-Embedding 8B 70.58 MMTEB, 4B 69.45, 0.6B 64.33; MRL 32 to 4,096; 32K input | partly verified | 0.6B card: 32K, dims 32 to 1,024 (FACTS setup); MMTEB scores unconfirmed here |
| MRL 14x smaller at equal ImageNet accuracy | verified with scope | "up to 14x smaller" is ImageNet-1K classification only (FACTS vec) |
| HF quantization: binary keeps about 92.5% (96% rescored), int8 about 99% | consistent | measured here: binary nDCG 0.680 of 0.700 (97%), 0.700 rescored; int8 with float query 0.996 top-10 agreement (rd-s4) |
| HNSW levels, M / 2M links, heuristic, pgvector defaults m 16 / ef_construction 64 / ef_search 40 | verified | Vector indexes child read hnswlib 0.8.0 source; Tool map ran pgvector 0.8.7 |
| HNSW graph M x 8 to M x 10 bytes per vector | **corrected** (made exact) | hnswlib layer 0: 2M ids of 4 bytes plus a 4-byte count, 132 B at M 16 (rd-s4 calculator) |
| IVF cost C + nprobe n/C; pgvector lists n/1000 and probes sqrt(lists) | formula verified; pgvector advice unconfirmed here | Vector indexes child |
| PQ, ADC, IVF-PQ; ScaNN 2x QPS in 2020 | PQ verified (measured 16 B: 0.450 / 0.914 rescored); ScaNN claim unconfirmed | rd-s4; child |
| DiskANN: billion points, 64 GB RAM, > 5,000 QPS, < 3 ms, 95% recall@1 | unconfirmed (paper not re-read here) | rd-s4 links the paper; child built Vamana |
| Late interaction MaxSim; 300 x 128 storage; ColBERTv2 6 to 10x compression | verified | rr child: 235.7 token vectors per abstract, 29x bge-small; ColBERTv2 20 or 36 bytes per vector |
| Filters and ANN: pgvector iterative scans since 0.8.0, max_scan_tuples 20,000 | verified | rp and map FACTS |
| pgvectorscale 28x lower p95 vs Pinecone; Turbopuffer SPFresh-derived index; Notion and Cursor customers | unconfirmed (vendor) | not carried on the root |
| Rule of thumb: < 1 M nothing matters much | **corrected** | see root row 29 |

**Advanced and agentic RAG** (reused as `agentic_retrieval/`; GraphRAG moved to `graphrag_and_structured_retrieval/`). Full coverage belongs to those children. Claims the root touches:

| Old claim | Verdict | Where |
|---|---|---|
| Ladder naive / advanced / agentic; loop step by step | verified | rd-s7 |
| Self-RAG reflection tokens; Adaptive-RAG classifier routes to none / single / multi-step | Adaptive-RAG verified (T5-Large, 54.52% classifier accuracy, 46.94 vs 48.85 F1, about 2.4x less time); Self-RAG unconfirmed here | rd-s7 |
| Coding agents: grep plus file reading often beats embeddings | unconfirmed | not carried |
| Ferrazzi et al. numbers; FEVER 64.6 vs 87.9 as "fact verification" | **corrected** (row 36): Table 9 ratios, and the FEVER figure is user-intent F1 | rd-s7 |
| Token maths and worked example 18,000 / 52,500 | verified | rd-s7 animation |
| GraphRAG steps; map-reduce with 0 to 100 helpfulness scores | steps verified; the 0 to 100 score unconfirmed here | rd-s7 |
| Paperclipped GraphRAG and LightRAG costs | unconfirmed (row 38) | dropped |
| LazyGraphRAG details (noun phrases, relevance test budget, 700x) | vendor claims (map FACTS) | rd-s7 labelled vendor |
| Li et al. 2501.01880 findings | verified (abstract re-read) | rd-s7 |
| Lost in the middle; NoLiMa 11 of 13 models below half at 32K, GPT-4o 99.3 -> 69.7 | verified (abstract: "11 models drop below 50% of their strong short-length baselines"; Liu et al. Table 6 via the Agentic lab) | rd-s7 |
| Long-context cost maths | verified (arithmetic) | rd-s7 |
| LightOn 8 to 82x | unconfirmed (404) | dropped |
| Mem0 (ADD/UPDATE/DELETE/NOOP, 91% lower p95 latency), Zep / Graphiti validity windows | unconfirmed here | owned by Agent memory layers (linked) |
| Proactive Memory Agent figures incl. "Qwen3.5-27B 37.6% -> 41.1%" and tau2 numbers | **corrected** | the Qwen3.5-27B figure is the memory agent's held-out transfer, not an actor result (paper page); root carries only the 37.6 -> 45.9 Sonnet result |
| JitMem +16.2 / +16.3 / +3.9 and "untrained curator already wins" | numbers verified; claim **corrected** (row 35) | rd-s7 |
| "Where RAG is headed" essay | covered in spirit | rd-s7 closing sentences; rd-iq |

## 3. Further reading links

All 57 links of the Further reading tab were opened on 2026-10-14: every external URL returned HTTP 200 with a browser user agent (the ACM DOI for the RRF paper returns 403 to scripts, so the authors' PDF at plg.uwaterloo.ca is linked instead; the LazyGraphRAG blog returns 403 to curl's default agent and 200 to a browser agent). Knowledge base links use ids from `pages.json`. Reading times for knowledge base pages are their Reading tab's words / 200.

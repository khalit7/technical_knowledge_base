# RAG in production: visual ideas (built and rejected)

The question the page keeps returning to: what goes wrong after launch that no notebook evaluation shows, and what does each fix cost? A visual earns its place when it makes one of those failures measurable on the running example.

Scores 0 to 2 on: a quantity that moves with a reader's knob; reproduces a stated figure; computable from real data; shows what a sentence cannot; corrects a misconception; measures the central question; absent from neighbours; can animate a before/after (counted double: reproduce, computable).

| # | Idea | Score | Placement | Status | Notes |
|---|---|---|---|---|---|
| 1 | Backfill trap: the same 300 claims through an in-place backfill (MiniLM to bge-small, 10% steps) against a dual index with an atomic switch | 13 | Reading, section 3 | built | Before/after animation on the same input; real nDCGs at every step; the misconception is "same dimensions, so it works". |
| 2 | Access lab: one question through rule-in-prompt, rule + claimed authority, and filter-at-retrieval, with the real model answer and the leaked fact highlighted | 12 | own tab | built | Step animation (question, retrieval, prompt, answer, verdict); constructed corpus, labelled. |
| 3 | pgvector RLS matrix: 5 users x 8 modes (rows returned, recall, empty results, forbidden rows) plus the two query plans | 11 | Access lab | built | Shows "secure but incomplete" (reused plan) and owner bypass; data from a real database. |
| 4 | Semantic-cache replay with threshold and model knobs, stacked hit kinds, result-cache nDCG, worst examples | 11 | own tab | built | Differs from the Caching page's Quora/PAWS lab: RAG claims with opposite verdicts; result cache vs answer cache. |
| 5 | Similarity histogram of opposite-verdict vs same-verdict claim pairs | 9 | Reading, section 8 | built | One picture of "no threshold separates them". |
| 6 | Latency waterfall from measured stages with knobs (embedder, device, search, reranker and K, generator and k, output tokens, cache hit) and a check line against the end-to-end run | 12 | own tab | built | Defaults reproduce the measured end-to-end configuration (sum of stages vs measured, residual shown). |
| 7 | TTFT against prompt length for two generators | 8 | Latency tab | built | Measured sweep 256 to 8,192 tokens. |
| 8 | Cost calculator from dated published prices, with self-host break-even | 10 | own tab | built | Defaults reproduce the Reading's worked example by construction; JS formulas mirrored in cost_model.py and recomputed in check_data.py. |
| 9 | Freshness lag calculator (poll interval, queue, embedder throughput, store visibility) | 7 | Reading, section 2 | built | Throughputs measured by the setup; visibility defaults from docs. |
| 10 | Purge table: text and vector bytes in table, index and WAL files after DELETE, VACUUM, VACUUM FULL | 9 | Reading, section 4 | built | Real file inspection; corrects "DELETE erases". |
| 11 | Golden-set power curves by size for five changes | 9 | Reading, section 10 | built | Paired t-test over 2,000 draws per size. |
| 12 | Best-match similarity drift chart for three query sets | 6 | Reading, section 10 | built | Label-free monitor. |
| R1 | Animated request timeline with concurrent users and queueing | 5 | | rejected | Would need a load test on a shared laptop; numbers would describe the laptop, not the design. Capacity belongs to Capacity planning and LLM serving in production. |
| R2 | Qdrant payload-filter run beside pgvector RLS | 5 | | rejected | The Vector indexes page already measured Qdrant's filtered path (recall 0.998 with the graph forced); repeating it adds nothing. |
| R3 | Sharding simulator (fan-out, tail latency) | 6 | | rejected | Would rest on assumed latency distributions; the Tail at Scale arithmetic is stated in prose instead. |
| R4 | Content-hash change detection animation | 6 | | rejected | Owned by the ingestion page's Re-indexing lab; linked. |
| R5 | Freshness lag measured in Qdrant with wait=false | 4 | | rejected | A small-collection timing on Docker for Mac would mostly measure the VM; docs quoted instead. |

What the methodology lacked for this page: operational failures have no published figure to reproduce, so most visuals are measured demonstrations of a failure and its fix on the running example; "reproduces a stated figure" was replaced by "reproduces the page's own end-to-end measurement" (waterfall) or "the Reading's worked example" (cost).

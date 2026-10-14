# Coverage of the old page "Advanced and agentic RAG: GraphRAG, agent loops, long context, memory"

The old page is saved verbatim in `live.md` (copied from the root's `src/read/old/advanced_and_agentic_rag.md`, fetched 2026-09-30). It was treated as unverified notes: each claim below is carried (with where), moved to the page that owns it, corrected, or dropped with the reason.

| Old claim or section | Status | Where now / why |
|---|---|---|
| Three failing question kinds (multi-hop, ambiguous, global) | carried | Reading intro and section 2 (multi-hop measured); global questions: GraphRAG child |
| Maturity ladder: naive, advanced, agentic | moved | root section 7 owns the ladder; this page's "In one screen" table extends it to ten approaches |
| The loop, step by step (5 steps) | carried, extended | Reading section 1 (tool, schema, observation, budget, stopping, with the real rendered Qwen3 template) |
| Self-RAG reflection tokens | carried, corrected detail | section 4: the four token types with their values, critic and generator sizes, Table 2 numbers |
| Adaptive-RAG classifier | carried, verified | section 5: 46.94 vs 48.85 F1, 54.52% classifier accuracy (Table 4), 56.28 oracle, time ratios 3.60 vs 8.81 (Table 1), seconds per query (Table 3) |
| "By 2026 frontier models make this decision natively ... with no special tokens or classifier" | dropped | no source; the page measures routers instead |
| Tool diversity; "plain grep plus file reading often beats embeddings" for code | dropped here | unsourced; harness-level design belongs to Topic: agentic-harnesses |
| Deep-research pattern | carried, extended | section 7: three open projects read in source with file and line, three vendor systems from docs, dated |
| Ferrazzi et al.: 3.3x input, 1.9x output, 1.5x time, up to 3.6x cost | carried with a note | section 10; the text's 3.3x / 1.9x are the authors' figures; their Table 9 per-dataset averages give about 3.15x and 1.75x |
| "the pipeline scored 87.9 F1 against the agent's 64.6 on FEVER, a fact-verification set" | CORRECTED | Table 3 of arXiv 2601.07711v2 scores user-intent routing (is the query in scope) on FEVER, not fact verification; the root page repeats the old reading (reported to the root) |
| Token maths of a loop, worked example (18,000 and 52,500 tokens) | carried, measured | section 1: formula checked against 200 recorded trajectories (2.5% mean error, s = 172, r = 474 measured); the worked example itself is on the root |
| GraphRAG step by step, worked map-reduce example, cheaper variants, when a graph pays | moved | GraphRAG and structured retrieval child (owns it); root section 7 summary |
| Paperclipped figures (500-page corpus $50 to $200, LightRAG $0.50, 70 to 90% of quality) | dropped | no method or primary source (the root drops them too) |
| LazyGraphRAG 0.1% indexing cost, 700x cheaper queries | moved | GraphRAG child and root (vendor claims, labelled) |
| Long context vs RAG: Li et al. findings | moved | root section 7 owns the head-to-head; this page links the paper in Further reading |
| Where long context wins / where RAG wins (economics, latency, scale, ACLs, distraction) | carried, measured | section 8: prefill model on this laptop, KV memory from configs, accuracy against tokens read, position test, "When each wins" box |
| Lost in the middle | carried, verified | section 8: Table 6 values (75.8 / 57.2 / 53.8 / 55.4 / 63.2, closed book 56.1) plus the root's measured 20-paragraph run |
| NoLiMa: 11 of 13 models below half at 32K; GPT-4o 99.3% to 69.7% | carried (GPT-4o figure) | section 8; the model count is on the root |
| Cost maths example ($0.021, $3.009, $0.309) | moved, extended | root section 7 owns the example; the Long-context calculator here computes it for any inputs at dated list prices with a cache-write charge |
| LightOn: RAG 8 to 82 times cheaper | carried, labelled | Further reading, as the vendor blog's estimate |
| How the two compose | carried | section 8 box |
| Memory patterns: episodic logs, Mem0 (ADD/UPDATE/DELETE/NOOP, 91% p95, >90% tokens), Zep / Graphiti | carried, verified, extended | section 9; added that full context stays more accurate in Mem0's own table (J 72.90 vs 66.88) and Zep's LongMemEval numbers; Graphiti details belong to Agent memory layers |
| Agent-curated notes file (CLAUDE.md pattern) | moved | Agent memory layers / Context engineering pages |
| Proactive Memory Agent results "from The Batch's coverage rather than the paper" | moved | its paper page carries the corrected, paper-based numbers; linked |
| JitMem: +16.2 / +16.3 / +3.9, "an untrained curator already beats the write-time methods, which locates the gain in the timing" | CORRECTED | the JitMem paper page (and the root) found most of the gain comes from training the curator; section 9 says so and links it |
| Trade-offs: which approach when | carried | "In one screen" table and section 8 box |
| Common mistakes (6) | carried, extended | Common mistakes (9), each with a measured number where one exists |
| "Where RAG is headed" | dropped | forecast without sources |
| Related pages and resources | carried | Further reading (every link timed) |

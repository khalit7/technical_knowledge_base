# Reading tab: visuals built and rejected

The question the page keeps returning to: where does a correct answer get lost between the corpus and the generator's reply, and who should drive the search?

## Built

| Visual | Section | What it shows | Why it earns its place | Data |
|---|---|---|---|---|
| Where 188 answers go (animation, before/after) | 0 | One square per SciFact claim, coloured stage by stage (lost at retrieval, ranking, generation, correct), funnel bars and r, p, g, A counters; toggle with and without the reranker; final step regroups by fate | The page's central idea on real data in one picture; shows that generation, not search, loses most answers here, and what the reranker buys (7 more in the prompt, 6 more correct); CONTRADICT claims marked so the label collapse is visible | pipe/out/e2e.json (per-claim ranks and results), asserted totals |
| BM25 on a real claim (calculator) | 2 | Postings and IDF of each query term, per-term points for the relevant abstract (rank 3) and the one ranked first, k1 and b sliders | BM25 from zero with real counts; defaults reproduce the recorded scores; k1 = 0 flips the order, which teaches saturation | retrieval_pipeline/src/out/bm25_example.json |
| Five retrievers on three datasets | 3 | nDCG@10 bars, re-sorted per dataset | "Model size is not a ranking" and "your data decides" in one toggle | vec/out/models.json, data/README.md |
| Memory bill and exact scan | 4 | Bytes per vector by format and dimension, hnswlib layer-0 graph, scan time at the measured 37 GB/s | Lets the reader size an index and see where exact search stops being enough; defaults land on the child's 112 ms by construction | arithmetic; 37 GB/s from the Vector indexes child |
| Hybrid and rerank chart (before/after) | 5 | Each model alone and fused with BM25 (arrows), then three rerankers on the fused list at K 20 and 30 | Two corrections in one card: hybrid can hurt; a weak reranker hurts | pipe/out/fusion.json, rerank.json |
| Price the levers (calculator) | 6 | r, p, g, N sliders, the three buckets as one stacked bar, the gain from perfecting each factor; measured and old-page presets | Reproduces the old page's worked example and shows that on the measured run the opposite lever wins | e2e.json; old root |
| Pipeline against agent loop (animation, before/after) | 7 | Input tokens per model call growing call by call against one pipeline call, with n, s, r controls | The quadratic cost made visible; reproduces the old agentic page's 18,000 and 52,500 | formula, illustrative inputs |
| One request measured two ways (before/after) | 8 | Stage medians alone against inside one process, with the end-to-end p50 | "Time the whole request path": embedding 49 ms alone, 428 ms on a shared GPU | pipe/out/latency.json, rag_in_production/src/facts.json |
| Predict-then-reveal (2) | 1, 4 | Prompt rule leaks; the two recalls | Belief elicitation on the two most counter-intuitive measured results | production child, vec two_recalls |

## Rejected

| Idea | Why not |
|---|---|
| Per-claim funnel of one query through BM25, dense, RRF and rerank | The Pipeline lab's first section does exactly this; the Reading tab aggregates over all 188 claims instead |
| HNSW build-and-search animation | Owned by the Vector indexes child (HNSW lab) |
| Chunking explorer, RRF calculator, K and k slider | Owned by the Pipeline lab; the Reading states the lessons with numbers and links |
| Both-gold-in-top-k curves for multi-hop | The Agentic lab builds them as a predict-then-reveal; the Reading quotes the numbers |
| Trajectory replay of agent runs | The Agentic lab's centrepiece |
| nDCG / MRR calculator on a toy list | RAG and retrieval evaluation has one on real BEIR runs |
| Long-context cost calculator | One worked example in prose carries the point; the production child has the cost calculator |
| Taxonomy diagram (the old page's Mermaid tree) | Replaced by the section structure and the child-page map; a tree of names teaches nothing a reader can check |

# Visualisation ideas: The retrieval pipeline (child of Topic: rag-and-retrieval)

The question the page keeps returning to: for each stage between the documents and the prompt, which knob moves the result, by how much, measured on labelled queries (and what the library actually does when you leave the default).

Existing visuals not repeated (root Pipeline lab, t-pipe): one claim's funnel animation, the chunk explorer on arXiv 1902.09666, the chunking bar chart, the RRF calculator on real lists, the RRF k and alpha sweeps, the pre/post-filter selectivity chart, HyDE/multi-query bars and the conversation table, the rerank depth chart, the A = r x p x g decomposition with sliders. Rerankers child owns rerank before/after and MaxSim; vector_indexes owns filtered HNSW.

Scores: computable from public data (x2), reproduces a source or the root (x2), shows something a sentence cannot, corrects a misconception, measures the central question, absent elsewhere, animatable before/after; minus build cost.

## Built
| # | idea | placement | score | data | notes |
|---|---|---|---|---|---|
| 1 | Chunking workbench: two real QASPER papers cut live by five strategies (JS port of the root's chunkers.py, 18/18 configurations identical to Python), size/overlap/budget sliders, separator toggles, evidence intact, BM25-lite budget fill, all-strategy table | own tab | 13 | 22_rp_data.js wb (text, Qwen3 token offsets, paragraphs, questions) | Recursive separators toggle makes the LangChain default (no sentence separator) visible. BM25-lite has no stemmer: labelled. |
| 2 | Fixed windows vs recursive splitter, animated chunk by chunk on the same section (before/after), cuts drawn, counters for chunks ending mid-paragraph and evidence intact | Reading 1.2 | 12 | same, computed live | Khalid's before/after pattern on one input. |
| 3 | Fusion lab: real BM25 and Qwen3 top-20 lists, two methods A and B with knobs, rows animate from A's order to B's; plus every method's sweep with the held-out choice ringed | own tab | 12 | fusion_deep.py | The root has an RRF-only calculator; this adds the whole family and the honest-vs-leaked tuning view. |
| 4 | Query-rewrite lab: original list against each rewrite's list (HyDE, HyDE + claim, multi-query, step-back), animated, with the generated text; decomposition examples | own tab | 11 | root qtrans_gen.json + qgen.py | Claims chosen where a rewrite moved the relevant abstract most: stated on the tab. |
| 5 | BM25 term-by-term table on a real claim (relevant at rank 3 behind a review that repeats "statin") | Reading 2.1 | 10 | bm25_example.py; scores equal the recorded run | Shows saturation and the vocabulary gap in one table. |
| 6 | Saturation and length-normalisation explorer (k1, b sliders) | Reading 2.1 | 8 | formula | Removed 2026-10-19 (overlap fix): Search and vector databases owns the BM25 formula and its saturation curve and calculator; 2.1 links it and keeps the measured claim. |
| 7 | k1 x b grid, test vs tuning split, default outlined and tuned ringed | Reading 2.2 | 11 | bm25_sweep.py | Shows the leak: best-on-test 0.688 vs tuned 0.678 vs default 0.679. |
| 8 | Margin quintile bars (what RRF discards) | Reading 4.2 | 9 | fusion_deep.py | |
| 9 | Fusion family table, tuned on held-out splits, both datasets | Reading 4.4 | 10 | fusion_deep.py | Reproduces the root's RRF/min-max/z-score numbers exactly. |
| 10 | Fuse-then-rerank table | Reading 4.5 | 10 | recorded Qwen3-Reranker scores | Tests the old page's claim. |
| 11 | Post-filter survivors vs K x s (formula lines, root's measured dots) | Reading 6.2 | 9 | root filter.json | Shows where the formula fails (correlated access). |
| 12 | MMR lambda sweep (HotpotQA both-gold, NFCorpus, SciFact) | Reading 7.2 | 9 | mmr.py | Negative result, shown. |
| 13 | Small-to-big bars at 1,024 tokens with two metrics (evidence covered, answer string) | Reading 1.5 | 9 | parent_child.py | The second metric keeps sentence windows from looking unfairly bad. |
| 14 | Tables: tokenizers, truncation, mixed index, tokenisation variants, self-query, step-back, decomposition, prompt budget, citation formats, evidence position bars | Reading | | out/*.json | |

## Rejected
- A live embedding model in the page (late chunking demo): too large for a sandboxed page; the measured table carries it.
- Re-drawing the root's funnel or RRF calculator: exists on the root.
- A 2-D map of chunk vectors: the root's Vector search lab showed 2-D projections mislead (trustworthiness numbers); no new lesson here.
- Live BM25 with stemming in JS (a Snowball port): cost out of proportion; the workbench labels its BM25 as unstemmed.
- A per-query router explorer: the router barely beats nothing; a table says it.
- Rerank depth visuals: owned by the rerankers child.

## What the methodology lacked here
Most visuals are measurements of a pipeline knob rather than reproductions of a published figure; the "defaults reproduce" rule became "the page's numbers reproduce the root's" (fusion, chunking, recursive splitter, BM25 run) and "the JS reproduces the Python" (chunkers).

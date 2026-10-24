# Visual ideas: Rerankers and late interaction

Question the page keeps returning to: **what does reading the query and the candidate together buy, and what does it cost per query?** Every visual either measures that trade on the running example (SciFact) or shows the mechanism that creates it.

Existing visuals checked first so nothing is repeated: the root's Pipeline lab (funnel animation for claim 70, rerank depth sweep for three rerankers on three first stages, latency bars per stage); the ingestion page's ColPali section (MaxSim formula over patches, storage and indexing cost from the ColPali paper, ViDoRe measured); the vector-indexes page (IVF and PQ animations, which PLAID reuses for token vectors).

## Built

| # | Idea | Placement | Score (quantity moves / reproduces a figure / computable / beyond a sentence / corrects a misconception / animation) | Data |
|---|---|---|---|---|
| 1 | **Bi-encoder vs cross-encoder on the same real pair, animated** (claim 1180): separate encodings and one dot product, against one concatenated input with the cross-encoder's real last-layer attention lines and its [CLS] head; counters for model passes and tokens; the candidate list rescored both ways (rank 7 becomes rank 1) | Reading 1 | 2/1/2/2/1/2 = 10 | e_ce_manual.py (real attention, scores recomputed by hand equal to the recorded ones) |
| 2 | **Rerank before/after lab**: a real top-30 list per claim, first stage x reranker x K, rows slide to their new places, the K cut-line, per-claim nDCG before and after | Own tab | 2/0/2/2/2/2 = 10 | e_examples.py; claims chosen by written rules (rescued, hurt, disagreement, ceiling, multi-relevant) |
| 3 | **MaxSim lab**: every claim token scans the abstract's token vectors (shading = real dot products), its maximum outlined, running sum; toggle against the single-vector cosine; toggle the [MASK] expansion tokens | Own tab | 2/0/2/2/1/2 = 9 | e_maxsim_pair.py (stored vectors, re-encoding check 0.9999) |
| 4 | **Depth chart** nDCG@10 against K with first-stage recall@K as the ceiling, three cross-encoders plus ColBERT, per first stage | Reading 4 | 2/2 (60 cells equal the root's sweep, BEIR BM25+CE 0.688)/2/2/2/0 = 10 | e_depth.py, e_rerank_deep.py |
| 5 | **Depth chooser**: quality against measured per-claim time, with a hardware slider that rescales by FLOPs per pair | Own tab | 2/0/2/2/1/0 = 7 | e_time.py, e_tokens.py |
| 6 | **Score distributions and reliability bins**, one model at a time on the logit scale | Reading 5 | 1/0/2/2/2/0 = 7 | e_scores.py |
| 7 | **Abstention**: AUROC bars for five signals and a threshold slider (answered vs abstained) on a constructed "nothing relevant" set | Reading 5 | 2/0/2/2/2/0 = 8 | e_scores.py |
| 8 | **Listwise sliding window, animated** on one real claim with the model's real outputs | Reading 6 | 1/0/2/2/1/2 = 8 | e_llm.py, e_llm_eval.py |
| 9 | LLM reranker table (pointwise, pairwise, listwise with Qwen3-4B against trained rerankers: quality, calls, tokens, seconds) | Reading 6 | 1/0/2/1/2/0 = 6 | e_llm_eval.py |
| 10 | ColBERT as first stage or reranker (K sweep per first stage, exhaustive line) | Reading 8 | 1/1 (model card 0.748 vs 0.743)/2/1/1/0 = 6 | e_colbert.py |
| 11 | PLAID grid: probes x candidates fully scored, nDCG and top-10 overlap, 2 vs 4 bits | Reading 9 | 2/0/2/1/1/0 = 6 | e_plaid.py |
| 12 | Tiny training run table (zero-shot vs random vs hard negatives, 2 seeds) | Reading 3 | 1/0/2/1/1/0 = 5 | e_train.py |

## Rejected

| Idea | Why not |
|---|---|
| A funnel animation of one claim through retrieval, fusion and reranking | The root's Pipeline lab owns it (claim 70); this page links it |
| ColPali patch-level MaxSim | The ingestion page owns page-image retrieval; linked |
| Attention heat map of all 6 layers x 12 heads | Diffuse and hard to read; the mean of the last layer with the two strongest targets per token tells the same story in the animation |
| A cost-per-query calculator with hosted reranker prices | Cohere's price page could not be read from here; the RAG in production page owns cost per query |
| Training-loss curves of the tiny run | One epoch, a few hundred steps: the table of results says more than a noisy curve |
| Big rerankers at K = 100 on BM25 and dense lists | About 36,000 more pairs (2 to 3 hours on MPS) to repeat what the hybrid list already shows |
| PLAID timing on 5,183 abstracts | Exhaustive MaxSim already takes milliseconds at this size; a timing would measure overhead, not PLAID's benefit, which needs millions of passages |

## What the methodology lacked for this page

A rule for **scores that live on different scales**: the three rerankers' default outputs are a raw logit, a sigmoid and a log-odds. Every chart that compares scores maps them to one scale first and says how.

## 2026-10-24 rebuild (teaching contract)
- **Built: hero** (static annotated figure): bi-encoder, learned sparse, late interaction and cross-encoder by what is stored per abstract, what is paid per candidate, and SciFact nDCG@10; orange marks where the query meets the document. The ColBERT paper's Figure 2 idea, redrawn with this page's numbers (`28_rr_hero.js`). Kind: structure, so static.
- **Built: a real sparse document vector** (section 10): the 20 heaviest terms of SciFact abstract 4983 from the Retrieval pipeline page's SPLADE-style run, expansion terms in orange. Kind: structure of one real object, static bar chart.
- **Moved inline**: the Before/after lab (idea 2) into section 4, the MaxSim lab (idea 3) into section 8, beside the claims they prove; both wait for the reader (no auto-flip to After, no play on mode switch).
- **Kept as a tab**: the Depth chooser (idea 5), a tool used by sections 1, 4, 5 and 11.
- **Rejected**: an embedded copy of the ColBERT paradigm figure (the redrawn hero carries it with the page's own numbers); a SPLADE expansion stepper (a static vector says it; no change over time is the point); a photo (nothing physical to show).

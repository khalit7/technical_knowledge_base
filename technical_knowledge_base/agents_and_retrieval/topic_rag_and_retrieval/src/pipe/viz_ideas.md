# Pipeline lab (t-pipe): visual ideas, built and rejected

Question the tab keeps returning to: where, between the corpus and the generator's reply, does a correct answer get lost, and what does each stage cost?

## Built

| Idea | What it shows | Why | Data |
|---|---|---|---|
| Funnel animation, one real claim (SciFact 70) | Rows (real top 10 per stage) slide between BM25, dense, RRF and reranker rankings; a dashed cut line at k = 3; the generator's real answer and check. Toggles: hybrid or dense only, reranker on or off, so the same claim is replayed under four pipelines (before/after on one input) | The funnel shape and the fact that a document dropped at any stage is gone; the before/after Khalid asks for | funnel.py |
| Chunking explorer on a real QASPER paper | Chunk bands, overlaps, BM25's top 3 badges and the annotated evidence underlined, per strategy and per question | Makes "the cut fell through the evidence" visible | chunk_explorer.py |
| Strategy bars with metric switch | Intact share, BM25 / bge-small / Qwen3 at top 3 and at a 1,024-token budget | The fixed-k versus fixed-budget flip (predict-then-reveal above it) | chunk_eval.py |
| Hybrid bars, RRF k sweep, score-fusion alpha sweep, tuned-on-train table | Per model and set; the leak of tuning on test shown as its own grey bar | Hybrid is not always better; k barely matters; alpha must be tuned on held-out queries | fusion.py, fusion_tune.py |
| RRF calculator on real lists | k slider, five real claims (three rescued, two hurt), the formula written out with the evidence's real ranks | The formula on real ranks, as the brief asks | make_data.py |
| Filter table and returned-results chart | Pre-filter against post-filter at N = 10/30/100/1,000 over a selectivity slider | The silent shrinkage of the post-filter, with real counts | filter.py |
| Query rewriting tables | HyDE, multi-query, conversational rewrite (constructed chats) | Measured gains and losses per query | qtrans_gen.py, qtrans_eval.py |
| Rerank depth sweep | nDCG@10 / recall@10 against K for three rerankers on three first stages, with first-stage recall@K as the ceiling | Depth and model choice; a weak reranker hurts | rerank.py, rerank_extra.py |
| K and k slider with failure buckets | A = r_K x p_k|K x g with real counts, reranker on/off, lucky label-only answers counted | The decomposition, filled with real buckets | e2e_gen.py, e2e_eval.py |
| Latency bars, log or linear | Per-stage p50 at batch 1 | Where the time goes | latency.py |

## Rejected

| Idea | Why not |
|---|---|
| 2-D projection of chunk embeddings coloured by strategy | Belongs to the Vector search lab (what an embedding is); would repeat it |
| Animated boundary morph between chunkers | The static switch on the same text already shows the before/after; motion adds nothing measurable |
| Judge-based correctness (LLM-as-judge) for the end-to-end check | SciFact gives labels and evidence ids, so a deterministic check exists; judged metrics belong to the RAG evaluation page |
| Hybrid on HotpotQA | The multi-hop set belongs to the Agentic lab |
| Interactive fusion over all 300 claims in the browser | Would embed every top-100 list (several MB); the recorded sweeps carry the same information |

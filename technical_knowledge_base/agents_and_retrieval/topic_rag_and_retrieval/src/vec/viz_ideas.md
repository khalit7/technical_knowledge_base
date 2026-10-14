# Vector search lab: visual ideas

The question the tab keeps returning to: what does a vector carry, what does shrinking or indexing it cost, and which of those costs reaches the user (retrieval quality) rather than only the index (agreement with exact search)?

## Built
| # | Idea | Why it earns its place | Data | Placement |
|---|---|---|---|---|
| V1 | 2-D map of 705 real Qwen3 vectors from the four corpora, six claims, true top 10 ringed; PCA and t-SNE with a morph between them (before/after on the same points) | Shows what an embedding space looks like and, measured, how much a picture lies: PCA keeps 10.5% of the variance and 0 to 3 of 10 neighbours; t-SNE keeps 8 to 10 but invents global distances | proj.py; trustworthiness (scikit-learn) | What an embedding is |
| V2 | Three top-5 lists (cosine, dot, L2) on raw gte-modernbert vectors with a normalise toggle; histogram of vector lengths | The metric choice matters only for unnormalised vectors; gte ships without a Normalize step, so the mistake is real, not constructed | metric.py (MPS re-embedding, bench lock) | Cosine, dot, L2 |
| V3 | Model comparison bars (choose the metric) and full table, with published MTEB numbers beside | Quality, bytes, weights, indexing and query cost on one screen; the predict box breaks "bigger is better" | setup records | Which model |
| V4 | Contrastive batch: 8 real train claims x 8 positives (+ hard negatives), InfoNCE live from real cosines, temperature slider, step through rows, toggle hard negatives (before/after) | Teaches the loss on numbers the reader can check; no training run | contrastive.py | How they are trained |
| V5 | Batch-size sweep (positive beats B-1 in-batch negatives) | Why big batches matter | contrastive.py | same |
| V6 | Matryoshka x precision x rescoring explorer with nDCG against bytes per vector (log) | The memory-quality trade on one chart, every setting measured | mrl_quant.py | Smaller vectors |
| V7 | Truncation curves: Qwen3 (MRL) against gte and bge (not) | Before/after for Matryoshka training | mrl_quant.py | same |
| V8 | One claim through exact, HNSW ef 16 and IVF-PQ nprobe 4: rows slide to their rank, dropped neighbours dashed, newcomers outlined | The required before/after; the relevant abstract survives HNSW and is lost by IVF-PQ because its cell ranks 5th | two_recalls.py | Exact vs approximate |
| V9 | ANN recall against retrieval recall for every setting, plus a 300-square per-claim grid | The two recalls on the same queries; grey squares are failures no index can fix | two_recalls.py | The two recalls |
| V10 | Quora frontier scatter and best-per-family table | The short version, linking the child's full frontier | child's results.json | Speed, memory, recall |

## Rejected
- HNSW build-and-search animation, IVF-PQ ADC lab, filter lab, full frontier: the child page has them; rebuilding would repeat it.
- UMAP projection: not installed in the shared env; PCA and t-SNE already show the two failure modes.
- A tiny fine-tune before/after: belongs to the Embedding models child (Khalid's structure; the coordinator said not to run it here).
- 3-D projection: harder to read on a phone and no more honest than 2-D.
- Hosted model comparison: no API keys by design; published numbers sit in the Tool map.

## What the methodology lacked
A rule for showing a distortion metric whenever a high-dimensional object is drawn in 2-D (here: variance kept, trustworthiness, and neighbours kept per query).

# Vector indexes: visual ideas, built and rejected

Central question: "how does each index avoid comparing the query with every vector, and what does that cost in recall, work, memory and maintenance?" Scored 0 to 2 on: a parameter the reader moves, reproduces a published or library figure, computable from public data and code, shows what a sentence cannot, corrects a misconception, measures the central question, absent from neighbours, can be a step animation against the method it replaced (reproduction and computability count double; build cost subtracted).

## Built
| # | Idea | Score | Data | Placement |
|---|---|---|---|---|
| V1 | **HNSW built and searched step by step** on 240 real Qwen3 vectors (60 per corpus) by a line-by-line port of hnswlib (checked link for link against hnswlib on 5,183 vectors); before/after: HNSW vs closest-M links vs one layer, same points, order and levels; per insert the descent, kept links, heuristic rejections with the blocking neighbour, re-pruned lists; search with distance counter against exact | 14 | `make_hnsw_anim.py`, `pyhnsw.py`, `check_port.py` | Reading 6, inline (was the HNSW lab tab until 2026-10-24) |
| V2 | **IVF-PQ on one claim**: centroid bars, probed cells, the 16 x 256 lookup table as a heat map, one candidate's 16 code bytes outlined in it, PQ score vs exact scatter, results; before/after IVF-Flat vs IVF-PQ vs rescoring on the same claim, cells and candidates; JS recomputes FAISS's scores (max error 1.2e-7) | 14 | `make_ivfpq_anim.py` (real FAISS index) | Reading 5, inline (was the IVF-PQ lab tab) |
| V3 | **Frontier**: recall against QPS (one thread, one query at a time, timed under the bench lock) for 7 families on three collections, memory budget slider, Pareto line, 1 - recall log axis | 12 | `e_bench.py` | Frontier tab |
| V4 | **Filter lab** with a selectivity sweep animation (0.1% to 100%) and correlated / uncorrelated / anti-correlated filters; five strategies on one recall-vs-work chart; Qdrant server results beside | 13 | `e_filter.py`, `e_acorn.py`, `e_qdrant.py`, `e_qdrant_paths.py` | Reading 9, inline (was the Filter lab tab); the Qdrant table in a closed block |
| V5 | nDCG@10 against ANN recall@10 for every HNSW and IVF setting, with a predict-then-reveal | 11 | `e_hnsw.py`, `e_ivf.py` | Reading 1 |
| V6 | Exact-search calculator (N, d, bytes) on the measured GB/s, with measured points from 5k to 523k vectors | 10 | `e_bench.py exact_scaling` | Reading 2 |
| V7 | Cell rank of each true neighbour (the boundary problem) and recall-vs-nprobe curves per nlist | 10 | `e_ivf.py` | Reading 3 |
| V8 | Recall per byte budget for SQ, binary, RaBitQ, PQ, OPQ, alone and rescored | 10 | `e_quant.py` | Reading 4 |
| V9 | Levels measured vs N M^-l (1 - 1/M); M x efConstruction grid with recall, distances, nDCG; curves | 10 | `e_hnsw.py` | Reading 6 |
| V10 | What each half of HNSW buys (heuristic, hierarchy) at 5k and 25k, measured with the port | 11 | `e_variants.py` | Reading 6 |
| V11 | Vamana (from the paper) vs HNSW: hops and distances; alpha's effect on degree and edge ranks | 9 | `vamana.py`, `e_vamana.py` | Reading 7 |
| V12 | ScaNN anisotropic vs isotropic table | 7 | `e_scann.py` (container) | Reading 8 |
| V13 | Tombstone cost vs rebuilt graph | 8 | `e_updates.py` | Reading 10 |
| V14 | Memory calculator from formulas, with formula-vs-file checks | 9 | code reading + serialized sizes | Reading 11 |
| V15 | Work per query against N at fixed recall (exact, IVF, HNSW) on Quora prefixes | 10 | `e_scale.py` | Reading 12 |
| V16 | **Hero (2026-10-24)**: four ways to read less on one query, side by side (exact, IVF cells, a graph walk, codes plus a rescored shortlist), true neighbours found and missed ringed, the measured SciFact work and recall under each panel; points illustrative and seeded | 11 | `23_vix_hero.js`, results.json | Reading top |
| V17 | **DiskANN node layout on SSD (2026-10-24)**: sectors drawn to scale, SIFT (768-byte nodes, five per sector) against Qwen3-Embedding (4,224 bytes, two sectors per hop), arithmetic in the caption | 9 | section 7's own arithmetic | Reading 7 |

## Rejected
- A toy filtered-search animation: the measured Filter sweep (V4) shows the same on real data. (A 2D "one query four ways" toy was rejected in 2026-10 because the Search and vector databases page had one; that page now links here for how indexes work, and OWNERS.md gives this page the concept, so it became the hero, V16.)
- A pgvector re-measurement: the neighbour page owns it on the same Quora vectors; this page compares against its numbers.
- An animation of Vamana's RobustPrune on 2D points: in 1,024 dimensions the alpha rule behaved unlike its 2D picture (distance concentration), so a 2D animation would teach the wrong intuition; the measured edge-rank numbers say it instead.
- Timing ScaNN and Qdrant: a container on a shared laptop and a server with network and HTTP overhead are not comparable with in-process FAISS on one thread; recall only.
- A 2D projection of the whole collection: projections distort neighbourhoods (the neighbour page rejected it for the same reason); used only as a drawing layout in the HNSW lab, with the caveat.
- A Frontier animation sweeping the knob: the static chart with per-family lines shows the same thing; no step teaches more.
- GPU (MPS) search: FAISS's GPU build does not run on Apple silicon; not run.

## What the methodology lacked
A rule for "ports used as instruments": a re-implementation of a library is acceptable evidence only when checked against the library on real data (here link-for-link and top-10 identity), and its departures listed.

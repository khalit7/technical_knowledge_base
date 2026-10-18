# Visuals: built and rejected (Long context child, 2026-10-18)

Scores 0 to 2 per criterion of the explainer-page skill (choosing.md): movable quantity, reproduces a source (x2),
public inputs (x2), shows what a sentence cannot, corrects a misconception, measures the central question, absent
elsewhere, animatable against the method replaced. Build cost subtracted.

## Built
| Visual | Where | Score | Why |
|---|---|---|---|
| Memory wall: the same real model redesigned lever by lever, sequences-that-fit against context, before (dashed) and after | Memory wall tab | 15 | Defaults reproduce the root calc.py by construction; answers the design question; the root's KV calculator and Memory technology's tab size the plain cache but never redesign it |
| Memory bars before/after at one context and concurrency, plus the compute panel (attention share of prefill) | Memory wall tab | 12 | Shows that KV heads and dtype move memory but not prefill FLOPs, a common misconception |
| Kept-entry map animation: one 4,096-token prompt, 90 caches x 64 bins, full cache then each eviction policy | Eviction lab section 2 | 15 | Before/after on the same input with real kept sets from SmolLM2; shows where each policy looks (sinks, recency, the needle) |
| Quality against memory, three tasks, eviction lines and quantisation squares on one axis | Eviction lab section 3 | 14 | Puts fewer entries and fewer bits at equal memory; the new-story view shows perplexity hiding failures |
| Needle survival per policy (heads kept against accuracy) | Eviction lab section 4 | 10 | Not in any paper we read: which heads keep a fact matters more than how many |
| Loss by position past the trained length, toggles per scaling and fine-tune | Effective context lab section 1 | 13 | Measured position wall; recorded for the Positional Encodings child too |
| Distance-frequency histogram with a slider | Effective context lab section 2 | 9 | Makes An et al.'s left-skew argument concrete on the topic's own training length |
| SmolLM2 pass-key grid, length x depth, 1K to 16K | Effective context lab section 3 | 12 | Claimed (max_position 8,192) against measured, including past the config maximum |
| Design animation: one 80 GB GPU filled with 128K requests, lever by lever | Reading section 8 | 12 | Before/after of the same serving budget; numbers from the Memory wall's code |

## Rejected
| Idea | Reason |
|---|---|
| A KV-cache size calculator (model, context, batch, dtype) | The root's Attention lab has it; Memory technology has one across 13 models. Linked instead. |
| Rebuilding the MLA cache animation | The DeepSeek MLA explainer owns it. |
| Sliding-window ring buffer animation | The root's Attention lab section 6 shows it. |
| RoPE spectrum stretch / YaRN band plots | Positional Encodings owns them ("Stretch the spectrum"). |
| Ring attention step animation | Distributed Training, Distributed PyTorch and the JAX sharding page own context parallelism; one table row here. |
| A RULER / NoLiMa effective-length chart over published models | Long-context and multimodal benchmarks has the Effective length tab over 39 rows. |
| Decode latency against context measured on MPS | Absolute times on a shared laptop teach little; the bandwidth argument is in Performance math and the root's Attention lab measured it at a real layer shape. |
| Paged-block reclaim simulation of eviction | Batching, KV cache and scheduling measured realisable savings already. |

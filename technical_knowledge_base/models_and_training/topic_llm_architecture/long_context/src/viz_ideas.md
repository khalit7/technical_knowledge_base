# Visuals: built and rejected (Long context child, 2026-10-18; rebuilt 2026-10-23)

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

## 2026-10-23 rebuild (teaching-contract pilot)
| Visual | Where | Kind | Why |
|---|---|---|---|
| Hero: one Llama 3.1 8B request's weights and cache against context on an 80 GB GPU, linear axes, MHA counterfactual dashed | Reading, top | static annotated, to scale | the whiteboard picture: linear growth, cache equals weights near 122K, MHA runs out before 110K |
| One token's entry per design (MHA, GQA-8, MQA, MLA, MLA + DSA, recurrent), squares of 64 numbers | Reading s1 | static, drawn to scale | structure of the per-token rate; mechanisms stay on Attention variants |
| Attention share of FLOPs against context, decode and prefill (calc.py) | Reading s2 | static chart | the 28,600 and 70% numbers were prose only |
| Key and value outlier ratios, 90 caches | Reading s3 | static dot strip from measured data | KIVI's premise on our model, beside the claim |
| Gemma 3 27B layer strip | Reading s5 | one slider (context) | windowed layers stop, globals grow; replaces a paragraph |
| Eviction kept map, quality against memory, position wall, distance slider, pass-key grid | Reading s4, s7, s8 | moved from the lab tabs | the strongest visuals were one click away |
| KV-cache calculator: 45 presets, design as the variable, all presets at one context, 12 published checks | own tab | calculator with residuals | sole owner of sizing; replaces the Memory wall and the cache tabs of eight pages |

Rejected on 2026-10-23: a log-scale bar chart of every preset (bars on a log axis lie about ratios; linear bars with printed
values instead); keeping the Memory wall alongside the calculator (two calculators for one concept); per-channel key
histograms (would need a rerun for data the ratio strip already shows).

## 2026-11-09 rollout (split layout, renderer v2)
| Visual | Where | Kind | Data |
|---|---|---|---|
| Fig. 1 hero: one request's cache as a block along the context axis, the weights behind at the same cross-section, one 80 GB GPU column; three requests stacked; MHA counterfactual hitting the GPU at 109,748 | Reading top | 3D stage, 5 steps | KC engine on llama-3.1-8b (config.json) |
| Fig. 2 prefill against decode: the causal triangle, weight bars, a new decode row reading every key, rows growing, four sequences sharing one weight read | Reading s2 | 3D stage, 5 steps | KCD.vis.flops8b (calc.py), KC; 12 tokens illustrative |
| Fig. 3 eviction: 30 layers by 32 columns of kept share, evicted entries lift out, the needle plate and the answer | Reading s4 | 3D stage, 8 steps, budget chips | EVD.maps and EVD.feat (run_kv.py) |
| Fig. 4 the position wall: one row of loss columns per run, trained-length plates | Reading s7 | 3D stage, 6 steps | EFD.past (past.json) |
Kept 2D (in splits): attention share of FLOPs (log axis), key/value outlier strip, quality against memory (log axis, three metrics), Gemma 3 layer strip (one slider), distance histogram (slider), pass-key grid (a heatmap), the design stepper (RD.anim with a step list), the calculator.
Removed: the 2D hero chart, the per-design entry squares (Attention variants Fig. 1 draws them), the 2D eviction map stepper and the 2D position-wall line chart (both replaced by stages). Considered and rejected: the pass-key grid as 3D columns (a heatmap reads best flat); effective context accepted against used as 3D (the grid already shows it).

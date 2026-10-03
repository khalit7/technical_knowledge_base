# Flattening Every Memory Peak (MoE training memory): visualisation ideas

The question the paper keeps returning to: **which tensor sets the peak, and what does it cost to stop it from growing with the workload?** It makes the same move four times (stream a live set instead of materialising it), so the visuals show each live set before and after, on one scale.

Old page's visuals: none (a three-paragraph summary from a newsletter abstract, with one arXiv link). The paper has no code; LLEP's code is public, and the paper's routing profiles (B.2) are fully specified, which made a real replay possible for the dispatch operator. Figures 6 and 7 are PNGs whose baseline curves carry no values, so only their printed labels are used.

## Scores (0 to 2 each; reproduce and computable count double; build cost subtracted)

| Idea | Param moves | Reproduces | Computable | Beyond a sentence | Misconception | Central | New | Animation | Cost | Total |
|---|---|---|---|---|---|---|---|---|---|---|
| Dispatch replay: B.2 profiles through LLEP's released plan, chunk by chunk, contiguous vs strided vs whole batch | 2 (mode, profile) | 2×2 (all 8 send ratios of Table 8) | 2×2 | 2 | 2 ("chunking is just overlap") | 2 | 2 | 2 | -2 | 20 |
| Ring-DTP on real numbers, P = 4, three schedules | 2 | 1×2 (exact loss) | 2×2 | 2 | 2 ("you need the logits") | 2 | 2 | 2 | -2 | 18 |
| Which peak runs out first (four live sets vs HBM, operators toggled) | 2 | 1×2 (constants from Table 10, 14) | 2×2 | 2 | 2 ("fix the biggest and you are done") | 2 | 2 | 0 | -1 | 17 |
| Every number checked (57 checks, 4 do not reproduce) | 0 | 2×2 | 2×2 | 1 | 2 (SCO 17.65%, TFLOP multiples, AIME) | 1 | 2 | 0 | -1 | 15 |
| SCO step-through on 47 boundaries, host budget modes | 1 | 2×2 (21 / 42 boundaries) | 2×2 | 1 | 1 | 2 | 1 | 2 | -2 | 15 |
| Three-scalar fold of one token (predict reveal) | 1 | 1×2 | 2×2 | 1 | 2 | 1 | 1 | 0 | 0 | 12 |
| OffloadStreamAdamW timeline, 1 / 2 / 3 slots vs CPU Adam | 1 | 1×2 (1.93 s by construction, 4.234 GiB staging) | 1×2 | 1 | 1 ("more slots, faster") | 1 | 1 | 2 | -2 | 10 |
| Figure 2 rebuilt from Table 6 (shape, metric) | 2 | 2×2 | 2×2 | 0 | 1 | 1 | 0 | 0 | -1 | 11 |
| End-to-end from printed labels only | 1 | 1×2 | 1×2 | 1 | 1 | 1 | 1 | 0 | -1 | 8 |

Rejected: redrawing Figures 6 and 7's FSDP2 curves (no printed values; reading curves off a PNG is not allowed); a trained toy model (the operators change no arithmetic, so a toy trained with and without them is identical by construction, which is the paper's point and teaches nothing to watch); a Then and now tab (a September 2026 paper with no code yet; "What it takes to use this" covers adoption); a Ring-DTP bytes-per-hop calculator (one sentence, N > V/P, says it).

## Built

| id | Idea | Placement | Data |
|---|---|---|---|
| P-moe_training_memory_bottlenecks.1 | **Dispatch replay**: the paper's synthetic routing profiles (B.2) at the 65K shape, assigned by a port of LLEP's released plan (capacity factor 1.0), stepped chunk by chunk for strided chunks, contiguous chunks and LLEP's whole batch, to one scale: receive bars per destination against Eq. 1's guarantee, the 8 × 8 send matrix of the chunk, counters for routes, buffer bytes and worst send ratio; reproduces all eight send ratios of Table 8 independently | Live tab | B.2, Table 8, LeastLoadedEP code |
| P-moe_training_memory_bottlenecks.2 | **Ring-DTP on real numbers**: 4 ranks, 2 tokens, 12-word vocabulary; move-weights, move-activations (with the return hop) and dense, each rank's strip and (m, z, y_t) state per round; loss matches dense to 1e-15 | Live tab | Eq. 2, 3, Algorithm 2 |
| P-moe_training_memory_bottlenecks.3 | **SCO step-through**: 47 boundaries of 0.3735 GiB, device and pinned-host lanes, forward offload up to the budget, backward restore one ahead, for 8 GiB, 16 GiB, unlimited and off, with Table 3's measured peak beside the counters | Live tab | Table 3, 12, Algorithm 3 |
| P-moe_training_memory_bottlenecks.4 | **Optimizer stream timeline**: 26 buckets through upload, GPU update, write-back with 1, 2 or 3 staging slots against CPU Adam's 3.95 s, bucket times in proportion to bytes and scaled to the measured 1.93 s (illustrative) | Live tab | Table 4, 14, Eq. 5 |
| P-moe_training_memory_bottlenecks.5 | **Which peak runs out first**: the four live sets per GPU for gpt-oss-20b and the 120B, 241B, 667B end-to-end models, tokens per rank slider, each operator toggled, rough peak against the H200's 141 GB | Reading, Four live sets | Table 1, Appendix A, Tables 10, 14 |
| P-moe_training_memory_bottlenecks.6 | Predict: contiguous vs strided chunks, revealed with the replay against Table 8 | Reading, Dispatch | Table 8 |
| P-moe_training_memory_bottlenecks.7 | Predict: how many numbers per token for exact cross-entropy; revealed with a block-by-block fold of one token (blocks and seed sliders) | Reading, Vocabulary | Eq. 3 |
| P-moe_training_memory_bottlenecks.8 | Predict: SCO's 8 GiB budget and the peak drop, bars of Table 3 with the boundary payload still on device | Reading, Checkpoints | Table 3 |
| P-moe_training_memory_bottlenecks.9 | End-to-end panels from Figures 6 and 7's printed labels only, baseline shown as its out-of-memory region | Reading, Results | Figures 6, 7 (e-print PNG labels) |
| P-moe_training_memory_bottlenecks.10 | Figure 2 rebuilt from Table 6 (shape and metric toggles); all ten tables sortable; 57 checks with verdict filter | Tables tab | Tables 2 to 14, recompute.py |

## Defaults that reproduce

- Table 8's eight send ratios and the 12.5% / 17.1% fractions of the bound: independently, from B.2's profiles and LLEP's released plan at capacity factor 1.0 (not at the code's default 1.1).
- SCO's 21 / 42 of 47 boundaries and payload upper ends 7.84 / 15.69 / 17.55 GiB: independently, from the configuration.
- Table 14's eight staging sizes: independently, slots × largest bucket × 16 bytes.
- Table 10's weight, shards and the standard increment (three N × V FP32 tensors): independently.
- OffloadStreamAdamW's 1.93 s at two slots: by construction (the timeline is scaled to it).

## What the methodology lacked here

A way to treat a paper whose end-to-end evidence sits mostly in a companion paper (MoP): the rule now used is to name the companion's own numbers beside this paper's and say which result belongs to which.

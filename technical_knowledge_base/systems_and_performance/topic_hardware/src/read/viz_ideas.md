# Reading tab: visual ideas (built and rejected)

Central question of the Reading tab: for one training step (Llama 3.1 8B, 64 x 8,192 tokens), which of the three columns (arithmetic, bytes in memory, bytes on the wire) limits it, and what hardware serves each. Every visual makes one of the three measurable. Scores 0 to 2 per question (parameter to move, reproduces a published or measured figure x2, computable from public data x2, shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere, animatable before/after), minus build cost.

## Built
| # | Visual | Section | Score | Data and formulas | Notes |
|---|---|---|---|---|---|
| R1 | **Same 64x64x64 matmul tile on a CPU core, a GPU core, an H100 SM's CUDA cores and its tensor cores** (before/after animation, one time axis; modes: all, CPU vs GPU core, CUDA vs tensor cores) | s1 | 15 | FMA/cycle from specs (M1 P-core 16 per C++ page; M1 GPU core 128 per metal-benchmarks; H100 128 lanes per Hopper blog; tensor 2,048 = 2 x A100's 1,024 per A100 whitepaper, agrees with scaling book); H100 clock 1.83 GHz derived from 989.5 TF; measured M1 rates from the C++ page and Roofline lab | Required visual. Cycles 16,384 / 2,048 / 2,048 / 128 |
| R2 | **H100 at two zoom levels** (chip: 144 SM sites with 132 enabled, L2, 5 of 6 HBM sites; SM: 4 sub-partitions with scheduler, 32 lanes, tensor core, 64 KB registers; L1/shared, TMA) | s2 | 9 | Hopper blog, tuning guide, scaling book | Static with a toggle; disabled-SM positions illustrative (said) |
| R3 | **One decode token on GDDR7 vs HBM3 vs HBM3e, HBM3e vs SRAM-only, laptop vs H100** (before/after animation, to scale, 33 layer blocks) | s3 | 15 | time = 16.06 GB / bandwidth; LPX rack 40 PB/s and vendor 1,000 tok/s/user; M1 measured copy 165 GB/s | Required visual. Shows the limit moving off memory for SRAM-only |
| R4 | Full-memory reads per second (bandwidth / capacity) bars | s3 | 10 | vendor specs, M1 measured | Teaches the batch-1 ceiling for a model that fills memory; absent from the old page and the atlas |
| R5 | Dense peak by format across chips (FP32, TF32, BF16, FP8, FP4 selector) | s4 | 9 | facts file | "None" bars teach that a format needs silicon |
| R6 | Ridge points bars | s5 | 10 | peak / bandwidth | Carries the correction (BF16 ridge fell from H100 to B200) |
| R7 | **Ring all-reduce of the 8B's gradients, 8 GPUs, NVLink server vs 8 servers on InfiniBand** (before/after animation, 15 steps, chunks shaded by contributions, both times counted) | s6 | 14 | 2(N-1)/N x S / B; 450 vs 50 GB/s per direction | Required visual |
| R8 | Peak per dollar-hour bars (TFLOPS or TB/s per $/h) | s9 | 9 | Lambda and Google Cloud on-demand, 2026-10-05 | Labelled a ranking, not a quote |
| R9 | Predict-then-reveal: GPU core vs CPU core rate; implied MFU from the 8B model card; PCIe all-reduce time | s1, s5, s6 | 8 each | as above | Distill-style belief elicitation |

## Rejected
| Idea | Why |
|---|---|
| A roofline chart in Reading | The Roofline lab owns it (measured, interactive); Reading links it and shows ridge bars only |
| Training step on 1 vs 8 vs 64 GPUs animation | The Performance calculator owns it; Reading quotes its 8.7 s and 1.17 s |
| Tensor-parallel traffic of the 8B computed here | Reading first computed it (33 vs 301 ms against 125 ms) but the calculator's per-layer model gives a slightly different ratio; quoting the calculator's 70B figures (16% vs 141%) keeps one source. Values still in recompute.py, not shown |
| Systolic array animation | Belongs to the TPU child page; the scaling book already animates it well |
| Scale-ladder chart (chip to gigawatt) | A four-row table carries it; a log chart added nothing |
| Power-per-chip timeline | Too few verified points; prose carries the five numbers |
| Old taxonomy diagram | Replaced by bets cards and the Chip atlas |

## What the methodology lacked
A rule for numbers shared across tabs built in parallel: here the Reading tab aligned its running step (64 x 8,192 tokens) with the calculator's animation after both existed, and quotes the calculator rather than recomputing the same quantity with a different model.

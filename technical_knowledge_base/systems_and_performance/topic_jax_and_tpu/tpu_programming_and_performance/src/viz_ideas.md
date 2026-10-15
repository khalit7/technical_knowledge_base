# Visualisation ideas: TPU programming and performance (prefix tq)

The question the page keeps returning to: for a given model, batch and slice, what limits the step on a TPU, and what in your code moves that limit?

## Built (score 0 to 2 per question of the methodology; reproduce and computable count double; build cost subtracted)
| # | Idea | Where | Score | Reproduces / data |
|---|---|---|---|---|
| 1 | **Roofline walk, animated**: Llama 2 7B's MLP up-projection on all five generations' roofs as the batch grows 1 to 4,096 (decode to training: the same matmul before and after), counters per chosen generation | Reading s3 | 12 | B_crit 240 on v5e and 120 with int8 weights (scaling book) by construction from published specs; JS checked against recompute.py |
| 2 | **bf16 passes, animated**: one float32 product built from 1, 3 and 6 bf16 partial products (3x3 grid of pieces), live error; reader can type the numbers | Reading s5 | 10 | bf16 rounding equals ml_dtypes on 8 values; errors 1.6e-3, 2.8e-6, 5.4e-8 for 1/3 x pi |
| 3 | Precision measured: the trained running example with every matmul emulated at 1/3/6 passes vs float64 | Reading s5 (table) | 10 | measured (tq_precision.py); the CPU ignores precision (measured) |
| 4 | Remat menu: residual bytes against FLOPs for five policies | Reading s6 (scatter + table) | 9 | measured; agrees with JAX core child's 357.6 MB / 115.4 MB |
| 5 | MFU recomputed: published vs non-causal vs causal bars for MaxText's 8 runs | Reading s9, MFU tab | 12 | 6 of 8 reproduce only non-causally (finding) |
| 6 | **Roofline lab**: 7B layer (fused/unfused attention, int8 weights), decode step model with presets, running example, own matmul | tab | 11 | the scaling book's pop quiz (2.5 ms, 21 ms) reproduces; root's 16.1 ms 7B decode reproduces |
| 7 | **Tiling animation**: the same array before and after XLA TPU tiling, padding, tile order, bf16/int8 packing; MXU padding pictures | tab | 9 | XLA tiled_layout.md rules; checked against recompute.py |
| 8 | **Slice planner**: every Cloud slice shape, multislice, state fit, tokens per chip vs ridge, step time, cost, DCN time, JAX placement table | tab | 10 | scaling book LLaMA 3-70B 44 days reproduces (preset); placement measured on mock devices |
| 9 | **MFU calculator**: published rows with FLOP breakdown; your run (tokens/s or step time) on TPU or GPU | tab | 10 | Llama 2 70B v6e default lands on 43.6% non-causal vs 43.8% published |
| 10 | Generation table (sortable), critical-batch table, state-per-chip table, cost table | Reading | 7 | published + calculated |

## Rejected
- A TensorCore drawing and a matmul streaming through the MXU: the root's TPU and Pallas lab has both.
- Systolic array cycle by cycle, pods and optical switches: the Hardware topic's TPU page owns them.
- Collective time on ICI and the mesh-on-torus picture per chip: root lab and Sharding and scale own them; this page shows only the placement table per slice shape.
- A profile viewer: no TPU trace can be produced here and the CPU trace's TPU views are empty (XLA and compilation page shows the CPU trace); described in prose instead.
- Price history: a pattern Khalid removed; prices shown once, dated.
- VPU roofline per generation: only v5p's VPU rate is published (scaling book); mentioned in prose.

## What the methodology lacked
A rule for "measured by emulation": the precision table is a measurement of an emulation, labelled as both.

# Pallas kernels: visual ideas (built and rejected)

Central question: what does a Pallas kernel do that XLA cannot, and how do you know it is right without a TPU?

| # | Idea | Where | Data | Status |
|---|---|---|---|---|
| PK1 | Grid and BlockSpec stepper for ten kernels: the grid, every operand's block per step, copies by Pallas's skip rule, body skipped by pl.when; before/after index map (naive vs clamped) for flash forward and paged decode; TPU interpreter's recorded orders (1 and 2 cores) | Own tab | pk_grid.py, kernels' own index maps | built |
| PK2 | Kernel playground: code as run, measured errors, Mosaic op counts, VMEM calculator (logical vs (8,128)-padded) against each generation's VMEM, (8,128) rule check | Own tab | kernels.json, tpu_info.py VMEM | built |
| PK3 | Flash tiles: online softmax replayed on a trained head, before (naive, stores the row) / after (online) / wrong (no rescale) on the same input | Own tab | pk_tiles.py | built |
| PK4 | Serial vs double-buffered timeline, two lanes drawn to scale, copy-bound toy vs compute-bound 7B-class matmul | Reading s6 | pk_pipeline.py (calculated with v5e published figures) | built |
| PK5 | Same Python kernel lowered to Mosaic (TPU) and Triton (H100), toggle | Reading s2 | jax.export on CPU | built |
| PK6 | Pallas matmul guide utilisation bars by block size vs XLA (v5e, Google) | Reading s1 | matmul.ipynb outputs at the tag | built |
| PK7 | Page table to pool picture (interactive) | Reading s7 | the paged test | built |
| PK8 | Autotuned table heatmap v5 vs v6, with where they differ | Reading s11 | tuned_block_sizes.py | built |
| PK9 | Bug matrix: plain interpreter vs TPU interpreter vs lowering for 8 planted bugs (4 here, 4 root) | Reading s9 | kernels.json, root pallas.json | built |
| PK10 | Rebuild the root's matmul grid animation | none | | rejected: the root lab owns it; PK1 links and extends |
| PK11 | Interpret-mode speed chart | none | | rejected: interpret timings say nothing about TPU speed (a small labelled table only) |
| PK12 | HBM vs SRAM IO animation of flash attention | none | | rejected: the FlashAttention paper page has it (linked) |
| PK13 | Running tokamax kernels | none | | rejected: needs a GPU or TPU to select an implementation; read only |
| PK14 | A real TPU roofline per kernel | none | | rejected: belongs to TPU programming and performance; no chip here |

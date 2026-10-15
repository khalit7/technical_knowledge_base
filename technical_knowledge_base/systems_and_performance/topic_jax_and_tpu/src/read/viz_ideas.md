# Reading tab: visual ideas (Topic: jax-and-tpu)

The question the topic keeps returning to: **what does JAX's "record the whole function, then transform and compile it" cost and buy, from one function on a CPU to one program on a pod?** A Reading visual earns its place when it makes that measurable at root depth without repeating a lab tab's own visual (the labs own the jaxpr line-by-line animation, recompile drill, pytree explorer, vmap animation, fusion animation, remat slider, compile-cache demo, translation table, loss overlay, optax builder, sharding tiles, PartitionSpec playground, collectives animator, systolic array, roofline calculator, Pallas grid, tool table, picker and lineage).

Scores 0 to 2 per the Methodology (moves with a parameter; reproduces a figure, x2; computable from public data or our runs, x2; shows what a sentence cannot; corrects a misconception; measures the central question; absent elsewhere; step-by-step before/after animation), minus build cost.

| # | Idea | Score | Built | Placement | Data |
|---|---|---|---|---|---|
| 1 | **Same train step called four times, PyTorch eager against JAX jit** (two lanes; per call: ops from Python, traced ops, compile, fused kernels; a new shape on call 4 recompiles; counters) | 13 | built | Reading, section 2 | primitive and fusion counts of the running example's train step from the Compiler lab (illustrative 60/12 until then, labelled) |
| 2 | **Training-state memory per device, data parallel against FSDP, against each TPU's HBM** (model preset, device slider; fewest chips to hold the state) | 11 | built | Reading, section 5 | 16 bytes per parameter (ZeRO accounting), vendor HBM; derived |
| 3 | Ridge points of four TPU generations in the spec table, plus a predict question on small-batch decode (8 / 560 = 1.4%) | 9 | built (table column and predict) | Reading, section 6 | vendor specs from the Hardware TPU page; derived |
| 4 | The stack on one screen (clickable layers from model to hardware with PyTorch counterparts) | 8 | built | Reading, section 0 | none |
| 5 | Compiler strip: the running example's train step size at each stage (jaxpr, StableHLO, optimised HLO, fusions, compile time) | 9 | built as a data-driven bar strip, TODO until the Compiler lab measures | Reading, section 3 | Compiler lab outputs |
| 6 | Predict-then-reveal: print inside jit; small-batch decode on v6e | 8 | built | Reading, sections 2 and 6 | run here; derived |
| 7 | Real error messages for each common mistake, from snippets run here | 9 | built (run_examples.py) | Reading, Mistakes | run here |
| 8 | JAX against PyTorch evidence table with dated measurements (Hub counts, repo activity) | 8 | built | Reading, section 8 | measured 2026-10-15 |
| 9 | A mesh-shape picker for the 70B interview question (FSDP x TP split against tokens per chip and communication) | 8 | rejected | | depends on the scaling book's communication model; belongs to the sharding_and_scale child or the Sharding lab; the Reading answer quotes the book |
| 10 | A JAX-vs-PyTorch speed bar on the running example | 4 | rejected | | CPU timings do not transfer to accelerators and would mislead a root comparison; the Training lab shows them with their caveat |
| 11 | Animated jaxpr build-up | 7 | rejected here | | owned by the Transforms lab |
| 12 | Sharding tiles animation | 7 | rejected here | | owned by the Sharding lab |

What the methodology lacked: for a programming-model topic the central "figure to reproduce" is often a count (primitives, fusions, collectives, recompiles) rather than a published number; the Reading visuals take those counts from the labs so that they are measured once and quoted once.

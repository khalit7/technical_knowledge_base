# Sharding and scale: visual ideas

Central question: given a model and a set of devices, who decides each array's layout, which collectives does that produce, and how
do you predict and control them? Every visual either shows a decision the compiler made (read from its own output) or a formula
that predicts it, checked against that output.

What already exists, so this page does not repeat it: the root's Sharding lab (weight before/after sharding on a 2 x 4 mesh,
PartitionSpec playground with 108 compilations, ring collectives animator, six layouts chart), the root's TPU lab (mesh on the torus),
Distributed Training (one step nine ways, layout calculator, bubble table), Distributed PyTorch (pipeline schedules tab), DeepSeek and
Llama 3 pages (DualPipe and interleaved schedules), Switch page (Figure 9 splits), Interconnects (collective simulator).

## Built (score 0 to 2 per criterion: parameter to move, reproduces a published figure (x2), computable (x2), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere, step animation vs the method it replaced; minus build cost)

| # | Idea | Score | Where | Data |
|---|---|---|---|---|
| 1 | Propagation before/after: one block, every op filled in with the sharding the propagator chose, collectives per line; Shardy vs GSPMD toggle; table of every op group with differences highlighted | 13 | Propagation explorer | HLO dumped after `shardy-xla` / `sharding-propagation`, 5 cases x 2 propagators (ss_prop.py) |
| 2 | Whole-step propagator diff by source line (bars, Shardy vs GSPMD) | 12 | Propagation explorer + Reading table | full train step of 3 root-lab layouts |
| 3 | Explicit-mode ladder: naive, intermediate, fixed, with the real errors and jax.typeof of intermediates | 11 | Reading | ss_explicit.py |
| 4 | Strategies at two sizes: bytes per kind or memory per device | 11 | Reading | ss_scale.py |
| 5 | Context parallelism: ring vs all-gather on the same 8 x 8 query/key block grid, step animation, counters (bytes, blocks held, work device 0 vs 7), measured table incl. 8,192-token memory | 13 | Reading | ss_cp.py |
| 6 | Collective cost calculator: ring, 2-D torus, tree against message size, devices and link; real message sizes marked | 10 | Reading | scaling book formulas, alpha-beta; derived |
| 7 | Formula vs compiled bytes table | 12 (reproduces the compiler within 0.4% except one explained miss) | Reading + Mesh designer | ss_formulas.py |
| 8 | Mesh designer: model, slice, batch, X, Y, remat -> memory bar, compute vs communication bar, scaling-book conditions, torus placement or make_mesh refusal | 12 | own tab | specs.json (root TPU lab), torus.json, scaling book; JS checked against ss_mesh.py |
| 9 | Pipeline schedule tick by tick from the real runs, GPipe vs circular (same layers, same devices), bubble counters vs formula | 12 | own tab | ss_pipe.py |
| 10 | MoE dispatch/combine: the real 8 x 8 routing matrix, capacity and drops, two all-to-alls; top-1/2 and 3 capacity factors; hand vs propagation table | 12 | own tab | ss_moe.py |
| 11 | Two processes vs one process, step animation, what each process sees, the two real errors | 10 | own tab | ss_multi.py |
| 12 | Predict-then-reveal: which propagator sends more bytes | 8 | Reading | prop.json |

## Rejected
- Timeline of collectives from the profiler: simulated-device timings are meaningless.
- Pipeline 1F1B / DualPipe animation: exists on DeepSeek, Llama 3 and Distributed PyTorch pages; only the JAX implementations are new here.
- Re-animating weight sharding or ring collectives: the root lab owns them.
- An animation of the propagator's own visiting order: the dumps record the result, not the order; inventing an order would mislead. The before/after animation uses program order and says so.
- 2-D torus collective animation: the TPU lab owns placement; the cost calculator carries the numbers.

## What the methodology lacked
A "reproduce a published figure" axis was replaced again by "reproduce the compiler": formulas are checked against compiled byte counts at two model sizes, which is stronger than matching a paper's printed number. Worth adding: when the subject is a compiler's behaviour, the compiler's own output is the primary source, and a visual should show it next to the rule that predicts it.

## 2026-10-23 rebuild
- Added: hero (static: annotation code, 2 x 4 mesh with each device's block, the three deciders feeding the partitioner); PartitionSpec widget (one variable, six specs on fc1, derived, `P('data', 'model')` matches the measured shard shape); shard_map structure diagram (static). All in `parts/26_js_ss_read0.js`.
- Moved inline: ideas 1, 2 (section 3), 9 (section 8), 10 (section 9), 11 (section 12). The tabs are gone; the Mesh designer stays a tab.
- Moved into a closed block: idea 6 (collective cost calculator), because collective algorithms on the wire belong to Interconnects and scaling.
- Rejected: a photo of TPU hardware for the multi-host section (the hardware pages own it; a diagram teaches the process model better); an animated propagation order (still not in the dumps).

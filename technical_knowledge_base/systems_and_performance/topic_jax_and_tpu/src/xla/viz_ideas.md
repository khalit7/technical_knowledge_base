# Compiler lab: visual ideas

Central question: what does `jit` turn the train step into, and what does each compiler decision cost in kernels, memory and time?

## Built
| # | Idea | Data | Why it earns its place | Score (0-2 each: parameter to move, reproduces a figure, computable, beats a sentence, corrects a misconception, central, novel) |
|---|---|---|---|---|
| 1 | Five forms, animated (Python, jaxpr, StableHLO, HLO, optimised HLO, executable) with the real text of one MLP block and train-step counters | pipeline.json, fusion_demo.json | One object followed through every stage; the API to print each | 1,1,2,2,1,2,1 |
| 2 | Where the ops come from: forward, backward, optimiser in equations, kernels, FLOPs | pipeline.json pieces | The optimiser is 67% of equations and 0.07% of FLOPs; 3x-forward rule checked (23.71 vs 24.69 GFLOP) | 1,2,2,2,2,1,2 |
| 3 | Fusion before/after animation: 29 chips gather into 4 kernel boxes; kernels and bytes counters | fusion_demo.json (eqn-to-kernel by metadata op_name + source line; per-kernel bytes sum exactly to cost_analysis) | The requested before/after; shows CSE, absorbed broadcasts, removed copy, erfc expansion | 1,1,2,2,1,2,2 |
| 4 | Instruction count after each of 75 XLA passes (train step) or 43 (MLP block), with the biggest changes tabled | passes.json | Shows the fusion cliff and the CSE drop; CSE cause found (gradient norm computed twice) | 1,1,2,2,1,1,2 |
| 5 | Donation toggle: memory bars from memory_analysis | pipeline.json | Alias 9.92 MB = training state; temp dominates at this size; 7B derived | 1,1,2,1,2,2,1 |
| 6 | Remat slider (blocks x policy) + memory/FLOPs scatter | remat.json, timing remat | Real compilations; "the last block saves nothing" | 2,1,2,2,2,2,2 |
| 7 | Scan vs unroll, 1 to 32 layers, four metrics | timing.json layers | Compile time and size growth; cost_analysis undercount trap | 2,1,2,2,2,1,1 |
| 8 | Compile-cache race (cold, in-memory, disk) | timing.json step and cache | Default 1 s threshold checked | 1,1,2,1,2,1,1 |
| 9 | Profile top kernels; torch.compile comparison table; source path table | profile.json, torch_compile.json, source.json | Debugging and comparison with real outputs | 0,0,2,1,1,1,1 |

Predict-then-reveal: kernels left after XLA; the 4th remat block; the default cache threshold.

## Rejected
- Live XLA in the page: impossible (sandboxed iframe, no network or Python).
- Full HLO viewer with every instruction of the train step: 1.2 MB of text, unreadable; the MLP block excerpt teaches the same.
- Graph viewer image from xprof: graph_viewer fails on CPU ("Can not load hlo proto from options").
- GPU or TPU fusion results: not run here; described from OpenXLA docs and labelled.
- Attention block as a second fusion demo: same lesson as the MLP block, doubles the data.
- A per-pass HLO diff viewer: interesting but heavy (64 MB of dumps); the pass table carries the point.

## What the methodology lacked
Compiler internals have no "published figure" to reproduce; the equivalent check used here is internal consistency (per-kernel I/O bytes sum exactly to XLA's bytes accessed; FLOPs against the 3x-forward rule; identical loss under remat).

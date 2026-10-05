# Visual ideas: Triton and Gluon

What the text needs to be understood: (1) what "a program over blocks" becomes in threads and instructions, (2) why tile order matters, (3) what num_warps and num_stages cost, (4) what the compiler's stages and passes do, (5) what a layout is, (6) that the same source becomes different machine code per GPU. Constraint: no GPU, so no timings; every visual is built from real compiled output, the interpreter, or arithmetic reproduced in `code/recompute.py`.

## Built (score = teaches / real data / not elsewhere in the KB, each 1 to 3)

| # | Visual | Where | Score | Data |
|---|---|---|---|---|
| 1 | **Vector add through the passes** (before/after animation, 6 steps, 3 modes: aligned n = 992, aligned n = 1,000, no hints): 1,024 elements as 8 x 128 cells coloured by warp, the layout before and after convert-triton-to-tritongpu, coalesce, remove-layout-conversions, then the SASS and the mask | Reading s1 | 3/3/3 | `out/passes.json` snapshots, `out/compile.json` SASS counts for `vadd`, `vadd_n1000`, `vadd_nohints` |
| 2 | **Grouped against row-major program order** (before/after animation, 81 steps on 9 x 9 tiles, counters of A and B tiles needed) | Reading s3 | 3/2/3 | reproduces tutorial 03's 90 against 54 by construction; `recompute.py` `grouped_seq` checked against the page's function (`check/check_js.mjs`, 162/162) |
| 3 | **Register cliff grid** (softmax BLOCK x num_warps: registers and stack) | Reading s2 | 3/3/3 | 28 compiles for sm_90a |
| 4 | **One tl.dot, six instructions** table | Reading s3 | 3/3/2 | compiled for sm_80, sm_90a, sm_100a, sm_120, gfx942, gfx950 |
| 5 | **Shared memory against num_stages** chart with per-GPU limits | Reading s5 | 3/3/3 | 24 compiles; the buffer rule reproduces every point exactly (`recompute.py` asserts residual 0 to 16 B) |
| 6 | **Pass strip** (73 passes, click for what each did to this kernel, three kernels) | Reading s7 | 3/3/3 | `MLIR_ENABLE_DUMP=1` dumps |
| 7 | **Before/after IR for accelerate-matmul and pipeline** | Reading s7 | 3/3/3 | the same dumps |
| 8 | **Compiler stages** tab: 4 kernels x 6 targets x 6 stages | tab | 2/3/2 | `out/ir/` excerpts |
| 9 | **Config explorer** tab: tutorial 03's 16 configurations and two sweeps x 4 GPUs, occupancy, launchability, a shared-memory predictor | tab | 3/3/3 | 108 compiles; occupancy port checked 136/136 against `recompute.py` |
| 10 | **Layout explorer** tab: any blocked layout drawn, linear-layout bases | tab | 3/3/3 | JS bases equal Triton 3.8.0's `to_linear_layout` on 8/8 layouts; reproduces Gluon tutorial 02's printed table |
| 11 | Gluon tutorial 02 table recompiled (instruction widths per R next to the tutorial's GB200 throughput) | Reading s10 | 2/3/3 | `out/gluon.json`; `inputs/gluon_tutorial02_published.json` |
| 12 | Real Inductor-generated Triton (pointwise, persistent-reduction softmax, wrapper calling extern mm) | Reading s9 | 3/3/2 | `out/inductor/` |

## Rejected
- A software-pipelining timeline animation: the memory hierarchy sibling already animates a 1-to-4-stage pipeline; linked instead, and this page shows what the compiler allocates for it (chart 5, IR 7).
- An online-softmax animation for attention: the parent's Kernel lab has it and Writing kernels derives it; linked.
- Throughput charts for configurations or layouts: no GPU; any chart would be invented. The tutorial's published GB200 numbers are shown as a labelled column only.
- A Triton-vs-CUDA line-count comparison for attention: the CUDA version is being written in parallel on Writing kernels; the root already shows one softmax data point.
- Running Triton on the M1 GPU: Triton has no Metal back end; the interpreter runs on the CPU only.

## What the methodology lacked
A rule for "compiled but not run" evidence: this page needed a fifth evidence class beside measured, published, derived and not run. Used: "compiled here" (real compiler output for a GPU that is not present), with its own colour.

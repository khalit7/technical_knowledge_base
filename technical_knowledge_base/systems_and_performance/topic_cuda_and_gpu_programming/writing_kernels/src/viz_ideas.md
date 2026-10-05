# Writing kernels: visualisation ideas

Central question: for each kernel pattern, what limits it (bytes, launches, idle lanes, the exponential units), and which change removes that limit, measured rather than asserted?

Scores 0 to 2 per Methodology question (quantity under the reader's control; reproduces a stated figure, double; computable from public data or real measurement, double; shows what a sentence cannot; corrects a misconception; measures the central question; absent elsewhere in the KB; animation point), minus build cost.

| id | Idea | Placement | Data and sources | Score | Status |
|---|---|---|---|---|---|
| WK.1 | **Reduce and scan, animated**: 16 values on a toy GPU (warps of 4, 4 banks), six methods on the same input (Harris R1, R2, R3, warp shuffle; Hillis-Steele and Blelloch scans), arrows per operation, lane bars (working, idle in an issued warp, not issued), counters for additions, idle lanes, barriers, shuffles, shared-memory transactions, worst bank conflict; a table of all six | Own tab | Harris 2007; GPU Gems 3 ch. 39; model checked against tree_model.py (28 cases with fa_model) | 14 | built (before/after on one input; reproduces 2(n-1) adds for Blelloch and the Hillis-Steele sum by construction of the rules) |
| WK.2 | **Split-K against split-Q** inside one block, stepped, with shared-memory writes, reads, barriers, exchanges | Attention schedules tab | FA-2 §3.3 quotes; counts derived from tile shapes, checked against fa_model.py | 11 | built (counts are a model, labelled derived) |
| WK.3 | **FlashAttention-3 overlap time line**: in order, ping-pong, intra-warpgroup pipelining, both; softmax/GEMM ratio slider (0.5 = H100 d=128 from FA-3's 989 vs 3.9 TFLOPS; 1.0 = FA-4's Blackwell asymmetry); tensor-core utilisation; FA-3 ablation numbers beside | Attention schedules tab | FA-3 §3, ablation table; list-scheduling model, Python twin | 12 | built (illustrative model; does not reproduce 570/582/661, said; greedy non-optimality said) |
| WK.4 | **Harris ladder re-run on the M1** with predict-then-reveal (30x on G80 vs 1.6x here) | Reading s1 | measured, 3 runs; Harris deck table | 13 | built |
| WK.5 | **Sequential float32 sum stuck at 2^24**, predict-then-reveal; atomics give 6 to 8 distinct sums in 30 runs | Reading s1 | measured | 12 | built |
| WK.6 | Scan ladder bars (Hillis-Steele 24 launches, reduce-then-scan, mx.cumsum, copy) | Reading s2 | measured | 9 | built |
| WK.7 | **LayerNorm variance accuracy** predict-then-reveal and table at row means 0 to 3,000 (E[x^2]-E[x]^2 errs by 1,653) | Reading s3 | measured | 12 | built |
| WK.8 | Matmul ladder as compiled: registers, FFMA per shared load, SASS inner loops of k5 and k6 side by side; k1 = k2 in SASS | Reading s4, Compiled tab | CUDA 13.4.2, sm_80/90a/120 | 11 | built |
| WK.9 | **Epilogue fusion in three attempts** (16 KB staging tile, precise tanh, in registers) against unfused and mx.compile | Reading s5 | measured | 12 | built (fusion loses twice before it wins: kept as the lesson) |
| WK.10 | RMSNorm fused into the matmul (gamma folded, sum of squares from A tiles): measured loss | Reading s5 | measured | 9 | built |
| WK.11 | Decode GEMV ladder with a two-point fit of launch overhead and bandwidth | Reading s6 | measured; derived fit | 10 | built |
| WK.12 | FA-1 grid against FA-2 grid, same kernel, log bars | Reading s7 | measured (7.0x at N = 8,192) | 11 | built |
| WK.13 | Causal mask against block skipping, with the ideal (B+1)/2B | Reading s7 | measured; FA-2's 1.7-1.8x | 10 | built |
| WK.14 | **Split-KV decode chart** (time against splits for 3 lengths, MLX dashed), and the power-of-two cliff at S = 8 with its padded control | Reading s7, Bench tab | measured | 12 | built (cause unconfirmed, said) |
| WK.15 | Kernel bench tab: every case with spread, load, rate and timed source | Own tab | measured | 9 | built |
| WK.16 | Compiled tab: opcode families per kernel and target, blocks per SM from registers | Own tab | compiled; occupancy rules from the root | 8 | built |
| WK.17 | FlashAttention forward run step by step on a real input | none | | rejected: the FlashAttention paper page's Run the kernel tab already does it; linked |
| WK.18 | Online softmax one-row stepper | none | | rejected: the paper page and the root's Kernel lab both have one; linked |
| WK.19 | Boehm ladder timed on the M1 | none | | rejected: the root's Kernel lab measured it; this page compiles it for NVIDIA instead |
| WK.20 | Decoupled look-back scan measured on the M1 | none | | rejected: Metal documents no forward-progress guarantee between threadgroups, so a spin-wait could deadlock; described from the paper instead |
| WK.21 | FA backward pass animation | none | | runner-up: the formulas fit in five lines; an animation would repeat the forward one |
| WK.22 | Triton versions of the new kernels | none | | left to the Triton and Gluon sibling page |

What the methodology lacked here: a rule for **lesson cases**. Two of the fused kernels lost to the unfused pair for reasons a reader will meet (occupancy cliff from shared memory, accurate math in a compute-bound kernel); keeping the failed attempts as recorded, timed cases teaches more than showing only the final kernel. And a rule for **side experiments**: quick checks made while debugging (fast vs precise tanh, the padded split-KV) are recorded verbatim in `m1/out/side_experiments.txt` and promoted to recorded runs when the page leans on them.

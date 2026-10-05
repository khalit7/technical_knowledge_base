# Kernel lab: visual ideas, built and rejected

Central question: where does a kernel's time go, bytes or arithmetic, and what does each optimisation change about that?

## Built
| Idea | Where | Why it earns its place | Data |
|---|---|---|---|
| Softmax ladder: rung buttons, timed Metal code beside its Triton twin, stats, GB/s bars against the copy roof | Section 1 | Every rung measured; shows coalescing as the one big jump and that later rungs tie when re-reads hit cache; long-row case shows passes matter when they miss | run_*.json, Roofline lab copy roof |
| Passes animation (eager 5 kernels vs 3-pass vs 1-pass), counters of bytes, measured time | Section 1 | Before/after on the same rows; makes "fusion = fewer trips" visible | derived bytes, measured times |
| Matmul ladder M1 to M7 + MLX with bars against the measured FMA peak; Boehm's A6000 ladder alongside | Section 2 | Reuse ladder with real numbers; the two unplanned lessons (unrolling 34x, bigger tiles slower) | run_*.json; siboehm.com (Dec 2022) |
| Fused softmax + matmul: unfused vs two-pass vs online, step animation with bytes counters, time and peak memory at three N | Section 3 | The spec's required before/after; shows two-pass fusion gives back its gain, online wins | run_*.json, recompute.py |
| Online softmax on one row: 8 tiles, running max line, alpha, l, acc; naive mode storing every score; same output checked | Section 4 | The FlashAttention trick step by step against the method it replaced | computed in browser, checked by recompute.py |
| Attention time and peak memory vs N (log-log), naive memory extrapolated to 16K | Section 4 | Required before/after; peak-memory model matches all five measured points exactly | run_*.json |
| H100 table: measured here / vendor / derived | Section 5 | Keeps the three kinds of number apart | NVIDIA, SemiAnalysis, FA2/FA3 abstracts |
| Triton kernel picker with interpreter errors and sm_80 vs sm_90a resources and instruction counts | Section 6 | Real compiler output: tl.dot becomes HMMA vs HGMMA, register and shared-memory budgets | triton_compile.json |
| Predict-then-reveal (S1 vs S2; M3 vs M2) and interview questions | Sections 1, 2, 7 | Belief elicitation where the answer surprises | measured |

## Rejected
- Coalescing and bank-conflict animations: owned by the GPU simulator tab (linked).
- Tile reuse of a matmul (global vs shared) animation: required in the Reading tab and simulated in the GPU simulator; not repeated.
- A Triton timing on CPU: the interpreter's speed means nothing about GPUs.
- An fp16 ladder: the M1's fp16 FMA rate equals fp32 (Roofline lab), so it would teach nothing new here.
- Attention at 16K naive: 4 GiB of scores on a shared 16 GB laptop; shown as a derived point instead.

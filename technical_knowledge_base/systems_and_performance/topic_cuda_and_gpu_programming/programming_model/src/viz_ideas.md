# Visual ideas: The CUDA programming model

Method: `.claude/skills/explainer-page/visuals/choosing.md`. Needs of the text, in order: how threads find their data; which threads form a warp; what warp-level cooperation buys; why a barrier is needed (and what breaks without it); what launch configuration does to occupancy and to waves; what a launch costs. Scores are teaching value x evidence (1 to 5 each).

## Built
1. **Wave quantization, before/after (Reading s5), 25.** NVIDIA's own A100 example (108 SMs, 256 x 128 tiles, M = 2304): N = 1536 (108 tiles, one wave) against N = 1544 (117 tiles, two waves), SMs drawn to scale in count, time axis in tile units, counters (tiles, elapsed, SM utilisation, throughput relative). Data: docs.nvidia.com/deeplearning/performance/dl-performance-matrix-multiplication. Paired with a real measurement: the M1 Pro staircase (1 to 72 threadgroups of 1,024 threads, steps every 16), 3 runs.
2. **Race, before/after (Reading s4), 25.** Toy block of 16 threads (two warps of 8, labelled), tree sum with and without __syncthreads on one input (sum 80; 31 without), counters for barrier arrivals and stale reads. Backed by the real M1 run (10 to 80% of 65,536 blocks wrong without the barrier, 0 with) and the real SASS (17 LDS with barriers, 9 without: the compiler keeps s[t] in a register).
3. **Shuffles against shared memory (Reading s3), 20.** One warp, lane i holds i+1; five SHFL steps vs five levels of LDS/STS/BAR; counts per step from the real SASS of warp_sum and block_sum.
4. **Which threads form a warp (Reading s2), 20.** 256-thread block shapes 32x8 .. 1x256 coloured by warp, click a thread for threadIdx, linear id, warp, lane and the matrix element; sectors per warp load derived. Links coalescing to the memory-hierarchy sibling.
5. **Launch planner tab, 20.** GPU x kernel preset (real ptxas reports) or custom; occupancy for every block size coloured by limiting resource, suggested block size (cudaOccMaxPotentialOccupancyBlockSize logic), grid, waves, last-wave fill, cooperative-launch maximum. JS port checked against NVIDIA's cuda_occupancy.h run in the container: 1,155 of 1,155 values.
6. **Launch cost bars (Reading s8), 12.** M1: launch-and-wait vs queued launches.
7. Static evidence: real SASS listings (scale, warp-aggregated atomic, grid.sync), real error output of a host program run without a GPU, the __launch_bounds__ table across four targets.

## Added 2026-10-23 (teaching-contract rebuild)
8. **Hero: one launch unpacked (top), static annotated diagram.** Grid, block, warp, thread of `scale<<<4096, 256>>>`, one thread highlighted (i = 2,341), how each level cooperates and where it runs. Structure, so static.
9. **Host and device stepper (section 1).** CPU and GPU memory plus two schematic timelines over the seven steps of the first program; the asynchronous launch and the waiting copies were described only in words before. A process, so a stepper (no tweening). Timing labelled illustrative.
10. **The same stepper with a faulting kernel (section 6).** Opens at the launch; `cudaGetLastError()` returns success, the copy returns 700, every later call fails. Same input as 9, so a before/after across two sections.
11. **Occupancy under one slider (section 5).** One H100 SM's 64 warp slots and its 65,536-register file at 256-thread blocks, registers per thread as the only variable; presets are the real ptxas counts of the three `heavy_*` kernels (128, 64, 32 registers: 2, 4, 8 blocks). Uses the planner's port, checked against `cuda_occupancy.h`. Occupancy as a concept had no inline visual; the planner tab stays for the across-kernels question.

## Rejected
- Grid-stride vs one-per-element as a before/after for the tail: rejected after working it through; with uniform per-thread work both finish in the same number of rounds, so the animation would teach something false.
- A divergence animation: the root (s2) and GPU architecture (s5) already have it, with measurements.
- A latency-hiding scheduler animation: owned by GPU architecture s3.
- A streams/events timeline: owned by the streams sibling.
- An atomics-contention chart: the M1 showed no reliable difference among the three variants (all near the read time), so a chart would suggest an effect that was not measured; the numbers are given in prose with the SASS explanation.

## What the methodology lacked
A rule for evidence when the target hardware is absent: here "compiled here" (real compiler output, and host programs actually run without a GPU) proved as strong as measurement for many claims (register caps, compiler-removed loads, warp aggregation, how grid.sync is built), and is worth naming as its own evidence class.

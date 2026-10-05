# GPU simulator tab: visual ideas

The tab's question: what does the hardware do with the code you write, and how would you see it? Each simulator makes one
documented rule measurable with an input the reader controls, shows the old way and the fix on the same input, and puts a
real measurement on the M1 Pro GPU beside it where the M1 can show the effect.

## Built (score out of 14: quantity moves with a control, reproduces a stated figure x2, computable x2, beyond a sentence, corrects a misconception, central question, absent elsewhere, animation)

| # | Idea | Score | Reproduces | Data |
|---|---|---|---|---|
| 1 | Two warps through an if/else, one row per issued instruction, lanes masked; before: branch on `threadIdx.x % 2`, after: on the warp index; free mode with data-dependent conditions (random vs sorted data) | 12 | Guide 3.2.2.1 rule; predicts 2x, M1 measured about 1.85x (run of 2026-10-05) | M1 divergence kernel |
| 2 | Sector map of one warp load (lines x sectors x words) for contiguous, offset, stride, column, gather, broadcast; 2/4/8/16-byte elements | 13 | Guide 2.3.4.1: 4 sectors for 128 B; 1,024 B and 12.5% for 32-byte strides; Nsight's optimal Sectors/Req 4/8/16 | M1 stride sweep, 256 MB read once |
| 3 | Transpose of one 32x32 tile, naive vs staged in shared memory, sectors counted per warp instruction | 12 | 1,152 vs 256 sectors; guide 2.3.4.2.1 | M1 4096^2 transpose, 4 kernels |
| 4 | Tile memory map coloured by bank + 32 bank queues served one wavefront per step; [32][32] vs [32][33] vs XOR swizzle; free stride | 13 | Guide Figure 15 (stride 2 two-way, stride 3 none), 32-way column, padding fix | M1 threadgroup stride sweep |
| 5 | Occupancy calculator, all four limits as bars, sweep chart over registers / shared memory / block size, ptxas presets | 13 | NVIDIA cuda_occupancy.h on 5,292 cases, 0 mismatches | Programming Guide Tables 30, 31; ptxas from the Compiler explorer |
| 6 | SM register file filled warp by warp to scale (4 x 64 cells of 256 registers), 168 registers vs capped at 128 | 11 | 18.75% vs 25% on sm_90a, from the calculator | ptxas acc128 |
| 7 | Scheduler timeline (warps x cycles, idle row), 2 vs 6 warps; free mode with latency presets from Luo et al.; utilisation sweep against Little's law | 12 | Sim equals min(1, W k(c+1)/(k(c+1)+L)) | Luo et al. 2024 Table IV |
| 8 | M1 bandwidth against threads in flight, derived latency by Little's law | 11 | three low points give the same ~370 ns | M1 grid-stride read |
| 9 | 8x8 matmul with per-element load counts, naive vs staged tiles (1,024 vs 256 loads) | 10 | 2 n^3 and 2 n^3 / T | formula |
| 10 | Intensity against tile size with ridge points of M1 (measured), H100, B200, RTX 5090, A100; shared memory per block and which GPUs it fits; H100 memory vs math time | 11 | ridges from vendor pages in the shared facts file | FACTS.md, Roofline lab |
| 11 | M1 naive vs 8/16/32 tiles | 9 | agrees with the Roofline lab's independent runs within 2% | M1 |

## Rejected
- Full SM pipeline simulator (dual issue, scoreboards, arithmetic latencies): undocumented details would be invented; the latency model isolates the one idea and says what it leaves out.
- 64-bit and 128-bit shared-memory bank rules: NVIDIA's current guide does not spell out the phase split; modelled only 32-bit words and said so.
- Measuring occupancy on the M1 by varying threadgroup memory: Apple does not publish its per-core limits, so the sweep could not be interpreted; the threads-in-flight sweep shows the same latency-hiding idea directly.
- Achieved-occupancy or Nsight screenshots: no NVIDIA GPU available; metrics are named from the Profiling Guide instead.
- Warp-shuffle reduction animation: belongs to the Kernel lab and the Compiler explorer (its SASS).
- Tile animation of global vs shared loads as a picture of one tile: the Reading tab owns that conceptual visual; this tab counts loads per element instead.

## What the methodology lacked
- A rule for shared-laptop measurements: report median of runs and the full range, state the load average, and phrase prose
  only in terms that every run supports (the bank sweep's "stride 33 fastest in every run" was false for one run and was rewritten;
  `check_embed.py` now tests each such claim against all three runs).

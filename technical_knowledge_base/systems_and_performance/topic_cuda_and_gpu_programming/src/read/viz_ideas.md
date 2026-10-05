# Reading tab: visual ideas, built and rejected

Central question of the page: **for one operation, where does the time go between PyTorch and the silicon, and which bytes can you stop moving?** Scored 0 to 2 on: parameter the reader moves, reproduces a sourced figure, computable from public or measured data, shows what a sentence cannot, corrects a misconception, measures the central question, absent from existing explainers; "animatable as before/after" counted as an extra point. Build cost subtracted.

## Built (Reading tab)

| # | Visual | Section | Score | Data and formulas |
|---|---|---|---|---|
| R1 | **One call, eager against torch.compile** (before/after animation): CPU and GPU lanes, launches, a CPU wait, memory arrows; counters for launches, MiB moved, time at 3.35 TB/s and at the M1's measured softmax rate | 1 | 10 | 256 MiB per pass; eager 4 passes, fused 2; PyTorch dispatch read from `native_functions.yaml` and `SoftMax.cu` |
| R2 | **Launch explorer**: n, block size, thread i; blocks drawn, the selected block's warps with masked threads, the thread's block, warp and lane | 2 | 8 | ceil(n / B), B / 32 warps |
| R3 | **One warp through a branch, uniform against divergent** (required before/after): rows of issued instructions, lanes active or masked; counters for issue slots and lane efficiency; predict-then-reveal with the M1 measurement (1.86x) | 2 | 11 | GPU simulator's M1 runs |
| R4 | **Coalescing sectors plus measured bandwidth**: stride select; the warp's addresses mapped onto 32-byte sectors; bars of M1 GB/s per stride | 3 | 10 | NVIDIA 32-byte sector rule (Best Practices Guide); M1 from GPU simulator |
| R5 | **A matmul tile, global against shared memory** (required before/after): 4 x 4 block, K = 8, two phases; each A and B cell shows how often it was fetched from global memory; shared-memory tiles fill and are read; counters; real-size line with a tile select | 3 | 11 | 2T^2K against 2TK fetches; T/4 FLOP per byte (fp32) |
| R6 | **Softmax passes table** (derived H100 times) and **Kernel lab softmax ladder bars** (measured) | 4 | 9 | passes x 268 MB / 3.35 TB/s; lab/out/data.json |
| R7 | **Boehm ladder bars** (published) and **Kernel lab matmul ladder bars** (measured) side by side | 4 | 9 | worklog table; lab/out/data.json |
| R8 | **Attention unfused against fused** (required before/after): HBM tensors drawn to scale in bytes, S and P dashed when never stored, read and write arrows per step; N, d, batch x heads; counters for traffic, extra memory, H100 memory time and compute time, the bound speedup | 5 | 12 | 4BH N^2 b + 4BH N d b against 4BH N d b; FLOPs 4 BH N^2 d; H100 989.5 TF, 3.35 TB/s |
| R9 | **M1 attention table** (measured here: 3 runs, unfused three-step vs MLX SDPA) | 5 | 8 | read/out/run_*.json |
| R10 | Predict-then-reveal: divergence, stride 32, benchmark spread (the disturbed first run) | 2, 3, 9 | 8 | measured |

## Rejected

- **Roofline chart**: owned by Topic: hardware's Roofline lab; linked instead.
- **SM floor plan**: owned by Topic: hardware section 2.
- **Occupancy calculator, bank-conflict and latency simulators**: built in the GPU simulator tab; linked.
- **PTX/SASS explorer**: the Compiler explorer tab; Reading shows only the vector add, as text.
- **Online-softmax step animation over one row**: considered for section 4; the Kernel lab and the FlashAttention paper page both step through it; a formula box plus R8 suffices here.
- **Warp-specialised pipeline animation (TMA producers, wgmma consumers)**: belongs to the tensor-core child; no measured data here to anchor it.
- **Nsight screenshots**: no NVIDIA GPU to profile; would be borrowed images.

## What the methodology lacked for this page

No NVIDIA device: the "reproduce a published figure" test was met by real compiler output (registers, spills, instruction choice) and by measurements on another SIMT GPU, each labelled with what transfers. A rule worth adding: when the measurement platform differs from the subject's, state the ratio that decides transfer (here the ridge point: about 30 FLOP/byte on the M1 Pro against 295 on an H100), so the reader can scale the result.

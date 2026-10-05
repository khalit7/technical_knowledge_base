# Coverage of the old pages (Reading tab and Further reading)

The old root and its six children are saved verbatim in `old/` (fetched read-only from Notion on 2026-10-05, extracted by script; the root was last edited 2026-09-23, the children 2026-09-22). Each claim below is marked **verified** (with source), **corrected**, **unconfirmed**, or **left to a child** (depth the root does not carry; the child page keeps it until it is rebuilt). "Where" names the Reading section or tab that carries it.

## Root (`old/00_root_topic_cuda.md`)

| Claim | Verdict | Where |
|---|---|---|
| Video "three layers of one stack" (6 min) | kept on the Notion page; describes the old page (ask Khalid) | n/a |
| CUDA = C++ extension, compiler stack, driver/runtime APIs, libraries, profilers | verified (CUDA Programming Guide) | 1, 7, 8, 9 |
| cuBLAS is what `torch.matmul` calls; cuDNN backs SDPA | verified, refined: cuBLAS or cuBLASLt by heuristics (`preferred_blas_library`, PyTorch 2.14 docs); SDPA backends FLASH, EFFICIENT, CUDNN, MATH (`torch/nn/attention/__init__.py`) | 1, 7 |
| Triton: block-level DSL; what torch.compile emits | verified (PyTorch 2 paper: "translates PyTorch programs into OpenAI's Triton for GPUs and C++/OpenMP for CPUs") | 1, 6, 8 |
| Triton kernel ~1/10 the length, within 0-20% of CUDA | unconfirmed as a general figure; one data point shown (29 vs 9 lines for softmax, from the Compiler explorer) | 6 |
| CUTLASS, CuTe layout algebra | verified (CUTLASS docs) | 7 |
| CUDA Toolkit 13.3 latest stable, 13.4 preview | **corrected**: 13.4.2 is current (Docker Hub tag 2026-09-29; Programming Guide v13.4.2) | 8 |
| Triton 3.7 current, 3.7.1 pinned by engines | **corrected**: 3.8.0 released 2026-08-28 (GitHub releases), installs from PyPI | 6 |
| CUTLASS 4.x ships CuTe DSL | verified; latest 4.8.0, 2026-09-22 (GitHub releases) | 7 |
| PMPP 5th ed, Feb 2026 | verified with a caveat: Elsevier shows Feb 27, 2026 in the header and Jun 3, 2026 in product details; both stated | Further reading |
| GPU MODE ~30k members | unconfirmed (not checked); dropped the count | Further reading |
| Hot Chips 2026: CUDA targeting RISC-V hosts | unconfirmed (old link was the Chips and Cheese home page); dropped | n/a |
| Taxonomy diagram (APIs, compiler, libraries, tools, DSLs) | carried as the section structure and tables (driver vs runtime API left to the programming-model child) | 1, 7, 8, 9 |
| "Nearly all kernel optimisation is memory optimisation" | verified by measurement (M1 softmax at copy speed; coalescing, tiling) and arithmetic (H100 ridge 295) | 3, 4, 5 |
| Ladder: library, Triton, Gluon, CUDA | kept | 6, interview |
| Megakernel: Cohere Sep 9, 2026, 292 tok/s bs1, 62% SoL, 1.58x vLLM, 256K | **corrected date** to Sep 8, 2026; figures verified; added model (30B, 3.3B active) and GPU (one H100) | 5 |
| ROCm 10.0 released Aug 28, 2026; 7.14 to 10.0 | **corrected date** to Aug 27, 2026 (ROCm blog, Phoronix); jump verified | 10 |
| ROCm 10: 3.3x inference, 2.4x training over ROCm 7 (GLM-5, Kimi-K2.5, DeepSeek-R1-0528) | **unconfirmed**: in neither the ROCm blog nor Phoronix | 10 (marked) |
| ROCm.AI: ROCm CLI, Hyperloom, AMD Skills (Claude, Cursor, Codex) | verified (ROCm blog) | 10 |
| AMD Skills commentary (SKILL.md as procedural anchor, Phi-Bench 5.4%) | dropped: commentary linking other KB pages, not a GPU-programming fact; Phi-Bench figure not checked | n/a |
| CUDA Rust two tracks (cuda-oxide, cutile-rs), details | verified (NVIDIA blog, Sep 8, 2026), quoted | 10 |
| HN 968 points | unconfirmed; dropped | n/a |
| Z.ai infra agent, Dream-RSI (Sep 14, 2026) | unconfirmed; dropped (news, not a mechanism) | n/a |
| Learning path for an RTX 5090 owner | **corrected**: there is no NVIDIA GPU at home; rewritten for the Mac plus rented GPUs (Lambda H100 $3.99/GPU-h, FACTS.md) | 10 |
| `-arch=sm_120` on CUDA 12.8+ | verified (CUDA 12.8 release notes) | 8 |
| Best resources list | all kept, link-checked 2026-10-05 | Further reading |

## The CUDA programming model (`old/01_programming_model.md`)

| Claim | Verdict | Where |
|---|---|---|
| grid > block > warp > thread; up to 1024 threads/block; index idiom | verified (Programming Guide) | 2 |
| Block stays on one SM; blocks independent; RTX 5090 170 SMs | verified (FACTS: 170 SMs) | 2 (stated generally) |
| Clusters since Hopper, distributed shared memory | verified | 2, 7 |
| SIMT; per-thread PCs since Volta | verified (Programming Guide, independent thread scheduling) | 2 |
| Divergence up to 2x for two paths | verified by measurement (M1: 1.86x) | 2 |
| Latency hiding by many warps | verified by measurement (M1 latency sweep) | 2 |
| saxpy kernel, ceil-div grid | replaced by the vector-add kernel compiled in the Compiler explorer | 2 |
| Launch async; cudaGetLastError, compute-sanitizer | carried in part (async, compute-sanitizer); error-checking detail left to child | 1, 9 |
| Launch overhead a few microseconds; CUDA Graphs | verified (NVIDIA CUDA Graphs blog: 2.9 us kernel, 9.6 us with sync, 3.4 us with graphs, V100, 2019) | 1 |
| Streams, events, pinned memory pipelines | streams and events carried; pinned-memory pipeline left to child | 2 |
| Occupancy = resident warps / max (64); limiters; 255 regs, 64K regs | verified (FACTS, Programming Guide) | 2 |
| Matmul/attention at 25-50% occupancy deliberately | kept as the principle; the percentage range unconfirmed and dropped | 2 |
| First-kernel checklist | folded into section 2 and 9 | 2, 9 |

## GPU memory hierarchy (`old/02_memory_hierarchy.md`)

| Claim | Verdict | Where |
|---|---|---|
| Levels table with RTX 5090 numbers (255 regs, 256 KB file, 128 KB L1/smem, ~100 KB smem, 96 MB L2, 1.79 TB/s) | verified (FACTS, Programming Guide); table now H100, 5090 in the note | 3 |
| Latencies ~20-30, ~200, ~400-800 cycles | **corrected** to measured H800 values: smem 29.0, L1 40.7, L2 263.0, global 478.8 (Luo et al. Table IV) | 3 |
| PCIe 5 x16 ~64 GB/s | left to Topic: hardware (interconnects) | n/a |
| Spilling to local memory | verified by real compile (k10_spill: 255 regs, 1760 B spill stores) | 3 |
| Coalescing, 32-128 B transactions | refined: 32-byte sectors (Best Practices Guide); measured on M1 | 3 |
| Boehm coalescing step ~300 to ~2000 GFLOP/s | verified (309.0 to 1986.5) | 4 |
| float4, SoA vs AoS | float4 carried (section 4, 8); SoA left to child | 4 |
| 32 banks x 4 B, padding [32][33], swizzles, TMA | verified; measured on M1 | 3, 7 |
| Roofline, ridge ~59 FLOP/B FP32 on 5090 | roofline owned by Topic: hardware; ridge 295 for H100 BF16 used here (derived) | 3, 5 |
| Elementwise AI < 1, softmax a few, matmul grows with N | verified (derived) | 3, interview |
| Tiling: shared then register tiles, cp.async/TMA pipelines | verified; animated | 3, 4, 7 |
| ncu metrics names for coalescing and banks | carried (from docs, not run) | 9 |
| ~1.6-1.7 TB/s achievable on 5090 | unconfirmed (no measurement found); dropped | n/a |

## Writing kernels (`old/03_writing_kernels.md`)

| Claim | Verdict | Where |
|---|---|---|
| Boehm ladder: kernel 6 81%, kernel 9 94%, kernel 10 94% | **corrected**: 78.4%, 84.8%, 93.7% (worklog table) | 4 (correction box) |
| Reductions: grid-stride, shuffles, smem, CUB | verified; carried briefly | 4 |
| Online softmax (Milakov and Gimelshein 2018), formula | verified (arXiv 1805.02867) | 4 |
| Fusion: when it wins and loses | kept | 5 |
| FlashAttention ideas, O(N) memory, 2-4x | verified against the paper's abstract (15% BERT-large, 3x GPT-2, 2.4x LRA) and IO bound | 5 |
| FA2, FA3 (Hopper, wgmma, TMA), Blackwell via cuDNN/CUTLASS | **updated**: FlashAttention-4 in CuTe DSL for Hopper and Blackwell (repo README) | 5 |
| cuda-oxide paragraph | verified (NVIDIA blog) | 10 |
| Project ladder for the dual-5090 box | **corrected** (no such box); folded into the learning path | 10 |

## Triton (`old/04_triton.md`)

| Claim | Verdict | Where |
|---|---|---|
| Program instance = block; idioms (program_id, arange, mask, load/store, dot, autotune) | verified; softmax shown from the Compiler explorer source | 6 |
| What you give up | kept | 6 |
| 0-20% of CUDA, ~10x fewer lines | unconfirmed (see root) | 6 |
| Releases 3.7.0 May, 3.7.1 June; 3.8 scheduled late August | **updated**: 3.8.0 released Aug 28, 2026 | 6 |
| SGLang v0.5.18 pins 3.7.1 | unconfirmed; dropped | n/a |
| Hardware support Ampere to Blackwell, AMD, Intel | verified for targets compiled here (sm_80, sm_90a, sm_100a, sm_120a) | 6 |
| Gluon description | verified (Gluon tutorial 01 quote) | 6 |
| NVIDIA CUDA Tile IR backend for Triton | unconfirmed; dropped (the cutile-rs Tile IR fact is verified) | n/a |
| cutile-rs paragraph | verified | 10 |
| Learning path | merged into section 10 | 10 |

## Profiling and tools (`old/05_profiling.md`)

| Claim | Verdict | Where |
|---|---|---|
| nsys vs ncu vs torch.profiler vs CUPTI; compute-sanitizer | verified (docs) | 9 |
| ncu metric table | carried (docs, not run) | 9 |
| ncu locks clocks to base by default | **corrected**: default `--clock-control boost`, `--cache-control all` (Nsight Compute CLI docs v2026.3.1) | 9 |
| Benchmark methodology (events, warmup, clocks, L2, baselines, graphs, env log) | kept; illustrated by the M1 load episode | 9 |
| `do_bench` has `flush_l2=True` | **corrected**: no such argument; it clears L2 before each run and returns the mean by default (triton/testing.py) | 9 |
| Hyperloom, Dream-RSI, Phi-Bench commentary | Hyperloom verified (section 10); the rest unconfirmed, dropped | 10 |

## CUTLASS, cuBLAS, cuDNN, tensor cores (`old/06_cutlass_cublas_cudnn_tensor_cores.md`)

| Claim | Verdict | Where |
|---|---|---|
| Library table | kept, condensed; NCCL added as an API | 7 |
| Generations: Ampere mma.sync/cp.async; Hopper wgmma/TMA/clusters; Blackwell tcgen05/TMEM | verified (PTX ISA 9.4, real compiles) | 7 |
| RTX 5090: no TMEM, tcgen05, wgmma; has TMA and clusters; wgmma.fence will not assemble | verified by real compile (CUDA 13.4.2) | 7 |
| Ada FP8 code generally ports to sm_120 | partly verified: FP8 mma.sync is native QMMA on sm_120 (and errors on sm_80 "requires sm_89"); new finding: emulated on sm_90a and sm_100a | 7 |
| "Generations" vs compute capability trap; `a` suffix | kept | 7, 8 |
| CuTe in one paragraph | condensed into the library table; depth left to the child | 7 |
| Practical guidance (baseline against cuBLASLt, MoE grouped GEMM) | kept briefly | 7, 10 |

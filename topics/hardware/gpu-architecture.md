# GPU architecture: Ampere to Blackwell

⏱ 7 min read · +3h 25m resources

Last updated: 2026-08-24.

## Best resources

- [Modal GPU Glossary](https://modal.com/gpu-glossary/readme) (docs, ~30 min for the core pages): the fastest way to nail every term below (SM, warp, occupancy, TMA, ...)
- [How To Scale Your Model: GPUs chapter](https://jax-ml.github.io/scaling-book/gpus/) (~1h): GPU rooflines and networking from a systems view
- [NVIDIA H100 whitepaper](https://resources.nvidia.com/en-us-tensor-core) (~45 min) and [Blackwell architecture page](https://www.nvidia.com/en-us/data-center/technologies/blackwell-architecture/) (~15 min): primary sources for the numbers
- [Chips and Cheese: Blackwell coverage](https://chipsandcheese.com/) (~30 min per deep dive): independent microarchitecture analysis
- [Making Deep Learning Go Brrrr From First Principles](https://horace.io/brrr_intro.html) (25 min) (Horace He): why the memory subsystem, not FLOPs, usually rules

## The execution model in one paragraph

A GPU is a grid of **Streaming Multiprocessors (SMs)**: 108 on A100, 132 on H100,
148 per die on B200, 170 on the RTX 5090. Each SM has 4 processing blocks, each
with a **warp scheduler** that every cycle picks one ready **warp** (32 threads
executing in lockstep, SIMT) and issues its next instruction. Latency is hidden by
oversubscription, not caches: an SM keeps up to 64 warps resident and swaps between
them for free, so while one warp waits ~400 cycles on a DRAM load, others compute.
This is why occupancy and coalesced memory access matter, and why branch divergence
inside a warp halves throughput. Per SM you also get tensor cores (4), a register
file (256 KB), and a software-managed **shared memory / L1** slab (up to 228 KB on
Hopper); all SMs share an L2 (50 MB on H100) in front of DRAM.

## Tensor cores, generation by generation

Tensor cores are small matrix-multiply-accumulate units; each generation widens the
matrix operation and adds cheaper number formats.

| Gen | Arch | New formats | New machinery |
|---|---|---|---|
| 3rd | Ampere (A100) | TF32, BF16, structured 2:4 sparsity | `mma.sync` warp-level MMA, `cp.async` (global -> shared without registers) |
| 4th | Hopper (H100) | FP8 (E4M3/E5M2) + Transformer Engine | **TMA**, **wgmma**, thread block clusters + distributed shared memory |
| 4th (consumer) | Ada (4090) | FP8 | no TMA/wgmma; Ampere-style `mma` |
| 5th | Blackwell DC (B200) | FP4/FP6 (microscaling MXFP4, NVFP4) | `tcgen05.mma`, **TMEM** (dedicated 256 KB tensor memory per SM), 2nd-gen Transformer Engine |
| 5th (consumer) | Blackwell GeForce (5090, sm_120) | FP4, FP8 | TMA available, but no TMEM/tcgen05; kernels look Ada-like |

Key Hopper machinery, because it defines how modern kernels (FlashAttention-3,
CUTLASS, DeepGEMM) are written:

- **TMA (Tensor Memory Accelerator)**: a per-SM DMA engine that copies
  multidimensional tiles between global and shared memory from a compact
  descriptor. One thread issues the copy asynchronously; no more warps burning
  issue slots on address arithmetic. Enables true producer/consumer
  (warp-specialised) pipelines.
- **wgmma (warpgroup MMA)**: asynchronous matrix multiply issued by a warpgroup
  (4 warps, 128 threads) that reads operands directly from shared memory. Hopper's
  peak FP8/BF16 throughput is only reachable via wgmma, not the old mma path.
- **Thread block clusters**: several blocks co-scheduled on adjacent SMs can read
  each other's shared memory (DSMEM), giving a new locality tier between SM and L2.

Blackwell datacenter replaces the wgmma register-heavy dance with `tcgen05`: MMA
accumulates into TMEM instead of the register file, freeing registers for the
epilogue, and a single MMA can span 2 SMs. FP4 with per-block scale factors
(NVFP4: FP8 scale per 16 values) doubles throughput again over FP8 and is the
format inference on Blackwell/Rubin is standardising on.

## Memory subsystem: HBM vs GDDR

- **HBM** (A100/H100/B200, MI300X, TPUs): DRAM dies stacked next to the GPU on a
  silicon interposer, very wide (1024-bit per stack) and relatively slow-clocked.
  Capacity and bandwidth scale with stack count: H100 3.35 TB/s (HBM3), H200 4.8
  TB/s (HBM3e), B200 8 TB/s, Rubin moves to HBM4 (~13 TB/s class). Expensive
  (advanced packaging is the industry bottleneck), power-efficient per byte.
- **GDDR** (GeForce): discrete chips around the board on a narrower bus, clocked
  very high. The 5090's GDDR7 on a 512-bit bus hits 1.79 TB/s, remarkable for
  non-stacked memory, but capacity tops out (32 GB) and there is no ECC by default.

Bandwidth is the number to memorise, because decode-phase inference and most
pointwise ops are bandwidth bound: the ratio peak FLOPs / peak bytes (arithmetic
intensity needed to be compute bound) is ~295 for H100 BF16 and rising every
generation; see [performance-math.md](performance-math.md).

## NVLink across generations

Per-GPU aggregate bidirectional bandwidth: A100 (NVLink 3) 600 GB/s, H100
(NVLink 4) 900 GB/s, B200/B300 (NVLink 5) 1.8 TB/s. With NVSwitch this is
all-to-all within the domain: 8 GPUs in an HGX box, 72 in a GB200/GB300 NVL72
rack (130 TB/s aggregate). GeForce cards since the 4090 have no NVLink at all:
Khalid's dual 5090s talk over PCIe 5.0 x16, ~64 GB/s per direction, roughly 28x
less than one H100's NVLink. Consequence: across the pair, prefer data or
pipeline parallelism over tensor parallelism (see
[interconnects-and-scaling.md](interconnects-and-scaling.md)).

## RTX 5090 vs H100 SXM in concrete numbers

| Metric | RTX 5090 | H100 SXM | Ratio |
|---|---|---|---|
| SMs / CUDA cores | 170 / 21,760 | 132 / 16,896 | 1.3x |
| BF16 tensor dense | ~210 TFLOPS (FP32 accumulate, GeForce half-rate) | 989 TFLOPS | 0.2x |
| FP8 dense | ~419 TFLOPS | 1,979 TFLOPS | 0.2x |
| FP4 dense | ~838 TFLOPS | n/a (no FP4) | - |
| Memory | 32 GB GDDR7 | 80 GB HBM3 | 0.4x |
| Bandwidth | 1.79 TB/s | 3.35 TB/s | 0.53x |
| Interconnect | PCIe 5.0 (64 GB/s) | NVLink 4 (900 GB/s) | 0.07x |
| TDP | 575 W | 700 W | - |

Reading of the table: for single-GPU, bandwidth-bound inference of models that fit
in 32 GB, the 5090 is genuinely about half an H100, and with FP4 quantisation it
can punch above that. For training it is much further behind: GeForce parts run
FP16/BF16 tensor math with FP32 accumulation at half rate, there is no NVLink for
tensor parallelism, and 32 GB caps model plus optimiser state. Dual 5090s are best
treated as: 64 GB total, DP/PP across PCIe, FP8/FP4 inference monsters, and a
perfect kernel-dev target for sm_120 (see
[../cuda-and-gpu-programming/](../cuda-and-gpu-programming/)).

## Datacenter line quick reference

| Chip | Year | Memory | BW | Dense BF16 / FP8 / FP4 | Power |
|---|---|---|---|---|---|
| A100 | 2020 | 80 GB HBM2e | 2.0 TB/s | 312 / - / - TFLOPS | 400 W |
| H100 SXM | 2022 | 80 GB HBM3 | 3.35 TB/s | 989 / 1,979 / - | 700 W |
| H200 | 2024 | 141 GB HBM3e | 4.8 TB/s | 989 / 1,979 / - | 700 W |
| B200 | 2024-25 | 192 GB HBM3e | 8 TB/s | 2,250 / 4,500 / 9,000 | 1,000 W |
| B300 (Ultra) | 2025 | 288 GB HBM3e | 8 TB/s | FP4 dense 15 PFLOPS | 1,400 W |
| Rubin | H2 2026 | 288 GB HBM4 | ~13 TB/s | ~50 PFLOPS NVFP4 (inference) | higher |

B200 is two reticle-limit dies joined by a 10 TB/s die-to-die link (NV-HBI),
presenting as one GPU: the first mainstream chiplet NVIDIA GPU. Blackwell Ultra
(B300) trades some FP64/INT for 50% more FP4 and 288 GB. Vera Rubin (Vera CPU +
Rubin GPU, NVL144 racks) entered production mid-2026.

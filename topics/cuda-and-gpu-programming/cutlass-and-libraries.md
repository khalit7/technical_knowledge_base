# CUTLASS, cuBLAS, cuDNN, and tensor cores

*Last updated: 2026-08-24*

## Best resources

- [CUTLASS documentation](https://docs.nvidia.com/cutlass/) and [NVIDIA/cutlass](https://github.com/NVIDIA/cutlass): docs for 4.x cover both the C++ templates and the Python CuTe DSL, including tcgen05 programming guides.
- [Colfax Research CUTLASS tutorial series](https://research.colfax-intl.com/blog/): the best written explanations of CuTe layouts, Hopper wgmma/TMA pipelines, and FlashAttention-3 style kernels.
- [GPU MODE lectures on CUTLASS and CuTe](https://github.com/gpu-mode/lectures) (several, including ones by CUTLASS developers).
- [cuBLAS docs](https://docs.nvidia.com/cuda/cublas/) (esp. the cuBLASLt section) and [cuDNN docs](https://docs.nvidia.com/deeplearning/cudnn/) (the graph API is the modern interface).
- [PTX ISA guide](https://docs.nvidia.com/cuda/parallel-thread-execution/) for mma/wgmma/tcgen05 instruction semantics when you need ground truth.

## The library landscape: when to use which

| Layer | What | Use when |
|---|---|---|
| cuBLAS | Closed-source BLAS; `cublasGemmEx` etc. | Default GEMM; what `torch.matmul` calls. Fastest with zero effort for standard shapes/dtypes |
| cuBLASLt | Lightweight cuBLAS layer: explicit descriptors, heuristic search, **epilogue fusion** (bias, GELU/ReLU, dGELU, aux outputs), FP8/FP4 scaling modes | Standard GEMM + a fusable epilogue; quantised GEMMs. PyTorch uses it for addmm/FP8 (`_scaled_mm`) |
| cuDNN | Conv, attention (SDPA/flash), norms; **graph API** describes an op graph, backend picks/fuses engines | Convs, and the fastest attention on datacenter GPUs; backend of `F.scaled_dot_product_attention` on Hopper/Blackwell |
| CUTLASS (C++) | Open-source template library of GEMM/conv/attention building blocks; you instantiate and tune | Custom GEMM variants libraries do not cover: new dtypes, fused mainloops, grouped/MoE GEMM, custom epilogues; also the reference for how peak kernels work |
| CuTe | CUTLASS 3+ core abstraction: `Layout` (shape:stride algebra) and `Tensor`, plus MMA/Copy "atoms" | The vocabulary everything modern is written in; learn it to read CUTLASS |
| CUTLASS 4.x Python DSLs / CuTe DSL | Author CuTe kernels in Python, JIT-compiled, near-parity performance with C++, integrates with PyTorch via DLPack | Prototyping peak-performance kernels without the C++ template compile-time pain; how new NVIDIA example kernels ship since 2025 |
| Thrust / CUB / libcudacxx (now unified as **CCCL**) | STL-like host algorithms (thrust), block/device primitives (cub: reductions, scans, sorts, `BlockLoad`), `cuda::std` | Never hand-write a reduction/scan/sort in production; cub's primitives are tuned per architecture |
| Triton / Gluon | See [triton-language.md](triton-language.md) | The pragmatic middle for custom ML kernels |

Decision rule: torch.compile/cuBLAS/cuDNN first; Triton for custom fusion; CUTLASS/CuTe
(DSL) when the kernel is GEMM-shaped and must hit >90% of peak or use features Triton
does not expose; raw PTX inline asm essentially never (read it, rarely write it).

## Tensor cores, practically

Tensor cores are matrix-multiply units: each instruction computes a small tile MMA
(e.g. 16x8x16) per warp or larger. You never index them directly; you reach them via
(descending abstraction): cuBLAS/cuDNN -> Triton `tl.dot` -> CUTLASS/CuTe atoms ->
`wmma` (portable but slow, ignore) -> PTX `mma.sync` / `wgmma` / `tcgen05.mma`.

What changed per generation (matters for reading kernels and docs):

- **Ampere (sm_80)**: warp-level `mma.sync` on registers; `cp.async` for global->smem
  copies enabling software pipelining. FP16/BF16/TF32/INT8.
- **Hopper (sm_90a)**: `wgmma`: asynchronous warpgroup-level MMA (4 warps cooperating),
  operands read directly from shared memory; **TMA** (Tensor Memory Accelerator), a DMA
  engine doing bulk async tiled global<->smem copies with hardware swizzling from a
  descriptor; thread block clusters + distributed smem. Enables warp-specialised
  producer/consumer kernels (FlashAttention-3, modern CUTLASS mainloops) where some
  warps only feed TMA and others only issue wgmma. FP8 (E4M3/E5M2) arrives.
- **Datacenter Blackwell (sm_100/sm_103, B200/B300/GB200)**: `tcgen05` instructions: the
  tensor core becomes a per-SM asynchronous unit ("5th gen") with its own **TMEM**
  (tensor memory) for accumulators instead of registers; single thread issues the MMA;
  pair-SM MMA across 2 SMs; native MXFP8/MXFP6/**MXFP4** block-scaled formats (2nd-gen
  Transformer Engine). CUTLASS 4.x and the CuTe DSL are the practical way to program
  this; Triton reaches it through its Blackwell backend and Gluon exposes TMEM directly.
- **Consumer Blackwell (sm_120, RTX 5090/GB202)**, directly relevant to Khalid's box:
  **no TMEM, no tcgen05, and no wgmma** (Hopper's wgmma does not exist off sm_90a
  either; `wgmma.fence` will not even assemble for sm_120). Consumer Blackwell uses the
  Ampere-lineage `mma.sync` model, extended with FP8/FP6/FP4 dtypes, and it does have
  TMA and clusters. Practical upshot: 5090 kernels look like Ada/Ampere kernels
  (register accumulators, `cp.async`/TMA pipelines, `mma.sync`); CUTLASS sm_120
  collections and Triton handle this automatically, but Hopper-specific tutorials
  (wgmma warp-specialisation) do not literally run on it. FP4 GEMMs on sm_120 are real
  and fast (this is what DGX Spark / RTX Pro Blackwell also use); Ada-targeted FP8 code
  generally ports.

Nomenclature trap: "generations" of tensor cores (4th = Hopper, 5th = datacenter
Blackwell) do not map to compute capability numbers; and `sm_90a`/`sm_100a`
architecture-specific suffixes are required to compile the accelerated instructions.

## CuTe in one paragraph

CuTe reduces every tiling/threading question to layout algebra: a `Layout` maps logical
coordinates to offsets via (shape, stride), layouts compose and divide, and the same
algebra describes a global tile, a swizzled smem layout, a thread mapping, or an MMA
atom's operand fragment. Once internalised, a CUTLASS kernel reads as: partition tensors
by tiles (`local_tile`), partition tiles across threads/atoms (`local_partition`,
`ThrMMA`), then `copy` and `gemm` on the pieces; correctness of the plumbing is enforced
by the algebra. This is the main learning investment in modern NVIDIA kernel work, and
the CuTe DSL makes it explorable interactively from Python. Start with the Colfax series
and CUTLASS's `examples/cute/tutorial`.

## Practical guidance for the fused-kernel project

- Baseline every GEMM idea against cuBLASLt with the appropriate epilogue before writing
  anything; it is often already fused.
- For attention on the 5090, `F.scaled_dot_product_attention` picks flash/cuDNN backends;
  beat it only with a genuinely different algorithm, not a re-implementation.
- Grouped GEMM (MoE), dequant-fused GEMM, and block-scaled FP8/FP4 experiments are the
  areas where custom CUTLASS/CuTe-DSL work still pays visibly in 2026.
- Cross-reference: [hardware topic](../hardware/summary.md) for Blackwell architecture
  detail; [inference-and-serving](../inference-and-serving/summary.md) for where these
  kernels land in production stacks.

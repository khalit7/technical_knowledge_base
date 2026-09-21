# GPU memory hierarchy

⏱ 8 min read · +5h 40m resources

*Last updated: 2026-08-24*

### Best resources

- [Horace He, Making Deep Learning Go Brrrr From First Principles](https://horace.io/brrr_intro.html) (25 min): the canonical explanation of compute-bound vs memory-bound vs overhead-bound for ML people.
- PMPP 5th ed, ch. 5-6 (~60 pages, 1h 30m): memory architecture and tiling; the tiled matmul derivation everyone learns from.
- [Simon Boehm's matmul worklog](https://siboehm.com/articles/22/CUDA-MMM) (1h 30m): coalescing, shared memory, and tiling with measured numbers at each step.
- [CUDA C++ Best Practices Guide, memory optimizations](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/#memory-optimizations) (45 min): coalescing and bank conflict reference.
- [Modal GPU Glossary](https://modal.com/gpu-glossary) (~45 min): definitions with die-shot-level accuracy.
- Roofline model: Williams, Waterman, Patterson, ["Roofline: an insightful visual performance model"](https://dl.acm.org/doi/10.1145/1498765.1498785) (45 min, CACM 2009).

### The levels

From fastest/smallest to slowest/largest (RTX 5090 / GB202 numbers where they matter):

| Level | Scope | Size | Bandwidth / latency ballpark |
| --- | --- | --- | --- |
| Registers | per thread | 255 regs/thread, 256 KB/SM file | ~fastest, ~1 cycle |
| Shared memory / L1 | per block / per SM | up to 128 KB unified per SM, ~100 KB usable as shared | ~20-30 cycles, TB/s per SM |
| L2 cache | whole GPU | 96 MB on GB202 (huge vs 72 MB on 4090-class) | ~200 cycles |
| HBM / GDDR7 | whole GPU | 32 GB on 5090 | ~1.79 TB/s, ~400-800 cycles |
| Host RAM over PCIe | system | large | ~64 GB/s (PCIe 5.0 x16), microseconds |

The two order-of-magnitude gaps that drive all kernel design: registers/shared vs HBM

bandwidth, and on-chip vs off-chip latency. **Spilling** (compiler running out of

registers, pushing values to "local memory", which physically lives in HBM/L2) silently

turns register traffic into global traffic; watch for it in `ptxas -v` output or Nsight.

Shared memory is explicitly managed scratchpad (`__shared__` arrays, or dynamic via the

third launch parameter), carved from the same physical SRAM as L1. It is the only place

where threads of a block can cheaply exchange data, always paired with `__syncthreads()`.

### Coalescing

A warp's 32 loads are serviced as memory transactions of 32-128 bytes. If the 32

addresses fall in a small number of aligned segments (ideal: 32 consecutive floats = 128

bytes = minimal transactions), the access is **coalesced** and you get full bandwidth.

Strided or scattered access multiplies the number of transactions and can cut effective

bandwidth by 10-30x.

Rules of thumb:

- Make `threadIdx.x` index the fastest-varying (contiguous) dimension. For row-major
  `A[row][col]`, consecutive threads should read consecutive `col`.

- This is the very first fix in the matmul worklog: swapping which index maps to
  threadIdx.x took the naive kernel from ~300 GFLOPs to ~2000 on an A6000.

- Vectorised access (`float4`, 128-bit loads) improves bandwidth further and reduces
  instruction count; requires 16-byte alignment.

- Structure-of-arrays beats array-of-structures on GPUs for exactly this reason.

### Shared memory bank conflicts

Shared memory is divided into 32 banks, 4 bytes wide, interleaved. If the threads of a

warp access 32 different banks (or all read the same address: broadcast), the access takes

one cycle. If k threads hit different addresses in the same bank, the access serializes

k-way. Classic trigger: column access into a `__shared__ float tile[32][32]`, where a

whole warp hits bank `col % 32`. Classic fix: pad to `tile[32][33]`, or use swizzled

layouts (what CUTLASS does, and what TMA does in hardware on Hopper/Blackwell).

### Arithmetic intensity and the roofline model

**Arithmetic intensity (AI)** = FLOPs performed / bytes moved from memory. Every kernel

has one; every GPU has a critical ratio: peak FLOPs / peak bandwidth (the "ridge point").

- Roofline: attainable FLOPs = min(peak FLOPs, AI x peak bandwidth). Plot FLOPs vs AI:
  a slanted bandwidth roof meeting a flat compute roof.

- RTX 5090 ballpark: ~105 TFLOPs FP32 dense (much more with tensor cores in BF16/FP8/FP4)
  over 1.79 TB/s, so the FP32 ridge point is ~59 FLOPs/byte; for BF16 tensor-core math

  the required intensity is several hundred FLOPs/byte.

- Elementwise ops (add, GELU, residual): AI < 1. Hopelessly memory-bound; the only
  optimisation is to move fewer bytes, i.e. fuse.

- Softmax, layernorm, reductions: AI ~ a few. Memory-bound; aim for reading the data
  exactly once.

- Matmul (N x N): 2N^3 FLOPs over 3N^2 values; AI grows with N. Large matmuls are
  compute-bound, which is why they are the only ops that can saturate tensor cores, and

  why "keep the matmuls big and fuse everything around them" is the house style of

  modern ML systems.

Horace He's framing: kernels are compute-bound, memory-bound, or overhead-bound (launch

and Python overhead). Diagnose which regime you are in before optimising anything.

### Why matmul tiling works

Naive matmul: each thread computes one C element, reading a full row of A and column of B

from global memory; every A and B element is fetched N times. AI per global byte stays

tiny, so the kernel sits on the bandwidth roof despite matmul's intrinsic compute-bound

nature.

Tiling restores the intrinsic arithmetic intensity by staging reuse in fast memory:

1. **Shared memory tiling**: each block loads a BM x BK tile of A and BK x BN tile of B
   into shared memory (coalesced, each element loaded once per tile pass), syncs, and

   computes partial products from shared. Global traffic drops by a factor of the tile

   size (e.g. 32x fewer HBM reads for 32-wide tiles).

2. **Register tiling**: each thread computes a TM x TN micro-tile of C held in registers,
   reading tile fragments from shared into registers and doing TM x TN FMAs per pair of

   loads. This raises the FLOPs per shared-memory byte, because shared bandwidth becomes

   the next bottleneck after global bandwidth.

3. The hierarchy mirrors the memory hierarchy exactly: HBM -> shared (block tile) ->
   registers (thread tile) -> accumulators. Tensor-core kernels (CUTLASS, Triton's

   `tl.dot`) keep the same structure with mma instructions at the bottom and asynchronous

   copies (`cp.async` on Ampere+, TMA on Hopper/Blackwell) feeding the tiles in a

   software pipeline so loads for tile k+1 overlap math on tile k.

The same "load a tile into fast memory, do all the math it supports, write once" logic is

FlashAttention's entire trick, applied to attention instead of GEMM: see [Writing kernels: the practical track](writing-kernels.md) and [FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness](../../papers/2022-05_flashattention/summary.md).

### Practical diagnostics

- Nsight Compute "Speed of Light" section: % of peak memory vs compute tells you your
  roofline position immediately (details in [Profiling and tools](profiling-and-tools.md)).

- Effective bandwidth check: bytes you logically need to move / kernel time; compare to
  ~1.6-1.7 TB/s achievable on a 5090. Within ~80% of peak: stop optimising a

  memory-bound kernel, start fusing.

- `ncu` metrics for coalescing: `l1tex__average_t_sectors_per_request` (ideal 4 for
  32-bit accesses); for bank conflicts: `l1tex__data_bank_conflicts_pipe_lsu_mem_shared`.

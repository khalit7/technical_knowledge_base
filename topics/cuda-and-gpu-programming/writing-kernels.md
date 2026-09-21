# Writing kernels: the practical track

⏱ 8 min read · +9h 45m resources

*Last updated: 2026-08-24*

### Best resources

- [Simon Boehm, How to Optimize a CUDA Matmul Kernel for cuBLAS-like Performance: a Worklog](https://siboehm.com/articles/22/CUDA-MMM) (1h 30m, 2022/2023): the canonical worked example; 10 kernels from naive to ~94% of cuBLAS SGEMM. Read it, then reproduce it.
- [salykova, Advanced Matrix Multiplication Optimization on NVIDIA GPUs](https://salykova.github.io/sgemm-gpu) (1h 30m): the modern sequel; beats cuBLAS SGEMM on a 4090 and covers vectorisation, double buffering, and autotuning.
- [Mark Harris, Optimizing Parallel Reduction in CUDA](https://developer.download.nvidia.com/assets/cuda/files/reduction.pdf) (45 min): the classic 7-step reduction deck; still the best mental warm-up for memory-bound kernels.
- PMPP 5th ed (~90 pages, 2h 15m): ch. 6 (tiled matmul), ch. 10-11 (reduction, scan), later chapters for patterns.
- [GPU MODE lectures](https://github.com/gpu-mode/lectures) (~3h for lectures 8 and 12): lecture 8 (CUDA performance checklist), lecture 12 (FlashAttention), plus guest lectures by kernel authors.
- [FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness](../../papers/2022-05_flashattention/summary.md) (Dao et al., 2022) and [flash-attention repo](https://github.com/Dao-AILab/flash-attention) (repo, ~45 min for the entry path).

### The matmul ladder (memorise this progression)

Simon Boehm's worklog is the standard curriculum. The kernels, and the lesson each one

teaches (his A6000 numbers; expect higher absolute FLOPs but the same ratios on a 5090):

| Step | Kernel | Lesson | ~% of cuBLAS |
| --- | --- | --- | --- |
| 1 | Naive (1 thread = 1 output) | baseline; 300 GFLOPs | 1.3% |
| 2 | Global memory coalescing | map threadIdx.x to contiguous dim; ~8x | 8% |
| 3 | Shared memory tiling | stage block tiles in smem; reuse | 13% |
| 4 | 1D thread tiling (TM results/thread) | more work per thread, registers | 37% |
| 5 | 2D thread tiling (TM x TN) | register micro-tiles, outer-product FMAs | 69% |
| 6 | Vectorised loads (float4) | 128-bit transactions, transpose A into smem | 81% |
| 9 | Autotuned tile sizes | search BM/BN/BK/TM/TN per GPU | 94% |
| 10 | Warp tiling | third tiling level, sets up tensor-core layout | 94% |

Key takeaways beyond the numbers: each step is motivated by profiling the previous one

(the bottleneck moves: global bandwidth -> smem bandwidth -> instruction issue); optimal

parameters are hardware-specific, hence autotuning; and the final structure (block tile ->

warp tile -> thread tile) is exactly CUTLASS's decomposition, so this exercise is also

the on-ramp to reading CUTLASS and to tensor-core kernels. For the tensor-core and

double-buffering continuation, follow salykova's post.

### Reductions

The other foundational pattern: N values -> 1 (sums, max, norms; the inner loop of

softmax, layernorm, losses). Modern recipe:

1. Grid-stride loop: each thread accumulates a private partial over strided global reads
   (coalesced, arbitrary N).

2. Warp-level reduction with shuffles: `val += __shfl_down_sync(0xffffffff, val, offset)`
   for offset = 16,8,4,2,1. No shared memory, no sync, 5 instructions.

3. One partial per warp into shared memory, `__syncthreads()`, first warp reduces those.
4. One partial per block, then either a second tiny kernel, or `atomicAdd` (fine for
   float sums at low contention), or a cooperative-groups grid sync.

Harris's deck walks the historical ladder (interleaved addressing, bank conflicts,

sequential addressing, first-add-during-load, unrolling); the destination is the

shuffle-based version above. In library code just use CUB (`cub::BlockReduce`,

`cub::DeviceReduce`), which is what PyTorch does.

### Softmax and the online trick

Numerically safe softmax needs max, then sum of exp, then divide: naively 3 passes over

the row. The **online softmax** (Milakov and Gimelshein, 2018) fuses max and sum into one

pass by rescaling the running sum when a new max appears:

```javascript
m_new = max(m, x_i);  d = d * exp(m - m_new) + exp(x_i - m_new);  m = m_new
```

One block per row, warp/block reductions for max and sum, one read and one write per

element. This rescaling identity is the load-bearing math inside FlashAttention. Triton

tutorial 02 implements fused softmax in ~30 lines and beats eager PyTorch handily; do it

in both CUDA and Triton once.

### Fused kernels

Fusion = compute several logical ops in one kernel so intermediates stay in

registers/shared memory instead of round-tripping through HBM. When it wins:

- Chains of memory-bound elementwise/normalisation ops (bias + GELU + residual;
  RMSNorm + quantise): bandwidth-limited, so k ops fused ~ k-fold speedup.

- Epilogue fusion: apply bias/activation/scale while C tiles are still in registers at
  the end of a GEMM (cuBLASLt epilogues, CUTLASS epilogue visitor trees, Triton matmul

  with a fused epilogue).

- Kernel-launch-bound sequences of tiny ops (also fixable with CUDA graphs).
When it loses: fusing two compute-bound GEMMs rarely helps (tensor cores already

saturated, register pressure hurts); and torch.compile already does elementwise and

epilogue-adjacent fusion automatically, so measure against a compiled baseline, not eager.

### FlashAttention: the ideas above, composed

Standard attention materialises the N x N score matrix S = QK^T and P = softmax(S) in

HBM: O(N^2) memory traffic, memory-bound. FlashAttention ([FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness](../../papers/2022-05_flashattention/summary.md)) restructures it as a single fused kernel:

- **Tiling**: loop over K/V block-tiles held in shared memory against a Q tile; compute
  S-tiles on tensor cores without ever writing S to HBM (matmul tiling, applied twice).

- **Online softmax**: maintain running row-max m and normaliser d per Q row, rescaling
  the output accumulator when m updates, so softmax needs no second pass (the reduction

  and online-softmax patterns).

- **Recompute in backward**: store only O, m, d; rebuild S-tiles in the backward pass,
  trading cheap FLOPs for expensive bytes: the fusion trade in its purest form.

Result: O(N) extra memory, HBM traffic cut by ~N/tile-size, wall-clock speedups of 2-4x,

and long-context training made feasible. FlashAttention-2 improved parallelism and warp

partitioning; FA-3 (2024) is a Hopper-specific rewrite using wgmma, TMA, and async

pipelining; Blackwell attention kernels now ship mainly via cuDNN and CUTLASS-based

implementations. The lineage to internalise: every generation is the same three ideas

re-expressed with that architecture's data-movement hardware.

### Suggested project ladder (for the dual-5090 box)

1. Reproduce the matmul worklog through kernel 6 on sm_120; keep a table of GFLOPs and
   ncu bottleneck per step.

2. Reduction and fused softmax in CUDA; match or beat `torch.softmax` for large rows.
3. Same two kernels in Triton; compare source size and performance.
4. A real fusion torch.compile does not already do (e.g. RMSNorm + QKV projection
   epilogue, or dequant + GEMV for a quantised format), benchmarked per [Profiling and tools](profiling-and-tools.md) methodology.

5. Minimal FlashAttention forward in Triton (the official fused-attention tutorial is
   the reference solution); verify against `F.scaled_dot_product_attention`.

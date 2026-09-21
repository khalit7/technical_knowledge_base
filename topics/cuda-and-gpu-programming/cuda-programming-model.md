# The CUDA programming model

⏱ 8 min read · +8h resources

*Last updated: 2026-08-24*

### Best resources

- [CUDA C++ Programming Guide, ch. "Programming Model"](https://docs.nvidia.com/cuda/cuda-c-programming-guide/#programming-model) (~1h): the authoritative reference.
- PMPP 5th ed, ch. 2-4 (~90 pages, 2h 15m): threads, blocks, scheduling; the best pedagogical treatment.
- [GPU MODE lecture 2 (PMPP ch. 1-3)](https://github.com/gpu-mode/lectures) (video, ~1h 30m) and [Christian Mills's lecture notes](https://christianjmills.com/posts/cuda-mode-notes/lecture-002/) (30 min).
- [Modal GPU Glossary](https://modal.com/gpu-glossary) (~45 min): crisp definitions of SIMT, warp, occupancy, etc.
- [CUDA C++ Best Practices Guide](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/) (~2h): the optimisation checklist NVIDIA maintains.

### The hierarchy: grid > block > warp > thread

A kernel launch creates a **grid** of **thread blocks**; each block contains up to 1024

**threads**. You choose both sizes at launch: `kernel<<<gridDim, blockDim>>>(args)`.

Inside the kernel, `blockIdx`/`threadIdx` (each with .x/.y/.z) tell a thread who it is;

the near-universal idiom is `int i = blockIdx.x * blockDim.x + threadIdx.x`.

The hardware mapping is what gives each level its meaning:

- **Thread**: has private registers. Cheap to create; you launch millions.
- **Warp**: 32 consecutive threads, the actual unit of execution. Not part of the
  original abstract model but essential in practice.

- **Block**: scheduled onto exactly one **SM** (streaming multiprocessor) and stays
  there. Threads in a block share **shared memory** and can synchronise with

  `__syncthreads()`. Blocks must be independent of each other: the runtime may run them

  in any order, on any SM. That independence is what makes CUDA code scale across GPUs

  of different sizes (an RTX 5090 has 170 SMs; the same binary runs on a laptop GPU

  with 20).

- **Grid**: the whole launch. No cheap cross-block sync; a kernel boundary (or
  cooperative groups grid sync, rarely) is the global barrier.

Since Hopper there is an optional level between block and grid: **thread block clusters**,

which let a few blocks on adjacent SMs share each other's shared memory (distributed

shared memory). Useful for advanced kernels; ignore until needed.

### SIMT execution

CUDA is **SIMT**: single instruction, multiple threads. Each warp has one program counter

(pre-Volta) or per-thread PCs with convergence optimisation (Volta+, "independent thread

scheduling"), but the execution units still issue one instruction for the whole warp per

cycle. You write scalar-looking per-thread code; the hardware runs it 32 lanes at a time.

It feels like SIMD without explicit vector types, which is exactly the point.

**Warp divergence**: when threads in the same warp take different branches, the warp

executes both paths serially with lanes masked off. A divergent branch inside a warp can

cost up to 2x (or worse for switch-heavy code); a branch that is uniform per warp (e.g.

`if (blockIdx.x < n)`) costs nothing. Divergence between warps is free. Standard fixes:

arrange data so neighbouring threads take the same path, replace branches with predication

or arithmetic, or pad so boundary checks only diverge in the last warp.

**Latency hiding, not caching**: SMs hide memory latency by having many resident warps

and zero-cost switching between them (all warp state lives in registers permanently, no

context-switch spill). A GPU wants tens of thousands of threads in flight; this is why

"not enough parallelism" is a first-order performance failure.

### Kernel launch and execution

```javascript
__global__ void saxpy(int n, float a, const float* x, float* y) {
    int i = blockIdx.x * blockDim.x + threadIdx.x;
    if (i < n) y[i] = a * x[i] + y[i];
}
// host:
int block = 256;
int grid  = (n + block - 1) / block;   // ceil-div, the universal pattern
saxpy<<<grid, block>>>(n, 2.0f, d_x, d_y);
```

Key facts:

- Launches are **asynchronous**: the host call returns immediately. Errors surface later;
  check with `cudaGetLastError()` after launch and `cudaDeviceSynchronize()` when

  debugging (or run under `compute-sanitizer`).

- `__global__` marks a kernel (runs on device, called from host); `__device__` functions
  are device-side helpers; `__host__ __device__` compiles for both.

- Launch overhead is a few microseconds; a kernel that runs 5 us is dominated by launch
  cost. This is the motivation for fusion and for CUDA Graphs (record a DAG of launches,

  replay with near-zero CPU overhead; what vLLM and torch.compile use for decode).

### Streams and asynchrony

A **stream** is an ordered queue of GPU work. Operations in one stream serialize;

operations in different streams may overlap (kernel with kernel, kernel with copy).

Default usage patterns:

- Everything on the default stream: fine for learning and for most single-model training.
- Overlap H2D copy / compute / D2H copy with 2-3 streams plus `cudaMemcpyAsync` and
  pinned host memory (`cudaMallocHost`); this is the classic pipeline.

- **Events** (`cudaEvent_t`) do cross-stream ordering (`cudaStreamWaitEvent`) and GPU-side
  timing (`cudaEventElapsedTime`).

- PyTorch runs one compute stream per device by default; NCCL comms run on separate
  streams so communication overlaps backward compute.

### Occupancy

**Occupancy** = resident warps per SM / hardware maximum (64 warps per SM on recent

architectures). It is limited by whichever runs out first: registers per thread (255 max;

the SM register file is 64K 32-bit registers), shared memory per block, threads per block,

or the blocks-per-SM cap. `cudaOccupancyMaxActiveBlocksPerMultiprocessor` or Nsight

Compute's occupancy section shows which limiter binds.

The correct mental model: occupancy is a means (enough warps to hide latency), not an

end. Memory-bound kernels usually want high occupancy; register-heavy compute-bound

kernels (matmul, attention) deliberately run at 25-50% occupancy because more registers

per thread buys more data reuse than more warps would buy latency hiding. Chasing 100%

occupancy is a classic beginner mistake; measure achieved bandwidth/FLOPs instead.

### Checklist for a first kernel

1. Compute global index with the ceil-div grid pattern; always bounds-check.
2. Block size: 128-256 threads, multiple of 32, tune later.
3. `cudaGetLastError()` after every launch during development.
4. Compile for your GPU: RTX 5090 is `-arch=sm_120` (or `-arch=native`), CUDA 12.8+
   (current toolkit: 13.3).

5. Correctness first against a CPU or PyTorch reference, then profile.
Next: [GPU memory hierarchy](gpu-memory-hierarchy.md), because from here on, performance is mostly a memory story.

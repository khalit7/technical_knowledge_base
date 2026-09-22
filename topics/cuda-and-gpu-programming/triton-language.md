# Triton

⏱ 8 min read · +13h 25m resources

### Best resources

- [Official Triton tutorials](https://triton-lang.org/main/getting-started/tutorials/index.html) (~3h for tutorials 01, 02, 03 and 06): 01 vector add, 02 fused softmax, 03 matmul, 06 fused attention; the core curriculum, each with benchmarks against PyTorch.
- [Triton paper (Tillet et al., MAPL 2019)](https://www.eecs.harvard.edu/~htk/publication/2019-mapl-tillet-kung-cox.pdf) (45 min): the block-level design rationale in 10 pages.
- [GPU MODE lectures](https://github.com/gpu-mode/lectures) (~3h for the two lectures below): lecture 14 (practical Triton), lecture 29 (Triton internals), plus compiler deep dives; recordings on the [GPU MODE YouTube](https://www.youtube.com/@GPUMODE) (the same lectures in video form, ~1h 30m each).
- [triton-lang/triton releases](https://github.com/triton-lang/triton/releases) (20 min): the changelog is the best record of what the compiler can do now.
- [Sasha Rush, GPU Puzzles](https://github.com/srush/GPU-Puzzles) (~3h) and [Triton-Puzzles](https://github.com/srush/Triton-Puzzles) (~3h): learn by solving.

### Programming model: blocks, not threads

A Triton kernel is a Python function (decorated `@triton.jit`) written at the level of a

**program instance**, which corresponds to a CUDA thread block. There are no threads,

warps, shared memory, or `__syncthreads()` in the source; you manipulate blocks of

values (power-of-2-shaped tensors) and the compiler decides the thread mapping, shared

memory staging, vectorisation, and synchronisation.

```python
@triton.jit
def softmax_kernel(x_ptr, y_ptr, stride, n_cols, BLOCK: tl.constexpr):
    row = tl.program_id(0)
    offs = tl.arange(0, BLOCK)
    x = tl.load(x_ptr + row * stride + offs, mask=offs < n_cols, other=-float("inf"))
    x = x - tl.max(x, axis=0)
    num = tl.exp(x)
    y = num / tl.sum(num, axis=0)
    tl.store(y_ptr + row * stride + offs, y, mask=offs < n_cols)
```

The idioms that replace CUDA concepts:

- `tl.program_id(axis)` replaces blockIdx; the launch grid is a Python tuple.
- `tl.arange` + pointer arithmetic + `mask=` replace per-thread indexing and bounds
  checks. Coalescing falls out of contiguous offset math.

- `tl.load`/`tl.store` move blocks between HBM and registers/smem (compiler's choice);
  block pointers / `tl.make_block_ptr` and TMA-backed tensor descriptors handle 2D tiles.

- `tl.dot` is the tensor-core matmul primitive on (M, K) x (K, N) blocks.
- Reductions (`tl.max`, `tl.sum`) work across a block axis; the compiler emits the warp
  shuffles and smem staging you would have hand-written.

- `tl.constexpr` parameters + `@triton.autotune` over configs (block sizes, `num_warps`,
  `num_stages` for software pipelining) replace hand-tuning tile sizes.

What you give up: warp-level control, explicit shared-memory layouts, fine-grained async

(the compiler schedules `cp.async`/TMA for you), and non-power-of-2 block shapes. For

roughly 90% of ML kernels this trade is free performance-per-effort; a competent Triton

matmul or attention kernel typically lands within 0-20% of expert CUDA, in ~10x fewer

lines, and is portable to AMD (Triton has first-class ROCm and Intel XPU backends; it is

the kernel layer of PyTorch on all three).

### When Triton vs raw CUDA vs torch.compile

- **torch.compile first**: it auto-generates Triton for fusions, and its matmul/attention
  templates plus autotuning cover most standard patterns. Write no kernel until a profile

  shows a gap. See [Topic: pytorch-ecosystem](../pytorch-ecosystem/summary.md).

- **Hand-written Triton** when you need an algorithm torch.compile cannot express or
  schedule well: custom attention variants, quantised/mixed-format GEMMs, fused MoE

  routing, anything with data-dependent structure. Fastest path from idea to a fast

  kernel; integrates with PyTorch in-process (also via `torch.library` custom ops so

  compile can see through it).

- **Raw CUDA / CUTLASS** when you need the last 10-30%: explicit warp specialisation,
  exotic smem swizzles, cluster features, persistent kernels with custom scheduling,

  device-side APIs Triton does not expose, or a C++ deployment with no Python. Also the

  right tool for learning what the hardware actually does.

- Rule of thumb from the field: prototype in Triton, keep it if it is within a few
  percent of target, drop to CUTLASS/CUDA only for the kernels that dominate the profile.

### State

- **Releases**: Triton 3.7 is the current line (3.7.0 May 2026, 3.7.1 Jun 2026), and
  3.7.1 is what September 2026 engine releases pin, SGLang v0.5.18 among them; 3.8 was

  scheduled for late August 2026. The cadence is two releases per PyTorch cycle, and it

  ships as the `triton` wheel bundled with PyTorch.

- **Hardware**: mature support for Ampere through Blackwell (B200/B300 and consumer
  sm_120, so the RTX 5090 is fully supported), AMD CDNA (MI300/MI355), Intel XPU.

  OpenAI publicly runs Triton/Gluon on both NVIDIA and AMD. The ROCm backend is how most

  PyTorch kernels reach AMD parts, and it now sits on **ROCm 10.0** (August 2026), for

  which AMD reports an average 3.3x inference and 2.4x training uplift over ROCm 7: a

  vendor number on vendor-selected workloads, to be treated as such. That release and

  its agent-skills channel are covered on [Topic: cuda-and-gpu-programming](summary.md).

- **Gluon**: the big 2025-2026 development, a lower-level, explicitly-scheduled dialect
  in the Triton repo/runtime. It exposes what Triton hides (layouts, tensor memory

  (TMEM) on datacenter Blackwell, async TMA, barriers, warp specialisation) with Python

  ergonomics, for the kernels where Triton's compiler heuristics leave performance

  behind. A CuTe-DSL-shaped escape hatch inside Triton.

- **NVIDIA involvement**: NVIDIA contributed a CUDA Tile IR backend so Triton picks up
  new Blackwell-generation tensor-core features without source changes; Triton is now

  effectively the shared DSL target NVIDIA, AMD, and Intel all optimise for.

- **cutile-rs**: since September 2026 Triton's block-level argument has a peer in another
  language. You write tile-level computation, the compiler decides how tiles map onto

  each architecture, and the kernel is JIT-compiled through CUDA Tile IR on first use,

  the same backend NVIDIA contributed to Triton. Exclusive access is guaranteed by tensor

  partitioning plus ordinary Rust ownership rather than by a bespoke type, so the

  property Triton argues for in a comment is checked by the compiler. It is much further

  along than its SIMT sibling cuda-oxide ([Writing kernels: the practical track](writing-kernels.md), early alpha): published on

  crates.io and already in production in Hugging Face's Grout inference engine and in

  mistral.rs. Neither publishes performance benchmarks, so the comparison with Triton is

  about language and toolchain, not speed.

- **Ecosystem**: torch.compile/Inductor, vLLM, SGLang, Unsloth, liger-kernel and most
  open kernel libraries are Triton-first; the [GPU MODE kernel leaderboard](https://www.gpumode.com/) (~20 min) popularised competitive Triton/CUDA kernel writing and is worth using for practice problems.

### Learning path

1. Tutorials 01-03 (vector add, fused softmax, matmul); run the built-in benchmark
   plots on your own GPU.

2. Triton-Puzzles for indexing fluency.
3. Tutorial 06 (fused attention) after reading [FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness](../../papers/2022-05_flashattention/summary.md).
4. GPU MODE Triton lectures for internals: how `tl.dot` picks mma layouts, what
   num_stages does, reading the generated PTX/TTGIR when performance surprises you

   (`TRITON_PRINT_AUTOTUNING=1`, `kernel.asm["ptx"]`).

5. Profile Triton kernels exactly like CUDA kernels with ncu ([Profiling and tools](profiling-and-tools.md)); `proton` (Triton's bundled profiler) is useful for autotune-aware timing.

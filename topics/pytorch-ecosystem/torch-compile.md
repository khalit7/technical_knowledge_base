# torch.compile: Dynamo, AOTAutograd, Inductor

⏱ 9 min read · +3h 50m resources

Last verified: 2026-08-24 (PyTorch 2.13).

### Best resources

- [torch.compile programming model docs](https://docs.pytorch.org/docs/stable/torch.compiler_programming_model.html) (docs, ~50 min for the core pages): the modern official mental model (guards, graph breaks, specialization).
- [Dynamo deep dive](https://docs.pytorch.org/docs/stable/torch.compiler_dynamo_deepdive.html) (40 min): how bytecode tracing and guards actually work.
- [torch.compile, the missing manual](https://docs.google.com/document/d/1y5CRfMLdwEoF1nTk9q8qEu1mgMUuUtvhklPKJ2emLU8) (1h 15m, Edward Yang): the best practical troubleshooting document.
- [Compilers for ML: torch.compile walkthrough (ASPLOS 2024 PyTorch 2 paper)](https://pytorch.org/assets/pytorch2-2.pdf) (45 min): the canonical academic description of Dynamo + Inductor.
- [tlparse](https://github.com/pytorch/tlparse) (10 min) and [depyf](https://github.com/thuml/depyf) (10 min): tools for reading compile logs and decompiled graphs.

### The three-stage pipeline

`torch.compile(model)` wraps the callable; nothing happens until the first call.

1. **TorchDynamo** (capture): hooks CPython's frame evaluation API (PEP 523) and
   symbolically evaluates Python **bytecode**, building an FX graph of tensor operations

   while leaving non-tensor Python to run normally. Output: FX graph + guards + rewritten

   bytecode that stitches graph calls into the original function.

2. **AOTAutograd**: traces the captured forward through the autograd engine to produce a
   joint forward + backward graph ahead of time, then partitions it (min-cut partitioner

   decides what to save vs recompute between fwd and bwd). Also decomposes composite ops

   into a smaller Aten/prims opset and functionalizes mutations.

3. **TorchInductor** (codegen): lowers the graph to a define-by-run loop-level IR, fuses
   pointwise/reduction chains, plans memory, and emits **Triton kernels** for GPU (C++/

   OpenMP for CPU). Matmuls and attention can be autotuned against library kernels.

   Since 2.13 there is also a CuTeDSL backend for some patterns; 2.10 added combo-kernel

   fusion (horizontally fusing many small kernels to cut launch overhead).

### Guards: why recompilation happens

Dynamo compiles a frame under assumptions and installs **guards** that are checked on

every subsequent call; any failure triggers recompilation of a new specialized variant.

Typical guards: tensor dtype/device/requires_grad, tensor rank and (for static dims)

exact sizes, `nn.Module` identity (`id()`), Python constants and container structure,

global config flags.

- Int/float scalars and shapes start **specialized**; on the second distinct shape seen,
  Dynamo re-traces that dimension as **dynamic** (a SymInt) so further shape changes stop

  recompiling. Force with `torch.compile(dynamic=True)` or `mark_dynamic(t, dim)`.

- `torch._dynamo.config.recompile_limit` (default 8): past that, the frame falls back to
  eager. Hitting it usually means an unbounded specialization source (e.g. compiling on a

  new module instance per call, or data-dependent Python branching).

- Diagnose with `TORCH_LOGS=recompiles` (prints the exact failing guard).

### Graph breaks

When Dynamo hits Python it cannot trace (arbitrary C extensions, `print`, unsupported

builtins, data-dependent control flow on tensor values via `.item()`/`if tensor:`), it

splits the frame: compile what came before, run the unsupported part in eager, resume

compiling after. Correct but slow; each fragment is a separate graph with its own guards,

and optimizations cannot cross the break.

- Find them: `TORCH_LOGS=graph_breaks`, or `torch._dynamo.explain(fn)(*args)` for a
  summary, or tlparse for a full report.

- Eliminate the important ones: `torch.compile(fullgraph=True)` errors on the first break,
  which is the right setting for training loops you control (torchtitan runs fullgraph).

- Data-dependent shapes: `torch._check()` hints, `guard_size_oblivious`, and
  `torch.cond` / `torch.while_loop` for control flow you want inside the graph.

### Modes

| mode | What it does | Use |
| --- | --- | --- |
| `default` | Fast compile, standard fusions | First stop |
| `reduce-overhead` | Wraps execution in **CUDA graphs** to eliminate kernel-launch and Python overhead | Small batches / inference, overhead-bound training steps |
| `max-autotune` | Benchmark-based selection among Triton matmul/conv templates, library kernels, and (on recent GPUs) CuTeDSL variants; enables CUDA graphs | Throughput-critical, compile time no object |
| `max-autotune-no-cudagraphs` | Autotune without graph capture | When CUDA graphs are unsafe (see below) |

CUDA-graph caveats: static input/output addresses (Inductor maintains static buffers and

copies inputs in), no CPU syncs inside the region, memory pool pinning increases peak

memory, and unstable shapes defeat it (each shape records a new graph). The 2.12

`torch.accelerator.Graph` API generalizes graph capture across accelerator backends.

Skip-reasons are logged under `TORCH_LOGS=cudagraphs`.

### Compiled autograd

`torch._dynamo.config.compiled_autograd = True` (or `torch.compile` on the `.backward()`

call path) traces the **entire backward graph at backward time**, including autograd hooks

and accumulation, rather than relying only on AOTAutograd's ahead-of-time bwd. Benefits:

fuses DDP/FSDP communication hooks into the compiled backward, captures backward-only

graph breaks, enables full-graph backward for CUDA graphs. Cost: first backward is slow;

guards on the autograd graph structure. Used by torchtitan for compiled FSDP2.

### Regional compilation

Compiling repeated blocks instead of the whole model: `torch.compile` each transformer

layer (or use `nn.Module.compile()` on submodules). Since the layers share code, the

compiled artifact is reused across instances, cutting cold-start compile time from

minutes to seconds at a small fusion-opportunity cost at block boundaries. This is the

documented recipe for large LLMs (also what `transformers` does internally). Related:

`mark_static_address` for KV caches, and hierarchical compilation via

`torch._dynamo.config.` nested-compile options.

### Caching and AOT

- Local + remote caches (`TORCHINDUCTOR_CACHE_DIR`, `FX_GRAPH_CACHE`, Mega-Cache
  `torch.compiler.save_cache_artifacts()`) make warm starts near-instant; critical on

  multi-node jobs so ranks do not each compile.

- `torch.export` captures a single full graph (stricter than Dynamo's fallback semantics)
  for serialization; **AOTInductor** compiles it to a shared library callable from C++ or

  Python without recompiling, which is the deployment path (and what vLLM/ExecuTorch

  build on).

### Debugging workflow

1. `TORCH_LOGS="graph_breaks,recompiles"` first; fix the top offenders.
2. `tlparse` on a trace log (`TORCH_TRACE=/tmp/trace`) for a browsable compile report.
3. Numerics: `torch._dynamo.config.verbose=True`, compare with `backend="eager"` (Dynamo
   only) or `backend="aot_eager"` (Dynamo + AOTAutograd, no Inductor) to bisect the stack.

4. `TORCH_LOGS=output_code` dumps generated Triton; `TORCHINDUCTOR_UNIQUE_KERNEL_NAMES=1`
   makes profiler traces map kernels back to source lines.

5. Minify: `torch._dynamo.config.repro_after="dynamo"|"aot"` auto-generates a minimal repro.
6. Silent wrong results are almost always mutation/aliasing of graph inputs or guards on
   `id()`; `fullgraph=True` plus `aot_eager` bisection finds them fast.

Common failure modes: excessive recompiles from dynamic batch/seq lengths (mark dynamic),

graph breaks from logging/`.item()` in the step (move out or `torch._dynamo.disable`

wrap), compile-time blowups on huge models (regional compilation), CUDA-graph memory

growth (pooled buffers), and DDP interaction (DDPOptimizer splits graphs at bucket

boundaries automatically; FSDP2 prefers compiled autograd).

See also: [PyTorch performance stack: attention, torchao, memory, profiling](performance-stack.md) for how compile interacts with SDPA/FlexAttention, and [Distributed PyTorch: DDP, FSDP2, DTensor, and friends](distributed-pytorch.md) for compile over FSDP2.

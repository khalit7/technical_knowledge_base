# Profiling and tools

⏱ 8 min read · +8h 55m resources

*Last updated: 2026-08-24*

### Best resources

- [Nsight Compute docs](https://docs.nvidia.com/nsight-compute/) (docs, ~2h for the core pages) and [Nsight Systems docs](https://docs.nvidia.com/nsight-systems/) (docs, ~1h): the references; the Nsight Compute "Kernel Profiling Guide" is the piece worth reading end to end.
- [GPU MODE lecture 1 (profiling PyTorch + how to integrate profilers)](https://github.com/gpu-mode/lectures) (video, ~1h 30m) and lecture 8 (CUDA performance checklist, video, ~1h 30m).
- [PyTorch profiler recipe](https://pytorch.org/tutorials/recipes/recipes/profiler_recipe.html) (25 min) and the [holistic trace analysis](https://github.com/facebookresearch/HolisticTraceAnalysis) (repo, ~30 min for the entry path) tooling.
- [CUDA C++ Best Practices Guide, performance metrics](https://docs.nvidia.com/cuda/cuda-c-best-practices-guide/#performance-metrics) (30 min): timing with events, effective bandwidth.
- Microbenchmark papers ("dissecting the NVIDIA GPU architecture via microbenchmarking" lineage) (~1h 30m) for ground-truth latencies; optional.

### The tool split

- **Nsight Systems (****`nsys`****)**: whole-program timeline. CPU threads, CUDA API calls,
  kernel launches, memcpies, NCCL, NVTX ranges. Answers "where does wall-clock time go":

  gaps between kernels (CPU-bound / launch overhead), overlap of comms and compute,

  dataloader stalls. Always start here; it is cheap and non-perturbing.

  `nsys profile -o out python train.py`, view in the GUI; annotate phases with

  `torch.cuda.nvtx.range_push/pop` (or `nvtx` in C++) so the timeline is readable.

- **Nsight Compute (****`ncu`****)**: per-kernel microscope. Replays each selected kernel many
  times to collect hardware counters; heavily perturbing, so use it on kernels the

  timeline already convicted. `ncu --set full -k regex:my_kernel -c 10 -o out python ...`

  Answers "why is this kernel slow".

- **torch.profiler**: in-process, built on **CUPTI** (the CUDA Profiling Tools Interface,
  the library all these tools sit on; you can also use CUPTI directly for custom

  telemetry). Gives per-op CPU+GPU time, stack traces, Chrome/Perfetto trace export

  (`prof.export_chrome_trace`), and memory timelines. Best for "which PyTorch op is

  slow" before dropping to Nsight for "why". Use `schedule=` with warmup, and

  `with_stack=True` sparingly.

- Also in the kit: `compute-sanitizer` (memcheck/racecheck; run it before trusting any
  new kernel), `cuda-gdb`, and `nvidia-smi dmon`/`nvitop` for a live coarse view.

### ncu metrics that matter

Start with the **Speed of Light (GPU Throughput)** section: SM % and Memory % of peak.

The pair tells you the regime: high mem + low SM = memory-bound; high SM + low mem =

compute-bound; both low = latency/occupancy/divergence problem (or the kernel is tiny).

Then, per suspicion:

| Question | Metric (section) |
| --- | --- |
| Enough parallelism? | Achieved occupancy (`sm__warps_active.avg.pct_of_peak_sustained_active`), grid size vs SM count, "waves per SM" |
| What limits occupancy? | Occupancy section: registers/thread, smem/block, block size |
| HBM saturated? | `dram__throughput.avg.pct_of_peak_sustained_elapsed`; DRAM read+write GB/s vs ~1.79 TB/s on a 5090 |
| Coalesced? | L1/TEX sectors per request (~4 is ideal for 32-bit); "Memory Workload Analysis" excessive-sector warnings |
| Bank conflicts? | `l1tex__data_bank_conflicts_pipe_lsu_mem_shared_op_ld/st` |
| Divergence? | Branch efficiency, `smsp__thread_inst_executed_per_inst_executed` (32 = no divergence) |
| SMs busy at all? | `sm__cycles_active` / SM busy vs elapsed; tail effect shows as low "SM efficiency" with fine-looking per-SM numbers |
| Tensor cores actually used? | `sm__pipe_tensor_cycles_active`, or the instruction mix showing HMMA/QMMA |
| Spills? | Local memory traffic in Memory Workload Analysis; confirm with `ptxas -v` |

ncu's guided analysis (rules engine) names the likely bottleneck in prose; trust it as a

hypothesis generator, verify with the counters. Note ncu locks clocks to base by default

during replay (`--clock-control base`): numbers are stable but not "boost" numbers.

### Benchmark methodology (where everyone gets burned)

1. **Async means host timers lie.** Never wrap a kernel launch in `time.time()` without
   `torch.cuda.synchronize()`. Standard pattern: cudaEvent timing:

   `start.record(); work(); end.record(); torch.cuda.synchronize(); start.elapsed_time(end)`.

   Events time the GPU stream itself, excluding host overhead (use host timers +

   synchronize when you *want* to include launch overhead, e.g. overhead-bound regimes).

2. **Warmup.** First calls pay JIT/autotune/cuBLAS-heuristic/context costs and cold
   caches: run the op 3-10+ times before timing (more for torch.compile, which compiles

   on first call per shape). Then report median or trimmed mean over many iterations,

   not min, not a single run.

3. **Lock clocks.** GPUs boost and thermally throttle; back-to-back runs differ by
   double-digit percent. `nvidia-smi -lgc <sm_clock>` (and `-lmc` where supported, or

   `-pl` for power caps) pins clocks; unlock with `-rgc`. On a dual-5090 workstation

   also fix fans/power limits and note ambient temperature for anything you will quote.

   Alternative: report clock-normalised numbers or let ncu's clock control do it.

4. **Beware the cache.** Timing the same small tensors in a loop measures L2, not HBM.
   Rotate through buffers larger than L2 (96 MB on a 5090!) or flush between iterations

   (`triton.testing.do_bench` has `flush_l2=True` and does warmup/median for you; use it).

5. **Fair baselines.** Compare against torch.compile (not eager), cuBLAS with the right
   epilogue and dtype, correct transpose layouts; check outputs match to tolerance first.

   Report the achieved GB/s or TFLOPs next to the roofline number so speedups are

   interpretable.

6. **CUDA graphs / launch overhead**: for microsecond kernels, measure both graphed and
   ungraphed; otherwise you are benchmarking the CPU.

7. Keep an environment log: GPU, driver, CUDA/toolkit (13.3 current), PyTorch/Triton
   versions, clocks. Kernel numbers without this are not reproducible.

### Suggested workflow

nsys timeline -> pick the top kernels or gaps -> torch.profiler if the question is

"which op" -> ncu full section on the guilty kernel -> form roofline hypothesis ([GPU memory hierarchy](gpu-memory-hierarchy.md)) -> change one thing -> re-measure

with locked clocks and do_bench. Write the numbers down at every step; the worklog format

(as in Boehm's post) is the deliverable that proves the speedup.

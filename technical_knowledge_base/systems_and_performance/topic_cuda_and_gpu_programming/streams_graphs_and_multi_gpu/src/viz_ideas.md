# Visual ideas: Streams, CUDA graphs and multi-GPU programming

What the text needs a reader to see: that "different streams" does not mean "running together"; that overlap hides the smaller of two things; how much a launch costs against a short kernel and what a graph removes; when DDP's buckets leave during backward and why a tail stays exposed; that communication shares hardware with compute.

## Built (score out of 10: teaching value x evidence)
1. **One training step, before and after (Reading, animation, 9).** The same GPT-2-small-shaped DDP step on 64 H100s, lanes for copy, compute and NCCL streams, stepped event by event with captions and counters, toggling "no overlap" against "copy and comm overlapped". Drawn to scale from a stated model (`recompute.py` step_model, ported to JS and checked equal). Shows the exposed last bucket (tied embedding) rather than an idealised full hide. Inspiration: the DeepSeek MLA explainer's before/after mechanics.
2. **Launch overhead with and without a CUDA graph (Reading, animation, 9).** 20 kernels under launch+sync, stream, graph; CPU and GPU lanes, GPU-busy counter; values fitted to NVIDIA's four published V100 numbers (Gray 2019) and labelled as a fit.
3. **DDP buckets measured on real processes (Reading, chart, 8).** Real `DistributedDataParallel` with Gloo on 2 CPU processes, comm-hook timestamps; overlap against serial; plus torch.profiler events. Real data where no GPU exists; shows the 15% compute slowdown from contention.
4. **Step timeline tab (9).** Every input of the step model; step time against bucket size with an optional latency term.
5. **Chunked copy pipeline (Reading, interactive, 7).** Chunks slider and one or two copy engines; makes "the copies were the problem" visible.
6. **Default-stream toy with predict-then-reveal (Reading, 7).** Legacy against per-thread ordering of the compiled s5 program, backed by the symbol difference (`cudaMemcpyAsync` against `_ptsz`).
7. **M1 launch bars and concurrency bars (Reading, 7).** Metal command buffers and indirect command buffers as the measured analogue of streams and graphs; separate queues did not overlap, a concurrent encoder did.
8. **SASS of `cudaGraphSetConditional` (Reading, 6).** `CALL.ABS.NOINC` through a constant-bank address on sm_90a and sm_100a.

## Rejected
- An NCCL ring/tree animation: owned by Interconnects and scaling (its Collective simulator); linked instead.
- A Nsight Systems screenshot gallery: no GPU to produce real traces; Profiling page owns tool output from docs.
- Activation-offload scenario in the step animation: correct physics (copy-bound) but it diluted the main before/after; the text states the rule instead.
- A CUDA graph DOT rendering via `cudaGraphDebugDotPrint`: needs a driver.

## What the methodology lacked
A rule for measuring a GPU mechanism with no GPU: here the mechanism (bucketed overlap, queueing) was run on a different substrate (CPU threads, Metal) and the page states what transfers and what does not, next to the chart.

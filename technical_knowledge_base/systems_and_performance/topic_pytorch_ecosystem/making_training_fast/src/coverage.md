# Coverage of the old page

The old Notion page "PyTorch performance stack: attention, torchao, memory, profiling" (fetched 2026-09-22, verbatim in the root's `src/read/old/performance_stack.md`) is treated as unverified notes. Every claim is listed with its status and where this page carries it. Statuses: **verified** (checked against source, docs or a run here), **corrected**, **unconfirmed** (could not be checked; not stated as fact on the page), **dropped** (with the reason).

| Old claim | Status | Where now |
|---|---|---|
| "Last verified 2026-09-22 (PyTorch 2.13, torchao 0.14.x)" | corrected: PyTorch 2.14.1, torchao 0.18.0 (2026-08-03; root FACTS) | header, s11 |
| Resources: FlexAttention blog, SDPA docs, torchao repo, Understanding GPU memory 1-2, FlashAttention paper page | verified (URLs fetched 2026-10-13) | Further reading |
| SDPA dispatches among FLASH, CUDNN, EFFICIENT, MATH | verified; OVERRIDEABLE also in the enum; priority order quoted from Context.h L483-488 and cuda/sdp_utils.cpp L94-136 at v2.14.1 | s10 table |
| FA-2 kernels; FA-3 on Hopper; "since 2.11 an FA-4 backend" | refined: at 2.14.1 FA3 and FA4 are external plug-ins (`list_flash_attention_impls()` = ['FA3', 'FA4']), FA3 needs capability 9.0, FA4 9.0 or 10.0 (`_fa3.py` L154, `_fa4.py` L110); the 2.11 FA-4 item is a FlexAttention backend (root coverage) | s10, Attention lab |
| cuDNN "often fastest on Hopper+, default candidate since 2.5" | corrected: at 2.14.1 cuDNN is first only on capability 9.x/10.x with cuDNN newer than 9.15 (and, with CUDA 12 wheels, minor 0 or 3), otherwise last after math (source above). "Often fastest" unconfirmed, dropped | s10 |
| EFFICIENT: widest coverage (odd head dims, masks) | kept as the reason masks fall to efficient on CUDA (interview answer); not measured (no CUDA) | s10, interview |
| MATH: always works, numerics reference | verified on CPU and MPS (math path errors 1e-6 vs float64) | s10 |
| `sdpa_kernel([...])` pins a backend; warnings name the reason | verified on CPU (raises); **corrected for MPS**: ignored, math always runs (measured; attention.cpp L814, L862-866) | s10, mistakes |
| "TORCH_LOGS=+sdpa style debugging" | dropped: not verified as a logging artifact at 2.14.1; the page gives profiling the op names and `sdpa_kernel` raising instead | s10 |
| Arbitrary attn_mask forces EFFICIENT or MATH on CUDA; is_causal keeps flash | kept for CUDA (interview); **on CPU the flash kernel accepts masks** (measured) | s10, interview |
| 2.10 added varlen_attn | verified (root coverage); located at `torch.nn.attention.varlen.varlen_attn`, CUDA kernels only (varlen.py L54, L139); called here: fails | s10 |
| FlexAttention: score_mod, mask_mod, create_block_mask, BlockMask skips masked tiles; precompute once per shape | verified; block counts measured and recomputed in the browser | s10, Attention lab |
| Always compile flex_attention; eager is a slow reference | verified (warning text in flex_attention.py L2596-2600) | s10, mistakes |
| Backward generated too | verified for CUDA; **corrected**: no backward on CPU or MPS at 2.14.1 (L2204-2219; reproduced) | s10 |
| Perf within ~10-20% of FA2 | corrected to the source: 90% forward, 85% backward (vendor, 2024) | s10, Attention lab |
| Since 2.13 runs on MPS, CPU support exists | verified for MPS (inference, compiled); **CPU compiled needs AVX2 and not macOS** (flex_cpu.py L31-40; reproduced); eager CPU works | s10 |
| Used by HF transformers (attn_implementation="flex_attention"), torchtitan (document masking), gpt-fast | not re-verified here; moved to the libraries child; not stated on this page | (Libraries child) |
| torchao: tensor subclasses, composes with compile, FSDP2, DTensor | verified (subclass types measured: Int8Tensor, IntxUnpackedToInt8Tensor, Float8Tensor) | s11 |
| PTQ configs Int8WeightOnly, Int4WeightOnly (tinygemm), Int8DynamicActivation..., Float8DynamicActivationFloat8Weight | verified to exist in 0.18.0; run: Int8WO and Int8Dyn work on CPU; Int4WO fails without mslk; Float8 dynamic needs capability 8.9+ (assertion text) | s11 table |
| weight-only for memory-bound, dynamic for compute-bound | verified by measurement (M = 1 against M = 2,048 on CPU) | s11 |
| HF transformers accepts TorchAoConfig; ExecuTorch consumes torchao checkpoints | not re-verified; dropped from this page (belongs to libraries and inference pages) | (none) |
| QAT: torchao.quantization.qat insert/convert; used with torchtune/Axolotl | API verified and run (QATConfig prepare/convert); torchtune/Axolotl usage not re-verified, dropped | s11 |
| float8 training: convert_to_float8_training; tensorwise/rowwise; composes with FSDP2 (fp8 all-gather) and compile | verified API (Float8LinearConfig fields incl. enable_fsdp_float8_all_gather); run emulated on CPU | s11 |
| "delayed vs dynamic scaling" | dropped: Float8LinearConfig at 0.18.0 shows ScalingType.DYNAMIC defaults; delayed scaling not checked | (none) |
| torchtitan ~1.5x at 405B on H100s | corrected to the torchao README's wording: up to 1.5x at 512 GPUs / 405B (vendor) | s11 |
| AMD upstreamed FNUZ fp8 for MI3xx (Aug 2026) | unconfirmed (root coverage); not stated | (none) |
| MXFP8/MXFP4 target Blackwell incl. MoE grouped GEMM | verified location `torchao.prototype.mx_formats` (configs listed); MoE claim not checked, dropped | s11 |
| Sparsity: 2:4 with ~1.3-1.6x; block sparsity; Wanda | `sparsify_` verified present; speedup figures unconfirmed, not stated | s11 |
| Memory snapshot: _record_memory_history(max_entries=100000), _dump_snapshot, memory_viz | verified (signature read at 2.14.1); not run (no CUDA) | s7 table |
| Categories separate params/grads/optimizer/activations | verified on the CPU memory profiler (7 categories at 2.14.1, measured) | s7 |
| memory_summary, max_memory_allocated | verified; plus `torch.accelerator.max_memory_allocated` | s7 table |
| expandable_segments for fragmentation | moved to Memory allocators (link) | s7 |
| Activation checkpointing non-reentrant, per block | verified and measured | s8 |
| SAC via create_selective_checkpoint_contexts; saves matmul/SDPA, recomputes pointwise; composes with compile; memory budget API | verified (blog 2025, wheel); measured; the blog's `torch._dynamo.config.activation_memory_budget` **corrected** to `torch._functorch.config` at 2.14.1 | s8 |
| torchtitan exposes none/selective(op/layer)/full | not re-verified; dropped (libraries child) | (none) |
| nn.LinearCrossEntropyLoss (2.13) avoids materialising logits; the Liger trick | verified; **corrected**: the default (options=None) does not chunk at 2.14.1 (docstring and measured) | s9 |
| Profiler recipe (activities, schedule, tensorboard_trace_handler, profile_memory, with_stack, record_shapes) | verified; run on CPU and MPS | s2, Profiler trace |
| Perfetto / chrome://tracing / TensorBoard; with_stack; TORCHINDUCTOR_UNIQUE_KERNEL_NAMES=1 | carried | s2 |
| What to look for: GPU gaps, NCCL not overlapping, tiny kernels, D2H syncs | carried | s2 |
| synchronize + perf_counter; benchmark.Timer handles warm-up and medians | verified; **refined**: Timer synchronizes any accelerator at 2.14.1 (timer.py L15-18) | s1 |
| HTA for fleet-scale traces | carried (link) | s2, Further reading |
| Triage order: snapshot for OOM, profiler for throughput, flight recorder for hangs | carried (root table) | s0, link to distributed child |

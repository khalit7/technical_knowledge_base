# Coverage of the old pages (src/read/old/), checked 2026-10-12

The old root and its four children were fetched from Notion (read only) and saved verbatim in `old/`. Each claim is marked **verified** (with the source or measurement), **corrected** (what is true now, and where the page says it), **unconfirmed** (kept out of the root or flagged), or **moved** (detail that belongs to a child page, listed for the child). Where a fact is carried, the place is given (R = Reading tab section, F = Further reading, tab names as on the page).

## Root: Topic: pytorch-ecosystem (old/root.md)

| Old claim | Status | Where now |
|---|---|---|
| Current stable PyTorch 2.13.0 (July 2026) | corrected: 2.14.1 (2026-09-30), 2.14.0 2026-09-02 (PyPI, GitHub releases) | R0, Ecosystem map |
| ATen is the C++ tensor library; the dispatcher picks an implementation per device, dtype, autograd state and is the extension point | verified (wheel's dispatch keys, measured key sets) | R0, R2 |
| Autograd is a tape recording dispatched calls | verified with nuance: a graph of nodes built by the autograd kernel, measured | R3 |
| Dynamo captures bytecode into an FX graph plus guards; AOTAutograd builds forward and backward; Inductor emits Triton or C++/OpenMP | verified (Compile lab); added: Metal on MPS | R5 |
| torch.export is the strict full-graph capture; AOTInductor makes a library with no Python | verified, measured (.pt2 14.3 MB, 1.3e-6) | R5 |
| c10d over NCCL and Gloo; DTensor = mesh + per-dimension placement; FSDP2, TP, pipelining, DCP expressed in DTensor | verified (Distributed lab); pipelining uses stages and send/recv rather than DTensor placements, so "all expressed in DTensor" is softened | R7 |
| SDPA backend selection, FlexAttention, torchao, profiler | verified | R6 |
| Deployment: ExecuTorch, ONNX export, vLLM | verified | R5, R9 |
| Dispatcher and DTensor are the two narrow interfaces; wrappers get deprecated (FSDP1, torchtune, torchforge) | kept as the five ideas (dispatch, placements) and the "what was replaced" paragraph; FSDP1 part corrected below | R0, R9 |
| Mermaid diagram of the stack | redrawn as the stack animation | R0 |
| 2.9: symmetric memory, Python >= 3.10, wheel variants | verified (2.9 notes, Ecosystem map) | Ecosystem map releases |
| 2.10: Python 3.14, varlen_attn, combo-kernel fusion | verified (2.10 notes) | Ecosystem map releases |
| 2.11: FSDP1 formally deprecated | **corrected**: FSDP1 still ships at 2.14 with no formal deprecation notice (docs 2.14 fsdp.html, Ecosystem map) | R9, F |
| 2.11: differentiable collectives; FA-4 SDPA backend | verified as "FlexAttention with a FlashAttention-4 backend" (2.11 notes) | Ecosystem map releases |
| 2.12: torch.accelerator.Graph, fused Adagrad, batched eigh | verified (2.12 notes) | Ecosystem map releases |
| 2.13: FlexAttention on MPS, CuTeDSL backend, nn.LinearCrossEntropyLoss, Python 3.15 | verified (2.13 notes; "up to 4x lower peak memory" quoted as a release-note figure) | R6, Ecosystem map |
| Cadence about one minor release per quarter | verified (release dates 2.9 to 2.14: Oct, Jan, Mar, May, Jul, Sep) | Ecosystem map |
| PyTorch Foundation: PyTorch, vLLM, DeepSpeed, Ray, Helion, Safetensors | verified (Foundation blogs) | R9 |
| Meta satellites moved to meta-pytorch: torchtitan, torchtune, torchforge, monarch | **corrected**: torchtune, torchforge, monarch are in meta-pytorch; torchtitan is pytorch/torchtitan (Ecosystem map repo metadata) | R9 |
| torchtune discontinued mid-2025; torchforge paused; consolidation in torchtitan | verified (issue 2883, 2025-07-15; forge README) | R9 |
| Helion: tiled Python kernel DSL, autotunes, compiles to Triton, CuTeDSL, Pallas; kernels on the HF Kernels Hub | verified for Triton and autotuning (helionlang.com, Ecosystem map); CuTeDSL and Pallas targets **unconfirmed** here, left to the Extending child | R8 |
| ExecuTorch 1.0 in Oct 2025 with backends | verified (1.0.0 on 2025-10-17; now 1.5.1, "part of PyTorch Core" April 2026) | R9 |
| Deep-dive table of four children | replaced by section 10's proposed children | R10 |
| Adjacent links (cuda topic, training topic, inference topic, FlashAttention paper) | carried | F |
| Best entry points: blog index, newsletter, dev-discuss, torchtitan | carried, links checked | F |
| Video (7 min, describes the old page) | not touched; describes the old page, decision is Khalid's | report |

## torch.compile child (old/torch_compile.md)

| Old claim | Status | Where now |
|---|---|---|
| Resources: programming model docs, Dynamo deep dive, missing manual, PyTorch 2 paper, tlparse, depyf | carried; the programming-model link was dead (404) and is replaced by the 2.14 docs URL | F |
| Nothing happens until the first call | verified (Compile lab first-call timings) | R5 |
| Dynamo hooks PEP 523, FX graph + guards + rewritten bytecode | verified | R5 |
| AOTAutograd joint graph, min-cut partitioner, decomposition, functionalization | verified; measured: no memory saving on the running example | R5 |
| Inductor fuses, emits Triton/C++; matmuls autotuned; CuTeDSL (2.13), combo kernels (2.10) | verified; max-autotune on CPU kept BLAS (measured) | R5 |
| Guards on dtype, device, requires_grad, shapes, module identity, globals | verified (549 guards; grad mode guard caused eval recompile) | R5 |
| Automatic dynamic on second distinct shape; dynamic=True, mark_dynamic | verified with a correction found by the Compile lab: mark_dynamic on idx alone still recompiles on targets | Compile lab, child |
| recompile_limit default 8, then eager | verified (config at 2.14.1) | R5 |
| TORCH_LOGS=recompiles, graph_breaks, explain, tlparse, fullgraph=True (torchtitan runs fullgraph) | verified except "torchtitan runs fullgraph" **unconfirmed** here (moved to child) | R5 |
| Graph-break causes and cost | verified, measured (+7 to 9%) | R5, R8 |
| torch._check, guard_size_oblivious, torch.cond, while_loop | moved to child | child |
| Modes table: default, reduce-overhead (CUDA graphs), max-autotune, max-autotune-no-cudagraphs | verified; reduce-overhead is CUDA-only per the 2.14.1 docstring (measured no effect on CPU) | R5 |
| CUDA-graph caveats; torch.accelerator.Graph (2.12) | moved to child; owned in depth by Streams, CUDA graphs page | child |
| Compiled autograd; regional compilation; caches, Mega-Cache | moved to child (Mega Cache verified in 2.7 notes; regional compilation in 2.5) | child |
| Debugging workflow: aot_eager bisection, output_code, unique kernel names, repro_after | partly in R5 (aot_eager, output_code); rest moved to child | R5, child |
| DDPOptimizer splits graphs at bucket boundaries; FSDP2 prefers compiled autograd | moved to child, unconfirmed until rebuilt | child |

## Distributed child (old/distributed_pytorch.md)

| Old claim | Status | Where now |
|---|---|---|
| Resources: FSDP2 tutorial, fully_shard docs, torchtitan + paper, DDP paper, DTensor docs, DeviceMesh recipe | carried, checked | F |
| DDP buckets default 25 MB, reverse registration order, rebuilt in first iteration | verified with correction: first iteration is one bucket; 25 MiB cap and 1 MiB first bucket apply from step 1 (distributed.py L31-33, L151-154; measured) | R7 |
| Unused parameters hang DDP; find_unused_parameters; static_graph; no_sync; comm hooks | no_sync in R4; rest moved to child | R4, child |
| FSDP1 deprecated since 2.11 | **corrected** (no formal notice at 2.14) | R9 |
| FSDP1 vs FSDP2 table (flat parameter vs per-parameter DTensor, in-place API, frozen params, state dicts, mixed dtype, memory) | per-parameter DTensor verified (measured placements); rest moved to child | R7, child |
| fully_shard bottom-up per block, then root; prefetching | verified (measured 14 collectives, root not resharded) | R7 |
| DeviceMesh, HSDP, DTensor placements and propagation; differentiable collectives (2.11) | placements verified and measured; HSDP moved to child | R7 |
| TP with parallelize_module, Colwise/Rowwise, sequence parallel, context parallel, pipelining schedules | TP and pipelining measured; SP and CP moved to child | R7 |
| torchrun flags, elastic, TCPStore, torchft, Monarch | torchrun basics R7; rest to child; torchft and monarch statuses on Ecosystem map | R7, map |
| NCCL: identical order of collectives, timeouts (default 10 min) | verified (docstring: 10 min NCCL, 30 min others); hang measured on gloo | R7 |
| TORCH_NCCL_ASYNC_ERROR_HANDLING default 1, NCCL_DEBUG, TORCH_DISTRIBUTED_DEBUG=DETAIL | DETAIL verified and measured; NCCL env vars moved to child (cannot run here) | R7 |
| Flight recorder TORCH_NCCL_TRACE_BUFFER_SIZE, dump on timeout | corrected/updated: at 2.14.1 the variable is TORCH_FR_BUFFER_SIZE, with TORCH_NCCL_TRACE_BUFFER_SIZE as fallback (distributed_c10d.py); works on gloo | R7 |
| NCCL perf knobs, symmetric memory | moved to child / Streams page | child |

## Performance child (old/performance_stack.md)

| Old claim | Status | Where now |
|---|---|---|
| Resources: FlexAttention blog, SDPA docs, torchao, Understanding GPU memory, FlashAttention paper page | carried, checked | F |
| SDPA backends FLASH, CUDNN, EFFICIENT, MATH | verified; OVERRIDEABLE added (enum at 2.14.1) | R6 |
| FA-4 backend since 2.11; cuDNN default candidate since 2.5 | 2.11 FA-4 via FlexAttention verified; "cuDNN default candidate since 2.5" **unconfirmed** (2.5 notes say cuDNN backend added) | child |
| sdpa_kernel pins a backend | verified with measured error text on CPU | R6 |
| varlen_attn (2.10) | verified (2.10 notes) | Ecosystem map; child |
| FlexAttention score_mod, mask_mod, BlockMask, compile it | verified | R6 |
| FlexAttention within about 10 to 20% of FA2 | corrected to the source's figure: 90% forward, 85% backward (vendor, 2024) | R6 |
| FlexAttention on MPS since 2.13 | verified | R6 |
| torchao line 0.14.x | corrected: 0.18.0 (2026-08-03) | R6, map |
| torchao PTQ configs, QAT, float8 training, MX formats, sparsity numbers | float8 "up to 1.5x at 512 GPUs, 405B" verified (README, vendor); int8 weight-only measured on CPU; rest moved to child | R6, child |
| AMD FNUZ fp8 upstreamed Aug 2026 | unconfirmed here; moved to child | child |
| Memory snapshot workflow, memory_viz, expandable_segments | snapshot workflow verified (docs), carried in R6 table; expandable_segments to child | R6 |
| Activation checkpointing, non-reentrant only; SAC | verified and measured (non-reentrant); SAC moved to child | R3 |
| nn.LinearCrossEntropyLoss (2.13) | verified | R6 |
| Profiler recipe, Perfetto, what to look for, synchronize, benchmark.Timer, HTA | carried in R6 table and mistakes; HTA to child | R6 |

## HF stack child (old/hf_stack_and_frameworks.md)

| Old claim | Status | Where now |
|---|---|---|
| Last verified with transformers 5.15, Axolotl 0.29+ | corrected: transformers 5.19.0, Axolotl 0.20.0 (PyPI 2026-10-12) | R9, map |
| Resources: transformers v5 blog, torchtune issue 2883, torchtitan, Axolotl docs, TRL docs | carried, checked | F |
| transformers v5 (Jan 2026), PyTorch-only, modular, pluggable attention, kernels library | v5.0.0 on 2026-01-26 verified; details moved to child and map | map, child |
| accelerate launcher, FSDP2 plugin, DeepSpeed, Megatron | verified; added the measured CPU caveat (FSDP plugin ignored, DDP returned) | R9 |
| PEFT, TRL, datasets | carried on the map; brief in R9 | R9, map |
| torchtitan as pretraining reference, fork-and-own | verified | R9 |
| torchtune discontinued; torchforge paused | verified | R9 |
| Axolotl, Lightning, Composer (maintenance), Unsloth, LLaMA-Factory, NeMo/Megatron | verified on the map (Composer quiet, NeMo now speech only); LLaMA-Factory not on the map, moved to child | R9, map |
| "When to use which" table | kept as R9's table and the map's chooser | R9 |
| NVIDIA buying Hugging Face for $12.93B, confirmed 3 September; "now sits inside" NVIDIA | **corrected**: definitive agreement 2026-09-02 (NVIDIA Form 8-K), about $11.9B plus up to about $1.0B retention equity, expected to close in the first half of 2027; until then Hugging Face is independent | R9 |
| FSDP2 is the shared substrate for accelerate, Axolotl, Lightning, TRL, torchtitan | partly verified by the map's source scan; stays on the map | map |

## Cross-link pass, 2026-10-13

The six children exist now (five live, Distributed PyTorch being built). This pass links them from the root and carries the corrections they found, consistent with FACTS.md (keys tda, fst, ext, tcp, lib). Nothing from the distributed child is quoted.

| Change | Source | Where |
|---|---|---|
| Section 10 rewritten: the six children by their exact titles, linked by Notion id, one line each with what they own and the overlap notes; the "proposed" and "what happens to the old children" wording removed | pages.json titles and ids | R10 |
| "Go deeper" in sections 1 to 9 now links the child that owns the section, naming the child's section where it helps (tda 1, 2, 3, 4 and 2.6; tcp 11; fst 6, 9, 10; ext 2, 4, 5; lib 3) | children's Reading headings | R1 to R9 |
| Inside one step, Compile lab, Distributed lab and Ecosystem map each gain one "Go deeper" link in their lead paragraph | | tabs |
| Further reading: the six children at the top (old-title entries for the four reused pages removed), with their own reading times; the two without one estimated from word count (about 35 and 40 min) | children's Further reading | F |
| Autocast: tensors always carry the Autocast key; the thread excludes it by default and entering autocast removes the exclusion (DispatchKeySet.h L670-686) | tda | R2 |
| checkpoint() without use_reentrant still runs the reentrant variant at 2.14.1 and only warns (checkpoint.py L635-647); that variant recomputed 16 matmuls against 12 | tda | R3, Inside one step section 5 |
| Autocast lists are per device (MPS ran log_softmax in bf16); bf16 autocast was slower on this laptop (MPS 208.0 vs 143.0 ms; CPU 43.7 s vs 0.37 s, no bf16 hardware), larger variant | tda, fst | R4 |
| Dividing the loss by the number of micro-batches is exact only with equal token counts (59.1% gradient error in the measured case; only the HF Trainer with a `**kwargs` forward corrects it) | lib | R4 predict, Mistakes |
| export counts labelled: the root's and Compile lab's 95 ops / 329 core ATen are with a dynamic batch (one sym_size read); static shapes give 94 / 326 as on the compile child | src/comp/inputs/export.json (by_op has 1 sym_size.int, range VR[1, 64]) against torch_compile/src/inputs/export.json | R5, Compile lab section 9 |
| torch.export described as the whole-graph sibling (not "strict": non-strict tracing is the default) | tcp coverage | R5 |
| Saved-for-backward total: the Compile lab's 34,814,468 B is right and already includes the one logits tensor (view_49, 8x64x43, 88,064 B). The compile child's min-cut figure 34,902,532 B counts it twice: its script walks the forward graph's outputs, where view_49 appears both as the user output and as a saved value (re-checked 2026-10-13 with a deterministic rerun: num_fwd_outputs 2, user outputs [view_49, div], view_49 twice among 92 forward outputs, once among the backward's placeholders). Note added to the Compile lab; reported for the child and FACTS | src/comp/inputs/model_cpu.json, rerun | Compile lab section 6 |
| sdpa_kernel has no effect on MPS (always math); MPS never takes a fused SDPA path at 2.14.1 | fst | R6 |
| FlexAttention: inference only on CPU and MPS (no backward at 2.14.1), compiled CPU flex refuses macOS; on MPS slower than SDPA except a sliding window, causal 148 vs 7.7 ms; the 2.13 "~12x" did not reproduce | fst | R6, Ecosystem map releases |
| nn.LinearCrossEntropyLoss / F.linear_cross_entropy chunk only with LinearCrossEntropyOptions(); default = unchunked (2394.2 vs 1278.8 MB peak, larger variant, V 50,257) | fst | R6, Ecosystem map releases |
| Two traps: late autograd registration of a traced C++ op drops 16 of 52 gradients under compile; the wrong artefact persists in the AOTAutograd cache across processes | ext | R8 |
| "DTensor works the same way" softened: a subclass, but its constructor and common op path are C++ at 2.14.1; Python __torch_dispatch__ only for DTensor subclasses | ext | R8 |
| Helion: Triton by default, also Pallas, CuTe and Metal backends (Metal ran on MPS) | ext | R8 |
| DeepSpeed clips at 1.0 by default since 0.19.3 (0 before) | lib | R9, Mistakes, Ecosystem map atlas |
| Axolotl 0.20.0 pins transformers==5.17.0 and torch<=2.14.0 | lib | R9, Ecosystem map atlas |
| Lightning FSDPStrategy is FSDP1; FSDP2 + TP is ModelParallelStrategy | lib (the map already said so) | R9 |
| torchtitan 0.3.0: per-block compile with fullgraph=True, no compiled autograd; runs on a Mac CPU with four patches. The map's "torchtitan was read, not run" replaced by what the children ran (DeepSpeed and torchtitan on CPU by the libraries child, Helion on Metal by the extending child) | lib, tcp, ext | R9, Ecosystem map (atlas, Checks and limits) |
| NeMo repository speech only | already correct on the root | R9, map |
| Section 5 claims on regional compilation, mega-cache and unique kernel names: the root makes none beyond release-history items (2.5 regional compilation, 2.7 Mega Cache), which stay | tcp coverage | none |

Checks after the pass: build.sh; checkpage.sh fail=0, emdash 0, errbox 1, clipped 0; read/check_data.py 17 checks 0 fails; map/validate.py 37 ok; comp/check_page.py ok; step/check_page.py 21 claims fail=0; dist check_page.mjs and check_data.py pass; read/check_page.mjs and a tab sweep at 390 dark and 920 light: no errors, NaN, undefined or sideways scroll.

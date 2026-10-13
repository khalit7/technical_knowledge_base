# Coverage of the old page "torch.compile: Dynamo, AOTAutograd, Inductor" (verbatim in ../../src/read/old/torch_compile.md)

Every claim, its status (verified, corrected, unconfirmed, moved) and where this page carries it. R = Reading section, T = tab, F = Further reading. The root's own coverage (../../src/read/coverage.md) already checked these claims at intuition level; this file records the child's deeper check.

| Old claim | Status | Where |
|---|---|---|
| Resources: programming model docs, Dynamo deep dive, missing manual, PyTorch 2 paper, tlparse, depyf | carried; programming-model and deep-dive links moved to the 2.14 docs URLs (old stable URL was 404, root finding); links checked 2026-10-13 | F |
| torch.compile wraps; nothing happens until the first call | verified (first-step timings) | R0, R10 |
| Dynamo hooks PEP 523, symbolically evaluates bytecode, FX graph + guards + rewritten bytecode | verified and shown instruction by instruction (eval_frame.c L247-L255; walk.py) | R1 |
| AOTAutograd: joint graph, min-cut partitioner, decomposition, functionalization | verified on the real Inductor path; measured per cut (aot.py); 0 in-place ops in the joint graph. Whole-model min-cut 1.0 saves 34,814,468 B, equal to the Compile lab (2026-10-13 fix: a first version double counted the 88,064-byte logits, returned both as user output and saved value, giving 34,902,532 at budget 1.0 and 6,991,872 at 0.2; now 6,903,808; the block figures were unaffected) | R5, T part |
| Inductor: define-by-run loop IR, fuses pointwise/reduction chains, plans memory, Triton for GPU, C++/OpenMP for CPU | verified; added: most pointwise fusion happens at lowering, the scheduler log, buffer reuse (8 in one block), Metal on MPS | R6 |
| Matmuls and attention can be autotuned against library kernels | verified as config (max_autotune); on CPU the lab measured no template chosen | R6, R7 |
| CuTeDSL backend since 2.13; combo kernels in 2.10 | partly verified: CuTeDSL config entries exist at 2.14.1 (cutedsl_enable_autotuning); combo_kernels exists and is off by default; release versions not re-checked here (root coverage verified them) | not repeated on the page (GPU-only), root carries |
| Guards on dtype, device, requires_grad, rank, sizes, module id, constants, globals | verified, tree shown (GLOBAL_STATE, TENSOR_MATCH, ID_MATCH, TYPE_MATCH ...) | R2 |
| Shapes specialised first; second distinct shape makes the dimension dynamic | verified, with the 0/1 specialisation exception (T = 1 recompiles) | R4 |
| dynamic=True, mark_dynamic | verified; added: dynamic=True gave 4 compiles here (unexplained guard failure, marked unconfirmed); mark_dynamic with bounds turns a violation into an error | R4 |
| recompile_limit default 8, then eager | verified (config.py L121; the warning text recorded; calls 9 and 10 ran eagerly) | R4 |
| Unbounded specialization sources (new module per call, data-dependent branching) | verified for value-guarded Python args (strings); module-per-call not run | R4 |
| TORCH_LOGS=recompiles prints the failing guard | verified (recorded reasons) | R4 |
| Graph breaks: compile before, run unsupported in eager, resume after | verified; corrected nuance: inside a for loop Dynamo cannot resume and skips the whole enclosing frame | R3, T brk |
| Causes: C extensions, print, unsupported builtins, .item(), if tensor | verified each (9 kinds, 12 fixes) | R3, T brk |
| Find them: TORCH_LOGS=graph_breaks, explain, tlparse | verified, all three used | R3, R12 |
| fullgraph=True errors on the first break; torchtitan runs fullgraph | verified; torchtitan 0.3.0 compiles each block with fullgraph=True (torchtitan/distributed/compile.py L70); added: fullgraph=True captures some things instead of breaking (boolean mask) | R3, R8, R9 |
| torch._check, guard_size_oblivious, torch.cond, torch.while_loop | torch._check and torch.cond verified and run; guard_size_oblivious and while_loop not run here (named only in the old text; not repeated) | R4, R11 |
| Modes table (default, reduce-overhead, max-autotune, max-autotune-no-cudagraphs) | verified from list_mode_options at 2.14.1; added the undocumented "lite" preset | R7 |
| CUDA-graph caveats; torch.accelerator.Graph (2.12); TORCH_LOGS=cudagraphs | moved: owned by Streams, CUDA graphs and multi-GPU (linked); torch.accelerator.Graph exists at 2.14.1 (checked) | R7 link |
| Compiled autograd: traces whole backward at backward time incl. hooks; first backward slow; guards on graph structure | verified and measured (730-op graph, hook inside, 52 AccumulateGrad) | R8 |
| Compiled autograd used by torchtitan for compiled FSDP2 | corrected: torchtitan 0.3.0 has no reference to compiled_autograd | R8 |
| Regional compilation: compile each layer; artifact reused; cold start minutes to seconds; documented recipe; transformers does it internally | verified and measured (9.19 s to 5.72 s, flat in depth); "transformers does it internally" not checked here (unconfirmed, dropped) | R9, T cache |
| mark_static_address for KV caches | exists at 2.14.1 (torch._dynamo.mark_static_address); not run; not repeated | none |
| Hierarchical compilation via nested-compile options | verified as torch.compiler.nested_compile_region, measured | R9 |
| Local and remote caches, FX graph cache, Mega-Cache make warm starts near-instant; critical on multi-node | verified and measured: warm 0.85 s; corrected nuance: mega-cache into an empty directory still recompiled the C++ kernels (5.06 s) | R10, T cache |
| torch.export single full graph, stricter than Dynamo; AOTInductor compiles to a shared library callable from C++ or Python | verified and measured; added: non-strict is the default, wrong specs, draft_export, the non-contiguous-input trap | R11 |
| vLLM and ExecuTorch build on AOTInductor | corrected/unconfirmed: ExecuTorch and the ONNX exporter build on torch.export (root, FACTS map); vLLM's use of AOTInductor not verified here, dropped | R11 |
| Debugging: graph_breaks,recompiles first; tlparse; verbose; eager / aot_eager bisection; output_code; unique kernel names; repro_after minifier | verified, all used; corrected: kernel names are unique by default at 2.14.1 | R12, R6 |
| Silent wrong results almost always mutation/aliasing of inputs or guards on id() | unconfirmed (opinion), dropped; a measured silent-wrong case (AOTInductor strides) is shown instead | R11 |
| Common failure modes (recompiles from dynamic lengths, breaks from logging/.item(), compile blowups, CUDA-graph memory, DDP interaction) | verified except CUDA-graph memory (moved to Streams page) | R3, R4, R9, Mistakes |
| DDPOptimizer splits graphs at bucket boundaries; FSDP2 prefers compiled autograd | first verified and measured (2, 4, 13 graphs for 25, 4, 1 MB buckets; 1 with optimize_ddp=False); second unconfirmed (python_reducer mode requires compiled autograd per config.py L406-L432; FSDP2 preference not found) | R8 |
| See also performance stack and distributed pages | carried as links to Making training fast and Distributed PyTorch | R0, F |

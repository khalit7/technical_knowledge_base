# Compile lab: visualisation ideas (built and rejected)

The question this tab keeps returning to: what does `torch.compile` actually change in one training step of the running example, and does it pay?

## Built
| Idea | Where | Why it earns its place | Data |
|---|---|---|---|
| Fusion before/after animation: tanh GELU (8 ops) or add + LayerNorm (2 ops), eager op by op against the fused kernel, tensors drawn to scale in bytes, running counters (kernels, bytes read, written), total traffic eager vs fused on one scale, measured CPU and MPS times | Section 2 | The mechanism the brief asked for, on the same input both ways; the second function shows fusion losing | fusion.py (op list and bytes recorded by a TorchDispatchMode), time_comp.py fusion |
| Predict then reveal: speed-up from 9x fewer bytes on CPU vs GPU | Section 2 | Corrects "fewer bytes means proportionally faster" | same |
| Pipeline boxes with the recorded numbers per stage, clickable | Section 1 | One-screen map of the tab, each stage measured | trace_model.py |
| Guard kinds as bars plus the log excerpt | Section 3 | Makes "549 guards" concrete and explains later recompiles | TORCH_LOGS=guards |
| Graph-break explorer: code, Dynamo's reason, compiled pieces strip of one forward, step time, fullgraph error | Section 4 | Shows the surprising result (outer frame left uncompiled) | breaks.py, time_comp.py breaks |
| Predict then reveal: what stays compiled with a print in a block | Section 4 | Same | same |
| Recompile table, three dynamic-shape strategies, cold and warm times as bars | Section 5 | Shows automatic dynamic, the mark_dynamic mistake, the eval recompile | breaks.py, time_comp.py seq |
| Saved-for-backward bars by shape and full list | Section 6 | Compiled vs eager memory, measured | trace_model.py |
| Eager calls against compiled launches, side by side, device and phase toggles, click a kernel to read it | Section 7 | "A real generated kernel next to the eager op list it replaced" | run_and_get_code |
| Step-time bars per variant with trial ranges; phase table with two runs; profiler split | Section 8 | The honest headline (no CPU gain, MPS gain) and why | time_comp.py step, phases |
| Break-even calculator (compile time / saving per step) | Section 8 | Recomputes "does compile pay" from measured defaults, labelled mixing | first-call and step timings |
| Export and AOTInductor stats | Section 9 | Real package, sizes, output match, timings | export_aoti.py |

## Rejected
- A full FX graph diagram of 59 nodes: a long strip of op chips says the same at phone width.
- All 19 CPU and 91 MPS generated kernels embedded: about 600 KB; three CPU kernels are embedded, the rest stay in inputs/code_*.py.txt.
- An animated Dynamo bytecode walk: belongs to The compiler stack page, which already has every log on small programs.
- GPU speed-up charts: no NVIDIA GPU here; published figures are quoted with their source and labelled vendor.
- A memory timeline of the compiled step: Inductor's buffer reuse is visible in the wrapper but the CPU has no allocator stats; the MPS allocator figure is given as a number.

## What the methodology lacked
Timing on a shared, loaded machine: run-to-run variation (two phase runs disagree in sign on the CPU) had to be shown rather than averaged away.

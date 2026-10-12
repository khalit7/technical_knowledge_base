# Inside one step: visual ideas, built and rejected

Question the tab answers: what actually happens, call by call, when PyTorch runs one training step, and where its memory and time go.

## Built
| # | Idea | Why it earns its place | Data |
|---|---|---|---|
| 1 | View explorer: `arange(12).view(3,4)` and four derived tensors, storage strip highlighted in the tensor's own order, offset and stride formula, same-storage flag | Strides and offsets are invisible in prose; the strip shows a transpose reading storage out of order with no copy | basics.json (real tensors) |
| 2 | Predict then reveal: what `.contiguous()` after attention copies on CPU vs MPS | Corrects "contiguous always copies"; answer computed in the browser from both traces | step_cpu.json, step_mps.json |
| 3 | Dispatch table grid (ops x keys, kernel kinds, priority order) | Makes "a table of kernels per key" literal; three cells explain three trace differences | basics.json |
| 4 | Stepper through all 923 calls (phase switch, skip views, play/scrub/speed): op card with tensors and new-storage bytes, the dispatch key stack (active and skipped keys), memory timeline with cursor (click to jump), autograd graph by module growing in forward and unwinding in backward with the current node's edges | The core of the tab: the whole step at op level from real recordings | step_cpu.json |
| 5 | Graph table: per node type, what it saves and the bytes, with the live-memory reconciliation | Answers "what does autograd keep and why" with exact numbers | step_cpu.json |
| 6 | Before/after animation: plain vs checkpointed, live bytes per call on one scale, recompute calls ticked, counters | The memory-for-compute trade seen on the same step | step_cpu.json, step_cpu_ckpt.json |
| 7 | Before/after animation: grad on vs no_grad vs inference_mode, one lane per mode coloured by what autograd did per call | Shows the dispatch-level difference between the two switches, and why the recorder sees fewer calls under inference_mode | fwd_*.json |
| 8 | Phase time bars (CPU, MPS), profiler top ops, AdamW implementation bars behind a predict | Puts the optimizer's for-loop overhead in view; fused is one argument | timing*.json |
| 9 | Checks table recomputed in the browser | Every headline number reconciles with the trace | all |

## Rejected
- Full node-link drawing of all 187 nodes with every edge: unreadable at 390 px; edges drawn only for the current node.
- Per-op profiler time in the stepper: the profiler and the dispatch mode see different call sets (473 vs 142 in forward), so a one-to-one join would be invented; aggregated table instead.
- Memory snapshot (`torch.cuda.memory._record_memory_history`) view: CUDA only; not run here.
- An MPS stepper: doubles the data for a second op list; the differences are shown as counts and in the contiguous reveal.
- The profiler's memory categories (`_memory_profile`): CUDA-oriented, and the per-storage tracking already reconciles exactly.

## What the methodology lacked
Nothing to reproduce from a publication: the evidence is the recording itself, so "defaults reproduce a published figure" is replaced by internal reconciliation (saved bytes = live delta less logits and loss; MPS allocator within 35 KB of the tracked bytes).

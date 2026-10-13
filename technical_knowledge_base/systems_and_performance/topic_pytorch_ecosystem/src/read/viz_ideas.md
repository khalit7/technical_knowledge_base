# Reading tab: visual ideas (2026-10-12)

The question the page keeps returning to: where does one training step's time and memory go, and what does each PyTorch layer add or remove?

## Built (score: reproduces a measured figure x2, computable x2, shows what a sentence cannot, misconception, animation/before-after; minus cost)
| # | Section | Visual | Why | Data |
|---|---|---|---|---|
| 1 | 0 | One forward down the stack, eager against torch.compile (6 steps each, counters for calls, autograd nodes, launches, guards) | Before/after on the same input; ties the whole page together | step and comp records (142 calls, 135 nodes, 59 ops, 549 guards, 35 launches) |
| 2 | 1 | Views explorer: 8 expressions on one 3 x 4 storage, visit order drawn on the storage, address formula checked in the page | Strides are the idea behind views, contiguity and "view fails, reshape copies" | measure.py strides |
| 3 | 2 | The same `torch.mm` call in five situations, walking the dispatch keys | Shows no_grad versus inference_mode versus autocast versus a subclass as different routes through one table; corrects "no_grad removes autograd" | measure.py dispatch |
| 4 | 3 | A two-layer graph growing in forward and unwinding in backward, plain against first layer checkpointed | Saved tensors and recompute seen, not described | measure.py tiny graph and checkpoint |
| 5 | 3 | Checkpointing on the running example: memory, backward calls, step time bars | The real cost of the trade | step records |
| 6 | 5 | Eager against compiled step time, CPU and MPS, every mode | Corrects "compile always speeds up" | comp records |
| 7 | 6 | Bottleneck hunt animation: phases, the optimizer surprise, fused fix, measured again | The method of section 6 on real numbers; predicted 19.19 ms against measured 19.08 ms | step and comp records |
| 8 | 7 | One step on 2 ranks, DDP against FSDP2, every collective from the flight recorder, shards drawn per rank; memory-per-rank bars | Before/after on the same step; uses the lab's recorded order and sizes | dist records |
| 9 | 8 | Graph break against custom op, code side by side with explain() counts | The reason custom ops have fake implementations | measure.py custom_op |
| 10 | several | Predict-then-reveal questions (views, no_grad, accumulation, compile speed, conditional collective) | Belief elicitation, reused widget | |

## Rejected
- A full op-by-op stepper of the training step in Reading: it is the Inside one step tab's main visual; linked instead.
- A fusion bytes animation: the Compile lab has it (GELU 36 MiB against 4 MiB).
- A DTensor placement explorer: the Distributed lab has one validated on 990 rank-pairs.
- A release timeline: the Ecosystem map has it.
- Timed microbenchmarks of dispatch overhead per key: noisy on a shared, loaded machine and not needed for the argument; the forward-mode timings from Inside one step suffice.
- SDPA backend chooser simulation: no CUDA here to validate the selection rules; a table and a measured error message instead.

## What the methodology lacked
A rule for root pages that teach a stack rather than compare items: the spine here is one process followed down the layers, and the comparisons are before/after pairs on that process.

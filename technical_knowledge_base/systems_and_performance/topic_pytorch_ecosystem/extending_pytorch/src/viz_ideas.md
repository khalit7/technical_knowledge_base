# Visual ideas for Extending PyTorch

Question the page keeps returning to: which hook keeps autograd, compile and export working, and what does it cost?

## Built
| Idea | Placement | Score (0-2: parameter, reproduces, computable, beyond prose, corrects misconception, central, new, animation) | Data |
|---|---|---|---|
| Dynamo tracing one forward: direct pybind call vs custom op, animated (before/after, same input), counters for graphs compiled and eager stretches | Reading 2.1 | 1+2+2+2+2+2+2+2 | graphs.json (dynamo.explain op lists) |
| One weight through one matmul, float32 vs Int8Weight, bytes to scale, recorded AOT op sequence | Reading 5.3 | 1+1+2+2+2+1+2+2 | derived bytes, subclasses.json |
| opcheck grid: 10 variants x 4 tests + graphs + compiled grads | Reading 1.7 | 0+2+2+2+2+2+2+0 | custom_ops*.json |
| Cache-trap table (4 processes) | Reading 2.3 | 0+2+2+2+2+2+2+0 | cache_trap.json |
| Per-call cost bars, overhead vs kernel toggle | Reading 3.2 | 1+2+2+1+2+1+1+0 | timing.json |
| Inductor wrapper code side by side | Reading 2.2 | 0+2+2+2+1+2+2+0 | op_extras.json |
| Custom-op lab: any two of ten variants side by side | own tab | 1+2+2+2+2+2+2+0 | custom_ops*.json |
| Subclass tracer: recorded calls replayed at __torch_function__ vs __torch_dispatch__ level, with phase counters and op histograms | own tab | 1+2+2+2+2+2+2+2 | subclasses.json |
| Which extension point? decision tree ending in skeleton, checks and measured evidence | own tab | 1+0+2+1+1+2+2+0 | all |
| Real subclasses taken apart (inner tensors, bytes) | Reading 5.5 | 0+2+2+1+1+1+2+0 | real_subclasses.json |

## Rejected
- Animating custom-op registration key by key: the sibling's Dispatcher walker already shows an instrumented custom op at every key (linked).
- A Triton kernel run in the browser or here: Triton has Linux wheels only (3.8.0); the Helion metal backend covers "a kernel DSL plugged in" with real runs.
- Helion autotuning curve: autotuning is timing-heavy on a shared machine and the metal backend is experimental; would not transfer to Triton on NVIDIA.
- PrivateUse1 demo device: needs a C++ runtime; little teaching value for the reader's goals.
- Compiled-vs-eager speed bars per variant: the custom kernel's slowness dominates and would mislead about registration cost; the per-call bars separate overhead from kernel instead.

## What the methodology lacked
No published figure to reproduce for most of this subject; the "reproduces" criterion became "recorded on this machine and checked by a script" (check_data.py). The FLOP count does reproduce exactly: 6 x 3,156,736 x 512.

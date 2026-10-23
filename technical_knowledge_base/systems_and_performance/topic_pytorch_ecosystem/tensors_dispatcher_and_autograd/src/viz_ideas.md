# Visual ideas: built and rejected

The question the page keeps returning to: for one call, which pieces of PyTorch act on it, in what order, and what do they keep for backward? Every visual makes one part of that observable on a real record.

## Built (score out of 14 on the Methodology's questions; reproduce and computable count double)

| # | Visual | Where | Data | Why it earns its place | Score |
|---|---|---|---|---|---|
| 1 | Before/after animation: x.t() (header only) against x.t().contiguous() (a copy), same 12 cells, address formula per step, bytes-copied counter | Reading 1.2 | tensors.json | Shows a view and a copy as two animations of one input; the "jumps" counter is why view(12) fails | 11 |
| 2 | Type-promotion grid, 11 x 11, from torch.promote_types, cells that are neither input outlined | Reading 1.4 | tensors.json | Whole rule in one picture; corrects "the wider type wins" (bf16 + f16 = f32, u8 + i8 = i16) | 10 |
| 3 | Dispatch key ladder with the wheel's enum numbers | Reading 2.2 | dispatch.json | Priority made concrete | 7 |
| 4 | Slot statistics over all 3,113 aten ops, per key | Reading 2.4 | dispatch.json | Shows fallthrough and math kernels are the norm, not the exception | 9 |
| 5 | Before/after walk: one custom op instrumented at every key, plain vs inference_mode vs autocast vs no_grad | Reading 2.5 | dispatch.json walk | Ground truth of kernels run, not a diagram; no_grad and plain identical, inference_mode skips autograd | 13 |
| 6 | Functionalization: make_fx graph before and after | Reading 2.7 | dispatch.json | Real traced code; mutation becomes data flow | 8 |
| 7 | Per-call overhead bars in 6 dispatcher situations | Reading 2.9 | timing.json (bench lock) | The cost of dispatch as a number | 8 |
| 8 | Stride explorer: 36 recorded tensors plus running-example q/k/v, logical grid against storage strip, play through index order, read counts (stride 0, overlap), free strides mode computed in the browser | Tab | tensors.json | Every address checked by arange values; channels_last on real strides | 12 |
| 9 | Dispatcher walker: two situations side by side, stepped kernel by kernel; aten calls in 4 contexts with the reconstructed route and what the top and the Python key saw | Tab | dispatch.json | Before/after on the same op; shows that a dispatch mode's view depends on grad mode | 12 |
| 10 | Autograd engine stepper: one block's 46-node graph (54 on MPS), ready queue and counts re-run from engine.h's rule, saved bytes held, aten calls per node incl. checkpoint recompute; plain / checkpointed / offloaded | Tab | engine.json | Reproduces the recorded order exactly (by construction of the rule, checked independently against pre-hook records); before/after on one input | 13 |
| 11 | Version-counter lab: 14 snippets, versions per line, predict then reveal | Tab | autograd.json | Errors reproduced; two silent-wrong-gradient cases | 11 |
| 12 | Predict-then-reveal drills (8) | Reading | various | Belief elicitation | n/a |

## Rejected

- Animated autograd graph of the whole model (187 nodes): the root's Inside one step tab already has it; one block shows the engine better.
- A memory-over-time chart of the step: root's Inside one step owns it.
- Timing chart of checkpoint variants as its own visual: two numbers, put in a table caption.
- Dispatch trace via TORCH_SHOW_DISPATCH_TRACE: not compiled into the release wheel (tested: prints nothing), so the instrumented custom op replaced it.
- A CUDA column in the walker: no NVIDIA GPU here; said in "What carries over".

## What the Methodology lacked for this page

A runtime page has no published figure to reproduce; the substitute was reproducing PyTorch's own behaviour: the engine order from its scheduling rule, addresses from strides, the key set from the formula in DispatchKeyExtractor.h.

## 2026-10-23 rebuild (teaching contract): what moved, what was added

Kind of concept decides the form. All new visuals are SVG drawn at the measured width; none plays by itself.

| Visual | Kind | Where now | Status |
|---|---|---|---|
| Hero: `torch.mm(x, w)` as header over storage, the keys it walks, the node it records | structure (static annotated) | top of Reading | new |
| View against `.contiguous()` (built #1) | before/after stepper | Reading 1, redrawn as SVG with the address arrow | moved/redrawn |
| Key ladder (built #3) | structure (static) | Reading 2.1, SVG | redrawn |
| Walk of one call key by key (built #5 and #9 A) | process, before/after | Reading 2.2, one SVG stepper, two situations side by side, all eight records | merged; tab removed |
| Slot statistics (built #4) | structure (static bars) | Reading 2.3, SVG | redrawn |
| Real aten calls in four contexts (built #9 B) | explorer | Reading 2.6, closed block | moved; tab removed |
| Autograd graph (built #10) | process: forward builds, backward runs | Reading 3, inline, with a new forward phase and a saved-bytes curve | moved and extended; tab removed |
| Version-counter mechanism | structure in three states | Reading 3.3 | new |
| Version-counter lab (built #11) | predict then reveal | Reading 3.3, inline | moved; tab removed |
| Custom Function in the graph | structure (static) | Reading 3.4 | new |
| Checkpoint variants: memory after forward, backward calls, recomputed matmuls | before/after bars | Reading 3.6 | new (was a table only) |
| Promotion grid (#2), overhead bars (#7), functionalisation graphs (#6) | | closed blocks | kept, closed |
| Stride explorer (#8) | explorer | own tab | kept: a tool over 44 tensors used across section 1 |

Rejected in the rebuild: a separate static figure for the key-set formula (the walk stepper's step 0 caption states each side's key set and why each key is skipped, which is the formula applied); an SVG redraw of the Stride explorer's cells (the tab works and is not the explanation of one mechanism).

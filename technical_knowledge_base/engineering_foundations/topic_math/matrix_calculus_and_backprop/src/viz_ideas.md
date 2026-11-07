# Matrix calculus and backprop: visual ideas

Central question: how does a framework get every slope of one loss, what does that cost in arithmetic and memory, and how do you derive and check one layer's rule by hand?

## Built (scored 0-2 on: moving parameter, reproduces a source, computable from public data (x2), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere, step animation; minus build cost)
| # | Idea | Where | Score | Notes |
|---|---|---|---|---|
| 1 | One chain, four schedules (inference / store everything / checkpoint every k / store nothing), animated, n and k sliders, counters for held, peak, layer evaluations | Reading s9 | 13 | Khalid's before/after pattern; reproduces Chen et al.'s n/k + k shape; real values and gradients in the boxes; schedules recomputed in recompute.py |
| 2 | Measured memory timeline of one training step on MPS, store-all against checkpoint every block and every other block, plus inference | Reading s9 | 12 | Real allocator counts after every op; held memory equals the graph walk to 444 bytes |
| 3 | Forward mode (6 tangent sweeps) against reverse mode (1 sweep) on the tiny model, gradient grid filling, counters | Reading s4 (2026-10-24) | 11 | Before/after on the root's model |
| 4 | jacfwd against jacrev timings, one output vs one input | Reading s4 | 10 | Real; shows the crossover the survey states |
| 5 | Forward vs backward FLOPs (exact 2.00) and time (1.44 overall, 2.14 for matmuls; softmax the exception) | Reading s8 | 11 | Corrects "twice in time" |
| 6 | HVP vs explicit Hessian time against n | Depth block (2026-10-24) | 10 | Also found double backward faster than forward-over-reverse in PyTorch |
| 7 | Einsum cost and backward-spec calculator | Depth block | 7 | Small; reproduces the old page's 16,777,216 |
| 8 | Derivative workbench: six layers, derivation, shapes, live FD check with selectable h, Jacobian built from unit VJPs, LN kernel form | Reading s6, inline since 2026-10-24 | 12 | Asked for; checked against autograd |
| 9 | Real autograd graph: 71 nodes, saved tensors, engine order replay | Closed block in s12 since 2026-10-24 | 11 | Real PyTorch 2.14.1 output; the engine itself is owned by Tensors, the dispatcher and autograd |

## Added 2026-10-24 (teaching-contract rebuild)
| # | Idea | Kind | Where | Notes |
|---|---|---|---|---|
| 10 | Hero: the two-layer network forward and backward, shapes, kept activations, one VJP per arrow, weight gradients as outer products | static annotated diagram | top | the picture the whole page elaborates; same drawing as 11 |
| 11 | Backprop by hand through the root Gradient lab's two-layer ReLU network, 12 steps with numbers and multiply-add counters | stepper | s5 | the brief's "two-layer network by hand"; numbers from two_layer.py, checked against autograd (4.4e-16) |
| 12 | dz/dW for z = Wx as three 3 x 2 slices, 12 of 18 zero, beside J = W | static diagram | s1 | why the big derivative arrays are never built |
| 13 | The same six slopes in both layouts, one entry highlighted | static diagram | s2 | |
| 14 | Attention forward and backward shapes to scale, T x T blocks highlighted, D as one number per query | static diagram | s6f | "attention at the level of shapes" |
| 15 | Gradient norm by layer over 30 random layers, one slider (per-layer gain g), linear against tanh against g^(n-k) | slider | s10 | vanishing and exploding as a property of the product; seeded, recomputed by two_layer.py |
| 16 | One-sided against central finite-difference error against h, log-log | static chart | s11 | from recompute.py's fd_zsat; the root's Gradient lab keeps the full V shape |

No real image: the page is about a mechanism, not a physical object, so a diagram is the right tool (teaching contract, Images).

## Rejected
- A drawn node-link graph of the 71 nodes: unreadable at 390 px; the ordered list with edges ("sends gradients to #k") works at every width.
- Rebuilding the root's FD error-vs-h V plot: exists on the root's Gradient lab; linked. (The backprop tape on the two-layer network is now drawn here, section 5, because this page owns backprop by hand; the root should link it.)
- A slider for the multiplication order (d^2 against d^3 per layer): one sentence says it completely; the forward/reverse stepper shows it.
- Real weights of a pretrained model: the subject is the mechanism, which a small randomly initialised stack shows exactly; pretrained weights would add download size without teaching more.
- Korthikanti 34sbh activation calculator: owned by Distributed Training.

## What the methodology lacked
Measured wall-clock numbers on a shared laptop vary run to run (bwd/fwd 1.44, 1.57, 1.95 across three runs); the page states the variance and leans on exact FLOP and allocator counts.

## 2026-11-07: split layout and 3D stages (renderer v2)
| # | Idea | Kind | Where | Notes |
|---|---|---|---|---|
| 17 | The two-layer network as a chain in depth: values forward along the front row (green flows), gradients back along the row behind through the same glass weight plates (blue flows), weight gradients rising as outer-product bar fields behind each plate, kept activations on orange plinths | 3D stage, 5 steps | top (Fig. 1), replaces 10 | real values and gradients from MC2.two() |
| 18 | The same scene, 12 steps with the numbers, the camera moving in close on each layer | 3D stage | s5 (Fig. 5), replaces 11 | step list carries the old captions and counters |
| 19 | Jacobians of the tiny model: J = W as a plate and laid flat, softmax's 3 x 3 Jacobian as a signed bar field, dz/dW as three 3 x 2 slices (12 of 18 zero), contracted by z-bar into W-bar | 3D stage, 4 steps | s1 (Fig. 2), replaces 12 | MC.tinyAll() |
| 20 | Reverse against forward mode: adjoints run back once (blue) and fill all six cells of dL/dW at once; tangents run forward once per weight (gold) and fill one cell per sweep; two step lists swapped by a mode toggle | 3D stage, 6 and 8 steps | s3 and s4 (Fig. 3), replaces 3 | MC.tinyAll(), MC.tinyJvps(); forward mode grouped one sweep per step (the long-replay rule) |
| 1 | The four memory schedules | widget, no autoplay | s9 | up to about 60 events, so a widget the reader drives (long-replay rule b); opens on the turn from forward to backward |

Kept 2D, and why: the layouts figure (a small table read flat), jacfwd against jacrev and the FLOP and time bars (numbers on axes, a log axis), the memory timeline (a curve), the gradient-product slider and the finite-difference chart (log axes), attention's shapes (a flat to-scale comparison of block sizes), the workbench (tables of numbers) and the autograd graph explorer (a list). Considered and not built: a 3D stage for checkpointing (the schedule is a one-dimensional chain over time, which the 2D widget already shows with real values); an outer-product bar field for 6a on its own (the network stages already show two).

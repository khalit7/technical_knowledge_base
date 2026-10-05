# Matrix calculus and backprop: visual ideas

Central question: how does a framework get every slope of one loss, what does that cost in arithmetic and memory, and how do you derive and check one layer's rule by hand?

## Built (scored 0-2 on: moving parameter, reproduces a source, computable from public data (x2), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere, step animation; minus build cost)
| # | Idea | Where | Score | Notes |
|---|---|---|---|---|
| 1 | One chain, four schedules (inference / store everything / checkpoint every k / store nothing), animated, n and k sliders, counters for held, peak, layer evaluations | Reading s9 | 13 | Khalid's before/after pattern; reproduces Chen et al.'s n/k + k shape; real values and gradients in the boxes; schedules recomputed in recompute.py |
| 2 | Measured memory timeline of one training step on MPS, store-all against checkpoint every block and every other block, plus inference | Reading s9 | 12 | Real allocator counts after every op; held memory equals the graph walk to 444 bytes |
| 3 | Forward mode (6 tangent sweeps) against reverse mode (1 sweep) on the tiny model, gradient grid filling, counters | Reading s7 | 11 | Before/after on the root's model |
| 4 | jacfwd against jacrev timings, one output vs one input | Reading s7 | 10 | Real; shows the crossover the survey states |
| 5 | Forward vs backward FLOPs (exact 2.00) and time (1.44 overall, 2.14 for matmuls; softmax the exception) | Reading s8 | 11 | Corrects "twice in time" |
| 6 | HVP vs explicit Hessian time against n | Reading s12 | 10 | Also found double backward faster than forward-over-reverse in PyTorch |
| 7 | Einsum cost and backward-spec calculator | Reading s13 | 7 | Small; reproduces the old page's 16,777,216 |
| 8 | Derivative workbench: six layers, derivation, shapes, live FD check with selectable h, Jacobian built from unit VJPs, LN kernel form | Own tab | 12 | Asked for; checked against autograd |
| 9 | Real autograd graph: 71 nodes, saved tensors, engine order replay | Own tab | 11 | Real PyTorch 2.14.1 output |

## Rejected
- A drawn node-link graph of the 71 nodes: unreadable at 390 px; the ordered list with edges ("sends gradients to #k") works at every width.
- Rebuilding the root's backprop tape and FD error-vs-h plot: exist on the root's Gradient lab; linked.
- Real weights of a pretrained model: the subject is the mechanism, which a small randomly initialised stack shows exactly; pretrained weights would add download size without teaching more.
- Korthikanti 34sbh activation calculator: owned by Distributed Training.

## What the methodology lacked
Measured wall-clock numbers on a shared laptop vary run to run (bwd/fwd 1.44, 1.57, 1.95 across three runs); the page states the variance and leans on exact FLOP and allocator counts.

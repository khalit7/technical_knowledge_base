# Libraries on top of PyTorch: visual ideas, built and rejected

Central question: what does a training library do on top of the loop I would write, and which of its defaults change my results?

## Built

| # | Idea | Placement | Score (0-2 each: parameter to move, reproduces a fact, computable, beyond a sentence, corrects a misconception, central question, absent elsewhere, animation; build cost subtracted) | Data |
|---|---|---|---|---|
| L1 | **Defaults lab, before/after**: the plain loop against any of 10 library settings over the same 150 steps, drawn step by step, with probe loss, training loss, learning rate or gradient norm; caption per step (lr, norm, clipped or not, both losses), counters; chips to add any other run | Own tab | 2+2+2+2+2+2+2+2-1 = 15 | `defaults_lab.json` (11 real runs) |
| L2 | **Accumulation before/after animation**: the same 8 rows as 4 micro-batches, each row's share of the gradient under the mean of means against token weighting, drawn against the full batch's share, micro-batch by micro-batch, ending on the measured 59% gradient error | Reading, section 3 | 1+2+2+2+2+2+2+2-1 = 14 | `accum_lab.json` |
| L3 | **What calls what, before/after**: the recorded key calls of one run in first-seen order, stepped against the plain loop's own calls (matching calls highlighted on both sides; calls the plain loop never makes called out), with per-step call counts by kind for 15 runs | Own tab | 1+2+2+2+1+2+2+2-1 = 13 | `calls_*.json` (sys.setprofile traces) |
| L4 | Gradient norm per step against the clip line | Reading, section 2 | 0+2+2+2+2+1+2+0 = 11 | `defaults_lab.json` |
| L5 | Predict-then-reveal x 3 (same losses through the Trainer?; how often does clip 1.0 bite?; does the mean of means diverge?) | Reading, sections 1 to 3 | 0+2+2+1+2+2+1+0 = 10 | recorded runs |
| L6 | Final probe-loss bars for the 11 runs | Reading, section 2 | 0+2+2+1+1+2+1+0 = 9 | `defaults_lab.json` |
| L7 | Chooser with reasons tied to recorded facts, and a porting checklist that highlights every default that differs between two ways of training | Own tab | 2+1+2+1+2+2+2+0-1 = 11 | source-read defaults |
| L8 | torchtitan "what broke on CPU" as four stacked cards with the exact error and the smallest patch | Reading, section 6 | 0+2+2+1+2+1+2+0 = 10 | run logs |
| L9 | Tables filled from data: who divides by what (measured error), torchtitan runs, DeepSpeed stages (losses, state bytes, collectives) | Reading | 0+2+2+1+1+2+1+0 = 9 | inputs |

## Rejected

- Timing each library's overhead per step: CPU-only, small, load-dependent; the lock belongs to timing pages; the call counts in L3 show the overhead's shape without a clock.
- Rebuilding the root's atlas, release timeline or the "five doors" call-stack animation: the root's Ecosystem map owns them; this page links them and adds the ordered boundary trace instead.
- A loss-curve chart of torchtitan against the running example: different models, data and vocabulary; a table of its own runs says what matters (AC changes nothing, bf16 moves the third decimal).
- FSDP2 through Accelerate: Accelerate ignores the FSDP plugin on CPU (root map), so there is nothing real to draw.
- Running Axolotl or Unsloth: pinned stacks and GPU-only dependencies; read from source and labelled.
- Animated ZeRO stage memory: theory owned by Distributed Training and the ZeRO paper page; the DeepSpeed table carries the measured bytes.

## What the methodology lacked

A rule for "defaults" pages: a default is only a fact with its version, and the strongest evidence is the same script run before and after the default (here the DeepSpeed 0.19.2 to 0.19.3 change, reproduced by toggling the key). Also: when a trace tool reports calls, say what it cannot see (C++-issued collectives), or a reader concludes DDP makes no collectives.

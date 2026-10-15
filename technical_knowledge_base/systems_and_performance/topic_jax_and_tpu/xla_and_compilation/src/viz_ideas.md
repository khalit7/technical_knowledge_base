# Visual ideas: XLA and compilation (prefix xp)

The question the page keeps returning to: **what did the compiler do to my train step, and what does each decision cost (bytes, kernels, memory, compile time)?** Every visual below makes one of those measurable on the running example, from real compiler output.

## Built

| # | Visual | Where | Data | Why it earns its place | Score (0-2 per question, 7 questions) |
|---|---|---|---|---|---|
| 1 | Pass staircase, animated (before/after on the same program, pass by pass) | Reading s3 | per-pass dumps of the attention block (fwd+bwd) and the train step (`passes_diff.py`) | Shows where instructions disappear (CSE) and where the cliff is (fusion); a step-by-step animation with a caption per pass | 11 |
| 2 | Softmax three ways (default / library off / fusion pass off), kernel boxes animated | Reading s4 | `fusion_lab.py` breakers, real kernel lists and `cost_analysis` bytes | The same input before and after fusion; shows the library split and the tree-reduction rewrite | 12 |
| 3 | Fusion refusal counts, as bars | Reading s4 and Fusion explorer | XLA's own VLOG decisions (`TF_CPP_VMODULE`) | Turns "why didn't it fuse" into XLA's reasons, counted | 10 |
| 4 | Live bytes over the schedule, animated cursor, phase bands, peak dot | Reading s6 | `*-live-range.txt` + `*-buffer-assignment.txt` (`buffer_lab.py`) | The memory plan nobody sees in PyTorch; reconstruction checked against XLA's own peak (0.3%) | 12 |
| 5 | Peak attribution bars | Reading s6 | XLA's "Stack trace breakdown for peak usage" | Which JAX op holds the bytes at the peak | 9 |
| 6 | Recompile storm against buckets, animated call by call (before/after) | Reading s10 | `recompile_lab.py`, 3 repeats | 64 compiles against 4 on the same loop | 11 |
| 7 | Four forms of one attention block (switch) | Reading s1 | `lowering.py` | Read the same program at each stage | 8 |
| 8 | Primitive expansion table | Reading s1 | locations in the step's StableHLO and HLO | Shows what lowering rules do (implicit broadcasts become explicit) | 8 |
| 9 | Pass diff viewer tab | own tab | per-pass diffs, opcode deltas, CPU/GPU source lines | "Across all passes, what changed": room for diffs | 10 |
| 10 | Fusion explorer tab: 783 tiles, refusal examples, 13 breaker programs x 3 settings | own tab | `fusion_lab.py` | Every fusion of the step with phase and model function | 10 |
| 11 | Recompile detective tab: 11 predict-then-reveal cases | own tab | `recompile_lab.py` | Belief elicitation with JAX's real explanations | 9 |
| 12 | Profile reader tab: mini trace viewer with zoom, kernels joined to phases | own tab | `profile_lab.py` + fusion catalogue | Reading a trace on the running example; what each xprof view returns on CPU | 9 |
| 13 | Tables: cache cases, export per platform, flag settings, in-place check | Reading s6, s8, s9, s12 | the lab scripts | Each a measured answer to a question people get wrong | n/a |

## Rejected

- Rebuilding the root's five-forms stepper and MLP-block fusion animation: owned by the root's Compiler lab, linked instead.
- A GPU or TPU pass diff: cannot run here (no device; TPU compiler closed). The GPU-only passes are listed from source instead.
- A compile-time breakdown per pass: XLA did not report per-pass timing with the flags used; skipped rather than estimated.
- Animating Inductor against XLA on the PyTorch twin: owned by the CUDA topic's compiler-stack page.
- xprof's op profile and memory profile views: empty on CPU (recorded on the page as a finding).

## What the methodology lacked
A rule for **compiler internals with no published figure to reproduce**: here the "reproduce" check became "reconstruct XLA's own reported number from its dump" (peak memory within 0.3%; kernel counts reconciled with the root's lab, which counted reducer bodies as kernels).

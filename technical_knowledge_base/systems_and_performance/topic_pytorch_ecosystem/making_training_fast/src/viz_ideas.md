# Visual ideas: Making training fast

The question the page keeps returning to: **where does this step's time and memory go, and which change moves it?** A visual earns its place when it makes that measurable on the running example.

## Built

| # | Visual | Where | Why it earns its place | Data | Score (of 14, methodology section 2) |
|---|---|---|---|---|---|
| 1 | **Two real profiler traces on one clock, animated playhead** (before: as first written; after: the fixes kept), MPS and CPU, zoom, pan, click any bar; ATen self-time table | Profiler trace tab | The before/after on the same input (same model, same batch, same step): you see the 117 ms `.item()` wait on MPS and the 17 ms data range vanish. Real traces, not drawings | hunt.py trace, compact_trace.py | 13 |
| 2 | **Memory by category through one step, animated, plain against three checkpointing modes on one scale**, counters (live, activations, gradients, peak so far) | Reading s7 | Shows the peak is a moment, where it moves when checkpointing (start to end of backward), and which category dominates | mem_step.py (memory profiler) | 13 |
| 3 | **Memory budget calculator**, two competing moments, formulas read off saved tensors; validation table: 9 measured runs, all within 3% | Memory budget tab | Recomputes measured figures from a formula with every input movable; presets up to an 8B-scale shape | saved_formula.py, mem_step.py | 13 |
| 4 | **Attention mask lab**: position grid and tile grid side by side, kernel sweep animated, dense SDPA against FlexAttention BlockMask, counters; recomputed tiles checked against the recorded BlockMask | Attention lab tab | Before/after of the same mask; makes "block sparsity" countable; the browser's counts must equal PyTorch's | flex_lab.py | 12 |
| 5 | Hunt stage bars, animated stage by stage, kept vs reverted coloured; per-phase bars | Reading s3 | The method as a picture: one fix at a time, keep only what beats the spread | hunt.py time/phases | 11 |
| 6 | Predict-then-reveal: activations vs weights at the peak; which fix wins on MPS | Reading s7, s3 | Belief elicitation where intuition is wrong (bf16 and compile lose here) | measured | 10 |
| 7 | Bars: timing three ways, data loader sweep, optimizer impls, bf16 matmul GFLOP/s, checkpointing peaks and times, fused-loss peaks, attention saved bytes vs T, torchao latency at M = 1 and 2,048 | Reading s1, s4, s5, s6, s8, s9, s10, s11 | Each one number with something to move (device, size) and a sourced measurement | time_misc.py, mem_step.py, attn_backends.py | 8 to 10 |
| 8 | Tables: SDPA kernel that ran per input and what forcing does; torchao configs with bytes, loss, errors | Reading s10, s11 | Categorical facts per item, read verbatim from runs | attn_backends.py, torchao_lab.py | 9 |
| 9 | Float8 emulated vs float32 loss curves | Reading s11 | Shows numerics only, and the one spike | torchao_lab.py | 8 |

## Rejected

- **GPU kernel timeline for MPS** (Metal GPU lane): not available from torch.profiler on MPS (signposts go to Instruments); a derived lane from synchronised phase times would look measured and is not.
- **Re-drawing the root's step trace or checkpointing animation**: the root's Inside one step tab owns them; linked.
- **A FlexAttention speed chart against FlashAttention-2**: vendor numbers only, nothing to move; quoted in text.
- **SAC in the calculator**: the saved set depends on the policy and the op names per device; shown as measured bars instead.
- **An int4 "4x smaller" bar**: the CPU int4 path stores bytes; showing the format's theoretical size would mislead. The table shows measured bytes.
- **Memory snapshot (memory_viz) replica**: needs CUDA; the CPU memory profiler timeline is the honest substitute.

## What the methodology lacked for this page

A rule for **negative results**: two "standard" fixes (bfloat16, torch.compile) slowed this machine down. The page keeps them, marks them reverted, and explains which way they would move on NVIDIA hardware, rather than dropping them or presenting laptop results as general.

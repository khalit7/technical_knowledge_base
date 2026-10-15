# Transforms lab: visual ideas, built and rejected

Central question of the tab: what does a JAX transformation actually do to my Python, and what does that cost me (recompiles, errors, silent bugs)?

Scored 0 to 2 on the Methodology's questions (moving parameter, reproduces a figure, computable from real data, shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere), build cost subtracted.

## Built

| # | Visual | Score | Why it earns its place |
|---|---|---|---|
| 1 | Tracing animation: the running example's `attention` (and `mlp`) Python beside its real jaxpr, one equation per step, each linked to its Python line through `source_info_util.user_frames`; counters of equations, matmuls, shape-only ops | 11 | The required before/after on the same input. Shows Python disappearing, the generator expression tripled, constants folded, nested `jit` equations from `jnp` functions. Not on the Reading tab (which shows a static MLP jaxpr) |
| 2 | "Will this recompile?" drills: 14 predict-then-reveal cards with measured traces and compiles and JAX's own cache-miss log | 12 | Corrects real misconceptions (re-wrapping jit does not recompile; a new lambda does; weak types; int64 does not). Every answer is a measured count |
| 3 | Pytree explorer of the model's 69 parameters: expand, select, see path, shape, flatten index and PyTorch name (with transposition) | 9 | Makes "params is one value" concrete and links to the PyTorch state_dict the reader knows |
| 4 | vmap animation: MLP on one token beside vmap(mlp) on 4,096 tokens, equation by equation, batch dimension highlighted, the two extra broadcasts called out | 10 | Second before/after on the same input; shows a batching rule at work instead of describing it |
| 5 | Batching rule of `dot_general` toggle: one function, four programs (scalar, matvec, batched dot, full Q K^T) | 8 | The attention score matrix appearing from a one-pair function is the clearest demonstration of vmap's rule |
| 6 | Per-parameter gradient difference dot plot (log scale), JAX against PyTorch, key biases flagged | 8 | Shows agreement at float32 noise everywhere and explains the outlier |
| 7 | Jaxpr size against depth chart (unrolled loop against scan, 1 to 32 layers) | 7 | The compile-size argument for scan, measured |
| 8 | Per-example gradient timing bars plus agreement table plus norm strip | 7 | Timings labelled rough; agreement exact |
| 9 | Interpreter flow diagram plus verbatim source excerpts (13, with line links) plus a 33-line toy JAX checked against JAX | 9 | Goal 2 (internals) with pinned file:line |

## Rejected

- A key-split tree animation (keys as a growing binary tree): pretty, but a table of real values teaches the same rule; cost not worth it.
- A recompile timeline animation of the train step: the Reading tab already animates eager against jit with a recompile on call 4.
- Timing jit against eager per primitive: belongs to the Compiler lab (fusion), and CPU numbers mislead.
- An animated autodiff tape (forward then backward sweep): the child page JAX core is the better home for reverse mode in depth; here the LinearizeTrace excerpt and the grad comparison suffice for a root lab.

## What the Methodology lacked

Nothing to reproduce from a publication: the "published figure" of this tab is JAX's own behaviour, so the reproduce criterion was read as "the count or message is produced by the real library, not described".

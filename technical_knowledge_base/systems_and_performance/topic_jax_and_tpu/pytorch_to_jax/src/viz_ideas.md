# PyTorch to JAX: visual ideas

Central question: "my JAX port runs; is it the same model, and if not, where does it differ?" Each visual makes one part of that measurable on the running example (or on GPT-2). Scores 0 to 2 on the methodology's questions (parameter to move, reproduces a figure, computable, beyond a sentence, corrects a misconception, central, new, animatable); reproduce and computable count double. The "reproduction" here is the PyTorch twin (or transformers' GPT-2): every JAX number is checked against it.

## Built

| # | Visual | Score | Data | Placement |
|---|---|---|---|---|
| 1 | Evidence ladder, animated: the correct port and a chosen port climb logits, loss, gradients, one step, curves side by side (before/after on the same batch), cells turn green or red at stated thresholds, caption names the first failing rung | 16 | `pj_hunt.py` rungs for all 18 variants | Reading, section 4 |
| 2 | Divergence hunter: 17 porting differences (7 reused from the root, 10 trained here), |loss - PyTorch| on a log scale or raw loss, play through 300 steps, ladder table per selected run | 16 | `pj_hunt.py`, root `pitfalls.json` | own tab |
| 3 | Float32 vs float64 bars per rung, correct port vs tanh-GELU bug, plus PyTorch's clip formula in float64 | 15 | `pj_ladder.py` | Reading, section 4 |
| 4 | Weight transpose animation on a real 6 x 8 tile (row becomes column), with a GPT-2 Conv1D toggle where nothing moves (before/after) | 13 | `pj_convert.py`, `pj_gpt2.py` | Reading, section 3 (moved from the Weight conversion tab, 2026-10-23) |
| 5 | Name map of all 69 tensors (filter transposed, GPT-2), click for rule | 11 | `pj_convert.py` | Reading, section 3, closed block (moved 2026-10-23) |
| 6 | Port drills: 11 PyTorch snippets, 2 or 3 real JAX candidates each, real outputs and errors revealed | 13 | `pj_drills.py` | own tab |
| 7 | One boolean mask, three meanings (SDPA, JAX/Flax, nn.MultiheadAttention) as 4 x 4 cards | 12 | `pj_defaults.py` | Reading, section 2 |
| 8 | Fast-variance error by mean offset, log bars | 11 | `pj_defaults.py` | Reading, section 2 |
| 9 | Dropout curves: PyTorch, JAX fresh keys (two seeds), JAX reused key, no dropout | 10 | `pj_dropout.py` | Reading, section 2 |
| 10 | Drift by 500-step window from the root's 4,000-step twins | 9 | root `twin_long.json` | Reading, section 5 |
| 11 | Page map (five stages, clickable) | 7 | none | removed 2026-10-23: navigation, not teaching; replaced by the hero |

## Added 2026-10-23 (teaching-contract rebuild)
| # | Visual | Kind | Data | Placement |
|---|---|---|---|---|
| 12 | Hero: the same training step in PyTorch and JAX, four kinds of state colour-coded (in place against in and out) | static annotated diagram (structure) | the root's `model_torch.py` and `model_jax.py` | Reading, top |
| 13 | Side-by-side code stepper: the root's real twin files, differing lines highlighted, one step per difference (weights, keys, gradients, optimiser state, eager against traced), static captions | stepper (a process with a before/after) | the root's model files, line numbers checked | Reading, section 1 |

## Rejected
- Re-running the root's seven pitfall variants or the 4,000-step twins: published by the root lab, identical harness (checked: the correct curve reproduces exactly); cited instead (Khalid, 2026-10-15: skip expensive runs that teach little).
- A combinatorial "toggle several defaults at once" hunter: 2^17 runs; one combined "naive port" run shows that differences add up roughly, which is the lesson.
- A full GPT-2 fine-tuning twin: inference logits and greedy text already prove the port; training it adds CPU hours and no new lesson.
- Animating DLPack pointer sharing: a single fact (same pointer); stated with the aliasing measurement instead.
- Step-time race between frameworks: misleading on a loaded shared CPU (root lab's rejection stands).
- A torchax eager-mode demo: `extract_jax` gives the pure function that jit, grad and sharding need; eager mode adds nothing for a port.

## What the methodology lacked here
No published figure to reproduce; the reference is the other framework. The float64 rerun is the closest thing to "reproducing": it shows which differences are rounding (they vanish) and which are semantics (they stay), and it found that Adam amplifies tiny-gradient rounding by lr / eps.

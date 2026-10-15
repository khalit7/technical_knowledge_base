# Visual ideas: The JAX training stack (prefix ts)

Central question: "how does each library hold the state of a training run, and how do I know the run I resumed, sharded or fed is the run I meant?" Every visual makes one part of that measurable on the parent topic's running example. Scores 0 to 2 on the methodology's questions (parameter to move, reproduces a figure, computable, beyond a sentence, corrects a misconception, central, new versus the root's Training lab, animatable); reproduce and computable count double.

The root's Training lab already built (and this page links, not rebuilds): the NNX split animation, the optax chain builder checked against optax, porting pitfalls, PyTorch vs JAX twins trained 4,000 steps, the orbax resume timeline (plain JAX), bfloat16 with and without a master copy.

## Built

| # | Visual | Score | Data | Placement |
|---|---|---|---|---|
| 1 | Resume lab: five restore variants (everything, no data, no optimiser, no RNG, Params only) animated against the uninterrupted run, loss and log-gap panels; checkpoint files; RNG and iterator state | 16 | `ts_ckpt.py` (separate processes, NNX with dropout) | own tab |
| 2 | Unrolled vs `nnx.scan` before/after animation at 4, 8, 16 layers: blocks traced, jaxpr equations and HLO lines to scale, parameter layout | 14 | `ts_nnx.py` E7 | Reading 2 |
| 3 | Optimiser lab: one real AdamW step stage by stage (clip, m, v, bias correction, Adam direction, decay, lr) for 8 numbers and 12 steps, hand decomposition checked against `tx.update` | 14 | `ts_optax.py` S1 | own tab |
| 4 | Muon Newton-Schulz: singular-value spectrum of a real gradient before and after each of 5 iterations | 13 | `ts_optax.py` S8 | Optimiser lab |
| 5 | Data lab: grain batches cell by cell for four pipelines x 0/2/4 workers, cells out of place outlined | 14 | `ts_grain.py` G1 | own tab |
| 6 | State inspector: the real NNX state split by any filter, module by module, for 4 model variants; graphdef static attributes; optimiser state | 12 | `ts_nnx.py` E1, E2, E7, E9 | own tab |
| 7 | Mesh restore table with the "into the saved shardings" row (the finding that the compiler re-shards state after one step) | 13 | `ts_ckpt_mesh.py`, `ts_mesh_det.py` | Reading 5, Resume lab |
| 8 | Four optimisers 300 steps (AdamW, Lion, Muon default, Muon excluding embeddings) | 9 | `ts_optax.py` S9 | Reading 4 |
| 9 | float16 loss-scale table and loss-gap-from-float32 chart for no scaling, static and dynamic scales | 11 | `ts_mixed.py` | Reading 7 |
| 10 | Complete script: A vs B+C validation loss, kept checkpoints | 11 | `ts_full.py` | Reading 9, Resume lab |
| 11 | Predict-then-reveal drills (filter leaf count, resume without data iterator) | 8 | E2, ckpt | Reading 1, 5 |

## Rejected
- A graphdef tree diagram of all 170 nodes: a table of node kinds and a static-attribute table say the same in less space; the State inspector shows the leaves.
- Animated Adam moments over hundreds of steps: the root's chain builder already plots them; the stage-by-stage view is what was missing.
- Multi-process grain throughput bars: on a machine at load 40 to 100 the worker speed-ups were not measurable reliably (kept as a sentence, not a chart).
- Emergency checkpointing animation: not runnable here (needs several hosts and slices); described from the source instead.
- A Linen/Equinox/NNX side-by-side code view: the root's Training lab has it; this page uses a comparison table of how state is held.
- Optimiser bar race (val loss of AdamW vs Lion vs Muon): one seed and untuned rates would invite a ranking the data cannot support; shown as curves with a caveat.

## What the methodology lacked here
No published figure to reproduce. The reproductions are internal: the hand-computed AdamW stages against optax (7e-11), the AdamW 300-step validation loss against the root Training lab's float32 run (agree within 1e-7), the bitwise resumes, the Muon hand iteration against `orthogonalize_via_newton_schulz`. The most valuable visuals came from experiments that failed in an interesting way (mesh resume not bitwise, BestN metrics not persisted, worker-count dependence), which argues for running the "obvious" check before drawing it.

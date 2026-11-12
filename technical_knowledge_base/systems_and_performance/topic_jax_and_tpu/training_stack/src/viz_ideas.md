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

## 2026-11-12 rollout (split layout, renderer v2 3D stages)

| Visual | Kind | Data | Why this form |
|---|---|---|---|
| Fig. 1 hero, `stg-hero` (6 steps): grain, NNX split into graphdef and state, loss and nnx.grad, optax walls with the optimiser state, write-back, orbax's async save | 3D stage, replaces the static 2D hero | counts and times from `nnx.json` E1, E9, `ckpt.json`; batch 0's window indices from `grain.json` G1 | a training step is a pipeline of stations with state moving between them: flows show what moves, the empty wire frame shows what the graphdef is |
| Fig. 3, `stg-opt` (8 steps): eight tracked numbers as signed bars, one row per stage, glass walls for clip, scale_by_adam, add_decayed_weights, scale_by_learning_rate, apply_updates | 3D stage, replaces the 10-card 2D pipeline stepper (the cards stay as the readout) | `optax.json` S1, 12 steps x 8 numbers | many vectors at once, each scaled to its own row: the shape survives clipping, Adam flattens it to signs, the noise column stays near zero |
| Fig. 4, `stg-mesh` (5 steps): a (2, 4) mesh, fc1 shards as plates at their block offsets, the bias re-sharded, the OCDBT store, five restore targets, drift or bit-identical | 3D stage, new (the page had only a table in a closed block) | `ckpt_mesh.json`, `mesh_det.json` | a device mesh is spatial; restore onto other layouts is the recorded case the brief asked for |
| Fig. 5, `stg-grain` (5 steps, replayed per pipeline and worker count): 64 positions of shuffle(0), worker plate, batches 0 and 1, misplaced records lifted | 3D stage, replaces the 17-frame 2D cell grid (a long replay) | `grain.json` G1 | the position each record flows from is the point; which worker handled each record was not recorded, so flows cross one plate |
| Split stepper (section 1) | 2D stepper kept, step list generated from the data (before, one visit per top-level part, after) | `nnx.json` | an explorer of 69 named leaves reads best as rows of text |
| Scan stepper (section 2) | 2D, regrouped from depth + 2 frames (18 at 16 layers) to four explained steps per mode, plus a bar per recorded depth | `nnx.json` E7 | counts on an axis |
| Resume chart (section 5) | 2D widget, no autoplay, opens on the last frame | `ckpt.json` | loss curves and log gaps read best flat; the reader picks the variant |
| Muon spectrum (closed block), schedules, four optimisers, float16 | 2D | `optax.json`, `mixed.json` | log axes and curves |

Rejected for 3D: the scan stepper (counts against depth, a bar chart), the resume curves (the brief keeps loss curves 2D), the schedules and float16 charts (curves), a 3D NNX module tree (the hero already shows the split; a tree of 170 nodes would be clutter).

## Rejected
- A graphdef tree diagram of all 170 nodes: a table of node kinds and a static-attribute table say the same in less space; the State inspector shows the leaves.
- Animated Adam moments over hundreds of steps: the root's chain builder already plots them; the stage-by-stage view is what was missing.
- Multi-process grain throughput bars: on a machine at load 40 to 100 the worker speed-ups were not measurable reliably (kept as a sentence, not a chart).
- Emergency checkpointing animation: not runnable here (needs several hosts and slices); described from the source instead.
- A Linen/Equinox/NNX side-by-side code view: the root's Training lab has it; this page uses a comparison table of how state is held.
- Optimiser bar race (val loss of AdamW vs Lion vs Muon): one seed and untuned rates would invite a ranking the data cannot support; shown as curves with a caveat.

## What the methodology lacked here
No published figure to reproduce. The reproductions are internal: the hand-computed AdamW stages against optax (7e-11), the AdamW 300-step validation loss against the root Training lab's float32 run (agree within 1e-7), the bitwise resumes, the Muon hand iteration against `orthogonalize_via_newton_schulz`. The most valuable visuals came from experiments that failed in an interesting way (mesh resume not bitwise, BestN metrics not persisted, worker-count dependence), which argues for running the "obvious" check before drawing it.

## 2026-10-23 rebuild
- Added: hero, a static annotated diagram of one training step as state (structure, so static; score: central 2, beyond a sentence 2, absent elsewhere 2, fits the kind 2).
- Moved inline: State inspector (now section 1), Optimiser lab stage stepper (section 4), Resume lab (section 5), Data lab (section 6); each explains one mechanism, so it belongs beside the claim.
- Moved into closed blocks: Muon spectrum, four-optimiser curves, float16 loss-gap chart (measured depth, not needed on first read).
- Removed: the complete-script validation chart (A, B, C points coincide; the table says bit-identical) and the second copy of the mesh-restore table.

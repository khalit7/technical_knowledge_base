# Training lab: visual ideas

Central question of the tab: "if I port my PyTorch training to JAX, what changes, and how do I know the port is right?" Each visual makes one part of that measurable on the running example. Scores 0 to 2 on the methodology's questions (parameter to move, reproduces a figure, computable, beyond a sentence, corrects a misconception, central, new, animatable); reproduce and computable count double.

## Built

| # | Visual | Score | Data | Placement |
|---|---|---|---|---|
| 1 | Loss curves overlaid, PyTorch vs plain JAX vs NNX, 4,000 steps, animated through training with a log-scale difference panel and a jax-vs-nnx toggle | 15 | `run_twin_long.py` | section 5 |
| 2 | Porting pitfall switchboard: one mistake per run, loss or |difference| overlay, logit diff at init and val loss table | 15 | `pitfalls.py` | section 4 |
| 3 | optax chain builder: 5 optimisers x clip x decay x mask x 3 schedules x 2 lr on 8 real gradient coordinates, small multiples per parameter; JS checked against optax for all 132 combinations | 14 | `optax_check.py`, `check_chain.mjs` | section 2 |
| 4 | Same NNX module before/after `nnx.split`: leaves (area to scale) move into params and rest, graphdef skeleton, jit boundary, merge | 13 | flax source, `nnx_tour.py` | section 1 |
| 5 | Port translation panes with linked highlighting and a note per correspondence (real file lines, tagged by `make_train_data.py`) | 12 | `src/data/model_*.py` | section 3 |
| 6 | AdamW: optax vs torch on the same gradients, log-scale parameter difference per step (matched, defaults, defaults with equal decay), with the derived decay gap | 13 | `optax_check.py` | section 2 |
| 7 | Checkpoint resume timeline: run A vs run B stopped, process exit, restore, identical continuation | 12 | `ckpt_resume.py` | section 6 |
| 8 | Five-framework table and side-by-side code (NNX, Linen, Equinox, Haiku vs PyTorch), measured agreement | 11 | `frameworks.py` | section 1 |
| 9 | Mixed precision: three loss curves, memory, LayerNorm scales frozen in bf16 | 12 | `mixed.py` | section 8 |

## Rejected
- Step-time bar race between frameworks: a loaded shared CPU and a tiny model make it misleading (said in the text instead).
- Animated Adam moment estimates per coordinate: the chain builder's small multiples already show the normalised step; a second view repeats it.
- An orbax file-tree treemap: 19 files, three of which matter; a collapsible list says it in less space.
- Sharded checkpoint animation of tiles moving between meshes: the Sharding lab owns the tile animation; this tab states the measured shapes and links it.
- Running Linen/Equinox/Haiku full training runs: the block equivalence already proves the same math; full runs add CPU time without a new lesson.

## What the methodology lacked here
No published figure to reproduce: the "reproduction" is the PyTorch twin itself (the reference every JAX number is checked against), and the JS optax is checked against the real library rather than against a paper.

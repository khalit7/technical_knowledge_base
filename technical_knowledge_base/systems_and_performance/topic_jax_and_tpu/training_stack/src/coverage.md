# Coverage of the old Notion page

Old page: "Flax NNX, optax, orbax: the training stack" (Notion 3c65c17b0d0d817ea0ace9a2ca8677ec, fetched 2026-10-15, last edited 2026-09-22; saved verbatim in `live.md`). No child pages, databases or video. Every claim treated as an unverified note; checked against the pinned sources (flax v0.12.10, optax v0.2.8, orbax v0.12.7, grain v0.2.18) and runs in `runs/`.

| Old claim | Verdict | Where on the new page |
|---|---|---|
| Best resources: NNX basics, NNX vs JAX transforms guide, Linen to NNX guide, optax docs, orbax docs, JAX AI stack tutorials | kept (links checked); transforms guide now `guides/transforms.html` | Further reading |
| "NNX is the recommended API for new code; Linen is maintained, not deprecated" | verified (FACTS "map": Flax docs quote) | Reading 3, root Tool map |
| "interops via flax.nnx.bridge" | verified: ToNNX, lazy_init run; ToLinen exists | Reading 3 |
| Library landscape table (NNX, Linen, Equinox, Haiku) | verified; statuses live in the root's Tool map; this page compares how each holds state | Reading 3 table |
| "For the PyTorch-LM port: use NNX. Learn to read Linen" | kept as framing | Reading 3 |
| NNX in one screen code (Block with Linear, LayerNorm, Dropout, Rngs) | replaced by the running example's real model and measured state | Reading 1, State inspector |
| "Parameters are nnx.Param; mutable non-param state is nnx.Variable subclasses (BatchStat, custom)" | verified; extended with RngKey/RngCount, Cache, Intermediate, OptState | Reading 1 table |
| "nnx.Rngs carries PRNG streams so you do not hand-split keys" | verified; plus measured counter behaviour and the pure-jit bug | Reading 1 |
| "split/merge convert ... nnx.jit, nnx.grad, value_and_grad, nnx.scan are lifted transforms ... allow in-place-looking mutation" | verified (E5); added what retraces | Reading 2 |
| "Linen: init returns params; apply with mutable=['batch_stats']; @nn.compact lazy shapes" | verified with real errors | Reading 3 |
| "NNX ... at the cost of an explicit d_in on every layer" | verified | Reading 3 table |
| optax: init/update pure functions, apply_updates, chain | verified at source lines | Reading 4 |
| warmup_cosine_decay_schedule(0, 3e-4, 2000, 100000, 3e-5) example | evaluated by optax: 3e-4 at 2,000, 1.65e-4 at 51,000, 3e-5 at 100,000; decay_steps includes warmup | Reading 4, Optimiser lab |
| "Schedules are functions; no scheduler.step(); step count lives in the optimiser state" | verified; added inject_hyperparams for run-time changes (trace counts) | Reading 4 |
| "Gradient accumulation: optax.MultiSteps(tx, every_k_schedule=k)" | verified and measured (6.5e-6 vs big batch; memory) | Reading 4 |
| "Per-parameter behaviour: optax.multi_transform or adamw(mask=...)" | **corrected**: multi_transform is now a backwards-compatible alias of optax.partition (optax/__init__.py:179) | Reading 4, Old page |
| "EMA, SAM, Lion, Muon, apply-if-finite are all stock transformations you chain" | **corrected**: SAM and Muon live in optax.contrib; Muon's default includes embeddings | Reading 4, Old page |
| "nnx.Optimizer(model, tx, wrt=nnx.Param); optimizer.update(model, grads)" | verified (error without wrt measured) | Reading 2 |
| Train loop vs PyTorch side by side | owned by sibling pytorch_to_jax and the root's Training lab; linked | Reading "In one screen" |
| "@nnx.jit # compile whole step; donates internally" | **dropped**: not supported by anything run; nnx.jit takes donate_argnums like jax.jit (compilation.py signature) | Old page |
| "no .train()/.eval() global mode" | **corrected**: NNX modules have model.train()/model.eval() (measured) | Reading 1, Old page |
| "metrics you pull to host every step force a device sync, so log every N steps" | verified as practice; implemented with nnx.metrics | Reading 8, 9 |
| orbax StandardCheckpointer save of nnx.split state; restore into eval_shape target; nnx.update | verified pattern; extended: what saving only the model loses (measured) | Reading 5 |
| "Use CheckpointManager for rotation/retention" | **updated**: max_to_keep/best_fn documented as deprecated in favour of preservation_policy; and found that policies alone do not persist metrics | Reading 5 |
| "Orbax saves each shard from its own host ... restores directly into a sharding layout" | verified on 8 simulated devices (bitwise restore onto 4 layouts) | Reading 5, Resume lab |
| "supports emergency/multi-tier local checkpointing" | verified in source (experimental, approval warning); not run | Reading 5 |
| "This is the torch.distributed.checkpoint analogue, but the default path" | kept | Reading 5 |
| grain: deterministic global shuffle, workers, checkpointable iterator, API shape | verified and measured, with the worker-count caveats | Reading 6, Data lab |
| "A plain generator or a PyTorch DataLoader also works fine for the small-LM port" | kept, with the torch augmentation-seed contrast measured | Reading 6 |
| "Next: sharding this loop ..." mention of Sharding and scale | kept as links | throughout |

Counts: 30 claims; 23 verified or kept, 5 corrected or updated, 1 dropped, 1 moved to a sibling.

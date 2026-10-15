# training_stack: source

Child page 3 of Topic: jax-and-tpu, prefix `ts`. Deeper than the root's Training lab (`../../src/train/`), whose numbers it reuses and agrees with (the AdamW 300-step validation loss matches `src/train/out/mixed.json` f32 within 1e-7).

## Build
`sh build.sh` runs `runs/make_data.py` (out/*.json -> parts/22_js_ts_data.js, window.TS) and assembles `../index.html`. Parts: 20_read_a..i (Reading), 31 State inspector, 32 Optimiser lab, 33 Resume lab, 34 Data lab, 39 Further reading; JS 23 (helpers, prose fill), 24 (Reading), 31..34 (tabs). Prose numbers are `data-ts` spans filled from window.TS; source links are `data-ts-src` keys into `runs/out/source.json`, which `runs/ts_source.py` locates by pattern in the pinned clones.

## Runs (all CPU; `JX_SCRATCH` = the topic's shared setup folder)
```sh
P="JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B"
env $P ts_nnx.py          # NNX inventory, filters, Rngs, graph/tree mode, nnx.jit retraces, nnx.grad, scan vs unrolled, Optimizer  -> out/nnx.json
env $P ts_linen_eqx.py    # Linen collections and errors, NNX bridge, Equinox filtering                                              -> out/linen_eqx.json
env $P ts_optax.py        # chain stage by stage, inject_hyperparams, partition, MultiSteps, apply_if_finite, schedules, Lion, Muon, 4 runs -> out/optax.json (5 to 10 min)
env $P ts_ckpt.py         # resume variants, each in its own process                                                              -> out/ckpt.json
env $P ts_grain.py        # pipelines A-D x workers, epochs, random_map, iterator state, hosts, threads                            -> out/grain.json
env $P ts_torch_loader.py # PyTorch DataLoader contrast                                                                           -> out/torch_loader.json
env $P ts_mixed.py        # float16 underflow and loss scaling                                                                    -> out/mixed.json
env $P ts_full.py         # the complete script, run A / B (stopped at 250) / C (resumed)                                         -> out/full.json
TS_POLICY_ONLY=1 env $P ts_full.py   # the same without best_fn: metrics not persisted                                           -> out/full_policy_only.json
X="XLA_FLAGS=--xla_force_host_platform_device_count=8"
env $X $P ts_nnx_shard.py # logical-axis sharding on a (2,4) mesh                                                                -> out/nnx_shard.json
env $X $P ts_ckpt_mesh.py # save on (2,4), restore onto other meshes                                                             -> out/ckpt_mesh.json
env $X $P ts_mesh_det.py  # determinism and compiler re-sharding check                                                           -> out/mesh_det.json
$JX_SCRATCH/venv/bin/python -I -B ts_source.py   # source line numbers                                                          -> out/source.json
node runs/check_ui.mjs    # from the repo root: every control at 390 dark / 920 light, data equals out/, spans filled
```
Checkpoints and large intermediates go to `$JX_SCRATCH/ts/` (not committed).

## Departures from the child-page method
No published figure to reproduce: reproductions are internal (hand AdamW vs optax, root agreement, bitwise resumes). Old-page claims and corrections: `coverage.md`; visual choices: `viz_ideas.md`. Porting material is left to the sibling pytorch_to_jax.

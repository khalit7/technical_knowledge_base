# training_stack: source

Child page 3 of Topic: jax-and-tpu, prefix `ts`, storage key `ts-tab`. Built 2026-10-15; rebuilt 2026-10-23 to the teaching contract (editing only, no new runs). Deeper than the root's Training lab (`../../src/train/`), whose numbers it reuses and agrees with (the AdamW 300-step validation loss matches `src/train/out/mixed.json` f32 within 1e-7).

## Build
`sh build.sh` runs `runs/make_data.py` (out/*.json -> parts/22_js_ts_data.js, window.TS) and assembles `../index.html`. Parts: 20_read_a..i (Reading, sections 1 to 9 and the closed checklists), 39 Further reading; JS 21 and 99 (skill templates, never autoplay), 23 (helpers, prose fill), 24 (Reading tables, scan stepper, charts), 25 (hero figure), 31..34 (the split, AdamW-stage, resume and grain-batching steppers, which used to be tabs). Prose numbers are `data-ts` spans filled from window.TS; source links are `data-ts-src` keys into `runs/out/source.json`, which `runs/ts_source.py` locates by pattern in the pinned clones.

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
node runs/check_ui.mjs    # from the repo root: every control at 390 dark / 920 light, data equals out/, spans filled (tabs t-read, t-more)
```
Checkpoints and large intermediates go to `$JX_SCRATCH/ts/` (not committed).

## Departures from the child-page method
No published figure to reproduce: reproductions are internal (hand AdamW vs optax, root agreement, bitwise resumes). Old-page claims and corrections: `coverage.md`; visual choices: `viz_ideas.md`. Porting material is left to the sibling pytorch_to_jax.

## The 2026-10-23 rebuild: what changed and why
- **Top**: the core idea in one sentence ("a JAX training run is one compiled, pure step function applied to a pytree of state ...") and a new static hero (`25_js_ts_hero.js`, drawn at the measured width, stacked below 640 px): grain feeding a batch into the `nnx.jit` step, the model's graphdef (not saved) beside its state, the optimiser's state, metrics, and the orbax checkpoint's four items with dashed arrows from each piece of state. One highlight colour (`--acc`, class `.ts-hl`) marks state throughout. "You need" and six new terms follow; the PyTorch map table stays as the one-screen summary.
- **The four lab tabs moved into Reading**, each beside the claim it proves, because each explains one mechanism: State inspector (the split stepper) into section 1, Optimiser lab (one AdamW step, ten stages) into section 4, Resume lab (five restore variants) into section 5, Data lab (grain batches per worker) into section 6. Each has a prediction prompt before it and no longer starts playing on a mode switch. Their secondary parts (static attributes, graphdef repr, optimiser state sample, norms per stage, Muon spectrum, MultiSteps and apply_if_finite tables, checkpoint files, epochs and hosts table, PyTorch loader table) are in closed blocks next to the section.
- **Moved to closed blocks**: measured detail that is not needed on first read (sharding table and errors, Linen and Equinox walkthroughs with their errors, the four measured optax transformations, Lion and Muon measurements and the four-optimiser run, the mesh-restore table and its cause, emergency checkpointing, grain's iterator state, threads and alternatives, the float16 table, jmp step and runs, the full script's code, provenance and versions). The 17 "Common mistakes" became one closed pre-flight checklist (most restated a section); the interview block kept the three questions that combine sections (RNG in checkpoints, diagnosing a resumed run, the 70B checkpoint design); the old-page corrections are a closed block.
- **Ownership**: optimiser algorithms (Lion, Muon's Newton-Schulz, schedules as a design choice) link to Optimisers and learning-rate schedulers; float formats and loss scaling link to Numerical computing for ML and Quantization and Precision. This page keeps the optax and jmp APIs and its own measurements.
- **Deleted as fat**: wind-ups, pointers to removed tabs, the Resume tab's complete-script chart (its points coincide; the table says bit-identical) and its duplicate mesh table, two interview answers restating the section 3 table.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; a scroll-through with no clicks leaves every scrubber at 0 (checked at 390 dark and 920 light). Charts inside closed blocks redraw at their real width when the block opens.
- **Images**: none. The page is about software libraries; no physical object or canonical figure would teach more than the hero diagram.

## Length judgement
| | Before (2026-10-19) | After (2026-10-23) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 40.5 min | 28.7 min |
| Reading, closed details | 6.3 min | 20.5 min |
| Other tabs, core | State 1.4 + Optimiser 2.3 + Resume 1.7 + Data 2.0 = 7.4 min | none (moved into Reading) |
| Core total, excluding Further reading | 47.9 min | 28.7 min |
| Visuals drawn in Reading (audit count) | 3 (+ 4 in lab tabs) | 7 core + 3 in closed blocks |

Why 29 minutes is right: the page owns four libraries plus the two older ones a reader must recognise, and its core is what decides whether a run compiles once and resumes as the same run: how NNX state splits and what retraces, how optax builds and runs a chain, what each missing piece of a checkpoint does to a resumed run, and where grain's determinism breaks. Each of those now has its stepper beside the text and its numbers in the caption. What made the old page long (measured tables, error messages, code walkthroughs, mistakes, interview answers) is closed and optional, which is why closed time grew.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
386 units: core 245, depth 118, fat 23. 375 were drafted from the old page by `ledger.py init` (keys proposed by a matching script, then reviewed); 11 were added by hand for script-rendered tables and visuals, with their keys written into static captions. No unit is labelled owned: the optimiser and numerical pages carry the algorithms, but this page keeps its own measurements of them in closed blocks. Fat units carry a `note`.

## Departures from the page-kind shape
- Only two tabs (Reading, Further reading): every former lab explained one mechanism, so it sits inline.
- The section 1 split stepper lists every leaf; its group lists scroll inside a 280 px box to keep the Reading flow short.

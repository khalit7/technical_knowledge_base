# training_stack: source

Child page 3 of Topic: jax-and-tpu, prefix `ts`, storage key `ts-tab`. Built 2026-10-15; rebuilt 2026-10-23 to the teaching contract (editing only, no new runs). Deeper than the root's Training lab (`../../src/train/`), whose numbers it reuses and agrees with (the AdamW 300-step validation loss matches `src/train/out/mixed.json` f32 within 1e-7).

## Build
`sh build.sh` runs `runs/make_data.py` (out/*.json -> parts/22_js_ts_data.js, window.TS) and assembles `../index.html`. Parts: 01_head, 02_split (the split-layout template), 10_header, 20_read_a..i (Reading, sections 1 to 9 and the closed checklists), 39 Further reading; JS 21 and 99 (skill templates, autoplay on view since 2026-11-12), 23 (helpers, prose fill), 24 (Reading tables, scan stepper, charts), 25_js_s3.js (3D renderer v2, template), 31 (the split stepper and its generated step list), 32 (Muon spectrum, schedules, optax tables), 33 (the resume widget), 34 (grain tables), 40_js_sc_util.js (scene helpers) and the scenes 41_js_sc_hero.js, 42_js_sc_opt.js, 43_js_sc_mesh.js, 44_js_sc_grain.js. Prose numbers are `data-ts` spans filled from window.TS; source links are `data-ts-src` keys into `runs/out/source.json`, which `runs/ts_source.py` locates by pattern in the pinned clones.

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
node runs/check_ui.mjs    # from the repo root: every control at 390 dark / 920 light, data equals out/, spans filled, step-list numbers equal the data
node check_stages.mjs     # from the repo root (src/check_stages.mjs): every stage and animation autoplays in view, steps to its end, one list item per step, nothing moves under reduced motion
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
- **No autoplay** (superseded on 2026-11-12 by autoplay on view, below): `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; a scroll-through with no clicks leaves every scrubber at 0 (checked at 390 dark and 920 light). Charts inside closed blocks redraw at their real width when the block opens.
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

## The 2026-11 rollout: split layout, four 3D stages, explained and autoplaying animations (2026-11-12)

Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `05z_errbox.js.html`, `99_js_tabs.js` (key `ts-tab`). `build.sh` now writes the em-dash it looks for as bytes. No new runs: every scene draws from `TS` (`runs/out/*.json` via `make_data.py`, unchanged). The static 2D hero (`25_js_ts_hero.js`) is gone.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | **3D** `stg-hero` Fig. 1, one step through grain, NNX, optax, orbax | yes, 6 |
| Reading | You need, new terms, PyTorch map, running example | full width | table | no |
| Reading | 1 Variables table | full width | table | no |
| Reading | 1 split | split | 2D stepper (`RD.anim`), list generated per model and filter | yes, 10 to 12 |
| Reading | 1 Rngs, graph and tree mode | full width | table | no |
| Reading | 2 nnx.jit, grad, Optimizer | full width | table | no |
| Reading | 2 scan | split | 2D stepper, two lists (loop, scan) | yes, 4 each |
| Reading | 2 sharding annotations | full width | none (table closed) | no |
| Reading | 3 Linen, Equinox | full width | table | no |
| Reading | 4 One real step | split | **3D** `stg-opt` Fig. 2, readout cards under the list | yes, 8 |
| Reading | 4 four transformations | full width | none | no |
| Reading | 4 schedules | split | 2D chart (static, `s3side`) | no |
| Reading | 4 Lion and Muon (closed) | full width | 2D Muon stepper, curves | yes, 6 (Muon) |
| Reading | 5 missing pieces | split | 2D widget (resume chart, no autoplay, opens on the last frame) | no (a widget) |
| Reading | 5 CheckpointManager | full width | none | no |
| Reading | 5 restore onto other meshes | split | **3D** `stg-mesh` Fig. 3 | yes, 5 |
| Reading | 6 how grain works | full width | none | no |
| Reading | 6 where you batch | split | **3D** `stg-grain` Fig. 4, replayed per pipeline and worker count | yes, 5 |
| Reading | 6 iterator, hosts; 7 float16; 8 metrics; 9 full script; checklists | full width | tables, a chart in a closed block | no |
| Further reading | | unchanged | | |

What changed in the text: each animation's per-step caption became its step list (the split stepper's list is generated from the data, so it changes with the model and filter); paragraphs the stages now carry were cut to their remaining claims (section 6's "Batching in the MapDataset ..." paragraph, section 5's mesh paragraph, the hero caption, the scan and AdamW captions). The optax readout (the ten cards and one line of arithmetic for the chosen number and step) stays under the step list.

Kept 2D and why: the split stepper (69 named leaves read best as rows), the scan stepper (counts against depth), the resume chart (loss curves; a widget), the schedules, four optimisers and float16 charts (curves, log axes), the Muon spectrum (a log-scale bar chart).

Motion: every stage and the split, scan and Muon steppers play by themselves once at least half in view, pause off screen, stop for good on any control or at the last step, and never move under reduced motion (`check_stages.mjs`). The resume chart is a widget and never plays by itself. The grain stage replays when the pipeline or worker count changes; the optax stage redraws without restarting when the step or number changes.

### Length judgement (2026-11-12)
| | Before (2026-10-23 rebuild) | After |
|---|---|---|
| Reading, core (230 words a minute) | 28.7 min (6,601 words) | 33.6 min (7,739 words) |
| Reading, closed details | 20.5 min | 20.9 min |
| Visuals counted by the audit (svg, canvas, img) | 7 | 10 |

The core grew by about five minutes because every animation now has its steps written out on the left (the hero, AdamW, mesh and grain lists alone are about 1,100 words); before, the same explanation was in per-step captions drawn by script, which the audit counted only one at a time. Paragraphs the stages now carry were cut. The rest of the judgement of 2026-10-23 stands.

### Ledger (`python3 html_utils/ledger.py check`: problems 0)
386 units: core 245, depth 118, fat 23. Re-keyed to the new wording (no label changed): 80 (scan equations), 201, 277, 343 (mesh restore), 221, 222, 346, 347, 350, 352, 379 (grain batching), 386 (hero: graphdef not saved).

### Checks
`sh html_utils/checkpage.sh <page>`: fail=0, emdash 0, errbox 1, clipped 0. `node src/check_stages.mjs`: problems 0 at 1400 light, 920 light and 390 dark, plus reduced motion. `node src/runs/check_ui.mjs`: all checks passed, including the numbers written in the step lists against `runs/out/`.

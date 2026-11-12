# JAX core child page: source

Build: `sh build.sh` (runs `runs/make_data.py`, which gathers `runs/out/*.json` into `parts/22_js_jc_data.js` as `window.JC`, then assembles `../index.html`). Prefix `jc` for ids, classes and the storage key (`jc-tab`).

## Shape and why (rebuilt 2026-10-23 to the teaching contract)

Child page (`.claude/skills/explainer-page/page-kinds/topic-child.md`, governed by `teaching/teaching-contract.md`). Tabs: **Reading**, **Jaxpr explorer** (a tool used across the page: six real jaxprs), **Further reading**. The Autodiff tape, Control flow and Custom derivatives tabs each explained one mechanism, so their visuals moved inline beside the claim (sections 6, 5 and 7); their tabs were removed.

Reading order: the core idea in one sentence and a hero (one `sin` bound to the current trace, four interpreters), "You need", new terms with PyTorch counterparts; then 1 arrays, 2 tracing, 3 jit and its cache (new), 4 jaxprs, 5 control flow, 6 autodiff, 7 custom rules, 8 vmap (with pmap history, new), 9 pytrees, 10 random keys, 11 a new primitive; then a closed "Depth" section (five mistakes that teach something the core does not, two design questions, corrections to the old page).

## Parts

- `01_head.html`, `05z_errbox.js.html`; `02_split.html` (split layout), `25_js_s3.js` (3D renderer v2), `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates, copied unchanged on 2026-11-12 (autoplay on view; storage key `jc-tab`).
- `10_header.html`: page CSS (scoped `jc-` classes), title, subtitle with measured reading time, tab bar, section nav.
- `20_read_a.html` (top) to `20_read_g.html` (sections 1 to 11), `20_read_h.html` (closed depth), `20_read_z.html` (footer). `39_tab_more.html`: Further reading.
- `22_js_jc_data.js`: generated data. `23_js_jc_util.js`: helpers (data-k spans, predict-then-reveal, source excerpts, bars). `24_js_jc_read.js`: async timeline, the numbers in Fig. 2's step list, jit cache key and drills, promotion table, annotated jaxpr, Jacobian grid, residual bars, primitive stepper (the 2D hero and the dispatch stepper were removed on 2026-11-12: Fig. 1 carries both).
- `40_js_sc_util.js` (shared scene helpers and colours), `41_js_sc_hero.js` (Fig. 1), `42_js_sc_jit.js` (Fig. 2), `43_js_sc_ad.js` (Fig. 3, plus the equation panes and counters beside its step list), `44_js_sc_vmap.js` (Fig. 4), `45_js_sc_tree.js` (Fig. 5): the 3D stages of 2026-11-12.
- `31_*` Jaxpr explorer tab. `33_js_jccf.js` (loop bars, cond under vmap, chooser), `34_js_jccv.js` (custom-derivative sweeps): drawn in the Reading tab. `32_js_jcad.js` (the 2D autodiff tape) was replaced by Fig. 3 on 2026-11-12.
- `inputs/root_xf_*.json`: results recorded by the root's Transforms lab (`src/xf/out/` of the root: jit-cache drills, side effects, key reuse, tracing errors), copied with a provenance field; `runs/make_data.py` adds them as `JC.rc`, `JC.rb`, `JC.rt`. Not rerun here.

## The 2026-10-23 rebuild: what changed and why

- **Top**: core idea sentence, a new static hero (structure: bind, the current trace, four interpreters, clickable to sections), "You need", the PyTorch mapping table as the new-terms list. The "four sentences" box, the page map and the "how to read" note were fat (the hero and sentence carry them).
- **Absorbed ownership** (OWNERS for this page: pure functions and tracing, jit and its caching, pmap history): a new section 3 with a static cache-key diagram whose segments light up from a 14-row drill table (counts recorded by the root's Transforms lab), the static/traced rule and the side-effect run; pmap history in section 8 (facts as the root page reads the JAX changelog); the key-reuse mask numbers in section 10.
- **New visuals**: the hero, an async dispatch timeline (section 1), the cache-key diagram, a stateful against counter-based generator before/after (section 10), a pytree flatten diagram (section 9).
- **Moved inline**: the autodiff tape stepper (section 6, before/after transposition), the loop-form bars and cond-under-vmap bars (section 5), the custom-derivative sweeps (section 7). The dispatch stepper no longer starts on a mode switch.
- **Into closed blocks**: committed arrays, x64 table, matmul precision, jnp-vs-NumPy table and lattice source, ShapedArray fields, trace sources, stackless history, closed-over constants, the source of control-flow rules, the chooser, associative_scan, Hessian cost by nesting order, stop_gradient and kinks, in/out_axes details, spmd_axis_name, pytree utilities and flattening cost, Threefry source and split = fold_in, the six PRNG implementations, mistakes, design questions, old-page corrections. Source excerpts are closed by default.
- **Deleted as fat**: eleven mistakes and eight interview answers that restated their section, reading guides and pointers to removed tabs, cost boxes restated by the rewritten sections.

## Length judgement

| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core (230 words a minute) | 50.3 min | 37.7 min |
| Reading, closed details | 11.1 min | 25.0 min |
| Other tabs, core | explorer 1.1, tape 1.5, control flow 2.1, custom 1.0, further reading 3.9 | explorer 1.1, further reading 3.7 |
| Visuals drawn inline in Reading (audit count: svg, canvas, img) | 1 | 4 (plus HTML visuals: cache key, flows, bars, steppers) |

Why about 38 minutes is right: the page owns eleven mechanisms (arrays and dtypes, tracing, the jit cache, jaxprs, control flow, both autodiff modes, custom rules, vmap, pytrees, keys, primitives) and now also the jit-cache and purity units that lived only in the root's lab; each has its picture, its numbers and its check. About a third of the core words are tables, captions and counters of visuals (the new-terms table alone is about 275 words). The old page's length came from per-item tables, source excerpts and restated mistakes and answers, which are now closed or deleted. Core plus tabs fell from about 60 to about 39 minutes.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)

398 units: core 253, depth 77, fat 68. 364 were drafted from the old page by `ledger.py init` (keys picked as phrases that now appear on the page, then reviewed: restated mistakes, interview answers and pointers labelled fat with a note); 34 were added by hand for script-rendered visuals and for units absorbed from the root's Transforms lab (section "added 2026-10-23").

## Runs (src/runs/, each writes out/<name>.json)

```sh
export JX_SCRATCH=<the shared jax-and-tpu setup folder>
cd src/runs
JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_array.py    # jax.Array, async dispatch, dtypes, promotion table, jnp vs NumPy
XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_array8.py   # committed arrays, spmd_axis_name
JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_trace.py    # avals, trace chains, dispatch log, constants, explorer jaxprs
JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_cf.py       # loop forms at 3 lengths, transform support, cond/while under vmap, associative_scan (about 3 min)
JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_ad.py       # JVP/linearize/transpose/VJP jaxprs, residuals vs PyTorch, Jacobian cost grid, Hessians (about 2 min)
JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_admem.py    # compiled memory of loss, grad, grad with checkpoint
JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_custom.py   # custom_jvp/custom_vjp sweeps, fixed point, clip
JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_vmap.py     # in_axes, axis_name, nested vmap, rule tables
JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_pytree.py   # registration, aux data and the cache, costs
JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_prng.py     # typed keys, six impls, prefix stability, key reuse
JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_prim.py     # multiply_add primitive, one rule at a time
$JX_SCRATCH/venv/bin/python -I -B read_source.py                                                 # excerpts of jax-v0.11.2 located by pattern
cd .. && sh build.sh && python3 -B check_data.py   # also checks the static numbers quoted from inputs/root_xf_*.json
NPM_CONFIG_USERCONFIG=<empty file> node <this folder>/check_ui.mjs <page folder>/index.html [shots]   # from the repo root
```

`jccommon.py` holds shared helpers (path, user-name and address scrubbing of captured messages); `jaxpr_export.py` turns a jaxpr into structured data.

## What is deterministic and what is not

Deterministic, no caveat: jaxprs, equation and primitive counts, error messages, FLOPs and memory from XLA's cost and memory analysis, residual lists, numerical differences, PRNG values, source line numbers. Rough (labelled on the page): dispatch and run times, compile times, flatten costs, PRNG speeds; the machine had a 1-minute load average of about 20 to 45 during the runs.

## Checks

`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0. `check_ui.mjs`: every control in every tab at 390 dark and 920 light (all equations of all six jaxprs; in Reading, every custom-derivative case and every tape step), no errors, no undefined/NaN in numeric cells, no sideways scroll. `check_data.py`: embedded data equals a fresh build from `runs/out`, all 202 data paths resolve, prose numbers agree with the data.

## The 2026-11 rollout: split layout, five 3D stages, explained and autoplaying animations (2026-11-12)

Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js`, `21_js_rd_common.js`, `99_js_tabs.js` (key `jc-tab`). `build.sh` now writes the em-dash it looks for as bytes. No new runs: every scene draws from `JC` (`runs/out/*.json` via `make_data.py`, unchanged) and the root lab's recorded drills.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | **3D** `stg-hero` Fig. 1, two modes | yes, 6 and 2 |
| Reading | You need, new terms, environment | full width | table | no |
| Reading | 1 Arrays (fields, immutability) | full width | table | no |
| Reading | 1 Async dispatch | split | 2D timeline | no |
| Reading | 1 Weak types | split | promotion table widget | no |
| Reading | 1 details | full width | tables, code | no |
| Reading | 2 Tracing | full width | tables (avals, traces, chains), predict | no |
| Reading | 3 jit and its cache | split | **3D** `stg-jit` Fig. 2 | yes, 7 |
| Reading | 3 What is in the key | split | cache-key diagram with the 14 drills (reader-driven) | no |
| Reading | 3 Static and traced, side effects | full width | code | no |
| Reading | 4 Jaxprs | split | annotated jaxpr (text) | no |
| Reading | 5 Control flow table | full width | table | no |
| Reading | 5 Loop forms | split | 2D bars | no |
| Reading | 5 Under vmap | split | 2D bars | no |
| Reading | 6 JVP and VJP | split | Jacobian cost grid | no |
| Reading | 6 Linearize, then transpose | split | **3D** `stg-ad` Fig. 3, reverse and forward mode | yes, 8 and 5 |
| Reading | 6 Memory | split | 2D bars | no |
| Reading | 6 Second order, How to check | full width | (closed blocks) | no |
| Reading | 7 Custom rules | split | sweep charts (reader-driven) | no |
| Reading | 7 Fixed point | full width | none | no |
| Reading | 8 vmap | split | **3D** `stg-vmap` Fig. 4 | yes, 4 |
| Reading | 8 axis_name, pmap | full width | none | no |
| Reading | 9 Pytrees | split | **3D** `stg-tree` Fig. 5 | yes, 6 |
| Reading | 9 Registration, aux data | full width | code, table | no |
| Reading | 10 Random keys | split | 2D before/after (stateful against counter-based) | no |
| Reading | 10 Typed keys and details | full width | table, code | no |
| Reading | 11 New primitive | split | 2D stepper (`RD.anim`) | yes, 7 |
| Reading | Depth | full width | closed blocks | no |
| Jaxpr explorer | | full width | tool (two panes side by side already) | no |
| Further reading | | unchanged | | |

**Stages and their data.**
- Fig. 1 (`41_js_sc_hero.js`): three glass plates stacked (JVPTrace gold, BatchTrace teal, DynamicJaxprTrace purple) under the Python call; sin, cos and mul as float32[3] cube rows on the JVP plate, batched to float32[2,3] on the batch plate, recorded as the three equations of the printed jaxpr; all from `JC.tr.dispatch_log` (the logged `process_primitive` calls). Mode "no transformation": one EvalTrace. Replaces the 2D hero and the 2D dispatch stepper of section 2, whose captions became the step list.
- Fig. 2 (`42_js_sc_jit.js`): the recurrent cell under `lax.scan`, n = 1,000 (`JC.cf.loops.rows`): call, cache shelf and run in front; Python on tracers, the jaxpr (one `scan` plate with its three body plates), StableHLO, XLA and the executable behind; trace 6.0 ms, lower 5.7 ms, compile 146 ms, 89 HLO lines and one while, run 21.4 ms; the executable glides into the cache; the hit and the new-shape miss use the root lab's drills (`JC.rc.drills`: values 0 and 0, batch16 1 and 1, back 0), said so in the step text.
- Fig. 3 (`43_js_sc_ad.js`): block 0's MLP, one plate per equation of `JC.tape` (VJP: 15 forward, 20 backward by stage; JVP: primal and tangent rows), residual blocks sized by the cube root of their bytes (JAX residuals or PyTorch saved tensors, toggle), gradients with their real shapes ([128,512], [512], [512,128], [128]); the old tape's before/after equation panes and counters now sit under the step list and follow the stage (`onStep`).
- Fig. 4 (`44_js_sc_vmap.js`): q f32[6,32] and k f32[7,32] as bars (shape only), the 6 x 7 output grid, per-pair plates merging along a row and then over the rows into one `dot_general` plate (`JC.vm.nested`).
- Fig. 5 (`45_js_sc_tree.js`): a `LayerNorm(scale, bias, eps)` flattened into two leaves and a gold treedef plate (the printed treedef, `JC.pt.register`), jit with the treedef in the key, a hit on new values and a miss on eps = 1e-6 (`JC.pt.static`: traces 1 and 2), unflatten.
- Colours on every scene: tracers blue, jaxpr equations purple glass, real values and compiled code green, tangents and the JVP trace gold, batch teal, cotangents and gradients orange.

**Motion.** Every stage and the primitive stepper play once at least half in view, pause off screen, stop for good on a reader control or the last step, and never move under reduced motion. The cache-key drills, the promotion table and the custom-derivative sweeps are reader-driven tools with no autoplay. The primitive stepper's per-step caption was removed: its step list carries each failure message.

**Kept 2D, and why.** The async timeline, loop-form bars, cond-under-vmap bars, residual bars, custom-derivative sweeps and the Jacobian cost grid are numbers on an axis or a grid of ratios; the promotion table and the cache-key drills are tables; the stateful against counter-based generator is a flat before/after of two sequences; the primitive stepper is a grid of results. Code and jaxprs stay text.

**Checks.** `check_stages.mjs` (new, adapted from Matrix calculus and backprop): at 1400 light, 920 light and 390 dark every stage and the primitive stepper play when scrolled into view, step to the last step in every mode with one list item per step, stop redrawing off screen, every split is two columns at 1400; under reduced motion nothing moves; no errors, `undefined`, `Infinity` or sideways scroll. `check_ui.mjs`: the old tape stepper's deep pass now steps Fig. 3 in both modes with both tapes. `check_data.py`: new checks that every number written into the new step lists (35, 15 and 20 equations, 32, 2.03 and 2.48 times, 297.0 and 280.6 KB, 2.0, 8.2 and 262 KB, 131,712 weights, 6 x 32 and 7 x 32, the primitive's six failure messages and final results, the scan's 4 equations) agrees with the data.

**Length.** Reading core 8,676 words (37.7 min) before, 10,267 (44.6 min) after; closed 5,740 (25.0) unchanged; other tabs unchanged (explorer 1.1, further reading 3.8). The growth is the step lists of the five figures and the primitive stepper (about 1,450 visible words), which explain each figure step by step; before, the dispatch and tape captions showed one step at a time and the primitive's caption likewise. Only figure intros were added to the prose, and the primitive's rule-order paragraph was cut (the list carries it). Visuals drawn inline (audit count): 4 before, 8 after (five canvases replaced the SVG hero and two HTML steppers).

**Ledger** (`python3 html_utils/ledger.py check`: problems 0): 398 units, core 252, depth 77, fat 69. Re-keyed: 74, 92, 195, 371, 386, 393 (their visual became a stage or a split); 13 ("click a box to jump to its section", the 2D hero's instruction) relabelled fat. The root's ledger (`systems_and_performance/topic_jax_and_tpu`) still checks with problems 0.

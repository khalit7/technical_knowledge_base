# JAX core child page: source

Build: `sh build.sh` (runs `runs/make_data.py`, which gathers `runs/out/*.json` into `parts/22_js_jc_data.js` as `window.JC`, then assembles `../index.html`). Prefix `jc` for ids, classes and the storage key (`jc-tab`).

## Shape and why (rebuilt 2026-10-23 to the teaching contract)

Child page (`.claude/skills/explainer-page/page-kinds/topic-child.md`, governed by `teaching/teaching-contract.md`). Tabs: **Reading**, **Jaxpr explorer** (a tool used across the page: six real jaxprs), **Further reading**. The Autodiff tape, Control flow and Custom derivatives tabs each explained one mechanism, so their visuals moved inline beside the claim (sections 6, 5 and 7); their tabs were removed.

Reading order: the core idea in one sentence and a hero (one `sin` bound to the current trace, four interpreters), "You need", new terms with PyTorch counterparts; then 1 arrays, 2 tracing, 3 jit and its cache (new), 4 jaxprs, 5 control flow, 6 autodiff, 7 custom rules, 8 vmap (with pmap history, new), 9 pytrees, 10 random keys, 11 a new primitive; then a closed "Depth" section (five mistakes that teach something the core does not, two design questions, corrections to the old page).

## Parts

- `01_head.html`, `05z_errbox.js.html`; `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (never autoplay; storage key `jc-tab`).
- `10_header.html`: page CSS (scoped `jc-` classes), title, subtitle with measured reading time, tab bar, section nav.
- `20_read_a.html` (top) to `20_read_g.html` (sections 1 to 11), `20_read_h.html` (closed depth), `20_read_z.html` (footer). `39_tab_more.html`: Further reading.
- `22_js_jc_data.js`: generated data. `23_js_jc_util.js`: helpers (data-k spans, predict-then-reveal, source excerpts, bars). `24_js_jc_read.js`: hero, async timeline, jit cache key and drills, promotion table, dispatch stepper, annotated jaxpr, Jacobian grid, residual bars, primitive stepper.
- `31_*` Jaxpr explorer tab. `32_js_jcad.js` (autodiff tape), `33_js_jccf.js` (loop bars, cond under vmap, chooser), `34_js_jccv.js` (custom-derivative sweeps): now drawn in the Reading tab.
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

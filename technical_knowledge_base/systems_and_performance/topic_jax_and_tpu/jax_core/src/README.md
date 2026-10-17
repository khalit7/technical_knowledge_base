# JAX core child page: source

Build: `sh build.sh` (runs `runs/make_data.py`, which gathers `runs/out/*.json` into `parts/22_js_jc_data.js` as `window.JC`, then assembles `../index.html`). Prefix `jc` for ids, classes and the storage key (`jc-tab`).

## Shape and why

Follows `.claude/skills/explainer-page/page-kinds/topic-child.md` (child page): a Reading tab in the subject's own order (arrays, tracing, jaxprs, control flow, autodiff, custom rules, vmap, pytrees, keys, primitives, mistakes, interview questions, corrections to the old page), and four lab tabs for visuals that need room. It goes deeper than the root's Transforms lab and links it instead of repeating it (purity, side effects, recompile drills, per-example gradient timing and the toy tracer stay there).

## Parts

- `01_head.html`, `05z_errbox.js.html`, `21_js_rd_common.js`, `99_js_tabs.js`: copied from the root (title and storage key changed).
- `10_header.html`: page CSS (scoped `jc-` classes), title, tab bar.
- `20_read_a.html` to `20_read_g.html`, `20_read_z.html`: Reading tab. `39_tab_more.html`: Further reading.
- `22_js_jc_data.js`: generated data. `23_js_jc_util.js`: helpers (data-k spans filled from the data, predict-then-reveal, pinned-source excerpts, bars, tab hooks). `24_js_jc_read.js`: Reading visuals.
- `31_*` Jaxpr explorer, `32_*` Autodiff tape, `33_*` Control flow, `34_*` Custom derivatives (HTML and JS each).

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
cd .. && sh build.sh && python3 -B check_data.py
NPM_CONFIG_USERCONFIG=<empty file> node <this folder>/check_ui.mjs <page folder>/index.html [shots]   # from the repo root
```

`jccommon.py` holds shared helpers (path, user-name and address scrubbing of captured messages); `jaxpr_export.py` turns a jaxpr into structured data.

## What is deterministic and what is not

Deterministic, no caveat: jaxprs, equation and primitive counts, error messages, FLOPs and memory from XLA's cost and memory analysis, residual lists, numerical differences, PRNG values, source line numbers. Rough (labelled on the page): dispatch and run times, compile times, flatten costs, PRNG speeds; the machine had a 1-minute load average of about 20 to 45 during the runs.

## Checks

`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0. `check_ui.mjs`: every control in every tab at 390 dark and 920 light (all equations of all six jaxprs, every custom-derivative case, every tape step), no errors, no undefined/NaN in numeric cells, no sideways scroll. `check_data.py`: embedded data equals a fresh build from `runs/out`, all 202 data paths resolve, prose numbers agree with the data.

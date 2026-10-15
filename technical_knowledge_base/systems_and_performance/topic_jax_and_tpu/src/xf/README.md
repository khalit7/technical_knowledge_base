# Transforms lab (tab `t-xf`)

The functional core of JAX taught from zero on the running example (`../data/README.md`): tracing and jaxprs, static against dynamic values and structured control flow, jit's cache and what recompiles, purity and side effects, immutable arrays, PRNG keys, pytrees, grad against `loss.backward()`, vmap and per-example gradients, the transformations as interpreters in the pinned JAX source, a toy JAX, and the footguns with their real messages. Reading section 2 gives the overview; this tab goes deeper and does not repeat its print-in-jit example or its eager-against-jit animation.

Page parts: `../parts/31_tab_xf_a.html` to `_e.html` (HTML and scoped CSS), `../parts/31_js_xf_0data.js` (generated data, about 65 KB), `31_js_xf_1core.js` (helpers, step animation, inline numbers), `_2trace.js`, `_3drill.js`, `_4basics.js`, `_5grad.js`, `_6inside.js`.

## Scripts (each wrote `out/<name>.json`)

Run from this folder with the shared venv, CPU only, low priority:

```sh
export JX_SCRATCH=<the shared jax-and-tpu setup folder>
JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_trace.py      # jaxprs, tracer types, loop vs scan, control-flow errors
JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_recompile.py  # 14 recompile drills, counted
JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_basics.py     # side effects, .at[], keys, pytrees, footguns
XLA_FLAGS=--xla_force_host_platform_device_count=8 JAX_PLATFORMS=cpu nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_prng8.py   # same key on 8 devices
JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_grad.py       # gradients against PyTorch
JAX_PLATFORMS=cpu OMP_NUM_THREADS=4 nice -n 15 $JX_SCRATCH/venv/bin/python -I -B run_vmap.py       # per-example gradients, batching jaxprs (about 1 minute)
JAX_PLATFORMS=cpu $JX_SCRATCH/venv/bin/python -I -B toy_tracer.py                                  # the toy JAX, checked against JAX
$JX_SCRATCH/venv/bin/python -I -B read_source.py                                                    # excerpts of jax-v0.11.2 with line numbers
python3 make_data.py          # -> ../parts/31_js_xf_0data.js
sh ../build.sh && python3 -B check_data.py
NPM_CONFIG_USERCONFIG=<empty file> node <this folder>/check_ui.mjs <root>/index.html [shots dir]   # from the repo root
```

`xfcommon.py` holds the shared helpers (path scrubbing: every captured message has absolute paths replaced by `<root>/`, `<site-packages>/` or `<path>`).

## What is measured and how far it transfers

- Deterministic (no caveat): jaxprs and their equation counts, tracer types, error messages, recompile counts (Python traces counted inside the function, XLA compiles counted with the monitoring event `/jax/core/compile/backend_compile_duration`), gradient differences against PyTorch, PRNG values and sharding equality, source line numbers.
- Rough timings, labelled on the page: tracing time per depth, per-example gradient times (median of 5; 1-minute load average about 40 during the run: the machine was heavily shared), async dispatch. They show orders of magnitude on this CPU only.

## Findings worth knowing (all from these runs, jax 0.11.2)

- jit's trace cache is keyed on the Python function, not the wrapper: re-wrapping the same function with `jax.jit` every step traced once in 3 steps; a new lambda every step traced and compiled 3 times (`pjit.py:606`, `_infer_params_cached`, a `weakref_lru_cache` on `fun`).
- A Python float and `jnp.float32` of the same value are different cache keys (weak type), logged as `f32[]{weak_type=False}` against `{weak_type=True}`.
- NumPy int64 inputs do not recompile with x64 off (canonicalised to int32).
- `fori_loop` with static bounds lowers to `scan`; with traced bounds to `while`, which reverse-mode grad refuses.
- Under `grad` alone a Python `if` on an array works (the GradTracer holds the primal); under `jit` it raises TracerBoolConversionError.
- `jax.grad` in 0.11.2 runs through `vjp` and `LinearizeTrace` (the tracer prints as `GradTracer`).
- `split(key)[i]` and `fold_in(key, i)` gave the same numbers for i = 0, 1 (observation, not a guarantee).
- `jax.random.normal` gives identical values on 1 device and sharded over 8 devices (rows or a 2 x 4 mesh), with `jax_threefry_partitionable` True (default) or False; the two settings give different streams.
- Gradients against PyTorch under jit: largest difference 2.3e-7, worst relative 2.9e-6 (`blocks.0.mlp.fc1.weight`), loss difference 4.8e-7 (setup's unjitted check reported 2.5e-7, 2.8e-6 and 0.0).

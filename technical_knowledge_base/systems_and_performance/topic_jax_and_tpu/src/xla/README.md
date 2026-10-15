# Compiler lab (tab `t-xla`, prefix `xc`)

What happens after `jax.jit`, measured on the running example's train step (`../data/model_jax.py`). Page parts: `../parts/32_tab_xla_{a,b,c}.html` and `../parts/32_js_xc_*.js`; `32_js_xc_0data.js` is generated.

## Scripts (shared venv, CPU only, `nice -n 15`)

```sh
export JX_SCRATCH=<the shared jax-and-tpu setup folder>
PY="nice -n 15 $JX_SCRATCH/venv/bin/python -I -B"; export JAX_PLATFORMS=cpu OMP_NUM_THREADS=4
$PY pipeline.py        # stage counts, cost_analysis, memory_analysis with and without donation -> out/pipeline.json
$PY fusion_demo.py     # MLP block: 29 jaxpr equations mapped onto 4 optimised-HLO kernels -> out/fusion_demo.json
$PY passes.py          # HLO after every XLA pass (dumps in $JX_SCRATCH/xla/dump_*) -> out/passes.json
$PY remat.py           # jax.checkpoint policies x blocks wrapped: memory and FLOPs -> out/remat.json
$PY debug_tools.py     # debug.print, checkify, debug_nans, donation, their cost -> out/debug.json
$PY torch_compile.py   # PyTorch twin: eager operator counts, dynamo explain, Inductor kernels -> out/torch_compile.json
$PY source_refs.py     # jit's path in the pinned jax-v0.11.2 source, located by pattern -> out/source.json
$PY timing.py          # rough timings in fresh child processes (step, cache, layers, remat, torch) -> out/timing.json
$PY profile_step.py    # jax.profiler trace of 5 steps, scrubbed summary -> out/profile.json
python3 make_data.py   # -> ../parts/32_js_xc_0data.js and out/read_numbers.json (numbers for the Reading tab)
python3 check_data.py  # page embeds exactly that data; data-xc paths resolve; prose numbers match
node check_tab.mjs ../../index.html <shots dir>   # every control at 390 dark and 920 light
```

`xc_common.py` (paths, `scrub()` for paths and host names, the shared initial state) and `hlo_tools.py` (jaxpr, StableHLO and HLO text counting) are helpers.

## Definitions used in the counts
- **jaxpr equations**: recursive, nested `jit` (printed `pjit` before newer versions)/`custom_jvp` wrappers inlined (wrappers not counted).
- **StableHLO operations**: `stablehlo.*`, `chlo.*`, `func.call` lines, returns excluded.
- **HLO instructions**: every instruction in every computation of the unoptimised module.
- **kernels**: top-level instructions of the optimised module outside fused computations that do work (not parameter, constant, tuple, get-tuple-element, bitcast). Fusions are counted as one; "multi-op" fusions merge two or more operations. Reduction combiners (the two-parameter `add` or `maximum` bodies a reduce reaches through `to_apply=`) are not kernels and are left out (`reducer_bodies`): until 2026-10-15 they were counted, which gave 1,057 for the undonated step instead of 816 (783 fusions + 33 dots; 817 donated, one extra copy), as the child page XLA and compilation found. `out/pipeline.json` was recounted from the same compiled programs (fusion counts unchanged); its unoptimised `hlo` block and `out/timing.json`'s per-layer counts still include the combiners and are not shown on the page.
- **PyTorch operators that compute**: aten leaf operators under `torch.profiler`, leaving out views, allocations and scalar reads (list in `torch_compile.py`).
- Timings: "measured on Apple M1 Pro (CPU), shared machine, 4 threads, low priority", medians, with the 1-minute load average recorded per run. Everything else is deterministic.

Large outputs (HLO dumps up to 64 MB, profiles, the persistent and Inductor caches) stay in `$JX_SCRATCH/xla/`; profiles and dumps name the host and contain absolute paths, so only scrubbed summaries are committed.

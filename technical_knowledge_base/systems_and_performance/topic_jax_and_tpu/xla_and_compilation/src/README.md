# Source of "XLA and compilation: jaxprs, StableHLO, fusion and recompiles" (prefix xp)

`sh build.sh` writes `../index.html` from `parts/` (same build script as the root page, with the Reading tab starting at `20_read_a.html`).

## Tabs
Reading (`20_read_*.html`, JS `23` to `26`), Pass diff viewer (`31_*`), Fusion explorer (`32_*`), Recompile detective (`33_*`), Profile reader (`34_*`), Further reading (`39_tab_more.html`). `22_js_xp_0data.js` is generated: never edit it. Storage key for the open tab: `xp-tab`.

## Shape
A child-page shape (`.claude/skills/explainer-page/page-kinds/topic-child.md`): Reading organised by the pipeline's own order (lowering, PJRT, passes, fusion, layouts, buffers, remat) and then by what the user controls (caches, export, recompiles, profiling, flags), a comparison with torch.compile, mistakes and interview questions. Labs are the four the brief asked for. The root's Compiler lab owns the overview (five forms, MLP-block fusion, donation, remat policies, scan): linked, not rebuilt.

## Scripts (`lab/`, shared venv, CPU only, low priority)
```sh
export JX_SCRATCH=<the shared jax-and-tpu setup folder>
PY="nice -n 15 $JX_SCRATCH/venv/bin/python -I -B"; export JAX_PLATFORMS=cpu OMP_NUM_THREADS=4
$PY lowering.py              # four forms of the attention block, primitive expansion, PJRT, source walk -> out/lowering.json
$PY passes_diff.py dump attn; $PY passes_diff.py dump step; $PY passes_diff.py summarise   # -> out/passes_diff.json
$PY pipeline_src.py          # CPU/GPU pass lists and quotes from the fetched XLA files -> out/pipeline_src.json
$PY fusion_lab.py            # catalogue, VLOG decisions, 13 breakers x 3 settings, step x 3 settings -> out/fusion_lab.json
$PY buffer_lab.py            # live bytes over the schedule, peak attribution, allocations, layouts -> out/buffers.json (needs the step dump)
$PY inplace.py               # x.at[i].set with and without donation -> out/inplace.json
$PY recompile_lab.py         # 11 scenarios, storm vs buckets, log_compiles -> out/recompile.json
$PY cache_lab.py             # persistent cache cases and key ingredients -> out/cache.json
$PY export_lab.py            # AOT stages, serialized executable, jax.export x platforms, shape poly, vjp -> out/export.json (needs flatbuffers)
$PY profile_lab.py           # profiler trace of 5 steps, xprof tools -> out/profile.json (after fusion_lab.py)
$PY flags_lab.py             # flag docs from source, 5 CPU settings measured -> out/flags.json
python3 make_data.py && sh ../build.sh && python3 reading_time.py && python3 make_data.py && sh ../build.sh
python3 check_data.py        # page embeds exactly the data; data-xp keys exist; prose facts match
node check_page.mjs ../../index.html   # every control at 390 dark and 920 light, no errors, NaN or sideways scroll
```
`xp_common.py` reuses the root lab's `xc_common.py` (scrub, initial state) and `hlo_tools.py`. Large outputs (HLO dumps 64 MB, profiles, the persistent cache, exports) stay in `$JX_SCRATCH/xp/`.

## Sources
- JAX at tag `jax-v0.11.2` (32544801e261) and its docs folder; XLA at 91888df6 (pinned by that tag): `cpu_compiler.cc`, `gpu_compiler.cc` and 48 further files fetched one by one (list with sha256 in the shared SETUP.md; pass headers in `inputs/xla_headers_fetched.txt`); MaxText at 1a95d1e5.
- `inputs/`: StableHLO `compatibility.md` (main, 2026-10-15), XLA `docs/tiled_layout.md`, `docs/shapes.md`, `docs/architecture.md` at 91888df6.

## Labels
measured here (CPU, deterministic unless a time), read in source, Google docs, derived, not run here. Times: Apple M1 Pro CPU, shared machine (1-minute load 35 to 60), 4 threads, `nice -n 15`.

## Size
About 0.55 MB, over the 300 KB guide of the time (retired 2026-10-17; now about 1 MB for a child page): the embedded data (pass diffs, 783-fusion catalogue, breaker HLO, one step's trace) is about 375 KB and is the content of the labs.

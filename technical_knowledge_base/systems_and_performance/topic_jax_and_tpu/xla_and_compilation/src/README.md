# Source of "XLA and compilation: jaxprs, StableHLO, fusion and recompiles" (prefix xp)

`sh build.sh` writes `../index.html` from `parts/` (same build script as the root page, with the Reading tab starting at `20_read_a.html`).

## Tabs
Reading (`20_read_*.html`, JS `23` to `27`; `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates since 2026-10-23), Pass diff viewer (`31_*`), Fusion explorer (`32_*`), Recompile detective (`33_*`), Profile reader (`34_*`), Further reading (`39_tab_more.html`). `22_js_xp_0data.js` is generated: never edit it. Storage key for the open tab: `xp-tab`.

## Shape
A child-page shape (`.claude/skills/explainer-page/page-kinds/topic-child.md`): Reading opens with the core idea, a hero figure, "You need" and new terms, then follows the pipeline's own order (lowering, PJRT, passes, fusion, layouts, buffers, remat) and then what the user controls (caches, export, recompiles, profiling, flags), how XLA compares with torch.compile, and a closed depth section (four mistakes, two interview questions). Labs are the four the brief asked for. The root's Compiler lab owns the overview (five forms, MLP-block fusion, donation, remat policies, scan): linked, not rebuilt.

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

## The 2026-10-23 rebuild to the teaching contract (editing only, no new runs)
What changed and why:
- **Top**: core sentence (jit hands XLA the whole step, so the compiler decides kernels, memory and reuse ahead of time) and a new static hero (`27_js_xp_rd4.js`): the step's six forms with their measured counts, owners (JAX, PJRT, XLA, device) and the levers beside the stage each acts on. "You need" and ten new terms. The old flow cards and reading-time line were cut (the hero carries them); the root kernel-count reconciliation moved to a closed block.
- **New inline visuals** for mechanisms that had none: PJRT's structure (static), one producer with two consumers (cheap duplicated against expensive stored, a toggle on the measured `mul_two_users` / `exp_two_users` programs), TPU tile padding (one slider on the minor dimension; default 65 lands on the page's derived 1.97x), and the two caches (in-memory key, persistent key, what a hit skips). Remat became a two-column comparison table; section 13 became a comparison table and now links The compiler stack's section 1 for the cross-compiler view (OWNERS).
- **Moved into closed blocks**: the lowering source walk and expansion table, PJRT versioning and discovery, the pass table, the fusion kinds' header quotes, remat algorithms, shape polymorphism, export VJP and the stale doc line, the `jax_log_compiles` sample, the XProf views table, the flag help table, the PyTorch stage-by-stage table, and the depth section.
- **Deleted as fat**: wind-ups, the old flow cards, mistakes and interview answers that restated a section (each listed with its reason in `ledger.json`). Facts that only lived in mistakes (compile one per bucket, `platforms=(...)`, pass a global as an argument, set `XLA_FLAGS` before `import jax`, what changes the persistent key) moved into the core sections.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` replaced with the templates (storage key `xp-tab`); checked that all four Reading animations stay on step 0 with normal motion. Chart labels raised from 10 to 11 px; card tables now wrap at phone width.
- **Checks**: `lab/check_data.py` now also checks every number typed statically in the rebuild (hero, card titles, notes). The root's lab output now counts top-level kernels (816) while its Compiler lab prose still prints 1,057; the reconciliation check tests the arithmetic and the 816.

## Length judgement
| | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading, core (230 words a minute) | 44.1 min | 34.3 min |
| Reading, closed details | 4.8 min | 13.5 min |
| Lab tabs (pass, fusion, recompile, profile) | 2.7 + 2.4 + 2.1 + 1.7 | unchanged |
| Visuals drawn in Reading | 3 (plus 4 counted only when drawn) | 8 |

Why 34 minutes is right: this page owns XLA in depth (HLO, the pipeline, fusion decisions, layouts, buffer assignment, reading dumps, compile caching, GPU against TPU) and also carries export, recompiles, profiling and flags for JAX; every core ledger unit is needed for one of those. About 1,300 of the core words are program text, logs and measured tables rendered inside visuals (the four-forms viewer alone shows about 430 words of jaxpr), not prose. The labs stay as tabs because each is an explorer across all of something (passes, fusions, cases, trace events).

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
415 units: core 330, depth 47, fat 38 (no owned or volatile units). 403 drafted by `ledger.py init`, 12 added by hand for script-rendered tables and charts.

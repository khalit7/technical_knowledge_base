# Source of "XLA and compilation: jaxprs, StableHLO, fusion and recompiles" (prefix xp)

`sh build.sh` writes `../index.html` from `parts/` (same build script as the root page, with the Reading tab starting at `20_read_a.html`).

## Tabs
Reading (`20_read_*.html`, JS `23` to `27`, the 3D scenes `41` to `44`; `02_split.html`, `21_js_rd_common.js`, `99_js_tabs.js` and `40_js_s3.js` (the renderer, `25_js_s3.js` in the templates, renamed only so it loads after this page's own `25_js_xp_rd2.js`) are the skill templates, copied unchanged on 2026-11-12), Pass diff viewer (`31_*`), Fusion explorer (`32_*`), Recompile detective (`33_*`), Profile reader (`34_*`), Further reading (`39_tab_more.html`). `22_js_xp_0data.js` is generated: never edit it. Storage key for the open tab: `xp-tab`.

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
node ../check_stages.mjs                # the 2026-11 rollout checks: stages and steppers autoplay in view, step lists match, reduced motion, splits
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

## The 2026-11 rollout: split layout, three 3D stages, explained and autoplaying steppers (2026-11-12)

Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js` (as `40_js_s3.js`), `21_js_rd_common.js`, `99_js_tabs.js` (key `xp-tab`). `build.sh` now writes the em-dash it looks for as bytes. No new runs: `make_data.py` derives `XPD.low.scn` (the followed subtraction in the four forms, the chain's kernels and bytes) from `lab/out/*.json`, and `check_data.py` checks every number typed into the new step lists. Each numbered section is one `<section>` (for the nav) holding its splits as `div.xp-blk`.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | **3D** `stg-hero` Fig. 1 | yes, 6 |
| Reading | You need, new terms, evidence, reconciliation | full width | none | no |
| Reading | 1 Lowering | split | four-forms viewer (text, reader-driven) | no |
| Reading | 1 details | full width | tables | no |
| Reading | 2 PJRT | split | 2D static diagram | no |
| Reading | 3 HLO anatomy | full width | HLO line (text) | no |
| Reading | 3 Passes | split | 2D stepper, 7 stretches, two programs | yes, 7 |
| Reading | 4 Fusion | split | **3D** `stg-fuse` Fig. 2 | yes, 5 |
| Reading | 4 The rule | split | 2D duplicate-or-store toggle | no |
| Reading | 4 Fusion kinds, library | full width | none | no |
| Reading | 4 What XLA refuses | split | 2D bars | no |
| Reading | 4 Softmax three ways | split | 2D static before/after, three columns | no |
| Reading | 4 Whole step, GPU and TPU | full width | table | no |
| Reading | 5 Layouts | split | optimised HLO (text) | no |
| Reading | 5 Tiling | split | 2D slider | no |
| Reading | 6 Buffer assignment | split | 2D stepper, 5 stretches | yes, 5 |
| Reading | 6 Peak attribution | split | 2D bars | no |
| Reading | 6 Plan, aliasing | full width | table, correction | no |
| Reading | 7 Remat | full width | table | no |
| Reading | 8 Caches | split | 2D static diagram | no |
| Reading | 8 Persistent cache runs | full width | table | no |
| Reading | 9 AOT, export | full width | tables, code | no |
| Reading | 10 Recompiles | split | **3D** `stg-rec` Fig. 3 | yes, 8 |
| Reading | 10 The storm | split | 2D widget (exact against buckets, all 64 calls, no autoplay) | no |
| Reading | 10 At scale, fixes; 11 to 13; Depth | full width | tables, code | no |
| Pass diff viewer, Fusion explorer, Recompile detective, Profile reader | | full width | tools (unchanged; the pass viewer's Play runs only on a click) | no |
| Further reading | | unchanged | | |

**Stages and their data.**
- Fig. 1 (`42_js_sc_hero.js`): block 0's attention sub-block as four glass plates in a staircase, one tile per instruction in program order (jaxpr 61, StableHLO 90, HLO 133, optimised 13 kernels as blocks), LayerNorm's `x - mu` raised in blue: `u` and `z` in the jaxpr, two `stablehlo.subtract`, two broadcast-reshape-broadcast-subtract chains in HLO, one after CSE (the attention block's CSE delta: subtract -1), then `ynn_fusion.7` (kCustom: all of LayerNorm, 16 equations, 18 instructions); the last step writes the whole step's counts (3,411, 5,318, 4,932, 817) and the 374.4 MB peak. Replaces the 2D hero, whose lever boxes became the step texts.
- Fig. 2 (`43_js_sc_fuse.js`): the Fusion explorer's chain `tanh(x * 2.0 + 1.0) * 3.0` on f32[256,512]: memory row on the floor, chip row above; fusion off (7 kernels, writes and reads as flows, 7,340,044 bytes = 14 x 512 KiB + 12 scalar bytes, derived and checked), the kernels sliding into `broadcast_multiply_fusion`, fused (1,048,576 bytes, 7.0 times fewer).
- Fig. 3 (`44_js_sc_rec.js`): call, cache shelf (one block per executable), result in front, the slow path behind; one recorded case per step (value 1 compile, shape 2, weak 2, static 2, lambda 3 with one cache per function object, closure 1 with the stale `[2. 2.]`), then the storm's 64 executables against 4. It replaced the bullet list of causes, whose quotes moved into the step texts; JAX core's Fig. 2 is linked for the mechanism of one hit and one miss.
- Colours: jaxpr purple, StableHLO teal, HLO orange, kernels and executables green, the followed operation and reads blue, writes and misses orange.

**Long replays.** The pass staircase (34 or 45 passes), the memory curve (266 points) and the storm (64 calls) used to step one frame at a time. Now: the staircase is 7 explained stretches (by pass name, same for both programs), the memory curve 5 (inputs, forward, the peak, backward, optimiser; the whole curve is drawn faintly from the first step), and the storm is a reader-driven widget showing all 64 calls. The softmax kernel-by-kernel stepper became a static three-column before/after.

**Kept 2D, and why.** The four-forms viewer, the HLO anatomy and the layout examples are text; the staircase, memory curve, storm times and refusal counts are numbers on an axis; the tile padding is one flat parameter; the PJRT layers, duplicate-or-store and the two caches are small flat structures. No real image: none shows something new on a compiler page.

**Checks.** `check_stages.mjs` (new, adapted from JAX core): at 1400 light, 920 light and 390 dark every stage and both steppers play when scrolled into view and step to their last step with one list item per step; stages stop redrawing off screen; every split is two columns at 1400; the storm widget has no play button and its counters read 64 and 4; the softmax columns hold 6, 6 and 4 kernels; under reduced motion nothing moves; no errors, `undefined`, `Infinity` or sideways scroll. `check_page.mjs`: every control at 390 dark and 920 light. `check_data.py`: five new checks for the step-list numbers.

**Length.** Reading core 7,902 words (34.4 min) before, 8,965 (39.0 min) after; closed 3,104 (13.5 min) unchanged; other tabs unchanged. The growth is the five step lists (about 1,500 visible words) that explain each figure; before, the steppers' captions were drawn by script one step at a time (not counted), and the causes list of section 10 (about 250 words) is now Fig. 3's step list. Visuals drawn inline (audit count): 8 before, 10 after.

**Ledger** (`python3 html_utils/ledger.py check`: problems 0): 423 units, core 338, depth 47, fat 38. Re-keyed: 19, 79, 115, 117, 155, 208, 211, 213, 214, 343 (their sentences moved into step lists or cards). Added by hand: 416 to 423 (the new step lists). The root's ledger (`systems_and_performance/topic_jax_and_tpu`) still checks with problems 0.

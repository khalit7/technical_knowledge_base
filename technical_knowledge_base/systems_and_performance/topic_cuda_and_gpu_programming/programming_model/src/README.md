# The CUDA programming model: sources, scripts, outputs

- `build.sh`: assembles `../index.html` from `parts/` (`01_head.html`, `02_split.html` the split layout, `10_header.html`, Reading `20_read_a.html` to `20_read_k.html`; tab `31_*` Launch planner; `39_tab_more.html` Further reading; every JS part in its own script in file-name order, `99_js_tabs.js` last). Head CSS is copied from the CUDA root; `02_split.html`, `21_js_rd_common.js`, `25_js_s3.js` (renderer v2) and `99_js_tabs.js` are the explainer-page skill templates (storage key `cuda-pm-tab`); `40_js_sc_hero.js` to `43_js_sc_wave.js` are the four 3D scenes.
- `run_all.sh`: reproduces everything (Docker image kb-gpu-lab:1 from the CUDA root; MLX Python outside the repo).
- `cuda/kernels/p1..p6`: indexing, synchronisation (block sum with and without barriers, warp sum, votes, atomics, warp-aggregated atomics, `__reduce_add_sync`), cooperative groups and grid sync, clusters, `__launch_bounds__`, the kernel-argument limit. `cuda/host/`: a complete program, an error-handling program and NVIDIA's occupancy calculator driver, all compiled and run in the container (no GPU, no driver). `cuda/compile_all.sh` runs inside the container; outputs in `cuda/out/` (ptxas reports, SASS, errors, header excerpts, `occ_nvidia.jsonl`).
- `m1/measure.py`, `m1/run3.sh`: five Metal-kernel measurements on the Apple M1 Pro GPU through MLX 0.32.3 (waves, block size, launch cost, atomics, the race), 3 runs, load average 5.0 to 6.3; raw in `m1/out/`.
- `py/`: Numba CUDA in the simulator and `compile_ptx`, CuPy RawKernel, `torch.utils.cpp_extension.load_inline`, run in the container; outputs (and the failures, which are the point) in `py/out/`.
- `occ.py`: the occupancy port (from the root's port of `cuda_occupancy.h`) plus the block-size suggestion and launch bounds. `recompute.py`: parses every raw output, medians, derived numbers, the toy race reference; writes `out/data.json` and `parts/22_js_pm_data.js` (window.PM).
- `check_embed.py`: the page embeds exactly `out/data.json`; 50 tagged prose numbers equal the data; no private paths, login name or hostname (looked up at run time). `check/check_stages.mjs` (from the repo root, about 4 minutes): the 2026-11-06 rollout checks, see below. `check/check_page.mjs`: puppeteer, every control at 390 px dark and 920 px light, animation end states against the data, the inline occupancy figure against the ptxas presets, the error stepper, the planner's JS against NVIDIA's header values (1,155 of 1,155), the 3D stages' numbers, and that the animations play once scrolled into view.
- `live.md`: the old Notion page verbatim (copied from the root's `src/read/old/01_programming_model.md`, fetched 2026-10-05); `coverage.json`: its 37 facts with verdicts. `viz_ideas.md`: visuals built and rejected.

## The 2026-10-23 rebuild to the teaching contract
Editing only, no new runs. What changed and why:
- **Top**: the core idea in one sentence; a static hero (`29_js_pm_hero.js`) unpacking the running example's launch `scale<<<4096, 256>>>` into grid, block, warp and one thread (i = 2,341), with how each level cooperates and where it runs; "You need"; new terms. The old "In one screen" table is a closed reference block; the evidence legend and the owners line shrank to one paragraph.
- **New visuals for mechanisms that had none**: a host/device stepper (`29_js_pm_host.js`, section 1: CPU and GPU memory and two timelines, the launch returns at once, the copies wait), the same stepper with a faulting kernel in section 6 (the error appears at `cudaMemcpy`, two calls after the launch; sticky 700), and an inline occupancy figure (`32_js_pm_occ.js`, section 5: one H100 SM, registers per thread as the one variable, presets the three `heavy_*` kernels' real register counts; it uses the planner's `PMOCC` port, checked against `cuda_occupancy.h`). The Launch planner stays a tab: it is a calculator across kernels, GPUs and problem sizes, used from several sections.
- **No autoplay**: template `21_js_rd_common.js`; mode toggles of the shuffle, race and waves animations reset to step 0 instead of playing.
- **Moved to closed blocks (depth)**: the SASS listings (scale, warp-aggregated atomic, grid.sync) with their captions, the warp-function table and the Volta quotes, the M1 atomics numbers, atomics' contention fixes and float non-determinism, the grid-sync kernel and cluster compile results, the occupancy-header check, two compiler and runtime details of `__launch_bounds__`, the container's error output and the 15-code error table, the PyTorch `Loss.cu` assert, the memory-API sources and shared-memory limits, the launch-argument limit, the Numba/CuPy/torch code and run results, the CUDA to Metal dictionary, three mistakes, the checklist, four interview questions. Sections 9 and 10 merged into one with a route table (launch, index, barrier, how far each got here).
- **Deleted as fat (19 ledger units)**: wind-ups, headings, transitions, mistakes and interview questions that restated a section.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 42.3 min | 30.2 min |
| Reading, closed details | 2.5 min | 15.9 min |
| Launch planner, Further reading | 2.0, 2.6 min | 2.0, 2.6 min |
| Visuals drawn in Reading | 4 | 8 |

Why 30 minutes is right: the page owns ten mechanisms (host/device and the asynchronous launch, indexing and warp formation, warp cooperation, four scopes of synchronisation, occupancy, waves, the error model, the memory API, launch cost, the other spellings) for a reader who has never written a kernel; about a fifth of the core words are code he reads once and figure captions. What a first read does not need (machine code, raw outputs, quotes, per-target details, rehearsal) is closed.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
364 units: core 286, depth 59, fat 19. 346 were drafted by `ledger.py init` from the old page; 18 were added by hand for script-rendered tables and listings and the new visuals (section "added by hand"). Keys were first proposed by matching the old sentences against the rebuilt page (core if found outside closed blocks, depth if only inside), then 17 were set by hand where the wording changed; fat units carry a `note`.

Shape: `.claude/skills/explainer-page/page-kinds/topic-child.md`. Departures: the Reading tab is long (30 minutes core, see above) because the reader has never written a kernel and this page owns the programming model; physical SM details, divergence and latency hiding are linked to GPU architecture and the root rather than repeated. One standalone tab only (Launch planner); the other visuals belong inline next to the text they explain.

## The 2026-11-06 rollout (split layout, 3D stages v2), done 2026-11-12
Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js`, `21_js_rd_common.js`, `99_js_tabs.js` (key `cuda-pm-tab`). The page's own `#t-read .an-ctl` rules now skip `.stg-bar`, so a stage's control bar keeps the template's single row. No new runs: every scene draws from `window.PM` (`out/data.json`, unchanged) and the occupancy port `window.PMOCC`.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | **3D** `stg-hero` (Fig. 1), one launch unpacked | yes, 5 |
| Reading | You need, terms, running example, evidence | full width | none (reference table closed) | no |
| Reading | 1 The program | full width | code | no |
| Reading | 1 The launch is asynchronous | split | 2D host/device stepper | yes, 7 |
| Reading | 1 Launch arguments, markers, predict | full width | none; SASS closed | no |
| Reading | 2 Built-ins, three patterns, overflow | full width | table, code | no |
| Reading | 2 Which threads form a warp | split | 2D warp-shape widget (reader-driven) | no |
| Reading | 3 Warps | split | **3D** `stg-warp` (Fig. 2), warps and a divergent branch | yes, 5 |
| Reading | 3 A warp's row sum | split | 2D shuffles against shared memory (two modes) | yes, 6 + 6 |
| Reading | 3 The code, `_sync`, aggregated atomics | full width | code; table closed | no |
| Reading | 4 Scopes table | full width | table | no |
| Reading | 4 The block barrier | split | 2D race (two modes) | yes, 8 + 7 |
| Reading | 4 Compiler, rules, atomics, grid and clusters | full width | none; details closed | no |
| Reading | 5 Occupancy | split | **3D** `stg-occ` (Fig. 3) | yes, 4 |
| Reading | 5 Any register count | split | 2D register slider (reader-driven) | no |
| Reading | 5 Launch bounds, suggestion, block size | full width | table across four targets | no |
| Reading | 5 Waves and the tail | split | **3D** `stg-wave` (Fig. 4) | yes, 5 |
| Reading | 5 Measured on a real GPU | split | 2D M1 staircase chart | no |
| Reading | 6 Error kinds | full width | none | no |
| Reading | 6 The faulting program | split | 2D stepper (opens at the launch) | yes, 7 |
| Reading | 6 Macro, sticky errors, tools | full width | code; details closed | no |
| Reading | 7 Memory API | full width | table | no |
| Reading | 8 How long | split | 2D launch-cost bars | no |
| Reading | 8 Consequences, 9 Python and Metal, Depth | full width | tables; details closed | no |
| Launch planner | | split | notes left, calculator right | no |

**Stages and their data.** Fig. 1: the running example's launch (4,096 blocks of 256; block 9, warp 1, lane 5 = thread 37, i = 2,341), blocks 0 to 31 drawn. Fig. 2: a 256-thread block as 8 tiles of 8 x 4 lanes, then warp 1's four issue slots; the branch `if (lane < 16)` is labelled illustrative, no timing. Fig. 3: `PM.occ.sm_90a` registers and spill stores of `heavy_plain`, `heavy_lb1024`, `heavy_lb256x8` (128, 64, 32 registers; 2,328 and 3,004 bytes of spill stores) with `PMOCC.blocks` (2, 4, 8 blocks, equal to the header's values). Fig. 4: `PM.wq` (108 and 117 tiles on 108 SMs) and the row sum on an H100 from `PM.gpus`, `PM.occ.sm_90a.block_sum` (8 blocks per SM) and `PM.rowsum` (1,056 per wave, 4 waves, last 87.9% full); every block assumed to take the same time.

**Removed**: the 2D hero (`29_js_pm_hero.js`, carried by Fig. 1) and the 2D waves before/after (`27_js_pm_waves.js`, carried by Fig. 4). The per-step captions of the host, error, shuffle and race animations moved from their scripts into the step lists. **Kept 2D** and why: `viz_ideas.md` (timelines, rows of values, reader-driven tools and charts read best flat). No photo: the physical SM and die belong to GPU architecture.

**Motion.** The four stages and the four 2D animations play once in view (template rules); the warp-shape widget and the register slider never move by themselves. Mode toggles (shuffles or shared memory; with or without the barrier) swap the step list and replay.

**Checks.** `check/check_stages.mjs` (new): plays on view, steps, list lengths, mode swaps, widgets still, no redraw off screen, reduced motion, 12 splits in Reading and one in the planner, label overlaps at 1400 px including mid-tween, and the step lists' numbers against `PM`, `PMOCC` and the scenes' exports (`PM_HERO`, `PM_OCC`, `PM_WAVE`). `check/check_page.mjs`: the never-autoplay assertion inverted (animations play once scrolled into view); the waves checks now read the 3D stage; the error-stepper checks read the step list. `check_embed.py`: 50 tagged numbers (5 new in the step lists); privacy now also scans for the login name and hostname (looked up at run time) and home and scratch paths.

**Length.** Reading core 6,960 words (30.3 min) before, 8,544 (37.1 min) after; closed 3,661 (15.9) unchanged. The growth is the step lists, about 1,500 visible words, of which roughly 700 were the 2D animations' captions before (drawn by script, so the audit did not count them) and the rest explain the four 3D figures step by step; the paragraphs they made redundant (the old hero caption, the waves caption, the occupancy figure's numbers) were cut or folded in. Every unit kept is core or depth; the length is right for ten mechanisms, eight of them with a figure explained step by step.

**Ledger**: 368 units, core 290, depth 59, fat 19, problems 0. Re-keyed: 70 (the predict box now points at the widget), 175 (the row-sum waves sentence moved into Fig. 4's step list). Added: 365 to 368, one per 3D figure.

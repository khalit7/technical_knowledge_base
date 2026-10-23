# The CUDA programming model: sources, scripts, outputs

- `build.sh`: assembles `../index.html` from `parts/` (Reading `20_read_a.html` to `20_read_k.html` with JS `21` to `29` and `32_js_pm_occ.js`; tab `31_*` Launch planner; `39_tab_more.html` Further reading; every JS part in its own script, `99_js_tabs.js` last). Head CSS is copied from the CUDA root; `21_js_rd_common.js` and `99_js_tabs.js` are the explainer-page skill templates (storage key `cuda-pm-tab`).
- `run_all.sh`: reproduces everything (Docker image kb-gpu-lab:1 from the CUDA root; MLX Python outside the repo).
- `cuda/kernels/p1..p6`: indexing, synchronisation (block sum with and without barriers, warp sum, votes, atomics, warp-aggregated atomics, `__reduce_add_sync`), cooperative groups and grid sync, clusters, `__launch_bounds__`, the kernel-argument limit. `cuda/host/`: a complete program, an error-handling program and NVIDIA's occupancy calculator driver, all compiled and run in the container (no GPU, no driver). `cuda/compile_all.sh` runs inside the container; outputs in `cuda/out/` (ptxas reports, SASS, errors, header excerpts, `occ_nvidia.jsonl`).
- `m1/measure.py`, `m1/run3.sh`: five Metal-kernel measurements on the Apple M1 Pro GPU through MLX 0.32.3 (waves, block size, launch cost, atomics, the race), 3 runs, load average 5.0 to 6.3; raw in `m1/out/`.
- `py/`: Numba CUDA in the simulator and `compile_ptx`, CuPy RawKernel, `torch.utils.cpp_extension.load_inline`, run in the container; outputs (and the failures, which are the point) in `py/out/`.
- `occ.py`: the occupancy port (from the root's port of `cuda_occupancy.h`) plus the block-size suggestion and launch bounds. `recompute.py`: parses every raw output, medians, derived numbers, the toy race reference; writes `out/data.json` and `parts/22_js_pm_data.js` (window.PM).
- `check_embed.py`: the page embeds exactly `out/data.json`; 45 tagged prose numbers equal the data; no private paths. `check/check_page.mjs`: puppeteer, every control at 390 px dark and 920 px light, animation end states against the data, the inline occupancy figure against the ptxas presets, the error stepper, the planner's JS against NVIDIA's header values (1,155 of 1,155), and that nothing plays after a fresh load.
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

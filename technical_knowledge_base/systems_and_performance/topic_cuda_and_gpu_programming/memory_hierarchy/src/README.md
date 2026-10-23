# Sources, scripts and outputs: GPU memory hierarchy

Build: `sh build.sh` writes `../index.html` from `parts/` (same assembly as the parent and the Memory technology page). Reproduce everything: `run_all.sh` (needs Docker image `kb-gpu-lab:1` and an MLX Python as `MLXPY`).

- `kernels/m1_widths.cu` to `m7_async.cu`: the seven CUDA files the Reading tab quotes. `code/compile_all.sh` compiles them in `kb-gpu-lab:1` (CUDA 13.4.2, nvcc V13.4.92; no GPU) for sm_80, sm_90a and sm_120 with `-O3 -Xptxas -v`, plus `m3_regcap.cu` under eight `-maxrregcount` caps; `code/compile_one.sh` recompiles one file. Reports and SASS in `out/cc/` (no binaries kept).
- `code/measure_m1.py`: the M1 Pro GPU measurements (MLX 0.32.3 custom Metal kernels, each checked against NumPy before timing): load widths, AoS against SoA, threadgroup-memory reads of 4/8/16-byte elements at several lane strides, a run-time-indexed per-thread array, and a roofline sweep. `code/run_m1.sh` runs it three times: `out/run_{1,2,3}.json` and `.log` (load average 9.2 to 9.8: other agents shared the laptop). `out/trial_run.log` is the first trial run, kept because it shows why two cases were changed: a 4-FMA roofline kernel that stopped unrolling past F = 64, and a constant-address-space case that did not isolate the NVIDIA behaviour (dropped).
- `code/summarize.py`: medians and spreads of the three runs, ptxas reports and SASS excerpts parsed from `out/cc/`, the kernel sources, and five kernels quoted from the parent's Kernel lab (`../../src/lab/out/data.json`) -> `out/data.json` and `parts/22_js_data.js` (`window.MHD`, the only data the page embeds).
- `code/reference.py`: an independent Python version of the page's three models (32-byte sectors, bank passes, the S-buffer tile pipeline) -> `out/expected.json` (1,000 random cases and the page's defaults). `check/check_js.mjs` runs `parts/24_js_model.js` against it: 2,600 values, 0 mismatches.
- `check/check_embed.py`: the page embeds exactly `out/data.json`; 23 numbers in the prose equal the data; derived claims recomputed; no private paths. `check/check_ui.mjs` (from the repo root): every control at 390 px dark and 920 px light, errors, NaN, undefined, sideways scroll, element screenshots.
- `inputs/doc_quotes.txt`: every documentation quote used, with its URL and date. `live.md`: the old Notion page verbatim. `coverage.json`: its 27 claims with verdicts. `viz_ideas.md`: visuals built and rejected.

Parts: `20_read.html` (tab wrapper, CSS, section nav), `20_read_a` (core idea, hero, you need, new terms, the spaces table closed), `20_read_b` (1 global loads) to `20_read_g` (9 judge a kernel, the roofline block and interview rehearsal, both closed), `20_read_z`; `21_js_rd_common.js` and `99_js_tabs.js` (the explainer-page skill templates, storage key `cumem-tab`; nothing plays before the reader acts), `22_js_data.js` (generated), `23_js_charts.js` (MC chart helpers), `24_js_model.js` (sector, bank and pipeline models), `25_js_rd_warp.js`, `26_js_rd_sass.js`, `27_js_rd_pipe.js`, `28_js_rd_roof.js` (closed block in section 9), `29_js_rd_acc.js` (the two pattern widgets, formerly the Access lab tab, plus the parent's M1 numbers), `29_js_rd_hero.js`, `29_js_rd_l2.js` (launch order), `29_js_rd_tile.js` (tiling animation, moved from the parent root), `32_*` Memory instructions, `39_tab_more.html`.

`code/summarize.py` also copies the parent's GPU simulator measurements (`../../src/sim/out/data.json`: coalescing by stride, random gather, tiling, threadgroup banks) and two Kernel lab matmul times into `MHD.root`; they are quoted, not re-measured.

Departures from the child-page method: the Reading tab is organised by memory space rather than by mechanism history, because each section answers "where does this array live and what does it cost" for one space; tiling sits between the caches and banks because banks only matter once a tile is staged.

## The 2026-10-23 rebuild to the teaching contract
Per `technical_knowledge_base/OWNERS.md` this page owns GPU memory as the programmer sees it, including coalescing, banks and tiling, which the parent root used to teach with its own visuals. So:
- **Top**: the core idea in one sentence, a static hero (the ladder: registers, shared memory and L1, L2, DRAM, host, with H100 sizes, H800 latencies and the SASS of each rung), "You need", new terms. The old "In one screen" table is a closed reference block.
- **Absorbed from the parent root's section 3**: the stride rule and the M1 stride measurements (section 1), the tiling before/after animation with its real-size selector and the M1 tiling numbers (section 3, `29_js_rd_tile.js` copied from the root's `25_js_rd_mem.js`), the bank rule, the 32 x 32 transpose and the M1 bank numbers (section 4). The root should now link here instead of teaching them (see the report).
- **Access lab tab removed**: it explained two mechanisms, so its global widget sits in section 1 and its shared-memory widget in section 4 (defaulting to the transpose column with plain, padded and XOR layouts).
- **New visual**: launch order and L2 reuse (`29_js_rd_l2.js`), 90 against 54 blocks for the first nine output tiles, as Triton's tutorial states.
- **Into closed blocks (depth)**: the cache-operator table, L2 persistence, the carveout example, the ptxas declarations table, the launch-bounds documentation note, distributed shared memory, register bank conflicts, the constant-memory SASS and texture memory, host transfer rates, allocation and the Apple contrast, misalignment measurements, the width measurement, the M1 roofline with placed kernels and its calculator (the roofline model is owned by Performance math and the hardware root's Roofline lab; this page keeps only the recipe), interview rehearsal.
- **Deleted as fat**: the mistakes table (each row restated a section; the two that did not are folded into sections 8 and 9), wind-ups, headings, pointers to the old layout.
- **No autoplay**: the template controller; mode toggles reset to step 0 and no longer start playing. `check/check_ui.mjs` asserts every step slider is still at 0 after 2.5 s.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 33.1 min (7,609 words) | 27.1 min (6,239 words) |
| Reading, closed details | 1.5 min | 10.6 min |
| Other tabs | Access lab 1.8, Memory instructions 1.9 min | Memory instructions 1.9 min |
| Visuals drawn in Reading | 3 | 7 (plus the two pattern widgets' charts, 10 bars blocks) |

Why 27 minutes is right: the page now teaches nine mechanisms that this page owns (sectors, the caches and launch order, tiling, banks and swizzles, registers and local memory, constant memory, asynchronous copies, host memory, judging a kernel), three of which (coalescing by stride, tiling, banks) used to live on the root and are now here with their visuals and measurements, about 900 words. Everything not needed on first read (tables of compiler output, measurements that confirm a rule, documentation edge cases, the roofline that another page owns) is closed.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
320 units: core 236, depth 73, fat 11. 303 were drafted from the old page by `ledger.py init` and keyed by a script that matched each sentence's longest surviving phrase (then checked by hand); 7 were added for script-rendered tables and charts, 8 record what was absorbed from the parent root, 2 the new visuals. Fat units carry a `note`.

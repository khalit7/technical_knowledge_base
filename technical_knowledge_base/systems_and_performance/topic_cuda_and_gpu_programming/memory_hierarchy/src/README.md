# Sources, scripts and outputs: GPU memory hierarchy

Build: `sh build.sh` writes `../index.html` from `parts/` (same assembly as the parent and the Memory technology page). Reproduce everything: `run_all.sh` (needs Docker image `kb-gpu-lab:1` and an MLX Python as `MLXPY`).

- `kernels/m1_widths.cu` to `m7_async.cu`: the seven CUDA files the Reading tab quotes. `code/compile_all.sh` compiles them in `kb-gpu-lab:1` (CUDA 13.4.2, nvcc V13.4.92; no GPU) for sm_80, sm_90a and sm_120 with `-O3 -Xptxas -v`, plus `m3_regcap.cu` under eight `-maxrregcount` caps; `code/compile_one.sh` recompiles one file. Reports and SASS in `out/cc/` (no binaries kept).
- `code/measure_m1.py`: the M1 Pro GPU measurements (MLX 0.32.3 custom Metal kernels, each checked against NumPy before timing): load widths, AoS against SoA, threadgroup-memory reads of 4/8/16-byte elements at several lane strides, a run-time-indexed per-thread array, and a roofline sweep. `code/run_m1.sh` runs it three times: `out/run_{1,2,3}.json` and `.log` (load average 9.2 to 9.8: other agents shared the laptop). `out/trial_run.log` is the first trial run, kept because it shows why two cases were changed: a 4-FMA roofline kernel that stopped unrolling past F = 64, and a constant-address-space case that did not isolate the NVIDIA behaviour (dropped).
- `code/summarize.py`: medians and spreads of the three runs, ptxas reports and SASS excerpts parsed from `out/cc/`, the kernel sources, and five kernels quoted from the parent's Kernel lab (`../../src/lab/out/data.json`) -> `out/data.json` and `parts/22_js_data.js` (`window.MHD`, the only data the page embeds).
- `code/reference.py`: an independent Python version of the page's three models (32-byte sectors, bank passes, the S-buffer tile pipeline) -> `out/expected.json` (1,000 random cases and the page's defaults). `check/check_js.mjs` runs `parts/24_js_model.js` against it: 2,600 values, 0 mismatches.
- `check/check_embed.py`: the page embeds exactly `out/data.json`; 23 numbers in the prose equal the data; derived claims recomputed; no private paths. `check/check_ui.mjs` (from the repo root): every control at 390 px dark and 920 px light, errors, NaN, undefined, sideways scroll, element screenshots. `check/check_stages.mjs` (from the repo root, about 3.5 minutes): the five stages, see the 2026-11-06 rollout below.
- `inputs/doc_quotes.txt`: every documentation quote used, with its URL and date. `live.md`: the old Notion page verbatim. `coverage.json`: its 27 claims with verdicts. `viz_ideas.md`: visuals built and rejected.

Parts: `01_head.html`, `02_split.html` (the split layout, a skill template), `20_read.html` (tab wrapper, CSS, section nav), `20_read_a` (core idea, the Fig. 1 hero stage, you need, new terms, the spaces table closed), `20_read_b` (1 global loads) to `20_read_g` (9 judge a kernel, the roofline block and interview rehearsal, both closed), `20_read_z`; `21_js_rd_common.js`, `25_js_s3.js` and `99_js_tabs.js` (the explainer-page skill templates, storage key `cumem-tab`), `22_js_data.js` (generated), `23_js_charts.js` (MC chart helpers), `24_js_model.js` (sector, bank and pipeline models), `25_js_rd_warp.js` (measured bars and the predict box), `26_js_rd_sass.js`, `27_js_rd_pipe.js` (the tile-loop timeline widget), `28_js_rd_roof.js` (closed block in section 9), `29_js_rd_acc.js` (the two pattern widgets, formerly the Access lab tab, plus the parent's M1 numbers), `29_js_rd_l2.js` (launch order), `29_js_rd_tile.js` (the tiling saving at real size), `32_*` Memory instructions, `39_tab_more.html`, `40_js_sc_hero.js` to `44_js_sc_async.js` (the five 3D scenes).

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
- **No autoplay** (superseded on 2026-11-10: the stages now play once in view, see below): the template controller; mode toggles reset to step 0 and no longer start playing. `check/check_ui.mjs` asserts every step slider is still at 0 after 2.5 s.

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

## The 2026-11-06 rollout (split layout, 3D stages v2), done 2026-11-10
Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js`, `21_js_rd_common.js`, `99_js_tabs.js` (key `cumem-tab`). `build.sh` writes its em-dash test as `ED=$(printf ...)`. No new runs: every scene draws from the page's own models (`parts/24_js_model.js`, checked against `code/reference.py`) and its embedded data (`parts/22_js_data.js`, still exactly `out/data.json`).

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | **3D** `stg-hero` (Fig. 1), the ladder | yes, 5 |
| Reading | The idea: you need, new terms, spaces table | full width | none, table closed | no |
| Reading | 1 Global loads | split | **3D** `stg-load` (Fig. 2), one warp's load | yes, 6 |
| Reading | 1 Try any pattern | split | global pattern widget + measured bars (2D tool) | no |
| Reading | 1 Misaligned, width | split | SASS listing | no |
| Reading | 1 When it matters | full width | none | no |
| Reading | 2 Caches | full width | none (three-box grid) | no |
| Reading | 2 Launch order | split | 2D toggle (90 against 54 blocks) | no |
| Reading | 2 L2 persistence | full width | code, closed | no |
| Reading | 3 Tiling | split | **3D** `stg-tile` (Fig. 3) | yes, 5 |
| Reading | 3 Declaring and sizing | full width | tables and code | no |
| Reading | 4 Banks | split | **3D** `stg-bank` (Fig. 4) | yes, 6 |
| Reading | 4 Try any layout | split | bank widget + measured bars (2D tool) | no |
| Reading | 4 Swizzles, DSMEM | full width | none | no |
| Reading | 5 Register caps | split | 2D bar chart | no |
| Reading | 5 Local memory | split | SASS listings + bars | no |
| Reading | 6 Constant memory | full width | table, closed | no |
| Reading | 7 Async copies | split | **3D** `stg-async` (Fig. 5) | yes, 5 |
| Reading | 7 The SASS | split | SASS listings | no |
| Reading | 7 The cost | split | tile-loop timeline (2D widget, opens on its finished schedule) | no |
| Reading | 8 Host memory, 9 Judge a kernel | full width | none; roofline and calculator closed | no |
| Memory instructions | | full width | reader-driven browser | no |

**Stages and their data.** Fig. 1: H100 SXM sizes and H800 latencies already sourced on the page (80 GB at 3.35 TB/s, 50 MB, 228 KB, 65,536 registers = 256 KB per SM derived), plate width on a log scale of bytes; three SMs drawn and the climb's dot density are labelled illustrative. Fig. 2: `MHM.sectors` for a coalesced load (4 sectors), one field of a 32-byte struct (32), 4 bytes misaligned (5), `float4` (16 in one instruction); the random gather's addresses are seeded and labelled illustrative; the M1 gather (1.5 GB/s) and stride-1 (129 GB/s) numbers are `MHD.root`. Fig. 3: T = 4, K = 8, phases of 4 (the illustrative sizes of the 2D animation it replaced); bars are fetch counts, 256 against 64. Fig. 4: `MHM.banks` for a row read, a plain column, padded, XOR, `float4` at strides 8 and 9. Fig. 5: `MHM.pipeline(S, 479, 200, 8)` for 1 to 4 stages (5,432, 2,916, 2,237, 2,079 cycles). On phones every side label hides and one line per step says the result; the step lists name the parts.

**Removed**: the 2D hero (`29_js_rd_hero.js`), the 2D before/after warp animation (in `25_js_rd_warp.js`) and the 2D tile animation (in `29_js_rd_tile.js`), all carried by Figs. 1 to 3; the predict boxes for sections 1 and 4, whose answers Figs. 2 and 4 now show (ledger: fat). **Kept 2D** and why: see `viz_ideas.md`. No photo: the physical memory (HBM stacks, the die) belongs to Memory technology and GPU architecture.

**Motion.** The five stages play once in view (lists `sx-hero`, `sx-load`, `sx-tile`, `sx-bank`, `sx-async`). The tile-loop timeline is a widget (`auto:false`, opens on its last step, mode toggles reopen there). The pattern widgets never moved by themselves.

**Checks.** `check/check_stages.mjs` (new, about 3.5 minutes): plays on view, steps, list lengths, the widget never moving, no redraw off screen, reduced motion, splits, label overlaps at 1400 px including mid-tween, and every number in the step lists against `MHM` and `MHD`. `check/check_ui.mjs`: its never-autoplay assertion now applies to the timeline widget only (it must stay on its finished schedule); the removed animations' clicks replaced by the stages' controls. `check/check_embed.py`: privacy now scans the whole page folder for the login name (looked up at run time, case-sensitive), the hostname, home paths and IPv4 addresses (NVIDIA guide section numbers such as 2.3.4.1 are whitelisted by value).

**Length.** Reading core 6,261 words (27.2 min) before, 7,037 (30.6 min) after; closed 2,552 (11.1) unchanged. The growth is the five step lists (about 1,000 visible words), which explain each figure step by step; the paragraphs and predict boxes they made redundant were cut or folded in. Every unit kept is core or depth; the length is right for nine mechanisms each with its own figure.

**Ledger**: 325 units, core 233, depth 73, fat 19, problems 0. Re-keyed: 22, 23, 26, 27, 33, 101, 102, 126 (their text moved into step lists or figure intros), and 273, 285 to 288, 290 to 301, 303 (keys no longer contain a reading time). Fat: 25, 28 to 31, 98 to 100 (the dropped wind-up and predict boxes). Added: 321 to 325, one per new figure.

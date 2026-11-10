# The compiler stack: sources, scripts, outputs

`sh build.sh` writes `../index.html` from `parts/`. `sh run_all.sh` reproduces every output and runs the checks. No NVIDIA GPU was used anywhere: everything was compiled, or run on the CPU, inside Docker on an Apple M1 Pro laptop.

Images: `kb-gpu-lab:1` (the parent's, `../../src/compile/image/Dockerfile`: CUDA 13.4.2 toolkit for Linux arm64, nvcc V13.4.92, Triton 3.8.0, torch 2.14.1+cpu; image id `sha256:072ecc4d24a3...`) and `kb-gpu-lab-cs7:1` (`code/image/Dockerfile`: the same plus `python3-dev`, because Inductor's CPU back end compiles C++ that includes `Python.h`). cuTile Python 1.6.0 is pip-installed into a throw-away container by `code/run_tile.sh`.

## Code (`code/`)
- `nvcc_stages.sh`: the row softmax (the root's `k5_softmax.cu`, mounted read-only) through `nvcc --dryrun` (sm_90a, sm_90, sm_100f) and `--keep`; fat binaries for eight flag sets (`cuobjdump -lelf -lptx`); the root's kernels (vector add, FP8 mma.sync, wgmma, tcgen05, TMA plus cluster) for fourteen targets including `a` and `f` variants; ptxas -O0 to -O3; Triton's bundled ptxas 12.9 on CUDA 13.4 PTX; e^x four ways and inline PTX (`cu/`); template symbols; SASS with encodings (`nvdisasm -hex`) and live ranges (`-plr`) for six kernels; the `-arch=sm_90a` wgmma trap and its two fixes -> `out/nvcc/`.
- `nvrtc_demo.cpp`, `run_nvrtc.sh`: NVRTC from a C++ program: cubin and PTX, timings (7 runs), a specialised kernel, lowered template names, the missing-include error; the runtime error enum from `driver_types.h` -> `out/nvrtc/`.
- `tile_export.py`, `run_tile.sh`: cuTile Python -> Tile IR bytecode -> `tileiras` -> cubins for sm_80, sm_90, sm_100, sm_120 -> `out/tile/`.
- `tc_programs.py`, `run_tc.sh`, `run_tc2.sh`: torch.compile on the CPU with `TORCH_LOGS` (graph_code, guards, graph_breaks, bytecode, recompiles, dynamic, aot_graphs, fusion, output_code), `torch._dynamo.explain`, `fullgraph=True`, recompilation timings, compile latency cold and warm (3 runs each), mode options; Inductor's GPU code via the Triton page's stand-in driver (`inductor_tg.py` method) -> `out/tc/`.
- `sass_decode.py`: decodes the 21 control bits of every instruction (Jia et al. 2018 layout) and checks them against the code: every register written under a write scoreboard must be waited for before use; plus a negative control with the field shifted -> `out/sass.json`.
- `compat.py`: the documented driver rules (which image loads on which GPU) as code; 660 cases -> `out/compat_expected.json`.
- `build_data.py`: `out/` -> `parts/22_js_data.js` (`window.CSD`, `window.CSC`), paths cleaned; also reads the root's opcode table (`../../src/compile/inputs/sass_opcodes.json`) and `inputs/`.

## Inputs (`inputs/`)
- `pytorch_v2.14.0_build_env_setup.py`: PyTorch's wheel architecture table, fetched from GitHub (tag v2.14.0) on 2026-10-05.
- `triton_attn_sm_90a_ptx_head.txt`: the first lines of the Triton page's compiled PTX (its `run_all.sh` makes the file).

## Checks (`check/`)
- `check_embed.py`: the page embeds exactly the data rebuilt from `out/`; prose numbers agree with it; the fusion stepper's nodes and rounds match `out/tc/inductor_cpu.log`; privacy patterns absent.
- `check_js.mjs`: the Will it run? logic against `compat.py`: 660/660.
- `check_ui.mjs`: every control in every tab at 390 px dark and 920 px light (no errors, NaN, undefined, sideways scroll), screenshots in `../.shots/`; then a normal-motion pass that scrolls every stepper into view and fails if any moves by itself. `shots.mjs`, `smoke.mjs`, `wide.mjs`: helpers used while building.

## Departures from the child-page method
- A new page: no old Notion text, so no `live.md`; `coverage.json` instead records how this page reconciles with the root's section 8 and Compiler explorer.
- No timings of GPU code at all (no NVIDIA GPU, and Metal has nothing to say about ptxas). The only timings are CPU-side: NVRTC compiles and torch.compile's compile latency, labelled with load.
- The scoreboard decoding is independent reverse engineering (Jia et al.), shown as such, and validated here rather than trusted.

## Not committed (`.gitignore`)
cubins and `out/sass.json` (regenerated in seconds by `run_all.sh`).

## The 2026-10-23 rebuild to the teaching contract
Editing only, no new runs: every visual still draws from `out/` through `parts/22_js_data.js`.

**Ownership** (brief of 2026-10-23): this page owns the GPU compiler stack from framework graph to kernel, the cross-cutting view of torch.compile/Inductor, XLA, TVM, MLIR and Triton as one case, NVCC, PTX and SASS, LLVM NVPTX, and what fusion and codegen decide. torch.compile in depth stays with `topic_pytorch_ecosystem/torch_compile`, XLA in depth with `topic_jax_and_tpu/xla_and_compilation`, Triton's passes with `triton_and_gluon`; they are linked.

**What changed and why**
- **Top**: the core idea in one sentence and a new hero (`23_js_rd_flow.js`): a static annotated diagram of six front ends (CUDA C++, Triton, PyTorch, JAX, TVM, cuTile) meeting at PTX and ptxas, cuTile's tileiras bypass drawn, each box clickable for what it produces and how to see it (the old two-road clickable cards, extended). "You need" and new terms follow.
- **New section 1, what each compiler decides**: fusion, codegen and assembly as three decisions, a comparison table of six roads (XLA and TVM added, sourced to openxla.org's GPU architecture page, TVM's overview and TVM 0.11's `build_cuda_on.cc`), and a new fusion stepper (`30_js_rd_fuse.js`) on Inductor's own log of the running example: seven scheduler nodes, four, two, then one C++ kernel plus the library matmul, with the refused pair and its logged reason. The generated C++ and Triton moved here from old section 9 (code in closed blocks).
- **Lab tabs folded into Reading**, each beside the claim it proves: the "SASS, decoded" scoreboard replay is now inside section 4 (its per-instruction table closed), "Will it run?" inside section 5 (its all-GPU matrix closed). Their CSS is scoped to `#cs-sxbox` and `#cs-runbox`; their tab hooks became `RD.onRender`. The run tab's image chips use `data-c` (they used `data-t`, which the tab wiring and the audit took for tab buttons).
- **ptxas levels** became a bar chart (one bar per level, instructions and registers), so "less than a third" is seen.
- **torch.compile condensed to what crosses each stage** (section 8): Dynamo's graph and guards, graph breaks as the point where fusion stops, AOTAutograd's save-or-recompute choice, compile cost and caches. The graph-break stepper, the explain table, recompilations, the guard list, the AOT graphs and the modes table are kept in closed blocks (the owner page teaches them in depth).
- **Moved to closed blocks**: opcode families, templates and names, the full JIT-cache variable table, the Tile IR listing, mistakes and interview answers.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `cs-tab`).
- **Deleted as fat**: tab-bar and nav labels of the old layout, pointers to removed tabs, a wind-up and a restatement (10 units).

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core | 43.2 min | 36.6 min |
| Reading, closed details | 6.5 min | 24.2 min |
| Will it run? tab | 2.2 min | folded into Reading |
| SASS, decoded tab | 10.3 min | folded into Reading |
| Inside torch.compile tab | 0.7 min | 0.7 min |
| Further reading | 2.7 min | 2.9 min |
| Core total, excluding Further reading | 56.4 min | 37.3 min |
| SVG or canvas visuals in Reading (audit) | 1 | 4 (hero, fusion stepper, ptxas bars, live registers) |
(`html_utils/audit_pages.mjs`, 230 words a minute; text written by scripts counts.)

The audit counts only SVG, canvas and images; the page's other visuals are HTML (the nvcc stepper, the PTX highlighter, the SASS line anatomy, the scoreboard replay, the driver stepper, the feature matrix, the e^x stepper, the Dynamo stepper), and the two strongest of those, the scoreboard replay and the driver's search, now sit inline instead of one click away in tabs.

Why about 37 minutes is right: the page covers two complete roads (nvcc and torch.compile) and now the cross-cutting view of four more, and the ledger is mostly core (236 of 304). About 790 words of the core time are the PTX listing itself, which the reader scans with the highlighter rather than reads; without it the core is about 33 minutes. What made the old page long (per-instruction tables, generated code, logs, the torch.compile depth now owned elsewhere, mistakes and interview answers) is closed and optional, which is why the closed time grew.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
304 units: core 236, depth 58, fat 10, owned 0, volatile 0. 297 drafted from the page as built on 2026-10-19 by `ledger.py init` (keys found by a script that looks for the longest phrase of each unit on the rebuilt page, then 24 set by hand); 7 added for the new cross-cutting content. Units from the two folded tabs carry a `note`.

## The 2026-11-06 rollout (split layout, 3D stages v2), done 2026-11-10
Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js`, `21_js_rd_common.js`, `99_js_tabs.js` (key `cs-tab`). No new runs: every scene draws from `parts/22_js_data.js` (unchanged, still rebuilt byte for byte from `out/` by `check_embed.py`).

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | hero, 2D static, clickable (Fig. 1) | no |
| Reading | 1 table, codegen | full width | table | no |
| Reading | 1 Fusion | split | 2D step animation (Fig. 2) | yes, 4 |
| Reading | 2 nvcc | split | **3D** `stg-nvcc` (Fig. 3), sm_90a and sm_90 | yes, 7 and 5 |
| Reading | 3 PTX | split | PTX highlighter, 2D listing | no |
| Reading | 3 Toolkit tie | full width | code | no |
| Reading | 3 On the way down | split | **3D** `stg-down` (Fig. 4) | yes, 5 |
| Reading | 4 Anatomy | split | 2D line anatomy | no |
| Reading | 4 Control bits | split | bit layout + scoreboard replay (reader-driven tool) | no |
| Reading | 4 Live registers | split | 2D chart | no |
| Reading | 5 Which image | split | **3D** `stg-fat` (Fig. 5), release wheel and nightly | yes, 6 and 3 |
| Reading | 5 Driver's search | split | "Will it run?" tool (reader-driven) | no |
| Reading | 5 flags, a/f, trap, JIT cache | full width | tables, code | no |
| Reading | 6 NVRTC stats, templates | full width | stats | no |
| Reading | 6 Compiling late | split | SASS listing with toggle | no |
| Reading | 6 Inline PTX | split | PTX and SASS listings | no |
| Reading | 6 e^x | split | 2D step animation (Fig. 7) | yes, 4 |
| Reading | 7 LLVM, Tile IR | split, split | PTX headers; Tile IR table | no |
| Reading | 8 torch.compile | split | **3D** `stg-tc` (Fig. 6), one road and a graph break | yes, 6 and 4 |
| Reading | 8 Dynamo, AOT, cost, Depth | full width | code; the Dynamo stepper (closed block) with lists | yes, 6 and 4 |
| Inside torch.compile | | full width | reader-driven log browser | no |

**Stages and their data.** `40_js_sc_nvcc.js`: the real `--dryrun` commands (`CSD.dryrun`, `dryrun_sm90`) as program boxes in three lanes (host blue, compute_90 purple, compute_90a teal; SASS orange), files as slabs with log height from the `--keep` sizes, the step's real commands printed under the list. `41_js_sc_down.js`: source (32 lines), PTX (245 lines; 230 virtual registers as cubes by type, `CSD.ptx_regs`), ptxas, SASS plates; -O0 792 slots / 31 registers to -O3 232 / 18 (`ptxas_levels`); four targets' slots (`sass_check`), registers (`sass_regs`) and argument offsets. `42_js_sc_fat.js`: the PyTorch 2.14 release wheel and nightly (`CSC.fat`) on seven GPUs, every outcome from `CSRUN.decide` (the 660/660-checked port of `compat.py`). `43_js_sc_tc.js`: frame, 18-post guard gate, Dynamo, AOTAutograd, Inductor (the seven nodes of `30_js_rd_fuse.js`, exposed as `window.CSFUSE`), C++ (115 lines) and Triton, PTX `.version 8.8`, ptxas, SASS; a graph-break mode from `with_print`'s logs. Objects fade at the card's edge so close-ups never show a cut box; crowded labels hide under 520 px (the step text names them).

**Motion.** Stages and the fusion, e^x and Dynamo steppers play once in view (lists `sx-*`); the per-step captions moved into the lists. The scoreboard replay (232 to 280 instructions) and the driver's search are widgets (`auto:false`): long replays and reader-driven tools. Removed: the 2D nvcc stepper (`23_js_rd_flow.js`), the ptxas bar chart (`24_js_rd_ptx.js`), both carried by Figs. 3 and 4.

**Kept 2D:** the hero (a map of six roads, click for detail), fusion rounds and e^x (flat sequences), listings, tables, the live-register chart, both tools.

**Checks.** `check/check_stages.mjs` (new, about 4.5 minutes): plays on view, steps, list lengths, mode swaps, no redraw off screen, reduced motion, splits, label overlaps at 1400 px including mid-tween, and every number in the step lists against `CSD`/`CSC`/`CSRUN`. `check/check_ui.mjs`: its never-autoplay assertion inverted. `check/check_embed.py`: privacy now scans the page and all of `src/` for the login name (looked up at run time, case-sensitive), hostname, home paths and IPv4 addresses. Recorded logs keep container paths only (`/work`, `/tmp/cs`).

**Length.** Reading core 8,534 words (37.1 min) before, 10,056 (43.7 min) after; closed 5,284 (23.0) to 5,577 (24.2). The growth is the step lists of the four new figures and the nvcc list now static (about 1,200 visible words), which explain each figure step by step; no prose was added beyond the figure intros, and the paragraphs the lists replaced were folded in.

**Ledger**: 304 units, core 236, depth 53, fat 10, owned 5, problems 0. Re-keyed: 30, 35, 36, 72, 118, 141, 151, 244, 269 (their text moved into step lists or new headings) and 272, 282, 287 to 293, 295, 296 (keys no longer contain a reading time).

# Writing kernels: sources, scripts, outputs

Page: `../index.html`, built by `sh build.sh` from `parts/` (page prefix `wk`, storage key `wk-tab`). Rebuilt 2026-10-23 to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`); editing and small derivations only, no new runs.

## Tabs and parts
| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `02_split.html` (split layout, skill template), `20_read.html` (styles, nav), `20_read_a` (the idea: core sentence, the Fig. 1 hero stage with its step list, you need, new terms, what is real, closed pattern table; section 1 matmul ladder), `20_read_b` (2 reductions with the Fig. 2 stage, 3 scan with the Fig. 3 stage), `20_read_c` (4 softmax and norms, 5 fusion with the Fig. 5 stage), `20_read_d` (6 decode GEMV, 7 FlashAttention with the Fig. 6 stage, the split-K/split-Q animation and the FA-3 schedule widget), `20_read_e` (8 testing, closed depth), `20_read_z`; JS `21_js_rd_common.js` (skill template), `22_js_data.js` (WKD), `22_js_ladder.js` (WKL), `23_js_rd_main.js` (bars, SASS excerpts, predict-then-reveal, decode chart), `24_js_rd_fa.js` (split and schedule models and cards), `24_js_rd_treemodel.js` (WKT), `25_js_s3.js` (renderer v2, skill template), `26_js_rd_extra.js` (softmax ladder bars, passes diagram), `40_js_sc_hero.js`, `41_js_sc_tree.js` (Figs. 2 and 3), `42_js_sc_fuse.js`, `43_js_sc_fa.js` (WKFT, the toy) | sections 1 to 8 core, closed depth blocks inside each |
| Kernel bench (M1) `t-bench` | `33_tab_bench.html`, `33_js_bench.js` | every M1 timing with spread, load, rate and timed source: used across the page |
| Compiled for NVIDIA `t-sass` | `34_tab_sass.html`, `34_js_sass.js` | registers and instruction mix of every CUDA kernel for three targets: used across the page |
| Further reading `t-more` | `39_tab_more.html` | |

## What is real
- `m1/`: Metal kernel bodies (`k_reduce.py`, `k_scan.py`, `k_norm.py`, `k_fuse.py`, `k_gemv.py`, `k_attn.py`; the attention kernel extends the root's Kernel lab kernel with causal and grid switches) and `measure.py`, which checks every kernel against float64 NumPy and times it on the Apple M1 Pro GPU through MLX 0.32.3 (`mx.fast.metal_kernel`). Three full runs `m1/out/run_{1,2,3}.json` (+ logs), the power-of-two experiment `m1/out/camp_{1,2,3}.json`, and `m1/out/side_experiments.txt` (debugging checks quoted on the page).
- `cuda/`: the same patterns in CUDA C++ (`kernels/`), compiled for sm_80, sm_90a and sm_120 in the topic root's `kb-gpu-lab:1` image (CUDA 13.4.2) by `compile_all.sh`; `sass_stats.py` reads `ptxas -v` and `cuobjdump -sass` into `cuda/out/stats.json`. Raw SASS dumps are git-ignored and regenerated.
- `inputs/`: verbatim extracts of sources read on 2026-10-05 (Harris's deck, PyTorch, vLLM, flash-attention, cublasLt.h and compute-sanitizer from the toolkit), and `root_kernel_lab_matmul.json`: the topic root's Kernel lab matmul and softmax runs on the same M1 (copied by `ladder.py` from `../../src/lab/out/data.json`, refreshed when that file is present).
- `gen_data.py` merges everything into `out/data.json` and `parts/22_js_data.js` (median of the three run medians; min and max over all trials). `recompute.py --fill` derives every number the prose states (`out/expected.json`) and writes it into the `<span data-wk>` tags. `ladder.py` derives the hero's bytes per FMA from `cuda/kernels/m_ladder.cu`'s tile sizes, joins Boehm's table, the compiled counts and the lab's M1 times into `out/ladder.json` and `parts/22_js_ladder.js`, and writes the hero's numbers as a static table into section 1's closed block. `tree_model.py` and `fa_model.py` are independent Python versions of the two widget models.
- Checks: `node check/check_js.mjs` (widget models against Python), `python3 check/check_embed.py` (page embeds exactly `out/data.json` and `out/ladder.json`, prose numbers equal `expected.json`, no private paths), `node <this folder>/check/check_page.mjs <page folder> <out dir>` from the repo root (every control at 390 px dark and 920 px light, under reduced motion; the FA-3 schedule widget stays on its finished time line), `node <this folder>/check/check_stages.mjs [shots dir]` from the repo root (about 4 minutes: the five stages and the split animation play on view, step lists match in every mode, nothing moves under reduced motion or redraws off screen, splits, label overlaps at 1400 px, step-list numbers against WKL, WKT, WKD and WKFT, the toy FlashAttention against the direct softmax). Reproduce everything: `MLXPY=<python with mlx> sh run_all.sh`.

## The 2026-10-23 rebuild: what changed and why
The audit found 39 minutes of Reading with no visual drawn in it (the decode chart was its only SVG) and the page's two mechanism animations in separate tabs. OWNERS.md now gives this page writing CUDA kernels by hand: the progression from a naive kernel to a tiled, coalesced, vectorised one, warp-level primitives, reductions, fusion and launch configuration.
- **Top**: the core idea in one sentence (reuse every byte fetched from slow memory; every optimisation moves fewer bytes per useful operation or removes a round trip), a **hero stepper over the matmul ladder** (new, `23_js_rd_hero.js`): seven rungs, each showing what one block and one thread touch in A, B and C, the global and shared bytes per FMA it asks for (derived from the code: 33 moved, 5, 0.25, 0.125, 0.0625; shared 8, 4.5, 1), Boehm's published A6000 GFLOP/s, registers as compiled for sm_90a, and the root Kernel lab's M1 time for the nearest rung. Then "You need", seven new terms, the provenance box; the pattern table and the method are a closed reference block.
- **Matmul first** (section 1): it is the progression the page owns, and the hero is its picture; the section keeps what the stepper does not say (coalescing invisible in the binary, FFMA per shared load, registers and blocks per SM, beyond CUDA cores). The compiled table, Boehm's table (now static text), the hero's numbers as a table, the correction and the SASS inner loops are closed.
- **Absorbed from the root's Kernel lab**: the softmax ladder (bars inline in section 4: one threadgroup per row is 50 times faster than one thread per row; every later rung stays within 13% of a copy) and the M1 matmul ladder times (in the hero and its table). The root's lab keeps its runs; it should now link here for the progression.
- **Moved inline**: the reduce-and-scan widget (old tab "Reduce and scan, animated") into section 2, the split-K/split-Q animation and the FA-3 schedule (old tab "Attention schedules") into section 7. A new static before/after of residual + RMSNorm passes (5 against 4) sits in section 4.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (`wk-tab`); the widgets no longer start playing on a mode switch. (Superseded on 2026-11-12: animations and stages now play once in view; see the rollout section below.)
- **Depth into closed blocks**: Harris's rungs by name, the warp-synchronous correction, PyTorch's reduction and scan internals, decoupled look-back, LayerNorm timings and Welford's merge, epilogues in cuBLASLt/CUTLASS/Triton, the GEMV's SASS and Marlin, FA-3's numbers and machinery, FA-4, the backward pass, sanitizer tools, tolerances and inputs that break kernels, interview rehearsal, the practice path.
- **Deleted as fat**: wind-up headings, pointers to the removed tabs, the "Common mistakes" list (each restated a section; the one new line, compare against the compiled framework, is now in section 5), interview answers that restated a section.
- Section numbers changed (matmul is 1; reductions 2, scan 3, norms 4); cross-references in the bench and compiled tabs and Further reading were updated.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 39 min (9,075 words) | 31 min (7,114 words) |
| Reading, closed details | 3 min | 15 min |
| Other tabs, core | 14 min (two animated tabs 4.4, bench 2.2, compiled 4.2, further reading 3.3) | 9.5 min (bench, compiled, further reading) |
| Visuals drawn in Reading (svg or canvas) | 1 | 6 (hero, reduce-and-scan, passes, split, schedule, decode) |

Why 31 minutes is right: the page teaches eight kernel patterns that a transformer is built from, each with a measured result, and now also the matmul and softmax progressions it owns (absorbed from the root); the two animated tabs' text (4.4 minutes) moved into the Reading flow, so the like-for-like core fell from 43 to 31 minutes. Every remaining core unit in the ledger is either a mechanism, the number that proves it, or the caveat that keeps the number honest; about a fifth of the core words are widget captions and counters. Provenance, internals of PyTorch and NVIDIA libraries, FA-3 and FA-4 detail and rehearsal are closed.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
414 units: core 267, depth 101, fat 46, owned 0, volatile 0. 404 were drafted from the old page by `ledger.py init`; 10 were added by hand for absorbed root-lab numbers, the hero's derived traffic and script-rendered tables now in static text. Fat units carry a `note`. The old `coverage.json` (migration from the Notion page) is kept as history.

## Departures from the page-kind shape
- Matmul comes first, before reductions, because the hero is the matmul ladder and the progression is what this page owns.
- The hero's M1 column maps each CUDA rung to the lab's nearest Metal kernel (the lab has no 1D-tile rung; its 2D rung is 4 x 4 per thread); each counter names the M1 case it shows.

## Not run here
Nothing ran on an NVIDIA GPU. Decoupled look-back was not run (no forward-progress guarantee on Metal). The cause of the S = 8 split-KV slowdown is not established. Why the three-sweep softmax (S2) runs near copy speed (likely cache hits on the 16 KB row) was not profiled.

## The 2026-11-06 rollout (split layout, 3D stages v2), done 2026-11-12
Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js`, `21_js_rd_common.js`, `99_js_tabs.js` (key `wk-tab`). Parts renamed so the load order is explicit: `23_js_rd.js` is `23_js_rd_main.js`; `23_js_rd_hero.js` (the 2D hero) and `24_js_rd_tree1.js` (the 2D tree widget) are removed, their figures now 3D; `24_js_rd_tree0.js` is `24_js_rd_treemodel.js`; `25_js_rd_fa.js` is `24_js_rd_fa.js`. Every script runs after the parts it uses (data 22, models 24, renderer 25, scenes 40 to 43, tabs 99). No new runs.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | **3D** `stg-hero` (Fig. 1), the matmul ladder | yes, 7 |
| Reading | You need, terms, what is real, pattern table | full width | none | no |
| Reading | 1 Matmul ladder | full width | none (Fig. 1 is its picture; compiled table and inner loops closed) | no |
| Reading | 2 Reductions | split | **3D** `stg-red` (Fig. 2), modes R1, R2, R3, warp shuffle | yes, 5, 5, 5, 6 |
| Reading | 2 Measured ladder | split | 2D bars | no |
| Reading | 2 Harris's rungs | full width | closed list | no |
| Reading | 2 Shuffles | split | source and SASS listings | no |
| Reading | 2 Combining blocks, order of additions | full width | predict box | no |
| Reading | 3 Scan | split | **3D** `stg-scan` (Fig. 3), Hillis-Steele and Blelloch | yes, 5 and 10 |
| Reading | 3 Measured scans | split | 2D bars | no |
| Reading | 4 Softmax ladder, online softmax | split | 2D bars | no |
| Reading | 4 LayerNorm | full width | predict box, table | no |
| Reading | 4 Residual + RMSNorm | split | 2D passes diagram | no |
| Reading | 5 Fusion, epilogue | split | **3D** `stg-fuse` (Fig. 5) | yes, 5 |
| Reading | 5 Against compiled MLX | split | 2D bars | no |
| Reading | 5 Prologue | full width | table | no |
| Reading | 6 Decode GEMV | split | 2D bars | no |
| Reading | 7 FlashAttention, the algorithm | split | **3D** `stg-fa` (Fig. 6), illustrative toy | yes, 7 |
| Reading | 7 FA-2 grid | split | 2D bars (log) | no |
| Reading | 7 Split K against split Q | split | 2D animation (`RD.anim`, plays on view) | yes, 6 and 5 |
| Reading | 7 Causal masks | full width | none | no |
| Reading | 7 FA-3 | split | 2D schedule widget (no autoplay, opens finished) | no |
| Reading | 7 Decode, split the keys | split | 2D line chart | no |
| Reading | 8 Testing, Depth | full width | none | no |
| Kernel bench, Compiled for NVIDIA | | full width | reader-driven tools | no |

**Stages and their data.** Fig. 1: `WKL` per rung (block tile, K step 32 for rung 3 and 8 after, thread tile, global bytes per FMA as log bars); the 256 x 256 corner and the drawn warp tile of rung 7 are illustrative sizes; the step list carries each rung's numbers (bytes, registers, Boehm's GFLOP/s, M1 time). Figs. 2 and 3: `WKT.run(mode)`, the same states and counters the 2D widget had; the counters under each list run up to the current step. Fig. 5: `WKD.m1.fuse` at K = 1,024 (unfused 10.71, staged 13.76, precise 11.40, fast 10.07, matmul alone 9.92 ms). Fig. 6: `WKFT`, an illustrative toy (seed 5, 4 query rows, 16 keys in 4 tiles, d = 4) whose final output equals the direct softmax to 1e-16; the rows whose maximum rises (tile 2: rows 1 and 2; tile 3: row 4; tile 4: rows 1 and 2) are checked against the list.

**Motion.** The five stages and the split-K/split-Q animation play once in view (lists `sx-hero`, `sx-red-*`, `sx-scan-*`, `sx-fuse`, `sx-fa`, `sx-fak`/`sx-faq`); mode chips swap the list and replay. The FA-3 schedule is a widget (`auto:false`, 25 frames, opens on its finished time line, every mode too). Per-step captions were moved into the step lists and removed.

**Fixed in passing.** The old `20_read_b.html` never closed the "warp-synchronous" correction block and closed the accumulation predict box with `</details>`, so "Combining blocks" and "The order of additions changes the answer" were hidden inside a closed block (ledger units 53 and 59 to 65 were labelled depth for that reason; now core). SVG labels in the split and schedule cards raised from 10 to 11 px.

**Length.** Reading core 7,117 words (31 min) before, 9,542 (41.5 min) after, of which 679 words (3 min) are the step lists of the modes not shown by default; closed 3,563 (15.5) before, 3,319 (14.4) after (the 244 words of the nesting fix moved into the core). The growth is the step lists (2,281 words, 1,600 shown by default): the hero's captions were one at a time before and are now a list with each rung's numbers; Figs. 2, 3 and 6 explain mechanisms that were a widget caption or prose before; the split-K/split-Q steps were a caption carousel. Duplicates between the hero list and section 1 were cut from the list. Every unit kept is core or depth; 42 minutes is long, but it covers eight kernel patterns, each with its measured result and now its explained figure.

**Ledger**: 420 units, core 281, depth 93, fat 46, problems 0. Re-keyed 321, 322, 327 (the widget's caption became the stage's note and step lists); 53 and 59 to 65 relabelled core (nesting fix); added 415 to 420, one per new figure and one for the traffic claim of Fig. 6.

**Checks.** `check/check_stages.mjs` (new), `check/check_page.mjs` (its never-autoplay assertion now applies to the FA-3 widget only, and it runs under reduced motion), `check/check_js.mjs` and `check/check_embed.py` (paths of the renamed parts updated).

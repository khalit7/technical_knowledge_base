# Writing kernels: sources, scripts, outputs

Page: `../index.html`, built by `sh build.sh` from `parts/` (page prefix `wk`, storage key `wk-tab`). Rebuilt 2026-10-23 to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`); editing and small derivations only, no new runs.

## Tabs and parts
| Tab | Parts | What |
|---|---|---|
| Reading `t-read` | `20_read.html` (styles), `20_read_a` (nav, the idea in one screen: core sentence, hero, you need, new terms, what is real, closed pattern table; section 1 matmul ladder), `20_read_b` (2 reductions with the reduce-and-scan widget, 3 scan), `20_read_c` (4 softmax and norms, 5 fusion), `20_read_d` (6 decode GEMV, 7 FlashAttention with the split and schedule widgets), `20_read_e` (8 testing, closed depth), `20_read_z`; JS `21_js_rd_common.js` (skill template, never autoplays), `22_js_data.js` (WKD), `22_js_ladder.js` (WKL), `23_js_rd.js` (bars, SASS excerpts, predict-then-reveal, decode chart), `23_js_rd_hero.js`, `24_js_rd_tree0.js` / `24_js_rd_tree1.js`, `25_js_rd_fa.js`, `26_js_rd_extra.js` (softmax ladder bars, passes diagram) | sections 1 to 8 core, closed depth blocks inside each |
| Kernel bench (M1) `t-bench` | `33_tab_bench.html`, `33_js_bench.js` | every M1 timing with spread, load, rate and timed source: used across the page |
| Compiled for NVIDIA `t-sass` | `34_tab_sass.html`, `34_js_sass.js` | registers and instruction mix of every CUDA kernel for three targets: used across the page |
| Further reading `t-more` | `39_tab_more.html` | |

## What is real
- `m1/`: Metal kernel bodies (`k_reduce.py`, `k_scan.py`, `k_norm.py`, `k_fuse.py`, `k_gemv.py`, `k_attn.py`; the attention kernel extends the root's Kernel lab kernel with causal and grid switches) and `measure.py`, which checks every kernel against float64 NumPy and times it on the Apple M1 Pro GPU through MLX 0.32.3 (`mx.fast.metal_kernel`). Three full runs `m1/out/run_{1,2,3}.json` (+ logs), the power-of-two experiment `m1/out/camp_{1,2,3}.json`, and `m1/out/side_experiments.txt` (debugging checks quoted on the page).
- `cuda/`: the same patterns in CUDA C++ (`kernels/`), compiled for sm_80, sm_90a and sm_120 in the topic root's `kb-gpu-lab:1` image (CUDA 13.4.2) by `compile_all.sh`; `sass_stats.py` reads `ptxas -v` and `cuobjdump -sass` into `cuda/out/stats.json`. Raw SASS dumps are git-ignored and regenerated.
- `inputs/`: verbatim extracts of sources read on 2026-10-05 (Harris's deck, PyTorch, vLLM, flash-attention, cublasLt.h and compute-sanitizer from the toolkit), and `root_kernel_lab_matmul.json`: the topic root's Kernel lab matmul and softmax runs on the same M1 (copied by `ladder.py` from `../../src/lab/out/data.json`, refreshed when that file is present).
- `gen_data.py` merges everything into `out/data.json` and `parts/22_js_data.js` (median of the three run medians; min and max over all trials). `recompute.py --fill` derives every number the prose states (`out/expected.json`) and writes it into the `<span data-wk>` tags. `ladder.py` derives the hero's bytes per FMA from `cuda/kernels/m_ladder.cu`'s tile sizes, joins Boehm's table, the compiled counts and the lab's M1 times into `out/ladder.json` and `parts/22_js_ladder.js`, and writes the hero's numbers as a static table into section 1's closed block. `tree_model.py` and `fa_model.py` are independent Python versions of the two widget models.
- Checks: `node check/check_js.mjs` (widget models against Python), `python3 check/check_embed.py` (page embeds exactly `out/data.json` and `out/ladder.json`, prose numbers equal `expected.json`, no private paths), `node <this folder>/check/check_page.mjs <page folder> <out dir>` from the repo root (every control at 390 px dark and 920 px light, and no animation moves before the reader acts). Reproduce everything: `MLXPY=<python with mlx> sh run_all.sh`.

## The 2026-10-23 rebuild: what changed and why
The audit found 39 minutes of Reading with no visual drawn in it (the decode chart was its only SVG) and the page's two mechanism animations in separate tabs. OWNERS.md now gives this page writing CUDA kernels by hand: the progression from a naive kernel to a tiled, coalesced, vectorised one, warp-level primitives, reductions, fusion and launch configuration.
- **Top**: the core idea in one sentence (reuse every byte fetched from slow memory; every optimisation moves fewer bytes per useful operation or removes a round trip), a **hero stepper over the matmul ladder** (new, `23_js_rd_hero.js`): seven rungs, each showing what one block and one thread touch in A, B and C, the global and shared bytes per FMA it asks for (derived from the code: 33 moved, 5, 0.25, 0.125, 0.0625; shared 8, 4.5, 1), Boehm's published A6000 GFLOP/s, registers as compiled for sm_90a, and the root Kernel lab's M1 time for the nearest rung. Then "You need", seven new terms, the provenance box; the pattern table and the method are a closed reference block.
- **Matmul first** (section 1): it is the progression the page owns, and the hero is its picture; the section keeps what the stepper does not say (coalescing invisible in the binary, FFMA per shared load, registers and blocks per SM, beyond CUDA cores). The compiled table, Boehm's table (now static text), the hero's numbers as a table, the correction and the SASS inner loops are closed.
- **Absorbed from the root's Kernel lab**: the softmax ladder (bars inline in section 4: one threadgroup per row is 50 times faster than one thread per row; every later rung stays within 13% of a copy) and the M1 matmul ladder times (in the hero and its table). The root's lab keeps its runs; it should now link here for the progression.
- **Moved inline**: the reduce-and-scan widget (old tab "Reduce and scan, animated") into section 2, the split-K/split-Q animation and the FA-3 schedule (old tab "Attention schedules") into section 7. A new static before/after of residual + RMSNorm passes (5 against 4) sits in section 4.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (`wk-tab`); the widgets no longer start playing on a mode switch.
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

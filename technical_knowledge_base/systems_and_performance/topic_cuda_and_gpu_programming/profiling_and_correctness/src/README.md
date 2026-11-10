# Sources, scripts and outputs: Profiling, benchmarking and correctness

Build: `sh build.sh` writes `../index.html` from `parts/` (same assembly as the siblings). Reproduce everything: `sh run_all.sh` (Docker image `kb-gpu-lab:1`, uv, an MLX Python as `MLXPY`, html_utils' node_modules).

- `code/ncu_extract.sh` (inside kb-gpu-lab:1, Nsight Compute 2026.3.1, compute-sanitizer 2026.3.0, no GPU): help text, `--list-sets/sections/rules`, and `ncu --import` (details, raw CSV, SASS source, session) of the six sample reports NVIDIA ships in `extras/samples` (profiled by NVIDIA on an RTX A4500, October 2023); a deliberately bad kernel run under ncu and compute-sanitizer without a GPU (both refuse). Outputs `out/ncu/`. Section files and sample sources copied to `inputs/ncu_sections/`, `inputs/ncu_samples/`.
- `code/check_metric_names.sh`: every metric name the page cites against `ncu --query-metrics --chip` for ga100, gh100, gb100, gb202 -> `out/ncu/metric_names_checked.txt` (the full lists, about 1 MB each, are not kept).
- `code/parse_ncu.py`: parses the details text into `out/ncu_reports.json` (values copied, nothing computed).
- `code/measure_timing.py`, `code/measure_warmup.py`, `code/run_timing.sh`: PyTorch 2.14.1 on the M1 Pro GPU (MPS): async timing four ways, launch-bound tiny op, hot/cold cache, 300-timing distributions, a line-by-line port of `triton.testing.do_bench`, warm-up in 9 fresh processes. Three runs: `out/timing_run_{1,2,3}.json`, `out/warmup_run_*.jsonl`; load averages recorded (4.3 to 4.7). MPS refuses event pairs that land in one command buffer; the port adds a synchronise before each start event (said on the page).
- `code/profile_torch.py`: torch.profiler on a small MLP training step, CPU and MPS (CPU activity only: 2.14.1 has no MPS activity) -> `out/torch_profiler.json`.
- `code/numerics.py`: finfo and assert_close defaults, accumulation error against K, summation orders and split-K, simulated atomic orders, fp16/bf16 MPS matmul against float64, FP8 scaling -> `out/numerics.json`. `code/atomics_mlx.py`: float atomics on the M1 GPU (MLX 0.32.3) -> `out/atomics.json`.
- `code/reference.py`: independent Python reference (PyTorch casts) for the page's float model -> `out/expected.json`; `check/check_js.mjs` compares `parts/24_js_fp.js` with it (2,099 values, 0 mismatches).
- `code/summarize.py`: everything the page shows -> `out/data.json` and `parts/22_js_data.js` (`window.PCD`).
- `check/check_embed.py`: the page embeds exactly `out/data.json`; 10 plain-text prose claims recomputed; privacy scan. `check/check_page.mjs` (from the repo root): every control at 390 px dark and 920 px light (timeline-shape rows, stall pairs, every closed block opened, the workbench), errors, NaN, sideways scroll, every `data-v` number equal to its data value, and (since 2026-11-10) every stage playing once in view. `check_embed.py` also checks the static formats table and the new plain-text numbers (atomics, FP8, Sobel occupancy) against the data.
- `inputs/doc_quotes.txt`: every documentation quote with URL and date; `inputs/triton_do_bench.txt`: the do_bench source read; `inputs/cited_metrics.txt`.
- `live.md`: the old Notion page verbatim (copy of the parent's `read/old/05_profiling.md`, fetched 2026-09-22; re-fetched 2026-10-05, unchanged); `coverage.json`: its 38 claims with verdicts (3 corrected, 2 dropped). `viz_ideas.md`.

Parts (since 2026-10-23): `20_read.html` (wrapper, CSS, nav), `20_read_a` (core idea, hero loop, you need, new terms, provenance block, section 1), `20_read_b` to `20_read_e` (sections 2 to 5), `20_read_f` (section 6, closed depth), `02_split.html`, `21_js_rd_common.js` and `25_js_s3.js` (skill templates), `22_js_data.js` (generated), `23_js_charts.js` (MC charts, copied), `24_js_fp.js` (float model), `25` Fig. 1 numbers, `26` benchmark charts, `27` profiler trace, `27b` six timeline shapes, `28` the report pairs, Fig. 2 numbers and metric anatomy, `28b` warp stalls and occupancy, `29` numerics charts and Fig. 3 numbers, `29b` the dot-product workbench (closed block in section 5; was the Numerics lab tab), `30` fills prose numbers, `31_*` Report reader, `39_tab_more.html`, `40` to `42` the three scenes, `99_js_tabs.js` (template, storage key `cuprof-tab`).

Departures from the child-page method: none of substance. The page is about 301 KB because the Report reader embeds NVIDIA's six reports (about 105 KB of data).

## The 2026-10-23 rebuild to the teaching contract (editing only, no new runs)
What changed and why:
- **Top**: the core idea in one sentence and a hero figure (the loop: timeline, ncu, change one thing, honest timing, check the answer, each with its tool and section), "You need" and a short new-terms list. The old four-question cards and the workflow list of section 6 are carried by the hero; the provenance table is a closed block.
- **New inline visuals** where a mechanism had none: six timeline shapes driven by the symptom table (illustrative, labelled), and a before/after of where a warp's cycles go (stall reasons, issue rate, achieved occupancy) from NVIDIA's reports, which now carries the warp-stall paragraph and the "metrics that matter" (achieved occupancy, memory throughput, stall reasons).
- **The Numerics lab tab moved** into Reading section 5 as a closed workbench (it explained one mechanism). Tabs left: Reading, Report reader (a dataset view used by section 4), Further reading.
- **Absorbed from Writing kernels**: compute-sanitizer's tool names as its help text gives them ("Memory access checking", "Shared memory hazard checking", "Synchronization checking", "Global memory initialization checking") and the assert_close tolerance table including float64 (1e-7, 1e-7); the formats table is now static HTML.
- **To closed blocks**: provenance, the do_bench port and fair-comparison rules, CUPTI and Kineto, nsys commands, extra ncu flags, metric anatomy and the question-to-metric table, FP8 scaling (owned by Quantization and Precision), interview rehearsal, agents.
- **Corrections**: the two ncu clock corrections merged into one box in section 2; a new visible correction: the old page's "Phi-Bench" figure, earlier called unfindable, is arXiv 2609.10226 and has a paper page (linked).
- **Deleted as fat**: the common-mistakes list (each restated a section; the two that added something, the loose bfloat16 tolerance and bit-equality, moved into the checklist and the determinism list), wind-ups and duplicate headings.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; mode switches no longer start the animations.

## Length judgement
| | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading, core (230 words a minute) | 30.8 min | 25.2 min |
| Reading, closed details | 2.2 min | 8.5 min |
| Other tabs | Report reader 1.2 + 10.4 closed, Numerics lab 1.3, Further reading 2.3 | Report reader 1.2 + 10.4 closed, Further reading 2.2 |
| Visuals inline in Reading | 8 (+1 in a tab) | 10 counted by the audit, plus hero and two in closed blocks |

Why 25 minutes is right: the page owns four tools and a method (timing, timelines, kernel counters, correctness), and every core ledger unit is needed for one of them; a fifth of the core words are captions, tables and code that a reader uses as reference while reading. What was cut is restatement; what was moved is optional reference.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
318 units: core 218, depth 64, fat 35, volatile 1 (Hyperloom, owned by the 2026-09-14 tech news issue; a dated sentence stays in the closed agents block). 303 drafted by `ledger.py init`; 15 added by hand for the hero, new visuals, script-drawn tables and the absorbed units. Fat units carry a `note`.

## The 2026-11-06 rollout (split layout, 3D stages v2), done 2026-11-10
Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js`, `21_js_rd_common.js`, `99_js_tabs.js` (key `cuprof-tab`). No new runs: every scene draws from `parts/22_js_data.js` (unchanged, still equal to `out/data.json`) and the page's float16 model (`24_js_fp.js`).

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | hero: the loop, 2D static (vertical in the right column) | no |
| Reading | 1 Why a stopwatch lies | split | **3D** `stg-time` (Fig. 1), four modes | yes, 4 each |
| Reading | 2 intro | full width | none | no |
| Reading | 2 Warm-up, Caches, Spread | split, split, split | 2D charts (log axes, histograms) | no |
| Reading | 2 Clocks, do_bench | full width | correction boxes, closed block | no |
| Reading | 3 intro and tools | full width | table | no |
| Reading | 3 Six timeline shapes | split | 2D widget (the symptom table on the left is the selector) | no |
| Reading | 3 CUPTI, nsys | full width | closed block | no |
| Reading | 3 torch.profiler | split | 2D real trace and table | no |
| Reading | 4 intro, replay cost, flags | full width | code, closed block | no |
| Reading | 4 Read a report top-down | split | **3D** `stg-walk` (Fig. 2), three pairs | yes, 7 each |
| Reading | 4 Warp stalls | split | 2D stacked bars | no |
| Reading | 4 Metric names | full width | closed reference table | no |
| Reading | 5 intro, formats, comparing | full width | table, predict | no |
| Reading | 5 Accumulate in float32 | split | 2D log-log chart | no |
| Reading | 5 Workbench | full width | closed widget | no |
| Reading | 5 Order changes the bits | split | 2D bars | no |
| Reading | 5 Atomics | split | **3D** `stg-sum` (Fig. 3), three orders | yes, 5 each |
| Reading | 5 Determinism to FP8, 6 Depth | full width | tables, closed blocks | no |
| Report reader | | full width | dataset view (no prose) | no |
| Further reading | | unchanged | | |

**Stages and their data.** `40_js_sc_time.js` (Fig. 1): the CPU thread and the GPU stream as two glass lanes on one time axis drawn to scale per mode, launches as flowing dots, the host clock as green posts on a ruler, events as purple flags; durations are the measured medians of `PCD.timing.async` (M1 Pro, MPS); the steps about the 0.18 ms call move the camera close and fade the far lane. `41_js_sc_walk.js` (Fig. 2): one group of columns per metric (duration, Compute (SM), Memory, the metric the numbers point to), the slow kernel orange and NVIDIA's fixed kernel green, a glass ceiling at 100% of peak, the rule's estimated speedup as a purple ghost of the duration it predicts; every number from `NCU.pairData` (NVIDIA's six sample reports); first and last steps close on the duration. `42_js_sc_sum.js` (Fig. 3): sixteen float16 numbers, one running total (left to right, or a random atomic order with "Another run") with a row of "lost so far" columns, or the pairwise tree built level by level; values from `window.PCSUM` (`29_js_rd_num.js`, the page's float16 model). Long replays follow the rule: fifteen additions are three stretches of five.

**Motion.** All three stages play once in view (lists `sx-tl-*`, `sx-wk-*`, `sx-sum-*`); the per-step captions of the old 2D animations moved into the lists, and their counters stayed only where they add numbers the list does not (Fig. 1's runs and implied TFLOP/s, Fig. 3's running result). Removed: the 2D timing animation, the 2D report walk and the 2D summation animation (their scripts keep only data and prose values). The six timeline shapes, the warp-stall pairs and the workbench are reader-driven widgets without autoplay.

**Kept 2D, and why:** the hero is a map read as text; warm-up and cache curves and the accumulation chart need log axes; the 300-timing histograms are distributions; the timeline shapes are illustrative and a flat timeline is the tool's own picture (Fig. 1 gives lanes their depth); the profiler trace is a real flat trace; warp stalls are a stacked bar with a legend; the order bars use a log scale. Rejected: per-element error columns under a glass tolerance slab (the recorded MPS matmul keeps only summaries; the float model on a small grid would show no failures at the measured rate of 23 in 65,536); a 3D nsys timeline (no recorded trace).

**Other changes.** Warp-stall colours: Drain and Selected no longer share MIO Throttle's and Barrier's colours; the "top stall" counter now takes the largest reason. Figures renumbered 1 to 3. One-line titles on every chart card. Ledger: units 44, 140, 200 re-keyed (their text moved into the new figures' intros), and 294, 296, 298 to 301 re-keyed so no key contains a reading time.

**Checks.** `check/check_stages.mjs` (new, about 5 minutes): plays on view, steps every mode to the end, list lengths, mode swaps and "Another run", no redraw off screen, reduced motion, 12 splits at 1400 px and none below 1100, label overlaps and card edges at 1400 px including mid-tween, and every number in the step lists recomputed from `PCD` and `FP` (not from the page's own scripts), with the quoted rule texts found in NVIDIA's reports. `check/check_page.mjs`: the never-autoplay assertion inverted (each stage must play once scrolled into view); the stage modes replace the old animation loop. `check/check_embed.py`: privacy now scans the whole page folder for the login name (looked up at run time, case-sensitive), the hostname, home paths and IPv4 addresses (the loopback 127.0.0.1 in NVIDIA's reports and `ncu --help` is allowed; NVIDIA's session files name their own profiling host, a Ryzen 7 3700X, not this machine, and are not embedded).

**Length.** Reading core 5,799 words (25.2 min) before, 7,149 (31.1 min) after; closed 1,954 (8.5 min) unchanged; Report reader 1.2 + 10.4 closed and Further reading 2.3, unchanged. The growth is the step lists of the three figures (about 1,350 words, of which 711 are in the lists of modes not shown at first; a reader following one mode per figure reads about 6,440 words, 28 min). The lists carry what the old animations wrote in script-drawn captions, which the audit did not count, so the page is not longer to read than before by that much; no prose was added beyond the figure intros.

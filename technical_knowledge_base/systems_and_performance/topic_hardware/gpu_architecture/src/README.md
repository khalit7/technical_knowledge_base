# GPU architecture page: sources and scripts

- `build.sh`: assembles `../index.html` from `parts/` (Reading `20_read_a..j.html`, `39_tab_more.html`; every JS part in its own script, `99_js_tabs.js` last). JS: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `ga-tab`; nothing animates before the reader acts), `22_js_ga_data.js` (generated), `23` scheduler animation, `24` SM per generation, `25` tile through three instruction families, `26` fills tables and numbers, `27` hero, `28` M1 charts, `29` floorplans, `30` B200 against MI300X.
- `run_all.sh`: reproduces everything: three runs of `m1/gpu_micro.py` on the M1 Pro GPU (needs an MLX Python outside the repo, `MLXPY=...`), then `recompute.py`, `build.sh`, `check_embed.py`. `SKIP_MEASURE=1` skips the measurements.
- `m1/gpu_micro.py`: four microbenchmarks with custom Metal kernels (pointer-chase latency against size, pointer-chase and coalesced-read throughput against threads, the occupancy cliff from reserved threadgroup memory, divergence by lane against by SIMD-group). Results checked against NumPy. Raw outputs and logs in `m1/out/` (MLX 0.32.3, 2026-10-05, load average 6.8 to 13: the machine was shared).
- `recompute.py` (stdlib): medians across runs, every derived number (Little's law, occupancy of the example kernel with the cuda_occupancy.h rules, tile instruction counts from PTX shapes, the latency-hiding simulation `hide_sim`, ratios and ridges), vendor figures typed with URLs; writes `out/expected.json` and `parts/22_js_ga_data.js` (window.GA).
- `check_embed.py`: the page embeds exactly `out/expected.json`, 30 hand-written prose numbers agree with the data, no private patterns.
- `check/check_page.mjs`: puppeteer, every tab and control at 390 px dark and 920 px light; no autoplay (every scrubber still at 0 after scrolling through the page); no errors, NaN, undefined or sideways scroll; the animations' end states equal the Python reference; screenshots to `../.shots/own/` or a given folder.
- `check_embed.py` also checks the AMD peaks (MI300X 1,307.4, MI355X 2,516.6 and about 10 PF MXFP4) from units x FLOPs per clock x clock.
- `ledger.json`: the knowledge ledger (`python3 html_utils/ledger.py check`). `../img/`: two photos, credits in `../img/CREDITS.md`.
- `live.md`: the old Notion page verbatim; `coverage.json`: 46 facts with verdict and where carried. `viz_ideas.md`: visuals built and rejected.

## The 2026-10-23 rebuild to the teaching contract
**What changed and why.**
- **Top**: the core idea in one sentence, a new static hero (one H100: 132 SMs, L2 and HBM sites; one SM zoomed; the ladder from HBM to the tensor core with Luo et al.'s latencies), "You need", and 16 new terms in a closed block; the six-part comparison table stays.
- **Tabs folded into Reading**: the Chip floorplans tab (now section 9, beside the text on GPCs and dies) and the M1 GPU lab (its charts now sit in sections 3, 4 and 6 beside the claim each one proves, with the "transfers / does not transfer" lines as captions and the method in a closed block). Each explained one mechanism, so by the contract they belong inline. Tabs now: Reading, Further reading.
- **Photos**: the GA100 die (CC BY 3.0) and a delidded Tesla P100 package with four HBM2 stacks (CC0), section 9, credited under each and in `img/CREDITS.md`. No openly licensed photo of an H100 or B200 SXM board was found on Wikimedia Commons (only PCIe cards in shrouds and nodes under cold plates).
- **AMD MI-series added** (section 13, owned here per the 2026-10-23 brief): CU, wavefront, LDS and register file against the SM; MI300X and MI355X per-CU rates with the peaks reproduced; chiplets and their cost; MI455X in a closed block. Absorbed from the TPUs and other accelerators sibling's section 5 and its research notes (fetched 2026-10-05); that page should keep its software and scale-up parts and link here for the hardware.
- **Ownership**: occupancy as a concept now links Programming model section 5 (per-generation limits stay here, section numbering 2 to 8 kept because other pages cite it); tensor-core instructions, the compiler's SASS per target and warp specialisation link Libraries and tensor cores sections 5 and 6 (throughput, the data path animation and TMEM as silicon stay here).
- **No autoplay**: template controller; the two mode switches no longer start the animations. SVG text raised to at least 11 px.
- **Depth closed**: source lists for every table, the corrections to the old page, Luo's throughput figures, the M1 method, GPU checks, two quoting traps and the interview rehearsal. Four "common mistakes" that restated sections 4, 5, 7 and 10 were deleted as fat.

**Length judgement.**
| | Before (2026-10-23 audit) | After |
|---|---|---|
| Reading, core | 30.4 min (6,988 words) | 29.4 min (6,757 words) |
| Reading, closed details | 1.8 min | 7.8 min |
| Other tabs, core | Chip floorplans 2.0 + M1 GPU lab 2.6 = 4.7 min | none |
| Core total, excluding Further reading | 35.1 min | 29.4 min |
| Visuals drawn in Reading | 3 | 11 (audit count) |

Why about 29 minutes is right: the page carries a whole chip from the SM up for five NVIDIA generations plus AMD, and every section is one mechanism with its numbers and its picture; a fifth of the core words are the comparison tables and chart captions. The old core plus the two tabs (35 minutes) shrank by six minutes while absorbing both tabs and adding AMD, mostly by moving provenance and rehearsal into closed blocks and cutting restatement. Cutting further would drop a mechanism (divergence, the ladder, the floorplans) that other pages link here for.

**Ledger** (`src/ledger.json`, check: problems 0): 323 units, core 232, depth 44, fat 41 (each with a note), owned 4 (three by Libraries and tensor cores: the SASS per target, `ptxas` refusals for sm_120/120a/121a, producer/consumer warps; one by Programming model: the occupancy calculator), volatile 2 (Rubin's production status, MI455X figures; both kept here in closed or source blocks). 310 drafted by `ledger.py init`, 13 added by hand for the hero, photos, script-rendered tables and the absorbed AMD units.

Shape: `.claude/skills/explainer-page/page-kinds/topic-child.md` (Reading by the subject's logic, one tab per standalone visual). Departures: no lab tabs (every visual explains one mechanism, so all sit inline); the parent's section 2, Chip atlas and Roofline lab are linked, not repeated. Programming the GPU (instructions, kernels, profiling) is left to Topic: cuda-and-gpu-programming, whose compile results are cited.

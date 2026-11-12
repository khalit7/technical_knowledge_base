# GPU architecture page: sources and scripts

- `build.sh`: assembles `../index.html` from `parts/` (`01_head.html`, `02_split.html`, header, Reading `20_read_a..j.html`, `39_tab_more.html`; every JS part in its own script, `99_js_tabs.js` last). JS: `21_js_rd_common.js`, `25_js_s3.js` and `99_js_tabs.js` are the skill templates (storage key `ga-tab`), `22_js_ga_data.js` (generated), `23` scheduler stepper, `24` SM table (and `window.GA_SM`), `26` fills tables and numbers, `28` M1 charts, `29` two-chip comparison table (and the GPC plans, `window.GA_PLAN`), `31` tile through three instruction families; scenes `40_js_sc_hero.js` (Fig. 1), `41_js_sc_sm.js` (Fig. 2), `43_js_sc_gen.js` (Fig. 3), `44_js_sc_amd.js` (Fig. 4).
- `run_all.sh`: reproduces everything: three runs of `m1/gpu_micro.py` on the M1 Pro GPU (needs an MLX Python outside the repo, `MLXPY=...`), then `recompute.py`, `build.sh`, `check_embed.py`. `SKIP_MEASURE=1` skips the measurements.
- `m1/gpu_micro.py`: four microbenchmarks with custom Metal kernels (pointer-chase latency against size, pointer-chase and coalesced-read throughput against threads, the occupancy cliff from reserved threadgroup memory, divergence by lane against by SIMD-group). Results checked against NumPy. Raw outputs and logs in `m1/out/` (MLX 0.32.3, 2026-10-05, load average 6.8 to 13: the machine was shared).
- `recompute.py` (stdlib): medians across runs, every derived number (Little's law, occupancy of the example kernel with the cuda_occupancy.h rules, tile instruction counts from PTX shapes, the latency-hiding simulation `hide_sim`, ratios and ridges), vendor figures typed with URLs; writes `out/expected.json` and `parts/22_js_ga_data.js` (window.GA).
- `check_embed.py`: the page embeds exactly `out/expected.json`, 30 hand-written prose numbers agree with the data, no private patterns.
- `check/check_page.mjs`: puppeteer, every tab and control at 390 px dark and 920 px light; the two 2D animations play once scrolled into view; no errors, NaN, undefined or sideways scroll; the animations' end states equal the Python reference; screenshots to `../.shots/own/` or a given folder.
- `check_embed.py` also checks the AMD peaks (MI300X 1,307.4, MI355X 2,516.6 and about 10 PF MXFP4) from units x FLOPs per clock x clock.
- `check/check_stages.mjs` (from the repo root, a few minutes): the 2026-11-06 rollout checks, see the last section.
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

## The 2026-11-06 rollout (split layout, 3D stages v2), done 2026-11-12
Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js`, `21_js_rd_common.js`, `99_js_tabs.js` (key `ga-tab`). The page's `#t-read .an-ctl` rules skip `.stg-bar`. No new runs: every scene draws from `window.GA` (`out/expected.json`, unchanged) and the plans already in the page.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | 1 The idea | split | **3D** `stg-hero` (Fig. 1): one H100, 132 of 144 SMs in 8 GPCs, one SM opened, the tile's ladder as flows | yes, 4 |
| Reading | 1 You need, terms, six-part table, labels | full width | table | no |
| Reading | 2 The SM | split | **3D** `stg-sm` (Fig. 2): H100 SM, then A100, B200 / B300, RTX 5090 | yes, 6 |
| Reading | 2 SM table | full width | table | no |
| Reading | 3 Hiding latency | split | 2D scheduler stepper (three programs) | yes, 4 + 4 + 4 |
| Reading | 3 Little's law, predict, M1 method | split | 2D M1 charts | no |
| Reading | 4 Limits table | full width | table | no |
| Reading | 4 Our tile's kernel | split | 2D M1 shared-memory chart | no |
| Reading | 5 Divergence | split | 2D M1 bars | no |
| Reading | 6 Ladder table | full width | table | no |
| Reading | 6 What it shows, training | split | 2D M1 pointer-chase chart | no |
| Reading | 7 Tensor cores | split | 2D tile through three generations | yes, 6 + 6 + 6 |
| Reading | 7 Generation table, compile target | full width | table | no |
| Reading | 8 Feeding the tensor cores | full width | none (four text cards) | no |
| Reading | 9 Grouping, L2 and memory | split | two photos | no |
| Reading | 9 Two dies | split | **3D** `stg-gen` (Fig. 3): six chips, then BF16 against bandwidth | yes, 7 |
| Reading | 9 Any two chips | full width | comparison table | no |
| Reading | 10 to 12 | full width | tables | no |
| Reading | 13 AMD | split | **3D** `stg-amd` (Fig. 4): B200 against MI300X | yes, 4 |
| Reading | 13 AMD table, porting, MI455X; 14 Depth | full width | table; details closed | no |
| Further reading | | unchanged | | |

**Stages and their data.** Fig. 1: `GA.chips` (H100: 144 SMs, 132 on, 8 GPCs, 50 MB L2, 6 sites, 5 used, 80 GB, 3.35 TB/s, 814 mm2), the H100 GPC plan of `GA_PLAN` (which SMs are off is illustrative), `GA.luo.H800` (479, 263, 29 cycles), `GA.tile.h100_fma_clk_sm`. Fig. 2: `GA_SM` per generation (lanes, L1 + shared, shared carve-out, TMA, TMEM, resident warps) and `GA.tile.acc_bytes` (a quarter of the register file). Fig. 3: `GA_PLAN` for all six chips (GPCs, SMs on and off, stack sites, GDDR7 controllers; B200 / B300 split per die drawn evenly, Rubin as one block per die with no stacks, as the page says), last step `GA.peak` BF16 and `GA.chips` TB/s divided by the A100's. Fig. 4: counts from the CDNA 3 white paper as written in section 13 (8 XCDs on 4 I/O dies, 40 CUs with 38 on, 8 HBM3 stacks), illustrative positions.

**Removed**: the 2D hero (`27_js_rd_hero.js`), the 2D SM drawing and its segment buttons, the 2D floorplan drawings (the comparison table stays), the 2D B200 against MI300X schematic (`30_js_rd_amd.js`); all carried by the four stages. The scheduler animation went from 21 frames per program to 4 explained steps (the long-replay rule); the per-step captions of both 2D animations moved into the step lists. **Kept 2D** and why: `viz_ideas.md` (a timeline, charts with log axes, tables; the tile's pipeline in 3D already exists as Fig. 3 on Libraries and tensor cores, linked).

**Length judgement.** Reading core 29.4 min before (6,757 words), 35.6 min after (8,184 words, `audit_pages.mjs`); closed details 8.0 min both times; Further reading 2.9 min unchanged. Visuals in Reading 11 before, 10 after by the audit's count (four 3D stages replaced four 2D drawings; the floorplan pair became one stage). The six minutes are the step lists that now explain each animation and stage on the left, as the rollout requires; prose they made redundant was condensed (section 7's counts sentence, section 9's grouping and two-die paragraphs, section 13's caption, the scheduler's closing steps). Nothing was cut that the ledger holds.

**Ledger**: unchanged in content (324 units: core 232, depth 44, fat 41, owned 4, volatile 3); `ledger.py check` problems 0 here and on the root.

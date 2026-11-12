# src: Power, cooling, reliability and the data centre

## Build and check
- `sh run_all.sh`: `recompute.py` (stdlib only) writes `out/expected.json` and `parts/22_js_pw_data.js`; `build.sh` writes `../index.html`; `check_embed.py` confirms the page embeds exactly that data, that 55 hand-written numbers in the prose match it, and that no private pattern is in the folder.
- From the repo root: `node <page>/src/check/check_page.mjs` clicks every control at 390 px dark and 920 px light (errors, NaN, undefined, sideways scroll), confirms the power-swing animation plays once in view and the checkpoint day (a widget) does not (inverted on 2026-11-12 from the old never-autoplay check), checks the page's JavaScript engine against `out/expected.json` (the default day's totals for both lanes, failure times, exact optimum, swing trace, the planner's B200 count) and saves screenshots per Reading section in `../.shots/own/`.
- `node <page>/src/check/check_stages.mjs` (repo root, a few minutes): the 2026-11-06 rollout checks, see the last section.
- `python3 html_utils/ledger.py check <page>` (repo root): every non-fat knowledge unit in `ledger.json` is still on the page or at its owner.
- `sh html_utils/checkpage.sh <page>` (repo root): fail=0, emdash 0, errbox 1, clipped 0.

## Parts
`01_head.html` shared CSS, `02_split.html` the split layout (skill template), `10_header.html` title, reading time and tabs (Reading, Further reading), `20_read_a` to `20_read_e` the Reading tab (ids `pw-s0` to `pw-s9`), `21_js_rd_common.js` and `99_js_tabs.js` the skill templates (autoplay on view since 2026-11-12; storage key `pw-tab`), `22_js_pw_data.js` generated, `23_js_pw_engine.js` the checkpoint model (port of `recompute.py`: mulberry32 PRNG, Poisson arrivals, `simulate`, exact and first-order efficiency, Young, Daly, refined first-order, exact optimum), `24_js_pw_rd.js` chip bars, cooling calculator, Table 5, scale table, predictions, `25_js_pw_swing.js` the power-swing animation (five explained stretches), `25_js_s3.js` the 3D renderer v2 (skill template, unchanged), `26_js_pw_hero.js` the fault-escalation diagram, `27_js_pw_mtbf.js` job MTBF against GPU count, `28_js_pw_ckpt.js` the checkpoint simulator (section 6), `29_js_pw_gw.js` the per-gigawatt planner (section 2), `39_js_sc_geo.js` the shared NVL72 rack geometry, `40_js_sc_hero.js`, `41_js_sc_cool.js`, `42_js_sc_fail.js` the three 3D scenes, `39_tab_more.html` Further reading. Photos in `../img/` (credits in `../img/CREDITS.md`).

## The checkpoint model
Period T = (T - C) of work plus a checkpoint C; a failure loses all work since the last completed checkpoint, then downtime D (failures not counted) and recovery R (failures can strike). This is Aupy et al. 2013, section 3, whose exact expectation for Poisson failures is Time_final = (mu + D) e^(R/mu) (e^(T/mu) - 1) Time_base / (T - C). Checks: the numeric optimum of that formula and the Young, Daly and RFO periods reproduce all forty entries of their Table 2 within 0.12% (`inputs/aupy2013_extract.txt`); a Monte Carlo of 8 runs of 2,000 MTBFs at nine intervals lands within 0.71 percentage points of the formula (and within 1.2 standard errors with 64 runs, checked once by hand).

## Departures from the child-page method
No old page to carry (new page). The failure arithmetic overlaps Training Infrastructure (which owns recovery designs and a first-order goodput calculator) and the Llama 3 paper page (which replays the 54 days); this page links both and adds what they lack: the exact formula with Monte Carlo validation, the hardware reading of Table 5, power, cooling and energy. (2026-10-19: Training Infrastructure was folded into the training root and retired; recovery designs, stragglers, silent-corruption detection and goodput now belong to Fault tolerance at scale, and this page owns the checkpoint-interval maths and the hardware's error reporting. Its links were repointed to Fault tolerance at scale and to the training root's Machinery section, "Running the job".)

## Inputs
`inputs/aupy2013_extract.txt`: the relevant lines and Table 2 of arXiv 1302.3752 (pdftotext). Every other input is typed in `recompute.py` with its source; vendor chip figures follow the shared facts file (FACTS.md) of the hardware topic.

## Rebuild to the teaching contract (2026-10-23)
- **Top**: the core idea in one sentence and a hero diagram (power in from a 1 GW connection to a 1,200 W GPU, heat out through cold plate, CDU and tower, then lockstep multiplying swings and failures), a label legend and a six-term glossary. The old log-scale power ladder was dropped: its numbers live in the hero and the sections.
- **Lab tabs folded into Reading**: the Checkpoint simulator explains one mechanism (the interval), so it now sits in section 6 beside Young's formula; the Gigawatt planner replaced the static per-gigawatt table in section 2 (same numbers at its defaults). Tabs are now Reading and Further reading.
- **New visuals for mechanisms that had none**: job MTBF against GPUs at three published rates (section 5, with the 20-minute C + D + R line where the first-order formula breaks); the memory fault escalation from a corrected bit to a replaced GPU, with the silent arithmetic error beside it; energy per training token as four bars widening the boundary (1.72, 4.19, 4.98, 10.9 J).
- **Photos** (three, Wikimedia Commons): a GB200 NVL72 rack beside the rack-power claims; an air-cooled hall (CERN) and a single-server immersion tank beside the three cooling methods. Immersion is now covered with one sourced sentence (Microsoft, Apr 6 2021: fluid boiling at 122 F, 5% to 15% less server power, vendor).
- **Autoplay removed**: `21_js_common.js` (which played each animation once on scroll) replaced with the template `21_js_rd_common.js`.
- **Closed details**: the Table 5 correction, what reproduces what (Aupy Table 2, Monte Carlo, presets and defaults), common mistakes that add something (three of six kept; the other three repeated the core) and interview rehearsal.
- **Ownership**: what one flipped bit does to a data-parallel run, and which detector catches it, is measured on Fault tolerance at scale (section 7); this page keeps the fleet studies and links there.

## Length judgement
Before: Reading 22 min core plus 2 closed, and 7 min in the other tabs (Checkpoint simulator 2, Gigawatt planner 2, Further reading 3). After: Reading 23 min core plus 3 closed (the simulator and planner text now inside it), Further reading 3 min. Total core time fell from about 26 to 23 minutes with nothing lost: the cuts are wind-ups ("The problem." openers), restated mistakes, tab introductions and the ladder. The page covers four subjects (power, cooling, power swings, failures and checkpointing) plus SDC and energy per token, each with its numbers and visual; nearly every remaining unit is a sourced number the reader uses later, so this length is right.

## Ledger
`ledger.json`: 260 units; core 190, depth 34, fat 35, owned 1 (the replica-checksum detector, owned by Fault tolerance at scale). `ledger.py check`: problems 0.

## The 2026-11-06 rollout (split layout, 3D stages v2), done 2026-11-12
Briefs `rebuild-page.md` and `layout-rollout.md`. Templates copied unchanged: `02_split.html` (in `build.sh` after `01_head.html`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js` and `99_js_tabs.js` (key `pw-tab`). No change to `recompute.py` or `out/expected.json`: every scene draws from `window.PW` and the engine `PWE`.

| Tab | Section | Layout | Visual | Step list |
|---|---|---|---|---|
| Reading | The idea | split | **3D** `stg-hero` (Fig. 1): one gigawatt from the grid to a GPU and out as heat | yes, 6 |
| Reading | Terms, six summary cards, who owns what | full width | none | no |
| Reading | 1 Watts per chip | split | 2D chip bars (toggle W / pJ per FLOP) | no |
| Reading | 2 Server, rack, delivery, 54 V | split | photo (GB200 NVL72) | no |
| Reading | 2 PUE, per-gigawatt, cost | split | 2D gigawatt planner (a widget) | no |
| Reading | 3 Cooling, Q = m cp dT | split | **3D** `stg-cool` (Fig. 2): one second of coolant | yes, 4 |
| Reading | 3 Predict | split | 2D cooling calculator (a widget) | no |
| Reading | 3 Three ways, water | split | two photos (air hall, immersion) | no |
| Reading | 4 Power swings | split | 2D swing animation, five stretches per mode | yes, 5 + 5 |
| Reading | 5 What fails (intro, MTBF formula) | split | **3D** `stg-fail` (Fig. 3): one failure stops every GPU | yes, 5 |
| Reading | 5 Three published rates | split | 2D job MTBF (log axes) | no |
| Reading | 5 What actually fails, Table 5 | split | 2D Table 5 bars | no |
| Reading | 5 How the hardware reports | split | 2D escalation chain | no |
| Reading | 6 Checkpoint interval, watch it | split | 2D checkpoint day (a widget: opens on the end of the day, never plays by itself, live caption kept) | no |
| Reading | 6 The exact answer, predict | split | 2D useful time against interval | no |
| Reading | 6 Scale table, reproduces | full width | table, details closed | no |
| Reading | 7 Silent corruption | full width | none | no |
| Reading | 8 Energy per token | split | 2D bars | no |
| Reading | Mistakes, interview | full width | details closed | no |
| Further reading | | unchanged | | |

**Stages and their data.** Fig. 1 (`40_js_sc_hero.js`): the GB200 NVL72 row of `PW.systems` (120 kW, 72 GPUs), PUE 1.2 (`PW.pue.root`), Blackwell's 1,200 W (`PW.chips`); derived: 167 MW of overhead and 833 MW to servers, 72 x 1,200 W = 86.4 kW (72% of the rack), 6,944 racks and 500,000 GPUs per gigawatt; stream cross-section area proportional to megawatts. The rack (`39_js_sc_geo.js`) follows the DGX GB200 user guide: 18 compute trays of 2 Grace CPUs and 4 Blackwell GPUs, 9 NVLink switch trays, 8 power shelves feeding a busbar, liquid manifolds and cold plates (tray order, shelf positions and the layout inside a tray are illustrative; the guide does not say where the shelves sit). Fig. 2 (`41_js_sc_cool.js`): the cooling calculator's defaults through Q = m cp dT: 6.6 m3/s of air (14,000 CFM, a 1.88 m cube per second) against 172 L/min of water (2.9 L/s, a 14 cm cube), 2,300 times less volume (3,464 at the same rise). Fig. 3 (`42_js_sc_fail.js`): the engine on the default day: 2,048 servers, MTBF 3.1 h, Young's 48.1 min, first failure 0.93 h losing 7.5 min, D 10 and R 5 min, 8 failures, 16.5 h against 11.7 h saved; which tiles fail is a fixed pseudo-random draw (illustrative).

**2D animations.** The swing's 13 phases became 5 explained stretches per mode (`PW_SWSTR`); stepping forward draws its stretch progressively; the mode switch swaps the step list (`sx-sw-raw`, `sx-sw-smooth`) and replays; the caption carousel was removed (its text moved into the lists). The checkpoint day (97 quarter-hours) is a widget under the long-replay rule, case b.

**Kept 2D** and why: chip bars, Table 5 and energy bars are ranked quantities; job MTBF and the useful-time curve are log or continuous axes; the escalation chain is a sequence of states with no spatial structure; the planner and the calculator are tools with several controls; the day is a time line the reader drives.

**Checks**: `check/check_stages.mjs` at 1400 px light, 920 px light and 390 px dark: the three stages and the swing play once in view, step to the end with one list item per step, stop redrawing off screen and never move under reduced motion; the swing's mode switch replays; the checkpoint day never plays by itself and opens on its last frame; 15 Reading splits are two columns at 1400 px and one below 1100 px; canvas labels do not overlap or leave the card; every number in the step lists equals the page's data and engine. `check/check_page.mjs` inverted (the swing plays in view; the widget does not).

**Length judgement.** Reading core 23.4 min before (5,380 words), 27.9 min after (6,423, `audit_pages.mjs`); closed details 2.9 min both times; Further reading 2.7 unchanged. The added words are the step lists that explain the three stages and the swing, as the rollout requires; the 2D hero's caption and the swing's caption carousel were folded into them, and the delivery paragraph of section 2 now points at Fig. 1 instead of repeating it. Nothing the ledger holds was cut.

**Ledger**: 270 units (core 199, depth 34, fat 35, owned 1, volatile 1); seven units added for the new numbers (the tray counts, 72% of the rack, 6,944 racks, the two cubes, the 7.5 minutes lost, the 16.7 MW swing). `ledger.py check` problems 0 here and on the root.

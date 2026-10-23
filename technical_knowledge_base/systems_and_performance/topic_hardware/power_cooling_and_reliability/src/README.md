# src: Power, cooling, reliability and the data centre

## Build and check
- `sh run_all.sh`: `recompute.py` (stdlib only) writes `out/expected.json` and `parts/22_js_pw_data.js`; `build.sh` writes `../index.html`; `check_embed.py` confirms the page embeds exactly that data, that 55 hand-written numbers in the prose match it, and that no private pattern is in the folder.
- From the repo root: `node <page>/src/check/check_page.mjs` clicks every control at 390 px dark and 920 px light (errors, NaN, undefined, sideways scroll), confirms neither animation moves before the reader acts, checks the page's JavaScript engine against `out/expected.json` (the default day's totals for both lanes, failure times, exact optimum, swing trace, the planner's B200 count) and saves screenshots per Reading section in `../.shots/own/`.
- `python3 html_utils/ledger.py check <page>` (repo root): every non-fat knowledge unit in `ledger.json` is still on the page or at its owner.
- `sh html_utils/checkpage.sh <page>` (repo root): fail=0, emdash 0, errbox 1, clipped 0.

## Parts
`01_head.html` shared CSS, `10_header.html` title, reading time and tabs (Reading, Further reading), `20_read_a` to `20_read_e` the Reading tab (ids `pw-s0` to `pw-s9`), `21_js_rd_common.js` and `99_js_tabs.js` the skill templates (RD.anim never autoplays; storage key `pw-tab`), `22_js_pw_data.js` generated, `23_js_pw_engine.js` the checkpoint model (port of `recompute.py`: mulberry32 PRNG, Poisson arrivals, `simulate`, exact and first-order efficiency, Young, Daly, refined first-order, exact optimum), `24_js_pw_rd.js` chip bars, cooling calculator, Table 5, scale table, predictions, `25_js_pw_swing.js` the power-swing animation, `26_js_pw_hero.js` the hero diagram and the fault-escalation diagram, `27_js_pw_mtbf.js` job MTBF against GPU count, `28_js_pw_ckpt.js` the checkpoint simulator (section 6), `29_js_pw_gw.js` the per-gigawatt planner (section 2), `39_tab_more.html` Further reading. Photos in `../img/` (credits in `../img/CREDITS.md`).

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

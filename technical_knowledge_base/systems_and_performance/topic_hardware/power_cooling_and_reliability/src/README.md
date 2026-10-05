# src: Power, cooling, reliability and the data centre

## Build and check
- `sh run_all.sh`: `recompute.py` (stdlib only) writes `out/expected.json` and `parts/22_js_pw_data.js`; `build.sh` writes `../index.html`; `check_embed.py` confirms the page embeds exactly that data, that 55 hand-written numbers in the prose match it, and that no private pattern is in the folder.
- From the repo root: `node <page>/src/check/check_page.mjs` clicks every control at 390 px dark and 920 px light (errors, NaN, undefined, sideways scroll), checks the page's JavaScript engine against `out/expected.json` (the default day's totals for both lanes, failure times, exact optimum, swing trace) and saves screenshots per Reading section in `../.shots/own/`.
- `sh html_utils/checkpage.sh <page>` (repo root): fail=0, emdash 0, errbox 1, clipped 0.

## Parts
`01_head.html` shared CSS (from the interconnects sibling), `10_header.html` title and tabs, `20_read_a` to `20_read_e` the Reading tab (ten sections, ids `pw-s1` to `pw-s10`), `21_js_common.js` the shared animation controller (RD.anim), `22_js_pw_data.js` generated, `23_js_pw_engine.js` the checkpoint model (port of `recompute.py`: mulberry32 PRNG, Poisson arrivals, `simulate`, exact and first-order efficiency, Young, Daly, refined first-order, exact optimum), `24_js_pw_rd.js` Reading charts and tables, `25_js_pw_swing.js` the power-swing animation, `31_*` Checkpoint simulator, `32_*` Gigawatt planner, `39_tab_more.html` Further reading, `99_js_tabs.js` tab wiring.

## The checkpoint model
Period T = (T - C) of work plus a checkpoint C; a failure loses all work since the last completed checkpoint, then downtime D (failures not counted) and recovery R (failures can strike). This is Aupy et al. 2013, section 3, whose exact expectation for Poisson failures is Time_final = (mu + D) e^(R/mu) (e^(T/mu) - 1) Time_base / (T - C). Checks: the numeric optimum of that formula and the Young, Daly and RFO periods reproduce all forty entries of their Table 2 within 0.12% (`inputs/aupy2013_extract.txt`); a Monte Carlo of 8 runs of 2,000 MTBFs at nine intervals lands within 0.71 percentage points of the formula (and within 1.2 standard errors with 64 runs, checked once by hand).

## Departures from the child-page method
No old page to carry (new page). The failure arithmetic overlaps Training Infrastructure (which owns recovery designs and a first-order goodput calculator) and the Llama 3 paper page (which replays the 54 days); this page links both and adds what they lack: the exact formula with Monte Carlo validation, the hardware reading of Table 5, power, cooling and energy.

## Inputs
`inputs/aupy2013_extract.txt`: the relevant lines and Table 2 of arXiv 1302.3752 (pdftotext). Every other input is typed in `recompute.py` with its source; vendor chip figures follow the shared facts file (FACTS.md) of the hardware topic.

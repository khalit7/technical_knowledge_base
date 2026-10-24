# Dynamic programming: source

Source of the interactive HTML on the Notion page "Dynamic programming: planning with a known model" (child of Topic: rl; page prefix `dp`, storage key `dp-tab`). `sh build.sh` writes `../index.html` from `parts/` (all `20_read_*.html` in name order) and fills in the best-resources total; the header's reading time is set by hand from `html_utils/audit_pages.mjs`.

## Shape (rebuilt 2026-10-24 to the teaching contract)

Reading: the idea in one screen (core sentence, hero figure, You need, new terms, the four methods in one table); 1 the MDP (loop, Markov property, observability, Markov process to MRP to MDP on Silver's student example; history, agent state, POMDP choices and notation closed); 2 the return and discounting (worked returns, Monte Carlo sampler); 3 values and the four Bellman equations, matrix solution, student widget and table, correction box; 4 backups, sweeps and policy evaluation (Figure 4.1 check closed); 5 policy improvement theorem (proof and ties closed); 6 policy iteration, tie bug, modified PI, GPI; 7 value iteration with the new stepper (gambler's problem closed, moved from the lab); 8 sweep order and PI on the corridor (before/after animation; evaluation numbers closed); 9 convergence (contraction chart; iteration count closed); 10 PI against VI (worst-case results closed); 11 cost and the curse (calculator; LP view closed); 12 asynchronous DP (published numbers closed); 13 beyond DP (VI against Q-learning animation; connections closed); depth: history and mistakes, closed. Tabs: Reading, Sweep lab (a tool used across sections 4 to 12), Further reading.

Departure from the child shape: the page still carries the RL foundations (MDP, return, Bellman equations) that the root moved here; they are the first three sections because every later section uses them.

## What changed and why
- **Top**: a core sentence and a new static hero (`29_js_rd_hero.js`): one optimality backup of Class 3 with real numbers (Study 10 against Pub 9.4) beside Silver's grid after 1, 3 and 6 sweeps. New-terms list. The "three facts" box was cut (it restated sections 9 and 11).
- **New stepper beside the update equation** (`28_js_rd_sweep.js`, section 7): synchronous value iteration on Silver's 4 x 4 shortest path, one sweep per step, changed cells outlined, greedy arrows with ties, one worked backup per frame; reproduces the slide's V1 to V7 independently. A prediction prompt precedes it and the text answers it.
- **Moved into Reading**: the gambler's problem left the Sweep lab (one mechanism, one example) for a closed block in section 7 (`27_js_rd_gam.js`, draws when opened). The lab keeps the cross-method race.
- **Merged**: old sections 1 and 2 into 1 and 2 by topic, 5 and 6 into 4, 15 and 16 into 13; history and the 12 mistake blocks into two closed blocks at the end (mistakes as one-line pointers to the sections that show them).
- **Collapsed into closed blocks**: POMDP agent states, notation, the improvement proof and ties, Figure 4.1's rounding check, the uniform-policy values, the corridor's sweep-by-sweep evaluation numbers, Szepesvari's iteration count (with its derivation), worst-case complexity, the LP view, prioritised sweeping's and RTDP's published numbers, the connection list.
- **Nothing moves before the reader acts**: `22_js_rd_common.js` is the skill template (only change: `onRender` and `anim` take a tab id, for the lab); `99_js_tabs.js` is the template with key `dp-tab`; mode switches in the corridor, VI against Q-learning and the lab no longer start playback. `check_controls.mjs` now also checks, under normal motion, that every scrubber is still at 0 after scrolling into view and after a mode switch.
- **Retired**: `mk_coverage.py` and `coverage.json` (the 2026-10-04 coverage of `live.md`); `ledger.json` supersedes them, drafted from the build those files had proved complete.
- **No images**: a mechanism page; the canonical figures (Sutton and Barto 4.1, 4.3) are CC BY-NC-ND, not an allowed licence, and the page reproduces them by computation instead.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute) | 46.6 min | 34.8 min |
| Reading, closed details | 1.5 min | 10.8 min |
| Sweep lab, core + closed | 3.2 + 1.3 min | 2.2 + 1.3 min |
| Further reading | 2.9 min | 3.0 min |
| Visuals drawn in Reading | 5 | 9 (plus 2 in the closed gambler block) |

Why 35 minutes is right: the page owns two subjects (the MDP foundations and every exact DP method), and the ledger is almost all core: 280 of 389 units are needed to follow the mechanisms, each with its number and source. What made the old page long without teaching (wind-ups, a recap box, restated mistakes, step lists that a formula already carries, history and proofs inline) is cut or closed. Going shorter would mean dropping the student example's numbers or the convergence bounds, which are what make the methods concrete.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
389 units: core 280, depth 98, fat 11 (each with a `note`). 378 were drafted by `ledger.py init` from the 2026-10-04 build; 11 were added by hand for script-rendered text (lab report lists, stepper, corridor and gambler captions, calculator tiles, hero), keyed to static text. No unit is `owned:` elsewhere or `volatile`.

## Files
- `parts/20_js_rd_engine.js` (window.RDE, student MRP and MDP, 4 x 3 world), `21_js_dpe.js` (window.DPE: worlds, backups, every method, corridor, contraction, gambler, curse), `22_js_rd_common.js` (template controller), `23_js_rd_found.js` (sampler, student diagram), `24_js_corr.js`, `25_js_contr.js` (contraction chart, curse calculator), `26_js_rd_grid.js` (VI against Q-learning), `27_js_rd_gam.js`, `28_js_rd_sweep.js`, `29_js_rd_hero.js`, `30_tab_lab.html` and `31_js_lab.js` (Sweep lab), `39_tab_more.html`.
- Reused from the parent's `for_children/`: the student diagram, the sampler, the 4 x 3 animation and the controller (`reading_full/`); the estimator lab's Figure 4.1 result is reproduced independently by the Sweep lab.

## Checks (from `src/` unless noted)
1. `uv run --with numpy --with scipy python recompute.py`: independent numpy implementation, 32 checks, writes `recompute.json`.
2. `python3 recompute_rd.py` with the repo's Python (`.venv`): the reused widgets' Python, writes `recompute_rd.json` (the system Python prints different float digits).
3. `node check_engine.mjs`: both page engines against both JSON files, 1,673 values, 0 mismatches.
4. `node .../src/check_controls.mjs` from the repo root: every control at 920 light and 390 dark, plus the no-autoplay pass; last run 2,751 scans, 0 problems.
5. `sh html_utils/checkpage.sh <page folder>`: fail=0, emdash 0, errbox 1, clipped 0.
6. `python3 html_utils/ledger.py check <page folder>`: problems 0.

`live.md` is the Notion page as fetched on 2026-10-04 (last edited 2026-09-30), saved verbatim; `inputs/old_embed_visible_text.txt` is the old embed's visible text.

2026-10-24 (topic close of Topic: rl): Further reading quotes the root as "17 min, plus 2" and siblings and neighbours as their headers; the corridor script comment says section 8; ledger keys that quoted old times re-keyed.

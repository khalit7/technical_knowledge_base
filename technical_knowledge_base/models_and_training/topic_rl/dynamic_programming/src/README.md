# Dynamic programming: source

Source of the interactive HTML on the Notion page "Dynamic programming: planning with a known model" (child of Topic: rl). `sh build.sh` writes `../index.html` from `parts/` and fills in the reading time and the best-resources total.

## Shape

Part B of `html_utils/methods/topic_pages.md` (a child page): Reading organised by the subject's own logic, one standalone tab (Sweep lab), Further reading. One departure: the Reading tab opens with four foundations sections (setting and observability; Markov process to MRP to MDP and the return; values and the four Bellman equations with Silver's student examples; history), because Khalid approved moving the RL foundations material that has no other child here (the root's `coverage_rl_foundations.md`, rows marked DP). That makes the Reading tab about 47 minutes (10,900 words; the foundations are about 18 of them). If that is too long, the clean split is sections 1, 2 and 4 into an "MDP foundations" tab, leaving section 3 (Bellman equations) in Reading: a decision for Khalid.

Reading outline: one screen; 1 setting (loop, history, state, Markov, observability, POMDP, LLM); 2 MP to MRP to MDP, return, discounting, sampled returns (sampler); 3 V and Q, Bellman equations for V and Q (expectation and optimality), matrix solution, student MRP and MDP (diagram, table, correction box), prediction and control; 4 history; 5 backups and sweeps; 6 policy evaluation; 7 policy improvement theorem; 8 policy iteration, tie bug, modified PI, GPI; 9 value iteration, gambler; 10 corridor worked example (animation); 11 convergence (contraction chart), bounds, γ = 1; 12 PI against VI table with complexity results; 13 cost, curse (calculator), LP view; 14 asynchronous DP (in place, prioritised sweeping, RTDP with the racetrack numbers); 15 beyond DP (VI against Q-learning animation); 16 connections; mistakes.

## Files

- `parts/20_js_rd_engine.js`: reused from Topic: rl's archived long Reading tab (`../../src/for_children/reading_full/21_js_rd_engine.js`), trimmed to the student MRP and MDP and the 4 × 3 world (window.RDE).
- `parts/21_js_dpe.js`: this page's DP engine (window.DPE): worlds (Sutton and Barto 4 × 4, Silver's shortest path, AIMA 4 × 3, Dyna maze, corridor), backups, sweeps, every method with look-up accounting, corridor steps, two-run contraction, gambler, curse.
- `parts/22_js_rd_common.js`: animation controller and helpers, reused from the archive with `anim` and `onRender` taking a tab id.
- `parts/23_js_rd_found.js`: student sampler and diagram, reused (discount-weights widget dropped; the root keeps horizons).
- `parts/24_js_corr.js` corridor animation; `25_js_contr.js` contraction chart and curse calculator; `26_js_rd_grid.js` VI against Q-learning (reused unchanged); `30_tab_lab.html` and `31_js_lab.js` the Sweep lab and gambler; `39_tab_more.html` Further reading.

## Reused from the parent's `for_children/`

- `reading_full/`: the student MDP diagram with clickable Bellman equations (`rd-sm`), the Monte Carlo sampler (`rd-mc`), the 4 × 3 value iteration against Q-learning animation (`rd-gw`, reproduces AIMA Figure 17.3), the text of archived sections 2 to 5 and 8 (rewritten here), the animation controller.
- `estimator_lab/` experiment 1: its result (Figure 4.1, 92 of 96 printed values; the four misses are the figure's rounding of −1.75; synchronous sweeps required; PI keeps the current action among ties) is reproduced independently by this page's own engine in the Sweep lab. Its sampled side (TD, MC on the gridworld) is left to Model-free prediction and control.

## Checks

From `src/`:
1. `uv run --with numpy --with scipy python recompute.py`: an independent numpy implementation; 32 checks (corridor tables, 66/688, 0.099, Figure 4.1 92/96 and greedy optimal from k = 3, Silver V1 to V7, AIMA 17.3, method races on all worlds, contraction at γ 0.5/0.9/0.99, student MRP and MDP tables, LP optimum equals V*, gambler, 3.2 million years). Writes `recompute.json`.
2. `python3 recompute_rd.py`: the reused widgets' Python (trimmed from the parent's `reading_full_checks/recompute.py`). Writes `recompute_rd.json`.
3. `node check_engine.mjs`: runs both page engines in Node against both JSON files (1,673 values, 0 mismatches at the last run).
4. `node src/check_controls.mjs` (from the repo root): every control at 920 px light and 390 px dark; last run 2,725 scans, 0 problems; screenshots in `../.shots/`.
5. `python3 mk_coverage.py`: `coverage.json`, 131 facts from `live.md` and the foundations rows, all found.
6. `sh html_utils/checkpage.sh <page folder>`: fail=0, emdash 0, errbox 1.

`live.md` is the Notion page as fetched on 2026-10-04 (last edited 2026-09-30); its text matched the local copy of the old build (`~/khalid_notion_updates/pages/dynamic-programming-planning-with-a-known-model/page_new.md`), which was used to save it verbatim, with one line's bold markup restored to the fetch's form. `inputs/old_embed_visible_text.txt` is the old embed's visible text.

# Source of "Model-free prediction and control: Monte Carlo, TD, SARSA, Q-learning"

Child page of Topic: rl (Notion 3c65c17b0d0d81898a0cd4c05c744969). Build: `sh build.sh` writes `../index.html` from `parts/`.

## Shape
Part B of `html_utils/methods/topic_pages.md`: a Reading tab in the subject's own order (one-screen comparison table, model-free vocabulary, MC, TD, the n-step / TD(lambda) dial, control with exploring starts, epsilon-soft and GLIE, SARSA and Expected SARSA, Q-learning, maximisation bias, off-policy learning and importance sampling, DP against TD, when to use which, mistakes, where next, check yourself), then one tab per experiment and Further reading. Departure: five experiment tabs rather than one or two, because each reruns a different Sutton and Barto figure with its own controls and checks; Khalid's brief named them as tabs.

## Files
- `parts/01_head.html` root CSS + lab CSS (scoped `.lbx`) + Reading CSS from Topic: rl; `10_header.html` tabs.
- Reading: `20_read_a.html`, `20_read_b.html`, `20_read_c.html`; JS `21_js_mf_engine.js` (engine, no DOM, Node-loadable), `22_js_rd_common.js` (RD.anim controller, from Topic: rl), `23_js_rd_four.js` (one episode, four learners), `24_js_rd_small.js` (lambda weights, two targets, fall chance, decision tree, self-check).
- Experiment tabs: `31_tab_rw.html`, `32_tab_nl.html`, `33_tab_cl.html` with `32_js_lab_a.js` (engine), `_b` (helpers), `_c`, `_d`; `34_tab_mx.html` + `34_js_mx.js`; `35_tab_is.html` + `35_js_is.js`. `39_tab_more.html` Further reading; `99_js_tabs.js` tab wiring (links `{{text|#t-tab/section-id}}` jump to a section).
- `live.md` the old page verbatim; `inputs/old_embed.html` its earlier embed (quiz, decision tree, calculators); `coverage.json`.

## Reused from Topic: rl (`../../src/for_children/`)
- Estimator lab experiments 2 to 4 (random walk Example 6.2/Figure 6.2; 19-state walk Figures 7.2, 12.3, 12.6; cliff Example 6.6), engine unchanged (`32_js_lab_a.js` still contains the gridworld functions so `lab/check.py` validates the identical engine), helpers adapted to one tab per experiment, Sarsa spelled SARSA in prose, experiment 1 (Figure 4.1) left for Dynamic programming.
- reading_full sections 9 and 10 (prose ideas, importance-ratio example, unified-view table) and the maximisation-bias widget (rebuilt in the Maximisation bias tab with an exact-normal-CDF check).
- Reading CSS and the RD animation controller.

## New here
- Figure 6.5 (Q-learning against Double Q-learning, 10,000 runs, one run animated); Figures 5.3 and 5.4 (ordinary against weighted importance sampling; infinite variance), with the Example 5.4 state value computed exactly (-0.277204 against the book's -0.27726 from 100 million episodes).
- One episode, four learners: MC, SARSA, Expected SARSA and Q-learning updating on the same recorded episode on a 3 x 6 cliff (before/after animation).

## Checks
- `cd checks && node dump_mf.mjs && python3 recompute.py`: Python port of `21_js_mf_engine.js` (bit for bit, or 1e-12 where log/cos enter) plus independent checks. Last run: all pass.
- `cd lab && node dump_js.mjs && uv run --with numpy python check.py`: the lab engine (from Topic: rl). Last run: pass.
- `cd checks && node check_page.mjs`: every control at 390 dark and 920 light. Last run: pass (294 probes).
- `sh html_utils/checkpage.sh <page folder>`: fail=0.

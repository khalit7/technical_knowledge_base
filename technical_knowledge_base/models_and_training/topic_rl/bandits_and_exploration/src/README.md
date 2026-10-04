Source of the interactive HTML on the Notion page "Bandits and exploration" (child of Topic: rl).

Build: `sh build.sh` writes `../index.html` (part order in the comment at the top of build.sh; the reading time replaces RT_MIN).
Checks: `python3 recompute.py && node check_engine.mjs` (Python reference against the page's engine; 48,927 values, 0 mismatches); `node check_page.mjs [light|dark] [width]` from the page folder drives every control in headless Chrome and screenshots into `../.shots/`; `sh html_utils/checkpage.sh <page folder>`. `recompute_output.txt` is the output of `python3 recompute.py --full` (2,000 testbed tasks in Python).

Old text: none. The Notion page was new, with only a placeholder line, so there is no `live.md` and no `coverage.json`.

Shape: Part B of `html_utils/methods/topic_pages.md` (a child page). Reading follows the subject's own order: one-screen table, the trade-off, action-value estimation, the strategies (with the five-strategy before/after animation), regret and the Lai and Robbins bound (live regret chart), contextual bandits and production uses, exploration in full RL (gridworld before/after animation, families of methods, Montezuma's Revenge table), exploration in LLM RL, common mistakes. One standalone tab, the 10-armed testbed, because "across all 2,000 tasks and all parameter settings" is a question of its own (Khalid's root lab rejected it there; it belongs here).

Reused from `../../src/for_children/` (the archived 60-minute root):
- `reading_full/20_read_b.html` section 7 (bandits): its prose (Silver's examples, ε-greedy probabilities and GLIE, optimistic initialisation, UCB, Thompson, deep exploration paragraph) rewritten and extended into sections 1, 3, 6, 7.
- `reading_full/24_js_rd_band.js` and `RDE.banditTable/banditRun`: the four-strategy animation, extended to five strategies (Thompson sampling with its posterior drawn per arm and its draws taken from the same pre-drawn table), UCB's bound whisker, and label de-overlapping; now `parts/24_js_bd.js` and `BX.banditTable/banditRun`.
- `reading_full/22_js_rd_common.js` (animation controller and helpers) copied as `parts/22_js_rd_common.js`; the root's `01_head.html`, `05z_errbox.js.html`, `99_js_tabs.js` (storage key changed).
- `estimator_lab/lab_src/viz_ideas.md` row LB-5 (the rejected 10-armed testbed and its text numbers 1.54, 91%, one third): built here as the testbed tab.

Engine (`parts/21_js_bx_engine.js`, mirrored line by line in `recompute.py`): mulberry32 random numbers as in the root; testbed runs use three independent streams per task (true values, reward noise, agent randomness) so methods share tasks and noise; Bernoulli regret runs; the gridworld.

Facts were checked against primary sources (Sutton and Barto 2020 PDF read with pdftotext; Auer et al. 2002; Lattimore and Szepesvári PDF; arXiv texts of the deep-exploration and LLM papers). Unconfirmed, and said so on the page or avoided: the verbatim Lai and Robbins statement (paywalled; the page uses Auer et al.'s restatement), the exact wording of the Nature Go-Explore paper (numbers taken from its arXiv preprint 2004.12919), whether Bing deployed adPredictor's posterior sampling (the paper says "can").

JS-only number (not in recompute.py, because a million Bernoulli pulls with Beta sampling is too slow in pure Python): Thompson's slope on arms 0.6 / 0.5 rising from 3.2 (10^3 to 10^4 pulls) to 4.2 (10^5 to 10^6), 20 runs, against the bound's 4.9. The engine itself is equal to Python on every value checked.

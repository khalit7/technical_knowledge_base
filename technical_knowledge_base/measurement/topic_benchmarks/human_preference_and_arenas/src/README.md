# Human preference and arenas: page source

`sh build.sh` writes `../index.html`. Full rebuild from raw data:
1. `python3 fetch_inputs.py [cache]` downloads the raw inputs to a cache outside the repo (default `~/.cache/kb_human_preference`; the public battle log of 26 Aug 2024 is 3.7 GB).
2. `OMP_NUM_THREADS=2 uv run --with pandas --with pyarrow --with scipy --with ijson python mk_inputs.py [cache] [board|pvc|battles|all]` reduces them into `inputs/`.
3. `python3 recompute.py && python3 mk_data.py && sh build.sh`, then `node check_page.mjs` (every control at 390 dark and 920 light, the page's numbers against `recompute_out.json`, screenshots into `../.shots/`) and `python3 mk_coverage.py`.

Shape: Part B of `html_utils/methods/topic_pages.md` (a child page). Reading tab (about 25 minutes) follows the subject's logic: one screen (every board with its unit, size, scoring and status); votes to ratings (battle protocol, Bradley-Terry, online Elo replaced, reproduction of the published board); uncertainty (bootstrap, sandwich, rank spread); style control (reproduced coefficients, step animation); category boards and the other arenas (Code, Copilot, Search, Vision and generation, Agent Arena, AutoEval); critiques (Leaderboard Illusion against Arena's response, best-of-N inflation, Llama 4 Maverick, vote rigging, sycophancy, factuality); judge-graded boards (MT-Bench, AlpacaEval LC, Arena-Hard-Auto, WildBench, the null model); instruction following (IFEval, IFBench, MultiChallenge: no other child owned them); preference against capability; what to use; mistakes. Statuses and dated readings are linked to the parent's Benchmark atlas, not rebuilt. The judge as an instrument (biases, calibration, juries, JudgeBench, RewardBench 2) belongs to "LLM-as-judge: design, biases, calibration, reliability" (Khalid's boundary) and is linked, not covered.

## Data (read 2026-10-04)
- `inputs/arena2024_fits.json`: this page's Bradley-Terry and style-control fits on the public log (1,762,122 anonymous, de-duplicated votes up to the board's last vote), FastChat's `rating_systems.py` reimplemented, against LMArena's published `elo_results_20240828.pkl` (plain mean gap 0.03, max 0.48 over 136 models; style control mean 1.11, top-20 max 1.39; coefficients 0.249, 0.024, 0.031, 0.019 as published) and the 13 Aug board from the 14 Aug log (max 2.97). The de-duplication tag (`dedup_tag.sampled`) is needed: without it gaps reach 16.7.
- `inputs/lab_sample.json`: 6,000 votes among ten models (seed 20240826), 7 characters per vote, style ratios quantised to 1/31.
- `inputs/board_2026-10-02.json`: Arena leaderboard-dataset (CC-BY-4.0), latest split: text raw, style control and factuality for 12 categories (top 30 by style control, with each lens's rank and Arena's rank spread computed over all models), Search raw and style control, Code Arena top 10.
- `inputs/pref_vs_cap.json`: 35 models matched by hand between Arena text (style control) and the AA Intelligence Index v4.3 snapshot in `topic_llms/src/data/aa_snapshot.json`.

## Files
`parts/20_read_a..e.html` Reading; `21_js_rd_common.js` (animation controller, from the parent); `22_js_data.js` generated; `23_js_math.js` (Bradley-Terry by Newton with sandwich covariance, online Elo, rank spread, Spearman, E[max]); `24_js_rd_elo.js` (Elo against Bradley-Terry animation), `25_js_rd_sp.js` (intervals and rank spreads), `26_js_rd_style.js` (style control step animation), `27_js_rd_misc.js` (best-of-N, null model bars, preference against capability); `30_*` Fit the votes, `31_*` Today's board, three ways; `39_tab_more.html`.

## Departures and notes
- The sandwich covariance is reported for centred ratings (the shift is unidentified without an anchor); the page centres sample ratings on the mean of the full-data ratings of the same ten models.
- Arena's published history (leaderboard-dataset) omits pre-release variants: Llama-4-Maverick-03-26-Experimental and the experimental Gemini 2.5 Pro do not appear; the page says so.
- Copilot Arena's status after 2025 could not be confirmed (marked unconfirmed).

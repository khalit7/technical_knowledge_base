# Human preference and arenas: page source

`sh build.sh` writes `../index.html`. Full rebuild from raw data:
1. `python3 fetch_inputs.py [cache]` downloads the raw inputs to a cache outside the repo (default `~/.cache/kb_human_preference`; the public battle log of 26 Aug 2024 is 3.7 GB).
2. `OMP_NUM_THREADS=2 uv run --with pandas --with pyarrow --with scipy --with ijson python mk_inputs.py [cache] [board|pvc|battles|all]` reduces them into `inputs/`.
3. `python3 recompute.py && python3 mk_data.py && sh build.sh`, then `node check_page.mjs` (every control at 390 dark and 920 light, the page's numbers against `recompute_out.json`, screenshots into `../.shots/`) and `python3 mk_coverage.py`.

Shape (rebuilt 2026-10-24 to the teaching contract, `.claude/skills/explainer-page/teaching/teaching-contract.md`; editing only, no new runs). Tabs: Reading, Fit the votes, Further reading (storage key `hparena-tab`). Reading:
- **Top**: the core idea in one sentence; a new static hero (`28_js_rd_hero.js`): one battle, millions of votes, the Bradley-Terry fit, score and interval, rank spread, with the four numbered places where the number bends (voters' taste, sampling and kept variants, the lens, intervals that cover only sampling noise); "You need" (Eval statistics, LLM-as-judge, Human evaluation linked); new terms.
- **1 Votes to a rating**: the battle; concrete (100 points = 64.0%), a new gap slider (`29_js_rd_gap_lc.js`), the formula; online Elo replaced (the Elo against Bradley-Terry animation, unchanged); the reproduction box.
- **2 How sure**: bootstrap to sandwich, the rank-spread rule and chart, fragility (0.003%).
- **3 Style control and factuality**: concrete (odds 1.28), the 2024 style-control step animation (no longer starts on a mode switch), the formula (now written with the /400 scale), the reproduction box, the factuality lens, and **Today's board, three ways moved inline** from its own tab (`26b_js_rd_board.js`, ids unchanged, card `rd-bd-card`).
- **4 Biases and gaming**: what voters reward (length, citations, flattery), The Leaderboard Illusion with its own Figure 1 (CC BY-SA 4.0, `img/`) and Arena's reply side by side, the best-of-N slider, Llama 4 Maverick (the cleaned-history finding is a closed block), vote rigging.
- **5 Category boards and specialised arenas**: categories; a new table of what each arena changes from the text battle (highlighted cells); per-arena detail closed.
- **6 Judge-graded proxies**: AlpacaEval length control, concrete then a new before/after range chart then the regression as published (Dubois et al. Eq. 1, rechecked against arXiv 2404.04475 on 2026-10-24), the null model; MT-Bench, Arena-Hard-Auto and WildBench detail and the instruction-following benchmarks (IFEval, IFBench, MultiChallenge) are closed blocks.
- **7 Aggregate indices and capability**: what the AA Intelligence Index is and why its value is tied to its version (v4.2, v4.3 changes from the landscape root's snapshot), the preference-against-capability scatter with its Spearman values now written in the prose.
- **8 How to read an arena number**: seven questions, each with this page's case (merges the old What to use and Common mistakes); the one dated table (the old One screen table, every board with unit, size, scoring, status and leader) is closed.

Removed: the Today's board tab (moved into section 3), the One screen table at the top (now the closed dated table), the What to use and Common mistakes sections (merged into section 8). Fit the votes stays a tab: it is a workbench used by sections 1, 2 and 3 (ties, K and order, vote count, style features, interval method). The judge as an instrument (biases, calibration, juries, JudgeBench, RewardBench 2) belongs to the LLM-as-judge page and is linked, not covered.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 wpm, `html_utils/audit_pages.mjs`) | 22.4 min | 24.3 min |
| Reading, closed details | 1.0 min | 5.0 min |
| Other tabs, core | Fit the votes 1.7 + Today's board 2.1 (+ Further reading 2.1) | Fit the votes 1.7 (+ Further reading 2.2) |
| Core total, excluding Further reading | 26.2 min | 26.0 min |
| Visuals drawn in Reading (audit count) | 5 inline, 0 in tabs | 9 inline (plus the arena table and the paper figure) |

Why about 24 minutes is right: the core carries one mechanism chain (vote, fit, interval, lens) with the evidence that each step reproduces the published board, then the ways the number bends and the proxies people quote; every section now opens with a concrete number and has its visual beside the claim. The Reading tab grew by about two minutes because the board explorer, the hero, the new terms and the aggregate-index paragraph moved in, while per-arena details, the three older judge boards, instruction following and the cleaned-history finding moved to closed blocks. The page total did not grow. A further cut would drop one of the bends (selection, sampling, lens) that the hero promises.

## Knowledge ledger (`ledger.json`, `python3 html_utils/ledger.py check`: problems 0)
261 units: core 175, depth 45, volatile 14 (the rows of the dated table and dated leaders, all kept in the closed table or beside the board), fat 27 (headings, wind-ups, pointers to the removed tab, the old What to use question headers; each carries a `note`). 248 were drafted by `ledger.py init`; unit 12 (the whole old table) was split into 11 row units; 3 were added by hand for script-rendered content (the Elo order spread, the lab table, the board explorer rows). Keys were drafted by a script that picked a distinctive number or phrase of each unit found on the rebuilt page, then reviewed by hand.

## Checks (2026-10-24)
`sh build.sh`; `node check_page.mjs` (all checks passed: every control at 390 dark and 920 light, the page's numbers against `recompute_out.json`, the gap slider at 64.0% and 76.0%, and a normal-motion check that no animation moves before the reader acts); `sh html_utils/checkpage.sh <page>` (fail=0, emdash 0, errbox 1, clipped 0); `python3 html_utils/ledger.py check <page>` (problems 0).

## Data (read 2026-10-04)
- `inputs/arena2024_fits.json`: this page's Bradley-Terry and style-control fits on the public log (1,762,122 anonymous, de-duplicated votes up to the board's last vote), FastChat's `rating_systems.py` reimplemented, against LMArena's published `elo_results_20240828.pkl` (plain mean gap 0.03, max 0.48 over 136 models; style control mean 1.11, top-20 max 1.39; coefficients 0.249, 0.024, 0.031, 0.019 as published) and the 13 Aug board from the 14 Aug log (max 2.97). The de-duplication tag (`dedup_tag.sampled`) is needed: without it gaps reach 16.7.
- `inputs/lab_sample.json`: 6,000 votes among ten models (seed 20240826), 7 characters per vote, style ratios quantised to 1/31.
- `inputs/board_2026-10-02.json`: Arena leaderboard-dataset (CC-BY-4.0), latest split: text raw, style control and factuality for 12 categories (top 30 by style control, with each lens's rank and Arena's rank spread computed over all models), Search raw and style control, Code Arena top 10.
- `inputs/pref_vs_cap.json`: 35 models matched by hand between Arena text (style control) and the AA Intelligence Index v4.3 snapshot in `topic_llm_landscape/src/data/aa_snapshot.json`.

## Files
`parts/20_read_a..h.html` Reading; `21_js_rd_common.js` (the skill template: never autoplays); `22_js_data.js` generated; `23_js_math.js` (Bradley-Terry by Newton with sandwich covariance, online Elo, rank spread, Spearman, E[max]); `24_js_rd_elo.js` (Elo against Bradley-Terry animation), `25_js_rd_sp.js` (intervals and rank spreads), `26_js_rd_style.js` (style control step animation), `26b_js_rd_board.js` (Today's board, three ways, in section 3), `27_js_rd_misc.js` (best-of-N, null model bars, preference against capability), `28_js_rd_hero.js` (hero), `29_js_rd_gap_lc.js` (gap slider, length-control chart); `30_*` Fit the votes; `39_tab_more.html`. Image: `../img/leaderboard_illusion_fig1.webp`, credits in `../img/CREDITS.md`.

## Departures and notes
- The sandwich covariance is reported for centred ratings (the shift is unidentified without an anchor); the page centres sample ratings on the mean of the full-data ratings of the same ten models.
- Arena's published history (leaderboard-dataset) omits pre-release variants: Llama-4-Maverick-03-26-Experimental and the experimental Gemini 2.5 Pro do not appear; the page says so.
- Copilot Arena's status after 2025 could not be confirmed (marked unconfirmed).

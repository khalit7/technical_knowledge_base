# Training Compute-Optimal Large Language Models (Chinchilla, Hoffmann et al. 2022): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d8116b7ddffba5c599f3f, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, with the shared pieces copied from the reference folder through the Scaling Laws page (`scaling_laws_for_neural_language_models/src/`, whose `mk_paper.py`, CSS and `11_js_ui.js` are the reference ones plus small additions).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with verdict; the core idea in one sentence, the hero (Table 1's models in (N, D) space against 20 tokens per parameter and Gopher's IsoFLOP line, arrow Gopher to Chinchilla), You need and New terms; Problem (Table 1, the learning-rate slider for Figure A1's cycle lengths), Setup, Approach 1, Approach 2 (Figure 3 rebuilt from the extracted points: parabolas per budget, power law through the minima), Approach 3 (Eq. 2 to 4 and 10 to 11), The answer (Table 2, Table 3 and the text-against-table discrepancies), Same budget (before/after animation: Gopher's and Chinchilla's allocation of 5.76e23 FLOPs through the loss decomposition), Chinchilla, the test (Table 4, the parameter count reconstruction), Results (Figures 6 and 7 rebuilt from Tables A6 and A7), How much of this to believe, Why it matters (with "Using this today"), Connections; three predict questions. |
| Refit Approach 3 | `t-run` | The live ingredient: Approach 3 fitted in the browser to the 245 points Besiroglu et al. read off Figure 4, with summed or averaged Huber (the bug), outliers, delta, a hold-out and the paper's 4,500-start grid; Figure 4 (left) rebuilt with the chosen fit's contours and frontier; residuals; tokens per parameter on each fit's frontier with a bootstrap. |
| The paper's tables, rebuilt | `t-tables` | Tables 3 and A3 checked against 6ND, results Tables 6 to 10 and A5 with deltas, Tables A6 and A7 per task, the Appendix F FLOP calculator against Table A4, Table A9 recounted, Table A1, every derived number (77 rows); the per-task, A9 and derived-number tables sit in closed blocks. |
| Then and now | `t-then` | One sentence and a link for the inference-aware optimum (owned and animated by Pretraining), tokens per parameter of 11 models 2020 to 2024, the exponent replicated (14 rows), changed and survived. Links the Scaling Laws page's Kaplan-against-Chinchilla animation instead of rebuilding it. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **The live ingredient refits the paper's own data, which the paper never released.** Papers.md forbids reading curves off plots. Besiroglu et al. did not read curves: they parsed the vector graphics of Figure 4, so each point's coordinates are exact up to the axis mapping and its loss is good to about 0.01 (256-colour scale). This page uses their published CSV (`inputs/epoch_fig4_points.csv`, N, C, L to 6 significant figures) and says so wherever it is used.
- **No Approach 1 envelope is drawn**: the paper released no training curves, and an envelope generated from a fitted surface would be an illustration of the fit, not of Approach 1. The text describes it; the 1e21 head-to-head is recomputed from Approach 2 instead.
- **Then and now does not repeat the Scaling Laws page's animation** (Kaplan's rule against Chinchilla's in (N, D) space); it links it and animates what is specific to this paper's afterlife, the inference-aware optimum.
- **The Scaling Laws page's toy sweep is not reused**: its largest model never overtook the next one inside 8.4M tokens, so it has no IsoFLOP valley to show. The extracted points do.
- **"What it takes to use this" is folded into "Why it matters" as "Using this today"**: the method is standard, and Then and now covers the rest (as for the Scaling Laws page).
- The Reading tab is 19 minutes of core (plus 4 in closed details) against the old page's 9: the paper page owns every detail of the paper, including the three methods, the evidence check and the discrepancies.

## What reproduces and what does not

- **Approach 2 on the extracted points** (`fit.py`, the page agrees): a = 0.507, b = 0.493 (the paper 0.49, 0.51); at Gopher's budget 70.9B parameters on 1.35T tokens (Chinchilla: 70B on 1.4T); the 1e21 valley at 2.84B (Approach 1 said 2.86B, §D.4). Dropping the five highest losses gives 0.518. Independently.
- **Approach 3, summed Huber, 240 points, the paper's grid**: SciPy gives E 1.8172, A 477.9, B 2143, α 0.3473, β 0.3672, a 0.514; Besiroglu et al. report 1.8172, 482.01, 2085.43, 0.3478, 0.3658, a 0.5126. E and α to three digits; B and β along their trade-off ridge. The JS optimiser (`parts/21_js_fit.js`) matches SciPy to four digits (`check_fit.mjs`; 2.9 s in Node for the full grid, 0.3 s for the page's 432-start quick grid, which finds the same optimum).
- **All 245 points**: β 0.453, B 12,844, a 0.565; Besiroglu's Table 3 gives 0.452, 12,530, and prints a = 0.512, which its own α and β contradict (they give 0.567).
- **The averaging bug**: with the Huber losses averaged, the same search with SciPy's default stopping rules stops early at a = 0.462 (SciPy) and 0.450 (the JS optimiser), against the paper's unrounded 0.4565 and the correct 0.514. The direction reproduces; the exact stopping point depends on the optimiser.
- **Bootstrap**: standard error of a 0.020 over 200 resamples (Besiroglu: 0.018 over 4,000). The page's 40-resample bootstrap gives a similar band.
- **Paper numbers** (`recompute.py`, 77 rows: 45 reproduce, 17 partly, 4 do not, 11 derived): Table 3 against 6ND reproduces except the 67B row (pinned to Gopher's budget); Table A3's Approach 3 column has one exponent misprint (175B: 1.26e24 should be 1.26e25) and two rows 4% off; the text's "over 250×" is 174×; the text's 4.41e24 / 4.2T and 1e25 / 6.8T match neither table; Table A4's FLOP ratios reproduce (five of six within 0.007) only with the embedding and logit terms left out, though Appendix F lists them; MMLU 67.6 reproduces as the unweighted mean of Table A6 but Gopher's comes out 60.6, not 60.0; BIG-bench's unweighted means are 64.5 and 54.4: Gopher's printed 54.4 reproduces, Chinchilla's 65.1 does not; Natural Questions' Gopher 5-shot is 24.5% in Table 9 and 21% in the text; parameter counts reproduce with 13 L d² (an inferred relative-position term), not 12 L d².
- **Sardana et al.'s examples** (moved to Pretraining's recompute.py on 2026-10-26) reproduce within a few percent with the paper's unrounded constants (13B quality, 2e12 inference tokens: 7.1B, saving 1.6e22 FLOPs, 16%, against their 7B, 1.7e22, 17%); with the rounded constants they move by 10 to 40%.

## Corrections to the old Notion text (all in coverage.json, "Corrected")

- Approach 3's exponents are a = β/(α+β) and b = α/(α+β), not the other way round; the rounded constants give 0.452, the 0.46 comes from the unrounded ones.
- "5B to over 500B tokens": the abstract says 5 to 500B, §1 "over 400B".
- "Gopher should have been trained on 6.8T tokens (17× its 300B)": 6.8T is the text's figure for a 280B model at about 1e25 FLOPs and is 23× Gopher's tokens; Table 3 says 5.9T (20×); 17.2 is the FLOPs in Gopher units.
- "N and D doubled together as budget doubles": doubling the model means doubling the tokens; doubling the budget grows each by √2.

## Files

`paper.json`, `tables.json` (from `mk_tables.py`, which parses `inputs/table_*.txt` and adds hand-entered rows with sources), `mk_paper.py` (card, Further reading, `window.PAPER` including the points and fits), `recompute.py` (`inputs/recompute.json`), `fit.py` (SciPy refits, `inputs/fit.json`; `uv run --no-project --with numpy --with scipy python fit.py`, a few minutes on 2 threads), `check_fit.mjs` (JS optimiser against SciPy, `inputs/check_fit.json`), `check_page.mjs` (every control, both themes and widths, both animations stepped), `mk_coverage.py` (58 items), `save_live.py`, `extract_paper.py`, `inputs/` (paper text and table extracts, the Besiroglu et al. v2 text, the extracted points, fit and recompute JSON), `viz_ideas.md`.
Parts: `00_top`, `01_css` (reference CSS plus a few additions), `02_header`, `03_paper`, `04_run`, `05_tables`, `06_then`, generated `_gen_card`, `_gen_more`, `_gen_data.js`; JS `10_js_common`, `11_js_ui` (shared), `21_js_fit` (the optimiser, also run by Node), `13_js_read`, `23_js_run`, `24_js_tables`, `25_js_then`, `99_js_tabs` (the explainer-page template, storage key `ch-tab`, plus `data-to` scrolling that opens a closed block). `reading.json` holds the measured reading time for the header; `label_ledger.py` labels `ledger.json`.

## Checks (2 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, 209 KB. `node src/check_page.mjs`: 294 actions, 0 problems. `mk_coverage.py`: 58 of 58 verified. Every arXiv anchor the page links (82) exists in the fetched HTML.

## Light pass, 2026-10-25 (teaching contract)

- **Top**: the core sentence, a hero figure (every model of Table 1 by parameters and training tokens on log axes, the 20-tokens-per-parameter line of Table 3, the IsoFLOP line 6ND = 5.76e23 of Gopher's budget, and an arrow from Gopher to Chinchilla; static, drawn from `tables.json`, with the caption noting that 6ND puts the two runs at 5.04 and 5.88e23, not exactly on the line), You need and New terms (compute-optimal, IsoFLOP profile, a and b, cosine cycle). The paper is under arXiv's non-exclusive licence, not CC BY, so no figure is embedded.
- **Owned elsewhere** (one sentence each, linked to Pretraining, which owns scaling laws, compute-optimal allocation and over-training): why 6 FLOPs per parameter per token; over-training as a planning choice; planning a run today. The paper's own analysis, Sardana et al.'s optimum (which Pretraining links here for) and every number stay.
- **Moved into closed `<details>`** (nothing deleted but fat): schedule and hyperparameter details, the theory behind each term of Eq. 2 and the fit's settings, the text-against-table discrepancies, the parameter-count reconstruction, the five differences between Chinchilla and Gopher (one sentence stays in the core), every evaluation beyond MMLU and BIG-bench (one summary sentence stays), three smaller evidence points, and a dated follow-ups block (10,000 tokens per parameter, fitting your own law, MoE). In the Tables tab, the per-task Tables A6 and A7, Table A9 and the 80-row derived-number check are closed blocks.
- **No autoplay**: `makeAnim` (11_js_ui.js) waits on step 1, also after a mode switch; `check_page.mjs` fails if `spx` or `inf` draws a frame before play or on a mode switch. Header: "Reading: 19 min, plus 4 in closed details."
- **Length**: core 21 min before (4,821 words) plus 0 closed, 19 after (4,380) plus 4 closed; other tabs 28 min before, 13 core plus 15 in closed blocks after (the Tables tab went from 4,203 words open to 752 open and 3,478 closed). What remains open is the paper's argument (the problem, the three approaches, the answer, the same-budget animation, the test, the headline results and the evidence judgement), which this page owns.
- **Ledger** (`ledger.json`): 263 units, core 213, depth 44, owned 2, fat 4 (old reading-time line, tab labels, two sentence fragments); script-rendered tables are covered by one unit each with its block's title as the key; `ledger.py check` problems 0.
- `mk_tables.py`: one escape fixed (`'\\;'` for `'\;'`, the same string) so newer Pythons stop warning.

Rechecked 2026-10-25: `checkpage.sh` 5 tabs, 217.7 KB, emdash 0, errbox 1, clipped 0, fail=0; `check_page.mjs` 294 actions, 0 problems (including the no-autoplay checks); `check_fit.mjs` unchanged results; `mk_coverage.py` 58 of 58.

## 2026-10-26: inference-aware optimum owned by Pretraining
Khalid's decision: Pretraining owns Sardana et al.'s inference-aware optimum (it now carries the Eq. 3 objective, the paper's example and caveats). The Then and now card stays as this paper's replay against its own fits and names Pretraining as the owner. Ledger key 210 re-keyed for the added line.

## 2026-10-26: the inference-aware animation moved to Pretraining
Decision 4 (paper pages own only their own paper's results): the Then and now card animating Sardana et al.'s optimum (`#inf`, its JS in `25_js_then.js`, its no-autoplay and stepping checks in `check_page.mjs`, and the three `sard*` rows of `recompute.py`) moved to Pretraining section 3 (`#sa-card`). Then and now keeps one sentence and a link; Why it matters and the Llama 3 prediction link there too. Ledger: units 163 and 210 to 215 relabelled `owned:` Pretraining, unit 263 re-keyed (77 rows); owned 9. Derived-number table 80 to 77 rows. Reading header unchanged (19 min, plus 4).

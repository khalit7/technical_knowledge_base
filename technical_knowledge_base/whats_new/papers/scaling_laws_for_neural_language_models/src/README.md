# Scaling Laws for Neural Language Models (Kaplan et al. 2020): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81b08a1debb0c15cd252, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md` and the reference folder `attention_is_all_you_need_transformer/`.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with verdict; the core idea in one sentence, You need and New terms; At a glance (Fig. 1, a 3D stage of Eq. 1.6 over size and compute, with its step list); Problem, Method, Three power laws (Figure 1 rebuilt from Eq. 1.1 to 1.3), Overfitting (Fig. 2, a 3D stage of Eq. 1.5 with the 2.4% line and both frontiers; Figure 9 rebuilt from Table 2), Training curves (critical-batch explorer in a closed block), Spending compute (animation "big model stopped early" against "small model converged" with its step lists, Figure 15 rebuilt with exponent sliders), Results, How much of this to believe, Why it matters, Connections; three predict questions. |
| Refit the laws | `t-run` | A real toy sweep (27 runs, 1.5k to 2.7M parameters, 32 CPU minutes): L(N) refitted live with residuals and extrapolation, learning curves with the compute frontier and three compute accountings, checkpoint against matched-schedule runs (plus a learning-rate probe), the "bigger and stopped early" comparison, seed noise, every run. |
| The paper's tables, rebuilt | `t-tables` | Table 1 calculator, Tables 2 to 6, and "every derived number, checked" (34 rows from `recompute.py`). |
| Then and now | `t-then` | Animation spending the same budgets (10^21, GPT-3, Gopher, Llama 3 405B) by Kaplan's and Chinchilla's rules in (N, D) space with real models; Porian et al.'s step-by-step reconciliation; Chinchilla Table 2; changed and survived. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **The live ingredient is a toy sweep, not refitted paper data.** The method suggests rebuilding an empirical paper's figures from its tables or released data. Kaplan et al. released neither (no tables of runs, no code), and papers.md forbids reading curves. So the Reading tab draws only the paper's fitted equations (labelled as such), and "Refit the laws" runs a small sweep in the paper's style whose points are real.
- **No allocation exponent from the toy.** Two fitting approaches were tried (curve crossings, Chinchilla's parametric Approach 3); the bigger model never overtakes the smaller one inside the 8.4M-token budget and the parametric fit had 3 to 4% RMS error, so the tab shows the comparison itself and says plainly that the toy cannot locate the optimum.
- **"What it takes to use this" is folded into "Why it matters" as "Using this today"**, because the method itself is superseded; Then and now carries the rest (papers.md: classics use Then and now).
- **The tables tab has no "rebuilt from data" charts**: the paper's six tables are all fitted constants or formulas.

## Toy sweep (what reproduces and what does not)

- `prep_data.py` downloads WikiText-2 raw from Hugging Face into `$SL_DATA` (outside git) as byte-level tokens; `train.py sweep` trains every run in `runs()` (resumable; skips finished runs); `mk_results.py` writes `parts/_gen_runs.js` and `inputs/results.json`.
  - `SL_DATA=<scratch> uv run --no-project --with pyarrow --with numpy python prep_data.py`
  - `SL_DATA=<scratch> uv run --no-project --with torch --with numpy python train.py sweep` (torch is never added to pyproject.toml; 2 threads)
- Copied from the paper: decoder-only Transformer, d_ff = 4 d_model, N = 12 n_layer d_model^2, the LR(N) rule of Eq. D.1, 1.2% warmup and cosine to zero, one fixed step count for every size, test loss on held-out text.
- Differs: byte-level tokens (vocabulary 96), WikiText-2 (10.9M characters, no token seen twice), context 64, batch 2,048 tokens, 1,536 to 2.65M parameters.
- Reproduces: the power-law form of L(N) (α_N = 0.080 here against 0.076; the fit is good to 1.5% RMS, with a slight concave curvature in the residuals), the lower-envelope frontier where bigger models take over at higher compute, and the Figure 6 point that counting embeddings bends small models off the line.
- Does not reproduce: Chinchilla's finding that a schedule ending at the budget beats a checkpoint of a longer run. With the paper's LR rule the matched short runs are worse by 0.07 to 0.19 nats; a 3x learning rate fixes it (below), which is the paper's own Appendix C caveat and Porian et al.'s tuning finding.
- Seed noise is up to about 0.06 nats for the tiny models, as large as the gap between the two largest sizes.

Numbers (inputs/results.json, model/*.json):
- Final test losses of the full runs, 1.5k to 2.65M parameters: 2.503, 2.318, 2.065, 1.863, 1.713, 1.577, 1.479, 1.424 nats/char. Pure power law over all eight: α_N = 0.080.
- Matched 1/4-budget runs against the long run's checkpoint at the same tokens: worse by 0.07 to 0.19 nats at the Eq. D.1 rate. At 3x the rate: 83k 2.056 (checkpoint 2.166, rule's rate 2.358); 442k 1.833 (checkpoint 1.908, rule's rate 2.075).
- Bigger-and-stopped-early against smaller-and-finished at equal compute: the smaller wins for every pair but the smallest, down to 7 tokens per parameter.
- Second seed: 6.1k +0.060, 83k -0.022, 442k -0.0005 nats.
- CPU: 1,915 s summed over runs (2 threads), plus one interrupted run (M4_6_192, dropped from the plan for budget).

## Files

`paper.json`, `tables.json`, `mk_paper.py` (card, Further reading, `window.PAPER`), `recompute.py` (every derived number, `inputs/recompute.json`), `train.py`, `prep_data.py`, `mk_results.py`, `model/*.json` (run logs, small; no checkpoints are saved), `check_page.mjs` (every control, both themes and widths, animations stepped), `mk_coverage.py` (51 items from `live.md`), `save_live.py`, `extract_paper.py`, `inputs/` (paper text and table extracts, recompute and results JSON), `viz_ideas.md`.
Parts (99_js_tabs.js is the explainer-page template, storage key `sl-tab`, plus `data-to` scrolling that opens a closed block): `00_top`, `01_css` (reference CSS plus a few additions), `02_split` (template), `02_header`, `03_paper`, `04_run`, `05_tables`, `06_then`, generated `_gen_card`, `_gen_more`, `_gen_data.js`, `_gen_runs.js`; JS `10_js_common`, `11_js_ui` (shared; makeAnim with the 2026-11-06 motion rules, from the Chinchilla page), `25_js_s3` (template, renderer v2), `13_js_read`, `23_js_run`, `24_js_tables`, `25_js_then`, `31_js_sc_hero`, `32_js_sc_lnd` (the two scenes), `99_js_tabs`. `check_stages.mjs` checks the stages and animations (after Chinchilla's). `label_ledger.py` labels `ledger.json`; `reading.json` holds the measured reading time for the header.

## Light pass, 2026-10-24 (teaching contract)

- **Top**: the core sentence, a hero figure (learning curves of 10^6 to 10^10 parameters against compute, with the lower envelope that is the compute-efficient frontier, drawn from the paper's fitted Eq. 1.6 with the batch at B_crit, the same constants as the animation; labelled fitted equations, not runs), You need and New terms (power law, non-embedding N, critical batch, C_min). The paper is under arXiv's non-exclusive licence, not CC BY, so its figures are redrawn, not embedded.
- **Owned elsewhere** (one sentence each, linked): why compute is 6 FLOPs per parameter per token (Pretraining); McCandlish's steps-against-examples trade-off and batch-size rules (Optimisers and learning-rate schedulers); compute-optimal allocation today and over-training (Pretraining). The paper's own results (Eq. 5.3, the frontier, L(N, D)) stay.
- **Moved into closed `<details>`** (nothing deleted but fat): LSTM and recurrent comparisons, where the overfitting fit fails, the Eq. 5.1 slider and the "1-2 million tokens" check, the small internal slips and data reuse, and the practical recipe in detail.
- **No autoplay**: `makeAnim` (11_js_ui.js, the GPT-3 page's fixed copy) waits on step 1; `check_page.mjs` now fails if `cvx` or `thx` draws a frame before play or on a mode switch. Header: "Reading: 17 min, plus 2 in closed details."
- **Length**: core 17 min before (3,826 words), 17 after (3,825) plus 2 in closed details, with the new top section absorbed by what moved into details. The remainder is the paper's argument, every law with its constants and the verdict, which this page owns; the toy sweep, tables and Then and now tabs are tools used across the page and are unchanged.
- **Ledger** (`ledger.json`): 248 units, core 203, depth 38, owned 3, fat 4; `ledger.py check` problems 0.

## Checks (2 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, 174 KB. `node src/check_page.mjs`: 236 actions, 0 problems (both themes and widths, every control, both animations stepped and played). `mk_coverage.py`: 51 of 51 items verified. Reading time of The paper tab: 16 minutes (the old page said 8; the paper page owns every detail, and the toy and table material is in other tabs).

Rechecked 2026-10-24 after the light pass: `checkpage.sh` 5 tabs, 182.1 KB, emdash 0, errbox 1, clipped 0, fail=0; `check_page.mjs` 236 actions, 0 problems (including the no-autoplay checks); `mk_coverage.py` 51 of 51.

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged): every section with a visual is text left, visual right (sticky); sections without one stay full width. Reading: At a glance (new section `s-glance`, stage), Three power laws (Figure 1 card right), Overfitting (stage, then a second split with the Figure 9 card), Spending compute (animation card right with its step lists left, then a second split with the Figure 15 card). Problem, Method, Training curves (its only visual is in a closed block), Results, Believe it?, Why it matters and Connections stay full width. Refit tab: four splits (each card's heading, try note and caption on the left, controls, chart and output on the right); the sweep table, the noise card and the verdict stay full width. Then and now: the animation right, intro and step list left; the Porian and Chinchilla tables and Changed/Survived full width. Tables and Further reading unchanged (tables only).
- **Two 3D stages** (template `25_js_s3.js`, renderer v2, unchanged; one scene file each). Both are drawn only from the page's own constants (`KAPLAN` in `13_js_read.js`, `PAPER.rc` from `recompute.py`); every number in their step lists is computed in the scene.
  - `31_js_sc_hero.js`, Fig. 1, replacing the static 2D hero (the same equation, Eq. 1.6 at B_crit with Table 5's constants): floor log C (PF-days, left to right) by log N (front to back), height the loss from 1.5 nats, flat above 5. Steps: rows as learning curves (10M flattens at 3.37, 10B still falling at 2.03 by 1,000 PF-days); the 1 PF-day cut with its curtain and flows down both walls to the valley (603M at 2.72); the valley stopped 10% above its converged 2.47 (Eq. B.5), the camera close; cuts from 1e-3 to 100 PF-days with the valley line, slope 0.68 on the surface (the paper's formula, against 0.73 fitted); the 2.50 contour with the animation's two runs (663M near converged at 13.67 PF-days, 1.8B stopped early at 4.91, 0.36x).
  - `32_js_sc_lnd.js`, Fig. 2, new, what Kaplan adds beside Chinchilla's picture: L(N, D) of Eq. 1.5 with Table 2's constants over log N by log D; rows at 1B and 1T tokens; the 2.4% penalty line (Eq. 4.3 at the threshold Eq. 4.4 implies, `PAPER.rc.overfit_thresh`) with the overfitting region tinted; then, surface receded and camera overhead, Table 6's frontier on the floor (C_min = C/2, as Then and now) with budget cuts 1e19 to 1e25, tokens per parameter 63 to 0.11, and where it crosses the 2.4% line (1.3e20 FLOPs, 1.1B on 21B tokens; derived here, with the paper's own Sec. 6.3 sentence); then Chinchilla's 20 tokens per parameter and Gopher's budget spent both ways (485B on 198B against 69.3B on 1.39T). Frontiers stay on the floor because the surface is an early-stopped loss on a dataset of D tokens, not a one-pass loss; the caption says so.
- **Kept 2D**: Figure 1 rebuilt (a slider and power laws read off log axes), Figure 9 rebuilt (a slider, values read off), the Eq. 5.1 slider, the spending animation (curves against compute you read losses from), Figure 15 rebuilt (exponent sliders), every Refit chart (log axes, residuals, bars the reader drives) and the Then and now animation (real models placed on log axes). A third stage of the toy sweep's learning curves was considered and not built: it would repeat the Refit tab's learning-curve chart.
- **Motion**: `11_js_ui.js` copied from the Chinchilla page (makeAnim with the RD.anim rules: plays once half in view, pauses off screen, stops for good on any control or at the end, never under reduced motion, `data-playing`, an `ol.sx` per mode). The caption carousels (`cvxStep`/`cvxCap`, `thxStep`/`thxCap`) became step lists: two for the spending animation (one per strategy), one shared by both rules in Then and now. `99_js_tabs.js` and `05z_errbox.js.html` are the templates (storage key `sl-tab`, the `data-to` link still opens its closed block). `check_page.mjs` now asserts autoplay on view and a replay on a mode switch instead of forbidding them; `check_stages.mjs` checks both stages and both animations at three widths and under reduced motion.
- The em-dashes in the extracts `inputs/paper_v1.txt` and `inputs/table_S2_T1.txt` (empty table cells) became `--`.

## Length judgement (2026-11-13)
| | Before | After |
|---|---|---|
| The paper, core | 16.7 min (3,842 words) | 21.7 min (4,994) |
| The paper, closed | 2.0 min (450) | 2.0 min (450) |
| Refit (core + closed); Tables; Then and now; Further reading | 6.1 + 1.5; 7.7; 3.3; 1.8 | 6.1 + 1.5; 7.7; 4.2; 1.8 |
| Visuals in Reading (audit) | 6 | 7 |

The growth is the step lists that now explain the two stages and the two animations (about 1,150 words in Reading, 200 in Then and now; the animation captions were script-drawn before and invisible to the audit); nothing was cut. Header: "Reading: 22 min, plus 2 in closed details." Pages that quote the old 17 minutes (performance_math, topic_math, matrix_calculus_and_backprop) need `check_times.py --fix` by the lead.

Ledger: 271 units (core 226, depth 38, owned 3, fat 4); 23 added for the two stages' step lists and captions and the three animation lists; unit 245 rewritten for the new hero; keys of units 79 ("play both runs in the animation"), 202 ("the paper's allocation rule drove the models of 2020") and 207 ("why the exponents differed") re-pointed; `ledger.py check` problems 0.

## Checks (13 November 2026)
`checkpage.sh`: tabs 5, 242 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 272 actions, 0 problems. `check_stages.mjs`: 12 stages and animations checked (three widths), 0 problems. `verify_layout.mjs`: problems 0. `mk_coverage.py`: 50 of 51 (the Takeaway property line was already missing before this pass: the card's "In one line" no longer carries "6+ orders of magnitude"). `ledger.py check`: problems 0.

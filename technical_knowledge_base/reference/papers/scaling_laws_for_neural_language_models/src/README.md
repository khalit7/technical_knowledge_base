# Scaling Laws for Neural Language Models (Kaplan et al. 2020): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81b08a1debb0c15cd252, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `html_utils/methods/papers.md` and the reference folder `attention_is_all_you_need_transformer/`.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with verdict; Problem, Method, Three power laws (Figure 1 rebuilt from Eq. 1.1 to 1.3), Overfitting (Figure 9 rebuilt from Table 2), Training curves (critical-batch explorer), Spending compute (before/after animation "big model stopped early" against "small model converged", Figure 15 rebuilt with exponent sliders), Results, How much of this to believe, Why it matters, Connections; three predict questions. |
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
Parts: `00_top`, `01_css` (reference CSS plus a few additions), `02_header`, `03_paper`, `04_run`, `05_tables`, `06_then`, generated `_gen_card`, `_gen_more`, `_gen_data.js`, `_gen_runs.js`; JS `10_js_common`, `11_js_ui` (shared), `13_js_read`, `23_js_run`, `24_js_tables`, `25_js_then`, `90_js_tabs`.

## Checks (2 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, 174 KB. `node src/check_page.mjs`: 236 actions, 0 problems (both themes and widths, every control, both animations stepped and played). `mk_coverage.py`: 51 of 51 items verified. Reading time of The paper tab: 16 minutes (the old page said 8; the paper page owns every detail, and the toy and table material is in other tabs).

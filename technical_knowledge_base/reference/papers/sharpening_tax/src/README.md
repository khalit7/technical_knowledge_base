# Sharpening Tax in Post-Training: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3fe5c17b0d0d81efa2a9f532c14c87a3, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row had no old body ("Being built in the technical_knowledge_base repository."), no child pages, databases or video, so coverage runs against the paper's own claims. Built from `.claude/skills/explainer-page/page-kinds/paper.md` with the shared pieces (`01_css`, `05z_errbox`, `10_js_common`, `11_js_ui`, `14_js_charts`, `90_js_tabs`, `mk_paper.py`, `build.sh`) via the SA-MRPO page's copies; `check_page.mjs` and `mk_coverage.py` rewritten for this paper.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with verdict; Problem; Setup (metrics with a one-task pass@k chart, benchmarks, models, harness); Base against post-trained (crossover predict question on real counts, scale, the polarisation animation of the same tasks under both models, consistency); The tax (Eqs. 1 to 3, Proposition 1, a per-task retry-value chart, where it is charged, what it is not, Figure 7 checked, routing); Why a tax (Theorem 2 predict question with a lab on real tasks, Table 8); PTGS (global-temperature predict question, Eq. 4 chart, Theorem 3); PTGS results (Table 2, ablations, test-time variant, posterior accuracy); How much to believe; What it takes; Why it matters; Connections. |
| Replay the 42 cells | `t-run` | Live ingredient 1: the authors' released per-task counts run through the paper's estimators in the browser, any cell, beside the printed Table 7; Tax across budgets; a 42-cell map (coverage gap against TaxS). |
| Train with PTGS | `t-toy` | Live ingredient 2: a port of the authors' CPU toy. One real batch through both samplers (before/after animation, Theorem 3 on real prompts); the ten-seed sweep of four arms; training traces; a live run that must equal the sweep; the authors' own toy table; engine check. |
| The paper's tables, rebuilt | `t-tables` | Every check with paper and page numbers; Table 7 explorer with the replay beside it; Tables 2, 9, 10 as intervals; Table 4. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from paper.md, and why

- **Two live ingredients, neither a trained toy model of the paper's own experiments.** The paper is empirical plus a sampler. Its main evidence ships as data (per-task counts of all 84 runs), so the first ingredient replays that data (the empirical-paper row: rebuild figures from released data, recompute). PTGS's own evidence (RL on a 7B model) cannot run here; the authors' released CPU toy shows the mechanism, so the second ingredient is a JS port of that toy, run live, rather than a new toy design.
- **No "Then and now"**: the paper is three weeks old. The debate it joins lives in the RL for LLMs page, section 9, which is linked rather than rebuilt (that page already has an illustrative sharpening against expansion chart; this page uses only real counts).
- **Table and figure numbers follow the PDF**: the arXiv HTML drops the numbers of the two main-text wrap tables and renumbers the appendix tables and figures from 5 on; the paper's text uses the PDF numbers. Links go to the HTML anchors (`inputs/anchors.txt`); the two wrap tables and wrap figure have no anchor, so their links go to §3 or §5.
- **The toy differs from the authors' in its random generator only** (mulberry32 instead of numpy's PCG64), so runs agree in distribution, not draw for draw; 10 seeds instead of 5.
- **Reading time** 24 minutes (counted by the build, predict reveals included).

## Corrections and findings

- The first Takeaway (written 2026-10-19 by the update run) said base models beat their post-trained versions at pass@K in "most of 42 cases"; that is the tax count (TaxS(128) > 0 in 36 of 42). The property was corrected in Notion the same day to state both counts. Base pass@128 is higher in 26 of 42, with the printed 95% interval clear of zero in 18; post-trained clearly ahead in 13.
- Figure 7's rho = 0.85 (TaxS(8) on half the tasks predicting TaxS(32) on the other half): over 200 random splits the replay averages 0.79 (5th to 95th percentile 0.73 to 0.85); 0.85 is what the two give on all tasks with no split.
- PTGS's tax reductions are within the noise of five runs (about 0.9 and 1.0 standard errors from the printed intervals); a fixed training temperature of 0.5 paid a smaller tax than PTGS in both games (Table 9), with lower pass@1.
- Ten of 84 budget-averaged coverage values in Table 7 differ from the replay by up to 0.001 (both directions); every coverage and tax value matches.
- Table 4 (32 attempts) and the main 128-attempt runs are separate evaluations: pass@1 differs by 0.9 points on average, up to 7.0.
- In the toy, a stale posterior heats a prompt the policy now solves 78% of the time, and it falls to 53%: Theorem 3's assumption can fail.

## Files

- `save_live.py` (the Notion fetch, verbatim, from the session transcript into `live.md`), `extract_paper.py` (arXiv HTML v1 to `inputs/paper_v1.txt` and `inputs/table_*.txt`; anchors listed in `inputs/anchors.txt`).
- `inputs/outcomes_42cells.csv.gz`: the authors' released per-task counts (github.com/changdaeoh/sharpening-tax, commit 789ae06c82728dc40f4f80e855d0f972eff1e5c6, `data/outcomes_42cells.csv.gz`, sha256 116b5dae...0ee3, CC BY-NC 4.0, 165 KB). `mk_data.py` checks the hash.
- `mk_tables.py` (tables.json, read from the extracts, PDF numbering), `mk_data.py` (needs numpy, in the repo's .venv: `inputs/replay.json`, `parts/_gen_cells.js`, the Figure 7 split check, the Appendix C.1 aggregate crossovers), `recompute.py` (`inputs/recompute.json`: every check shown in the tables tab).
- `parts/22_js_toy.js`: the toy engine (browser and node). `toy_sweep.mjs` (node, about 2 s): every toy number (`inputs/toy.json`, `parts/_gen_toydata.js`). `inputs/authors_toy_output.txt`: the authors' toy run unmodified (numpy, 5 seeds), transcribed into tables.json.
- `check_toy.mjs` then `<python with numpy> check_toy.py <checkout of the authors' repo at 789ae06c>`: the engine against the authors' functions on fixed inputs (`model/toy_case.json`, `model/check_toy.json`: PASS; probabilities and gradients within 2.2e-16).
- `check_page.mjs` (from the repo root with node; set CHROME_PATH if needed): every control in both themes and widths, both animations stepped in every mode with mid-move screenshots, all 42 replayed cells against Table 7, the live toy run against the sweep for all 10 seeds, prose numbers against the data, reduced motion. `mk_coverage.py`: `coverage.json`.

## Checks (19 October 2026)

`checkpage.sh`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, about 297 KB. `check_page.mjs`: 0 problems. `check_toy.py`: PASS. `mk_coverage.py`: 43 of 43. Measured on a Linux cloud container (4 CPUs, no GPU); everything here is deterministic CPU work.

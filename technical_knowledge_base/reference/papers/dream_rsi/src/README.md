# Dream-RSI: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3e25c17b0d0d813ba021d805ba80ef54, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `html_utils/methods/papers.md`, starting from the JIT-Agent page's copy of the reference pieces (`build.sh`, `mk_paper.py`, `11_js_ui.js`, `check_page.mjs`, `mk_coverage.py` with its item list replaced, the CSS).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card, Problem, Idea, Method (tree, online rollout, replay rules, Eq. 1, selection), the policy and agent prompts (Appendix B), Setup with the round-by-round race animation (six runs decoded from Figures 3b and 4), Lasso (predict question: datasets won), Maths, Kernels (predict question: VGG16 at matched performance), Analysis (Figures 5, 6), How much to believe, What it takes to use this, Why it matters, Connections. |
| Dream over a recorded tree | `t-run` | The live ingredient: §3's replay simulator on illustrative 10 × 11 worlds; fixed policy against the dreamed winner as a step animation; the dream sweep (504 candidates scored by Eq. 1 on t recorded worlds); the winner deployed on 300 fresh worlds, same kind or "gains arrive later". |
| The paper's tables and figures, rebuilt | `t-tables` | Figure 3(a) with per-dataset ratios against any row and an arithmetic/geometric toggle, the SimpleTES provenance box; Table 1 with SimpleTES's omitted Together AI row; Figure 4 at any budget (matched cost and matched performance); Figures 5 and 6 rebuilt; all 56 checks. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **Live ingredient is a simulator of the method, not a trace replay of the paper.** papers.md suggests a trace replay for agent papers, but no trace, tree or program is released (README release plan, 3 October 2026). The paper's mechanism is itself a replay procedure, so the tab implements §3's replay rules and Eq. 1 exactly and runs them on generated worlds, labelled illustrative; it measures what the method can and cannot do (the ceiling, the in-sample guarantee, the β dependence) rather than any paper number. The engine is checked against an independent Python implementation (`check_sim.py`, 1,512 of 1,512 pairs agree).
- **The real numbers get their own animation in Reading.** The before/after Khalid prefers is the round-by-round race of the two methods on the paper's own decoded curves, one task at a time, to scale.
- **No Then and now.** A 2026 method paper; "What it takes to use this" covers adoption.
- **Only arXiv v1 exists**, so one anchor set (`inputs/anchors_v1.txt`); `build.sh` fails on any anchor not in it.
- **Reading tab is long (about 23 minutes against the old 4).** The old page was an abstract-level summary; this one owns the method details, the prompts (whose objective differs from Eq. 1) and an evidence section that changes the reading.

## Files

- `save_live.py`: copied the Notion fetch verbatim from the agent transcript into `live.md`.
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `tables_v1.txt`, `anchors_v1.txt`.
- `decode_figs.py`: Figures 3(b), 4, 5 and 6 from the arXiv HTML's vector SVG to `inputs/figs.json` (transform composition, tick-mark calibration, residuals reported).
- `fetch_extracts.py`: verbatim extracts of SimpleTES (Supplementary Table 16, Table 1 rows, default budget), the project page, the README, the repository file list and the Hugging Face ranking to `inputs/extracts.txt` (em dashes in sources marked, not kept).
- `mk_tables.py`: `tables.json` (Figure 3a, Table 1, decoded figures, SimpleTES rows), with asserts against printed values.
- `recompute.py`: 56 checks to `inputs/recompute.json` (27 printed numbers reproduce, 1 partly, 3 do not; 25 added checks).
- `parts/14_js_simcore.js`: the replay engine (plain JS, also loaded by Node); `check_sim.py` checks it to `inputs/check_sim.json`.
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `mk_coverage.py` writes `coverage.json` (25 items, this paper's own, verified against the built page).
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, both animations stepped for every task and world.

## Checks (3 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems; `recompute.py` 27 of 31 printed claims reproduce (1 partly, 3 do not); `check_sim.py` PASS; `mk_coverage.py` 25 of 25.

# Dream-RSI: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3e25c17b0d0d813ba021d805ba80ef54, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the JIT-Agent page's copy of the reference pieces (`build.sh`, `mk_paper.py`, `11_js_ui.js`, `check_page.mjs`, `mk_coverage.py` with its item list replaced, the CSS).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card, the core sentence and hero figure with You need and New terms, Problem, Idea, Method (tree, online rollout, replay rules with the replay stepper moved here from the Dream tab, Eq. 1, selection), the policy and agent prompts (Appendix B), Setup with the round-by-round race animation (six runs decoded from Figures 3b and 4), Lasso (predict question: datasets won), Maths, Kernels (predict question: VGG16 at matched performance), Analysis (Figures 5, 6), How much to believe, What it takes to use this, Why it matters, Connections. |
| Dream over a recorded tree | `t-run` | The live ingredient: §3's replay simulator on illustrative 10 × 11 worlds (its step animation, fixed policy against the dreamed winner, now sits in Reading's Method and uses this tab's history); the dream sweep (504 candidates scored by Eq. 1 on t recorded worlds); the winner deployed on 300 fresh worlds, same kind or "gains arrive later". |
| The paper's tables and figures, rebuilt | `t-tables` | Figure 3(a) with per-dataset ratios against any row and an arithmetic/geometric toggle, the SimpleTES provenance box; Table 1 with SimpleTES's omitted Together AI row; Figure 4 at any budget (matched cost and matched performance); Figures 5 and 6 rebuilt; all 56 checks. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **Live ingredient is a simulator of the method, not a trace replay of the paper.** papers.md suggests a trace replay for agent papers, but no trace, tree or program is released (README release plan, 3 October 2026). The paper's mechanism is itself a replay procedure, so the tab implements §3's replay rules and Eq. 1 exactly and runs them on generated worlds, labelled illustrative; it measures what the method can and cannot do (the ceiling, the in-sample guarantee, the β dependence) rather than any paper number. The engine is checked against an independent Python implementation (`check_sim.py`, 1,512 of 1,512 pairs agree).
- **The real numbers get their own animation in Reading.** The before/after Khalid prefers is the round-by-round race of the two methods on the paper's own decoded curves, one task at a time, to scale.
- **No Then and now.** A 2026 method paper; "What it takes to use this" covers adoption.
- **The page follows arXiv v1** (v2 appeared on 6 October 2026 and is summarised in a dated block), so one anchor set (`inputs/anchors_v1.txt`); `build.sh` fails on any `ax:` anchor not in it, and v2 is linked by full URL.
- **Reading tab is long (about 24 minutes plus 4 in closed details, against the old 4; see the light pass below).** The old page was an abstract-level summary; this one owns the method details, the prompts (whose objective differs from Eq. 1) and an evidence section that changes the reading.

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

## The 2026-10-25 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence, then a hero redrawn as static SVG (`mk_hero.py` writes `parts/03a_hero.svg.html`): record a run, replay a revised policy on the record, redeploy the best, on an illustrative 6 × 6 grid where the replayed policy reaches the same best in 18 of 36 attempts and never above it; below it the Lasso (550 to 317 calls, faster on 1 of 6 datasets) and VGG16 (2.43× by budget, 1.89× matched) numbers. The paper is under arXiv's non-exclusive licence and the repository's figures carry no licence, so no paper figure is embedded and no real image fits (nothing physical to show). Then "You need" (Model-based RL and planning) and the new terms.
- **Lab moved into Reading**: the replay stepper (one recorded world, fixed policy against the dreamed winner) and its predict question now sit in Method beside the replay rules they illustrate, labelled illustrative; the Dream tab keeps the sweep and the deployment, which are tools across the page.
- **Owned elsewhere, a sentence kept and linked**: Dyna, Dreamer and model-based RL in general (Model-based RL and planning).
- **Closed**: how the page was built and what it corrects, the policy prompt's rules (an open summary keeps the four that matter), the Lasso correctness rule and datasets, the discovered solver, and the bullets of What it takes to use this (one summary paragraph stays open).
- **Volatile**: one dated closed block, "Since the paper (dated: checked 25 October 2026)", inside What it takes to use this: the code release (google-research/dream-rsi, Apache 2.0, 6 October; not yet checked against the text), arXiv v2 (6 October: Pareto hypervolume objective, M = 4, a harness task, a history ablation, PACEvolve; v1 headline numbers unchanged), and the Hugging Face upvote readings. The method and evidence sections point to it where v2 answers a v1 gap.
- **Trimmed**: the third paragraph of Why it matters (it repeated Connections); the Agora comparison softened to match the Agora page (concentration on one lineage, the intervention untested).
- **No autoplay**: `makeAnim` patched as on Terminal-Universe; `90_js_tabs.js` replaced by the skill template `99_js_tabs.js` (storage key `drsi-tab`), keeping the `data-to` scroll target. `check_page.mjs` fails if either animation draws a frame before a click and opens every closed block.
- **Takeaway scoped** (paper.json with a new `takeaway_note`, so the card, `live.md` and `mk_coverage.py`; `mk_paper.py` prints the note): "competitive or better ... at substantially lower discovery cost across" three domains became one run per setting, savings in several settings with their matched-performance values, a lost maths task, a Lasso average carried by one dataset, and the uncounted development agent. The Notion property needs the same edit.
- `inputs/paper_v1.txt`: its two em-dashes written as `--`; no author emails were present. `extract_paper.py` now writes `--` and redacts emails; it extracted v2 to `inputs/paper_v2.txt`, `anchors_v2.txt` and `tables_v2.txt` (for the dated block only). Header: "Reading: 24 min, plus 4 in closed details." from `reading.json`.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 23.4 min (5,371 words) | 24.4 min (5,607) |
| The paper, closed | 0 | 4.2 min (968) |
| Dream tab | 4.4 min (1,022), 3 visuals | 3.4 min (783), 2 visuals |
| Tables; Further reading | 9.2; 3.6 min | unchanged |
| Visuals in Reading (audit) | 1 | 3 (the hero and the replay stepper) |

Why about 24 minutes is right: the core grew by a minute because the top (about 250 words) and the replay stepper's caption and predict question moved in, while about 900 words of setup, prompt rules and adoption detail closed. What stays open is the method in the paper's order and an evidence section whose every point changes the reading (one run per arm, matched-performance ratios, the one-dataset Lasso average, the uncounted dreaming, the replay ceiling). Shorter would mean closing evidence the verdict rests on.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
304 units: core 278, depth 22, owned 1, volatile 3, fat 0. 292 drafted by `ledger.py init` from the page before the pass; 12 added. Nothing was deleted. `ledger.py check`: problems 0.

## Checks (25 October 2026)
`checkpage.sh`: tabs 4, about 174 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 938 actions, 0 problems (no frame before a click). `mk_coverage.py`: 25 of 25. `recompute.py` and `check_sim.py` run in the build unchanged.

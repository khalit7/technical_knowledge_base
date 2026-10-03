# Phi-Bench: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3db5c17b0d0d81029236da6c38f5891f, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `html_utils/methods/papers.md`, starting from the HarnessDev page's copy of the reference pieces (`build.sh`, `mk_paper.py`, `11_js_ui.js`, `check_page.mjs`, the CSS).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card; Problem; Three formats (nested-scope widget); Construction (funnel); Scoring (predict: a tie with the reference scores 0, live reward curve per task); Results (predict: E2EO scores highest; predict: Hardware and Edge is 3 tasks, heatmap); Iterations and effort (Figure 5 rebuilt); Errors and cheating; Case study; How much to believe; What it takes to use this; Why it matters; Connections. |
| Replay the MoE training run | `t-run` | The live ingredient: the iteration task's 24 rounds for three models (Figure 8), all eight best-so-far curves (Figure 6) with a BPB / task-reward lens, final table. |
| Score a submission | `t-score` | Simulated AB-BA scoring on any of the 77 real anchors, paired against unpaired; the anchors strip plot. |
| The paper's tables and figures, rebuilt | `t-tables` | Table 2 (sortable, bound, ranks), Table 3 with recomputed Full, max against high effort (leaderboard), Figure 5 against Table 3, Figure 7 counts, every check. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **Two live tabs, no toy model.** A benchmark paper: the live ingredient is a trace replay (the agent row of papers.md), made exact by decoding Figures 6 and 8 from the vector SVGs, and translated into the task's own reward with the frozen constants from the released package. A second tab simulates the scoring rule itself, because the reward's zero point (the expert reference) is the fact that most changes how the headline reads.
- **No Then and now.** A September 2026 result; "What it takes to use this" covers adoption.
- **Released data used beyond the paper.** The task package (`task_catalog.json`, `tasks_index.json`, SCORING.md, all 85 `task.toml` timeouts, the a3 manifest) and the leaderboard's `bench.json` and `iter.json` are the authors' own; they expose the 30-task effort study, the E2EO selection rules and the reward constants. Each use is labelled on the page.
- **Reading tab is long (about 22 minutes against the old 5).** The old page was written without the full paper; this one owns its details and an evidence section that changes the reading of the headline number.

## Files

- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an em-dash or unexpanded macro.
- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`.
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper.txt`, `inputs/table_*.txt`, `inputs/anchors.txt`. `decode_figs.py` (with `svgparse.py`, from the InstructGPT page): Figures 6, 7 and 8 to `inputs/figs.json`.
- `inputs/`: `task_catalog.json`, `tasks_index.json`, `scoring.md`, `gh_readme.md`, `a3_task.toml`, `a3_manifest_extract.json` (fetched from the GitHub repository on 2026-10-03), `agent_timeouts.json` (from all 85 `task.toml` files), `lb_bench.json`, `lb_iter.json` (from faibench.org, generated 2026-08-15).
- `mk_tables.py`: `tables.json`. `recompute.py`: 44 checks and every derived number, to `inputs/recompute.json`.
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `mk_coverage.py` writes `coverage.json` (34 items, this paper's own, verified against the built page).
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, the replay stepped for every model.
- `viz_ideas.md`: ranked ideas, rows `P-phi_bench.<k>`.

## Checks (3 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems; `recompute.py` 44 of 44; `mk_coverage.py` 34 of 34.

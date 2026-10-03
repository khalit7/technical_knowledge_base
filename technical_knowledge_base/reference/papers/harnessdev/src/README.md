# HarnessDev: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3d45c17b0d0d81cd9883f783840e013f, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `html_utils/methods/papers.md`, starting from the Demystifying Agent Skills page's copy of the reference pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card, Problem, Idea (roles diagram), Method (seed against the six modules, both protocols), Results 1 to 4 (two predict-then-reveal questions: distance to the human references, the 64 switches), How much to believe, What it takes to use this, Why it matters, Connections. |
| Replay the evolution runs | `t-run` | The live ingredient: all nine Evolution lineages stepped version by version, held-out line hidden until asked for, a "your pick" game, the per-version numbers, and the two Creation trajectories (Appendices F, G). |
| The paper's tables and figures, rebuilt | `t-tables` | Tables 3 and 4 explorer, cost against score (Figure 9), Tables 5, 6 (printed against decoded), 7, and all 83 checks. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **No toy model or simulation.** A benchmark paper about agents; the live ingredient is a trace replay (the agent row of papers.md), made exact by decoding the per-version scores of all nine lineages from the vector Figures 7 and 8.
- **No Then and now.** A September 2026 result; "What it takes to use this" covers adoption.
- **No code link.** Nothing released; the card links the project page.
- **Reading tab is long (about 22 minutes against the old 6).** The old page was written from the abstract; this one owns the full paper, its appendices and an evidence section that changes the reading (the executor confound). The Creation trajectories were moved to the replay tab to shorten it.

## Files

- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an em-dash or unexpanded macro.
- `extract_paper.py`: arXiv HTML v1 to `inputs/`. `decode_figs.py` (with `svgparse.py`, copied from the InstructGPT page): Figures 7 and 8 to `inputs/figs.json`.
- `mk_tables.py`: `tables.json` (Tables 2 to 7, 9, and the decoded lineages, asserting the two figures agree).
- `recompute.py`: 83 checks and every derived number, to `inputs/recompute.json`.
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`. `mk_coverage.py` writes `coverage.json` (36 items, this paper's own, verified against the built page).
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, the replay stepped for every lineage and view.

## Checks (3 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems; `recompute.py` 83 of 83; `mk_coverage.py` 36 of 36.

# Re-grading six physics benchmarks: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3e25c17b0d0d8165b0c8d15600421259, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. The paper is arXiv 2609.13009 v1, "How Good Are Frontier Models at Physics? Expert Re-Grading Reveals Broken Evaluations and Near-Saturation of Leading Benchmarks". Built from `html_utils/methods/papers.md`, starting from the Phi-Bench page's copy of the reference pieces (`build.sh`, `mk_paper.py`, `11_js_ui.js`, `check_page.mjs`, the CSS).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with verdict; the question; six benchmarks in two groups; the audit (three labels, two protocols); case gallery (the paper's 11 worked cases); Results (Figure 1 rebuilt; predict: model errors among 250, revealing Figure 2 rebuilt; predict: PHYBench 140's score, revealing two graders run on the paper's cases; CritPt 44 repair; the Anthropic audit); the defect floor (interactive, presets from Table 2); Not only physics; How much to believe (predict: what a rejections-only audit cannot see); What it takes to use this; Why it matters; Connections. |
| Follow the audit | `t-run` | The live ingredient: every benchmark's questions as squares through the paper's pipeline (select, grade, audit run, labels, exclude or repair, re-grade), with the paper's counts; then a simulator of the protocol against the truth, with the three rates the paper never measured. |
| The paper's tables, rebuilt | `t-tables` | Table 1 (printed, change, counts; Wilson intervals), the by-construction check for GPT-5.6-Sol, removal against re-grading, Table 2 with the audit funnel and defect rates, Tables 3 and 4 with bounded Scott's pi, 27 checks. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **The live ingredient is the audit itself, not a toy model or a trace replay.** The paper is an evaluation audit with no released code, data or labels; what it does release is counts at every stage. The pipeline animation replays those counts exactly, and the simulator runs the paper's protocol on a benchmark built from its own rates, which is the only way to show the protocol's one-sided biases (unaudited acceptances, exclusions chosen by one model's failures) that drive the verdict.
- **No Then and now.** A September 2026 result; "What it takes to use this" covers adoption.
- **Outside data used:** Artificial Analysis's CritPt leaderboard (read 3 October 2026, `inputs/aa_critpt_20261003.json`) to confirm the pre-audit 32.29% = 113 of 350 and to show the top-ten cluster; the Anthropic system card's section 8.9 text (`inputs/anthropic_syscard_critpt.txt`; the 88.4% itself sits in an image); FutureHouse's HLE audit, labelled beyond the paper.
- **Reading tab is long (about 22 minutes against the old 3).** The old page was written from the abstract; this page owns the paper's details and an evidence section that changes how its headline numbers read.

## Files

- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`.
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper.txt`, `inputs/table_*.txt`, `inputs/anchors.txt`.
- `mk_tables.py`: `tables.json` (Tables 1 to 4 and the audit funnel from Appendix B's text).
- `recompute.py`: 27 checks and every derived number (integer counts behind Table 1, implied scores, removal-only bound, Wilson intervals, Scott's pi bounds by enumeration, Bowman and Dahl's power ratio, Artificial Analysis cross-check), to `inputs/recompute.json`.
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `mk_coverage.py` writes `coverage.json` (26 items, this paper's own, verified against the built page).
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, the pipeline animation stepped for every benchmark. `shot_parts.mjs`: screenshots of each visual for review.
- `viz_ideas.md`: ranked ideas, rows `P-re_grading_six_physics_benchmarks.<k>`.

## Checks (3 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems; `recompute.py` 27 of 27; `mk_coverage.py` 26 of 26.

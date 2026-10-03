# MOLE: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3db5c17b0d0d818b9680c7b91baaf7e9, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `html_utils/methods/papers.md`, starting from the Demystifying Agent Skills page's copy of the reference pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card, Problem, Idea (Figure 1 redrawn, the R@K/day definition), Setup (threat explorer from Tables 1 and 4 with Figure 6's row), What a monitor sees (two released completed-harm account-days at the three observability levels, plus the hidden prompt), RQ1 to RQ5 with three predict-then-reveal questions, How much to believe, What it takes to use this, Why it matters, Connections. |
| Run the daily audit | `t-run` | The live ingredient: the paper's robust z-score and peer-fit monitors run in the browser on the 15 released test days of the GPT-5.3 single-day corpus (2,106 account-days, 45 completed harms), animated day by day, with the review budget, the feature set and the monitor as controls, the R@K curve, the per-threat table against Figure 6, and every completed harm with its rank. |
| The paper's tables and figures, rebuilt | `t-tables` | Table 11 with Figure 3 decoded, Figure 4 with exact intervals, Table 12 and J.1 and Table 13, Figure 6 with the recomputed classical columns, Tables 19 to 21, Table 22 as a cost chart, Table 6, and every check. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **No toy model; the live ingredient is the paper's own benchmark data.** MOLE is a benchmark paper whose corpora are released, so the page runs the two classical monitors (Appendix F.2, F.3) on the real test days instead of a toy, and reproduces the printed numbers exactly. The LLM monitors cannot be rerun (their saved scores are not released), so they appear as printed reference marks.
- **A trace viewer instead of a trace replay animation.** The agent-paper row of papers.md suggests replaying an episode; here what matters is what the monitor is shown, so the Reading tab renders two released account-days the way the paper's renderer does, at each observability level. It is also where the 600-character clip that hides data-poisoning triggers became visible.
- **The before/after animation is the daily review queue**, z-score against peer-fit (organisation-wide against group-relative baselines), on the same 15 days and the same scale.
- **No Then and now** (a 2026 benchmark paper).
- **Reading tab is about 22 minutes** against the old page's 5: the paper page owns every detail, and the evidence section carries several findings from the released data (the elicitation preamble, the renderer clip, the held-out refit) that needed their own explanation.

## Files

- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`. `mk_coverage.py` writes `coverage.json` (32 items from `live.md`, all verified against the built page).
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `tables_v1.txt`, `anchors.txt`. `decode_figs.py`: figure values from the vector PDFs of the arXiv e-print (needs `uv run --with pymupdf`; the e-print is not kept), including Figure 3's bars from its rectangles.
- `mk_tables.py`: `tables.json` from the extracted tables, the decoded figures and two passages of the text.
- `compute_features.py`: the released audit events (Hugging Face `forgelab/mole`, not kept: 89 to 94 MB per corpus) rolled up into `inputs/features_<split>.json` (integer counts per account-day, plus labels, groups and cohorts from the repository's bootstrap files). Done for `gpt53_single_day` and `gpt53_multiday`.
- `monitors.py`: the robust z-score, peer-fit, R@K/day, budget-AUC and AUROC in plain Python. `mk_audit_data.py`: `parts/21_audit_data.js` (the 15 test days for the page, the fitted profiles, and Python's reference results that `check_page.mjs` compares the JavaScript against).
- `mk_example.py` (needs the transcripts parquet, 250 MB, not kept) writes `inputs/examples.json`; `mk_example_js.py` trims it into `parts/20_example.js` (em-dashes in verbatim text shown as `--`).
- `clip_check.py`: where the trigger strings sit in every completed data-poisoning account-day. `elicit_check.py`: the elicitation preamble in every harmful session, sessions per account-day, median calls.
- `recompute.py`: every derived number and check, to `inputs/recompute.json`, shown on the page.
- `check_page.mjs` (run from the repo root with node): the JavaScript monitors against Python (both monitors, K = 1 to 20, two feature subsets, exact), every control in both themes and widths, the animation stepped in both modes, 11 px text, NaN, errors, sideways scroll.
- `inputs/README.md`: where every input came from.

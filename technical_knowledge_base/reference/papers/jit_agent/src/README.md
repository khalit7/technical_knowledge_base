# JIT-Agent: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3cd5c17b0d0d81148227fbd67dc4b3ee, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `html_utils/methods/papers.md`, starting from the HarnessDev page's copy of the reference pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card, Problem, Idea (the four-module protocol, a ReAct against Turnstile protocol-turn animation, the seed bank), Training (three stages, Evo-GDPO, predict question on the gate), Inference, Results 1 to 5 (two predict questions: harnessed V4-Flash against GPT-5.6, best score in how many of six settings; Figure 4 and Figure 6 decoded), How much to believe, What it takes to use this, Why it matters, Connections. |
| Score a group of harnesses | `t-run` | The live ingredient: Evo-GDPO's Eq. 6 and 7 on a group, animated against GRPO-style mixing, with the bank rule and Stage I's Eq. 4 pair rule; the released training harnesses counted and browsable. |
| The paper's tables and figures, rebuilt | `t-tables` | Tables 2, 3, 4, Figure 4 and all nine Figure 6 panels, the noise and granularity checks, the training-against-test checks, all 68 checks. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **Live ingredient is an update rule, not a trace replay.** papers.md suggests a trace replay for agent papers, but neither the paper nor the release publishes a single trace or run output. What is new and checkable in the paper is Stage III's reward arithmetic (Eq. 6, 7) and the bank rule, so the tab runs those (the training-recipe row of papers.md), on Table 3's real numbers as one preset. The protocol-turn animation in Reading is labelled illustrative.
- **Two arXiv versions.** v2 (3 September) is linked by default; an `ax1:` macro links v1 where v2 removed text (the Position box, Future Work, v1's training-source list that included DeepPlanning). `build.sh` fails on any anchor that is not in `inputs/anchors_v1.txt` or `anchors_v2.txt`.
- **Release audited, not just the paper.** Code, weights and 2,852 training harnesses are public, so the page measures them (`overlap.py`, `harness_stats.py`); this produced the main correction (training harnesses built on the DeepPlanning test cases' own databases).
- **No Then and now.** A 2026 result; "What it takes to use this" covers adoption.
- **Reading tab is long (about 26 minutes against the old 5).** The old page was a summary of v1's abstract and results; this one owns the full paper, both versions, the release audit and an evidence section that changes the reading. The Position box is folded into a details block; the generated-harness gallery is a table.

## Files

- `save_live.py`: copied the Notion fetch verbatim from the agent transcript into `live.md`.
- `extract_paper.py`: arXiv HTML v1 and v2 to `inputs/paper_v*.txt`, `tables_v*.txt`, `anchors_v*.txt`.
- `decode_figs.py`: Figures 4 and 6 from the vector PDFs in the v2 e-print to `inputs/figs.json` (`uv run --with pymupdf`).
- `mk_tables.py`: `tables.json` (Tables 1 to 4, Figures 4 and 6), asserting v1 and v2 tables are identical.
- `recompute.py`: 68 checks (47 printed numbers, all reproduce), noise, granularity, Figure 6 summaries, to `inputs/recompute.json`.
- `overlap.py`: training harnesses against the test sets (HF dataset, 102 MB, not kept; repo `dataset/`), to `inputs/overlap.json`.
- `harness_stats.py`: counts and a 12-harness gallery from the training harnesses, to `inputs/harness_stats.json` (keyword rules stated in the file).
- `fetch_release.sh`: verbatim extracts of the READMEs, model card and dataset card to `inputs/release_extracts.txt`.
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `mk_coverage.py` writes `coverage.json` (42 items, this paper's own, verified against the built page).
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, both animations stepped for every preset and mode.

## Checks (3 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems; `recompute.py` 47 of 47 printed numbers; `mk_coverage.py` 42 of 42.

# Agora: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3e25c17b0d0d81399738c3e65f4bf900, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from `html_utils/methods/papers.md` with the reference folder's pieces (`build.sh`, `mk_paper.py`, `10_js_common.js`, `11_js_ui.js`, `90_js_tabs.js`, the CSS, `check_page.mjs`, `save_live.py`, `extract_paper.py`).

The page follows arXiv v4 (30 September 2026). The Notion text (`live.md`, fetched as of 21 September) was written from an earlier version.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with verdict, Problem, the commit graph (Eq. 1), evidence score (Eq. 2), the frontier (analyze, clusters, Eq. 3) with a calculator on an illustrative graph, the run (Figure 2 decoded), the winning recipe (Stage B band map), Results (Table 4 as a step animation), Coordination dynamics, What the humans did, Why it matters, How much to believe, What it takes to use this, Connections. Four predict-then-reveal questions. |
| Rebuild the winning prior | `t-run` | The live ingredient: Stage A of the agents' recipe rebuilt on CPU with GPT-2 small and measured in bits per byte on 200 FineWeb-Edu texts; a ladder beside Table 4, a rank explorer, a token replay through four models, and the noise of a 200-text evaluator. |
| The run's numbers, rebuilt | `t-tables` | Table 4 (with v1 differences), Figure 2 as a table, the version-change list, Tables 1, 2, 3, 5, and every check from `recompute.py`. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **The live ingredient is the method the agents found, not the platform.** papers.md suggests a trace replay for agent papers, but no trace, graph or code is released and an illustrative replay of the community would only show what we put into it. The one claim that can be checked independently is the run's headline number, so `stage_a.py` rebuilds the recipe's first stage from Algorithm 1 and Table 5 and measures it with the paper's metric. The one-context rank-671 factorisation lands on Table 4's 2.1284 independently.
- **The platform's mechanism is a calculator on an illustrative graph** (Reading tab), with every formula and constant from §3 and the graph labelled as made up.
- **The before/after animation is Table 4 in two views** (the whole descent, and the last 0.03 against the cross-hardware noise band), since there is no "old method" to animate against; the token replay in the Rebuild tab runs one passage through four models.
- **No Then and now** (a September 2026 paper).
- **A version-change list** in the tables tab: four arXiv versions in two weeks changed several headline numbers, and the project website still carries version 1's.
- **Reading tab is about 27 minutes, plus 3 in four expandable details blocks** (the publication paths, the launcher and brief, Stage B with its band map, the negative results), against the old page's 5: the page owns every detail of the paper, and v4's account of the human interventions and the evidence section needed room. `build.sh` counts the details blocks separately and the breadcrumb shows both.

## Files

- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`. `mk_coverage.py` writes `coverage.json` (every fact of `live.md`, verified against the built page).
- `extract_paper.py`: arXiv HTML to `inputs/paper_v<n>.txt`, `tables_v4.txt`, `anchors.txt`. `diff_versions.py`: `inputs/version_diffs.txt`. `decode_fig2.py`: Figure 2 from the e-print's vector PDF (`uv run --with pymupdf`).
- `fetch_data.py`: the 200 FineWeb-Edu texts (to `$AGORA_DATA`, default `~/.cache/agora_toy`, not kept).
- `stage_a.py` (`OMP_NUM_THREADS=3 uv run --with torch --with transformers python stage_a.py`): builds the 50,257 × 50,257 tables for one and 28 contexts (10 GB each, in `$AGORA_DATA`, not kept), the randomized SVDs, and every rank's bits per byte; writes `model/stage_a.json` and `model/stage_a.log`.
- `stage_a_demo.py`: per-text bits for eight models, the bootstrap over texts, and the replay passage; writes `model/noise.json` and `model/demo.json` (shipped in the page by `build.sh`).
- `paper.json`, `tables.json`: card, further reading and the transcribed tables. `recompute.py`: every derived number and check, to `inputs/recompute.json`; `build.sh` fills `@@R:path:digits@@` placeholders in the prose from it, so the text cannot drift from the scripts.
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, the frontier nodes, both animations stepped, 11 px text, NaN, errors, sideways scroll.

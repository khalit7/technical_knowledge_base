# Schrödinger's Code Repository (SchrodingerRepo): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3e95c17b0d0d81e8b0e0e99acbeb9713, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `html_utils/methods/papers.md`, starting from the MOLE page's copy of the reference pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card; a provenance box (the old "6 to 14 points" is the paper's own 6.0 to 14.4); Problem with Figure 1 redrawn and judged; Idea with the command-flow diagram; the four levels with a panel applying Figure 4's renamings to the real issue; what the released code does differently; Setup; RQ1 (Table I chart with intervals, predict question), RQ2 (Figure 3, predict question), RQ3 (the 0.75 that is 0.55), RQ4 (predict question revealing a live power calculator); the case study as a before/after animation (familiar against renamed view); How much to believe; What it takes to use this; Why it matters; Connections. |
| Transform a repository | `t-run` | The live ingredient: the released Level 2 (tokenise, seeded token mapping, case-preserving rebuild, whole-word replacement) and Level 3 (definition-time dependency graph, random topological order) ported to JavaScript with CPython's Mersenne Twister, run on the real Django code of the case study; a step animation for each level, a seed slider, a Figure 4 preset, a search box comparing both views, the full renaming table, and what Levels 1 and 4 would do. |
| The paper's tables and figures, rebuilt | `t-tables` | Table I printed or recomputed, the interval and McNemar table, every printed change recomputed (108, two wrong), Tables II and III, Figures 1 and 3 as tables. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **The live ingredient is the paper's own transformation code, not a trace replay or a toy.** papers.md suggests a trace replay for agent papers, but no trajectory is released and the paper's contribution is the instrument, so the page runs the instrument: the released Level 2 and Level 3 code, ported line by line, on the real repository of the case study, checked against copies of the released Python for ten seeds. The candidate words are the only illustrative input (the released lexicon is LLM-generated and unpublished); the Figure 4 preset reproduces the renamings the paper prints, including its `Character_unitField` quirk.
- **The before/after animation is the case study**, the same issue walked in the familiar and the renamed view, drawn from Figure 4 and §V-E; the paper gives only the action totals (37 and 217), so the animation does not invent per-step counts.
- **A power calculator instead of a resampling of results**: no per-instance results are released, so the page quantifies what the printed counts allow (unpaired intervals, McNemar limits, RQ4's power).
- **No Then and now** (a 2026 evaluation paper).
- **Reading tab about 20 minutes** against the old page's 5: the page owns every detail of the paper, and the code-versus-text findings and the RQ4 power argument needed their own space.

## Files

- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`. `mk_coverage.py` writes `coverage.json` (22 items from `live.md`, all verified against the built page; four corrections listed).
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `tables_v1.txt`, `anchors.txt`. `mk_tables.py`: `tables.json` (Tables I to III parsed from the extraction, Figures 1 and 3 from printed labels). `recompute.py`: every printed change recomputed, Pass@1 granularity, unpaired intervals and McNemar limits, RQ4 power, Figure 1 and 3 shares, ratios; writes `inputs/recompute.json`.
- `schro_ref.py`: verbatim copies of the released `tokenize_identifier`, `create_token_mapping`, `reconstruct_identifier`, `_build_run_specs` and `_random_topological_order` (one stated change: integer seeds for the retries instead of string seeds hashed with SHA-512). `extract_targets.py`: runs the released extractor on a Django checkout (`uv run --with rich python extract_targets.py <Schrodinger-Repo> <django>`). `mk_excerpt.py`: `inputs/excerpt.json`. `mk_repo_data.py`: `parts/20_repo_data.js` (excerpt, targets, lexicon, Level 3 specs, Python reference results for seeds 1 to 10).
- `parts/21_js_port.js`: the JavaScript port (PyRandom, SR). `check_page.mjs` (from the repo root with node): the port against the Python reference (mappings, both orders, texts, Figure 4 preset), every control in both themes and widths, both animations stepped in both modes, 11 px text, NaN, errors, sideways scroll.
- `viz_ideas.md`: visualisations chosen and rejected, with scores.

## Checks (3 October 2026)

`sh html_utils/checkpage.sh <folder>`: see the latest run in the builder's report (fail=0, emdash 0, errbox 1, clipped 0). `node .../src/check_page.mjs`: 0 problems, JS port identical to the released Python for seeds 1 to 10. `mk_coverage.py`: 22 of 22.

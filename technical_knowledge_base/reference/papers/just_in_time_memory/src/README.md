# src: Just-in-Time Memory: Learning to Curate Task-Adaptive Memory for LLM Agents (arXiv 2609.27334)

`sh build.sh` writes `../index.html` (it runs `mk_tables.py`, `recompute.py`, `stream_sim.py` if `inputs/stream.json` is missing, and `mk_paper.py` first; `%%S:...%%` and `%%R:...%%` in the parts are filled from `inputs/stream.json` and `inputs/recompute.json`). Then:
- `python3 check_sim.py` (needs node): runs `parts/20_js_stream.js` against `stream_sim.py` on 5 seeds and success rates; orderings, retrievals and every statistic identical; writes `inputs/check_sim.json`.
- `python3 mk_coverage.py`: `coverage.json`, every fact of `live.md` checked against the built page (25 of 25).
- `node src/check_page.mjs [shots dir]` from the repo root: every control in both themes and widths (Chrome launched with `headless: 'shell'`).
- `sh fetch_inputs.sh` regenerates `inputs/` from public sources (arXiv HTML and e-print, SkillOS's arXiv HTML, the ALFWorld release zip); `decode_figs.py` needs `uv run --with pymupdf`.

| File | What |
|---|---|
| `live.md` | the Notion row page as fetched on 2026-10-03 (Notion's own timestamp 2026-09-28); written from the fetch result, see the note below |
| `paper.json` | headline card, verdict, resources, KB links |
| `mk_tables.py` | Tables 1, 2 and 9 parsed from the LaTeX in the e-print (`inputs/tex/`), Tables 3 to 8 typed and checked against `inputs/tables_v1.txt`; marks every baseline cell that matches SkillOS's published tables (`inputs/skillos_tables.txt`) |
| `recompute.py` | the 63 derived numbers printed in the paper (62 reproduce), standard errors of the gaps, the gain decomposition, the 17 untrained comparisons, validation-set sizes from the decoded curves, training budget |
| `stream_sim.py`, `parts/20_js_stream.js` | the paper's test-time memory protocol (empty bank, batches of 10, BM25 top 3 over task descriptions) on the 140 real ALFWorld valid_seen goals (`inputs/alfworld_valid_seen.json`) |
| `decode_figs.py` | the validation curves of Figures 5 and 6 from the vector PDFs (`inputs/fig_curves.json`) |
| `inputs/paper_v1.txt`, `tables_v1.txt`, `anchors_v1.txt` | the arXiv HTML as text (`extract_paper.py`), v1 is the only version |

## Shape, and departures from html_utils/methods/papers.md

- **Live ingredient: a replay of the paper's memory traffic, not a trace replay.** papers.md suggests a trace replay for agent papers, but no traces, code or curator are released. The part of JitMem that has no LLM in it, which trajectory each task retrieves and when, is exactly what the paper's credit-assignment argument is about, and it can be run on the real ALFWorld test goals with the paper's own protocol. Only task success is a coin (labelled). The replay measures what the paper only asserts: a stored trajectory is first used about 20 tasks later, a quarter are never used, a used one feeds about 5 tasks of about 2 types.
- **The Idea animation is the paper's own example (Figure 3)** run through both designs; its trajectory steps and the write-time artifact are illustrative and labelled.
- **No "Then and now"**: a 2026 result paper.
- **The Reading tab is long (about 17 minutes against the old page's 6)**, because the old summary's central claim ("an untrained curator already wins, so the gain is the timing") does not hold for the headline cells, and showing why takes the decomposition, the 17-cell comparison and the provenance of the baselines.
- **`live.md` was written with the Write tool from the fetch result in context**, not with `save_live.py`: the permission system blocked reading the session transcript. The content is the fetch result's text field, verbatim.

# ReAct: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d816b9a24c28de8f08ea8, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from `html_utils/methods/papers.md` with the reference folder's shared pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card and verdict (from `paper.json`), then Problem, Idea (the A ∪ L equation and the Figure 1 replay with four methods), the knowledge-task setup, their results (Table 1 bars, Table 2 splits, predict question on ReAct against CoT), fine-tuning (Figure 3 rebuilt, predict question), decision-making (ALFWorld and WebShop, predict question on the worst ReAct prompt), How much of this to believe, Why it matters (beyond the paper), Connections. |
| Replay the traces | `t-run` | The live ingredient: six of the paper's episodes (Figure 1 both panels, Figure 4, Figure 5, Table 10, Appendix D.1), each under every method the paper ran on it, stepped turn by turn with a to-scale context bar, counters (thoughts, actions, observations, model and environment words, context size including the exemplars) and the harness line that runs. |
| The paper's tables and figures, rebuilt | `t-tables` | Table 1 with gaps, standard errors and z; the three-source conflict (Table 1, Table 5, the code README); Figure 2 rebuilt from its SVG paths with the figure-against-table check; Table 2 with the Appendix E.1 example for each mode and the arithmetic check; Figure 3 rebuilt; Table 3; Table 4. |
| Then and now | `t-then` | One step of the Apple Remote episode in six wire formats, 2022 prompt text to 2025 interleaved thinking and the harness loop, with what replaced each part of the recipe. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md, and why

- **Live ingredient: a trace replay, not a toy model.** ReAct is a prompting method on a closed 540B model, so there is nothing to train at toy scale that would test its claim. papers.md's "agent or method on top of a model" row fits: the paper's own published trajectories, replayed method against method. No new trajectories are generated or invented; observations are truncated where the paper truncates them.
- **No "What it takes to use this".** The method is now the default agent loop; "Then and now" covers what replaced each piece, and the Reading tab says so.
- **Figures rebuilt from vector paths.** Figures 2 and 3 print no numbers. The arXiv HTML ships them as SVG, so `recompute.py` reads the line vertices and bar tops and converts them with the figure's own gridlines and printed ticks (about 0.01 point). That is not reading curves by eye; it surfaced the FEVER CoT and CoT-SC discrepancies with Table 1.
- **Reading length.** 18 minutes against the old page's 10: the paper page owns the details (setup, every result) and adds the evidence section; the four properties of §2 and the decision-task setup were condensed to keep it there.

## Files

- `build.sh`: runs `recompute.py`, `mk_traces.py` and `mk_paper.py`, assembles `parts/` (each JS part in its own `<script>`, tab wiring last, `#jsErr` box first), expands the link macros (see the reference folder's README), fails on an unexpanded macro or an em-dash, fills in the reading time and resources total.
- `paper.json`, `tables.json` (Tables 1 to 5 and the README table, printed precision), `mk_paper.py` (as in the RAG folder: card with verdict, Further reading, data).
- `recompute.py`: Figures 2 and 3 from `inputs/fig*.svg`; figure against Table 1 checks; Table 2 sums and the count-consistency search; binomial standard errors (HotpotQA and FEVER with n = 500 labelled as an assumption); headline gaps; Table 3 row means; exemplar word counts from Appendix C. Writes `inputs/recompute.json`.
- `mk_traces.py`: writes `parts/20_traces.js`. Figures 1, 4 and 5 are images, so their text is transcribed in the script by hand (with the paper's highlights as markup); Table 10, Appendix D.1 and the Appendix E.1 examples are cut from `inputs/paper_v3.txt` by the script.
- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`. `extract_paper.py`: the arXiv HTML (v3, and v1 for comparison) to `inputs/paper_v*.txt` and `inputs/table_*.txt`.
- `inputs/`: paper text (v1 and v3; the experiment numbers are identical, v3 adds Appendix A.1 on GPT-3 and footnotes 2, 3 and 7), the three figure SVGs, `repo_README.md`, `repo_hotpotqa_loop.txt` and `repo_wikienv.txt` (the released code, MIT), `later_extracts.txt` (the lines quoted from later work), `recompute.json`.
- `check_page.mjs` (from the repo root with node): every control, both themes and widths, each replay episode and mode stepped end to end, text at least 11 px, no NaN, no sideways scroll; mid-animation screenshots to `../.shots/x-*.png`.
- `mk_coverage.py`: writes `coverage.json` (every fact of `live.md` and where the HTML carries it) and verifies each against the built page.

## Checks (3 October 2026)

`sh html_utils/checkpage.sh <folder>`: fail=0, emdash 0, errbox 1, clipped 0, 5 tabs, about 167 KB. `node src/check_page.mjs`: 880 actions, 0 problems. `mk_coverage.py`: 59 of 59 items verified.

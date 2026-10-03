# Demystifying Agent Skills: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81249a3cf5fda4de5d92, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `html_utils/methods/papers.md`, starting from the ReAct page's copy of the reference pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card (from `paper.json`), Problem, Idea (the A.3 replay animation, the skill-creator prompt with its no-hint diff), Method, Results 1 to 4 (three predict-then-reveal questions, Table 1 differences in six panels, failure modes, outcome labels, transfer, retrieval), How much to believe (with the design-effect slider), What it takes to use this, Why it matters, Connections. |
| Replay the paired run | `t-run` | The live ingredient: Appendix A.3's three excerpts verbatim, and a checkout scheduler on the task's real service latencies with both verifier tests. |
| The paper's tables and figures, rebuilt | `t-tables` | Table 1 and 16 explorer, Figure 2 decoded, retrieval explorer (Tables 4, 14, 15) with the "opens every skill" overlay, Tables 9, 10, 12, 13 and Figure 4, every number checked. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **No toy model.** The paper measures agent behaviour on public benchmarks; there is no mechanism to train. The live ingredient is a trace replay (the agent row of papers.md), made exact by fetching the public SkillsBench task the paper's example comes from.
- **No code link.** The paper released none; the card says so and links the replayed task instead (`mk_paper.py` takes a `link_label`).
- **No Then and now.** A 2026 result paper; "What it takes to use this" covers adoption.
- **The evidence section leans on numbers derived from the paper's own tables** (trial counts from printed rates, triple counts against task counts, Figure 2 decoded to counts). Each is labelled derived on the page and in `recompute.py`.

## Files

- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_example.py`, `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an em-dash or unexpanded macro.
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `tables_v1.txt`, `anchors.txt`.
- `decode_figs.py`: Figures 2 and 4 from the vector PDFs of the arXiv e-print (needs `uv run --with pymupdf`; the e-print is not kept).
- `mk_tables.py`: `tables.json` from the extracted tables and decoded figures (printed strings kept).
- `recompute.py`: every derived number and check, written to `inputs/recompute.json` and shown in the checks table.
- `mk_example.py`: Appendix A.3 and B.1/B.2 verbatim into `parts/20_example.js` (braces escaped for the build).
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`. `mk_coverage.py` writes `coverage.json` (70 items from `live.md`, verified against the built page).
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, the replay stepped in all three arms, 11 px text, NaN, errors, sideways scroll.
- `inputs/README.md`: where every input came from.

## Checks (3 October 2026)

See the reply in the build log: `checkpage.sh` fail=0, `check_page.mjs` 0 problems, `mk_coverage.py` 70 of 70.

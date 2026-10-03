# src: Remember When It Matters: Proactive Memory Agent for Long-Horizon Agents (arXiv 2607.08716)

`sh build.sh` writes `../index.html` (it runs `mk_traces.py`, `recompute.py` and `mk_paper.py` first). Then:
- `python3 mk_coverage.py`: `coverage.json`, every fact of `live.md` checked against the built page.
- `node src/check_page.mjs [shots dir]` from the repo root: every control in both themes and widths, both animations stepped.
- `python3 parse_traces.py <examples dir>` re-parses the five released example traces into `inputs/traces.json` (download commands in its docstring; the HTML exports are not kept, three are over 1 MB).

| File | What |
|---|---|
| `live.md` | the Notion row page as fetched (saved by `save_live.py` from the session transcript) |
| `paper.json` | headline card, verdict, resources, KB links |
| `tables.json` | Tables 1 to 4 transcribed at printed precision from `inputs/table_*.txt`, plus the Terminal-Bench paper's reference rows |
| `recompute.py` | task counts behind every percentage, macro and micro averages, noise bounds (unpaired SE, exact McNemar), SETA implied sizes, trace totals, token and cost estimates; writes `inputs/recompute.json` |
| `parse_traces.py`, `mk_traces.py` | released traces to `inputs/traces.json`, then cut down to `parts/_gen_traces.js` for the Replay tab |
| `inputs/injection_labels.json` | this page's reading of each of the 52 reminders (recall, diagnose, check); a judgement, shown beside each reminder |
| `inputs/paper_v1.txt` | the arXiv HTML as text (`extract_paper.py`), the only arXiv version |
| `inputs/code/` | the released run configurations, `memory_agent.py` (prompts) and `trigger.py` |

## Shape, and departures from html_utils/methods/papers.md

- **Live ingredient: a trace replay** (the agent kind in papers.md), built from the five example runs the authors released (baseline and memory run of the same Terminal-Bench task). Nothing is simulated; memory-agent tokens and costs are estimates from character counts (3.76 characters per token, calibrated on the actor's first prompt in all ten runs) at list prices, and are labelled as such.
- **The Reading-tab animation** runs one real memory step (`sqlite-with-gcov`, trigger 4) through the full design and each Table 2 ablation; only the full design's content is real, the ablations' content is labelled illustrative.
- **No "Then and now"**: a 2026 result paper with no lineage yet.
- **The Reading tab is long (about 25 minutes against the old page's 3)**: the old summary was second-hand and missed the code, the traces, Table 2's run-to-run evidence and the cost question; the corrections need the evidence beside them.
- Em-dashes inside quoted trace text and prompts are replaced by commas (the page has none anywhere).

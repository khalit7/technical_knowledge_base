# Emergence World (Study 2): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3e25c17b0d0d818fbffbc9e2ceab824b, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from `html_utils/methods/papers.md` with the reference folder's pieces (`mk_paper.py` in the MOLE variant, `10_js_common.js`, `11_js_ui.js`, `90_js_tabs.js`, `05z_errbox.js.html`, the CSS, `check_page.mjs`, `save_live.py`, `extract_paper.py`, `mk_coverage.py` with this paper's own items).

The page follows arXiv v1 (15 September 2026), the only version on 3 October 2026. The Notion text (`live.md`, fetched as of 21 September) is fully covered (`coverage.json`, 30 of 30 items verified against the built page).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with the verdict; Problem; The world; Design (Figure 3 rebuilt from the records, the day-numbering fix, the stress events, scoring); Phishing (all three scorecards as one grid, predict 1 with the Gemini lanes); Misinformation (predict 2); Memory breach; Indicators (crime curves from the records against the printed totals, conformity mechanisms, predict 3 with the Table 13 slope chart); Language; Over time; Model or population; the Claude world (outreach step animation, Figure 18 rebuilt from the records); How much of this to believe; What it takes to use this; Why it matters; Connections. Reference detail sits in nine collapsed "details" blocks. |
| Replay the released logs | `t-run` | The live ingredient: any two of the seven exposed worlds replayed side by side through the phishing campaign or the memory breach, from the released tool-call records, with counters and the agents' own words; the classification rules; the recount of every testable number against the records. |
| The paper's tables, rebuilt | `t-tables` | One all-measures table (printed and recounted columns), Tables 13, 14, 15, 16, 17, 18 and 5, and every check from `recompute.py` (36 reproduce, 18 close, 17 do not, 7 where the paper disagrees with itself, 3 derived). |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **The live ingredient is a replay of released records, not a toy.** papers.md suggests a trace replay for agent papers; here the authors released every world's tool calls, so the page replays the real events, two worlds at a time, rather than an illustrative trace. Nothing about these models' behaviour could be learned from a toy society. The before/after is world against world under the same attack.
- **A recount section.** Because the records exist, every number they can test is recounted; this found the paper's two inconsistent theft counts (the records match §5.2.5), Grok's crimes (1,154 against 807), DeepSeek and Mistral/Qwen retrievals the scorecards count as non-engagement, an unreported eleventh agent in the OpenAI world, and Blackbox's 100 (not 140) breach calls.
- **Reading time.** The main path of The paper tab is about 26 minutes against the old page's 5, with about 15 more minutes in collapsed details blocks (the reading-time line in the header counts them separately; `build.sh` excludes `<details class="more">` from the main count). The paper is 7,500 lines with three events, five indicators, five longitudinal analyses and two case studies; the page owns all of them. If Khalid prefers shorter, the Language, Over time and Model sections can move to details as well.
- **No Then and now** (a September 2026 paper) and **no misinformation replay**: keyword rules could not tell a fact-check from a preservation plan in tool calls (see `viz_ideas.md`, P-emergence_world.11).
- **Quoted agents' em-dashes** in the shipped event snippets are replaced by hyphens (`mk_logs_js.py`), since the page carries no em-dashes.

## Files

- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`. `mk_coverage.py` writes `coverage.json`.
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `inputs/tables_v1.txt`, `inputs/anchors.txt` (the HTML itself is not kept).
- `mine_logs.py`: reads the Season 2 tool-call dataset from `$EW_DATA` (default `~/.cache/emergence_world`; download the eight zips from https://github.com/EmergenceAI/Emergence-World/tree/main/Season%202/tool_call_dataset and unzip there, about 175 MB zipped, 875 MB unzipped; not kept in the repo). Removes exact duplicate records, counts crimes, votes, breach searches, tool shares, the post_egress tally, and classifies the stress-event calls with the rules it prints; writes `model/logs.json` and `model/mine_log.txt`. Run it again only if the rules change; everything else reads `model/logs.json`.
- `mk_logs_js.py`: the part of `model/logs.json` the page ships (`parts/21_logs_data.js`, about 59 KB).
- `mk_tables.py`: the transcribed tables and the figure values printed in the text, to `tables.json`.
- `recompute.py`: every derived number and check, to `inputs/recompute.json`.
- `paper.json`: card, verdict, further reading.
- `check_page.mjs` (run from the repo root with node; launches Chrome with `headless: 'shell'`): every control in both themes and widths, both animations stepped, the replay for every world pair and both events, 11 px text, NaN, errors, sideways scroll.

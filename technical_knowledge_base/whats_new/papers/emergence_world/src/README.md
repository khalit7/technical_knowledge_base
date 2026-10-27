# Emergence World (Study 2): page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3e25c17b0d0d818fbffbc9e2ceab824b, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The row page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md` with the reference folder's pieces (`mk_paper.py` in the MOLE variant, `10_js_common.js`, `11_js_ui.js`, `90_js_tabs.js`, `05z_errbox.js.html`, the CSS, `check_page.mjs`, `save_live.py`, `extract_paper.py`, `mk_coverage.py` with this paper's own items).

The page follows arXiv v1 (15 September 2026), the only version on 3 October 2026. The Notion text (`live.md`, fetched as of 21 September) is fully covered (`coverage.json`, 30 of 30 items verified against the built page).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card with the verdict; the core sentence, hero figure (`15_js_hero.js`), You need and New terms; Problem; The world; Design (Figure 3 rebuilt from the records, the day-numbering fix, the stress events, scoring); Phishing (all three scorecards as one grid, predict 1 with the Gemini lanes); Misinformation (predict 2); Memory breach; Indicators (crime curves from the records against the printed totals, conformity mechanisms, predict 3 with the Table 13 slope chart); Language; Over time; Model or population; the Claude world (outreach step animation, Figure 18 rebuilt from the records); How much of this to believe; What it takes to use this; Why it matters; Connections. Reference detail sits in eleven collapsed "details" blocks. |
| Replay the released logs | `t-run` | The live ingredient: any two of the seven exposed worlds replayed side by side through the phishing campaign or the memory breach, from the released tool-call records, with counters and the agents' own words; the classification rules; the recount of every testable number against the records. |
| The paper's tables, rebuilt | `t-tables` | One all-measures table (printed and recounted columns), Tables 13, 14, 15, 16, 17, 18 and 5, and every check from `recompute.py` (36 reproduce, 18 close, 17 do not, 7 where the paper disagrees with itself, 3 derived). |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **The live ingredient is a replay of released records, not a toy.** papers.md suggests a trace replay for agent papers; here the authors released every world's tool calls, so the page replays the real events, two worlds at a time, rather than an illustrative trace. Nothing about these models' behaviour could be learned from a toy society. The before/after is world against world under the same attack.
- **A recount section.** Because the records exist, every number they can test is recounted; this found the paper's two inconsistent theft counts (the records match §5.2.5), Grok's crimes (1,154 against 807), DeepSeek and Mistral/Qwen retrievals the scorecards count as non-engagement, an unreported eleventh agent in the OpenAI world, and Blackbox's 100 (not 140) breach calls.
- **Reading time.** The main path of The paper tab is about 26 minutes against the old page's 5, with about 15 more minutes in collapsed details blocks (superseded 2026-10-25: the header now shows the minutes measured by `audit_pages.mjs`, from `reading.json`). The paper is 7,500 lines with three events, five indicators, five longitudinal analyses and two case studies; the page owns all of them. If Khalid prefers shorter, the Language, Over time and Model sections can move to details as well.
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

## Light pass to the teaching contract (2026-10-25)

- **Top**: the idea in one sentence (recognising an attack is not containing it); a static hero figure (`parts/15_js_hero.js`): six of Table 7's nine phishing criteria for the seven exposed worlds, split into noticed (P7, P5) and stopped (P1, P4, P6, P9), with each world's total out of nine; every world warned, none removed traces or kept watching. You need (Agent security, Multi-agent patterns); New terms (world, stress event, the three criteria sets, Agent World Indicators, reasoning-action mismatch).
- **Owned elsewhere, now linked** (what this paper did kept here): controls at the action boundary (Agent security, key "lethal trifecta") and the MAST taxonomy that "reasoning-action mismatch" comes from (Multi-agent patterns).
- **Moved into closed blocks**: provenance and corrections to the first summary; the Language section's coined terms, opacity judge and human parallels (a two-sentence summary stays in the core). No volatile follow-up news was on the page, so there is no dated block.
- **Never autoplays**: `makeAnim` (copied from the Phi-Bench page) waits on step 1 until the reader presses play or steps, also after a mode switch; both captions say so. `check_page.mjs` scrolls `ocx` and `rpx` into view and fails on any frame drawn before a click, clicks tabs through the DOM and opens every closed block. Tabs from the skill template (`99_js_tabs.js`, key `ew-tab`; `90_js_tabs.js` removed). Header: "Reading: 28 min, plus 16 in closed details." from `reading.json`.
- **Takeaway softened** (`paper.json` takeaway and takeaway_note, so the card, `live.md` and `mk_coverage.py`): run lengths as the paper reports them (4 to 21 days, not 16); "more than 850,000" calls and "nearly 50 billion" tokens; the 46 hours is one agent's retry after the campaign, not a detection-to-stop delay; "none was resilient" is now what the scorecards show; "model-level alignment proved not to be compositional" is now the authors' interpretation of single runs. The Notion property itself is Khalid's to change.
- **Length judgement**: Reading core 28 min before (6,346 words, 27.6 min) and 28 after (6,433, 28.0), plus 14 then 16 in closed details (3,328 then 3,735 words; `audit_pages.mjs`, 230 words a minute). The top added about 1.5 minutes; folding Language and the provenance note took out about as much. The rest is core: three stress events with their scorecards, five indicators, the Claude-world case and an evidence section that recounts the paper against its released records. Over time and Model or population could also fold if Khalid wants it shorter. Other tabs: Replay 8.5 to 8.6 min (caption), Tables 13.9 and Further reading 3.1 unchanged.
- **Ledger** (`ledger.json`, labelled by `label_ledger.py`): 397 units; core 250, depth 142, owned 2, volatile 0, fat 3 (old header line, the old "kept as written" card note, the old autoplay note); `ledger.py check` problems 0.
- **No real image**: the paper's subject is software agents in a simulated town; its own figures are CC BY-NC (the repository's licence) or of unstated licence, so the key results are redrawn from tables and records instead.
- Source extracts: eight author emails in `inputs/paper_v1.txt` replaced with "[email removed]"; em-dashes replaced with `--` in `inputs/paper_v1.txt`, `inputs/tables_v1.txt` and `model/logs.json` (JSON kept valid; quoted agents' em-dashes now reach the page as `--`); `extract_paper.py` and `mine_logs.py` now do this on extraction.

## Checks (25 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems (354 actions); `recompute.py` 36 reproduce, 18 close, 17 do not, 7 paper disagrees, 3 derived (unchanged); `mk_coverage.py` 30 of 30; `ledger.py check` problems 0.

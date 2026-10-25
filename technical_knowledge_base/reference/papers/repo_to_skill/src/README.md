# Repo-To-Skill: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3d45c17b0d0d818bacfeda8a40caddb2, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the Demystifying Agent Skills page's copy of the reference pieces (the closest paper: same subject, agent paper, no toy model).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card (from `paper.json`, with the softened Takeaway and a note on what changed), the core sentence, hero figure, You need and New terms, Problem, Idea (the vLLM and SGLang skill graphs drawn file by file to scale), Method (four-stage animation: task-agnostic huggingface_hub run against the task-oriented MLE-bench protocol), The library (memberships per area from the release), Results 1 to 4 (three predict-then-reveal questions), How much to believe, What it takes to use this, Why it matters, Connections. |
| Follow the router through the library | `t-run` | The live ingredient: the released Researcher session's 16 library reads replayed to scale (one square per 512 bytes) against two alternatives (every description up front; both graphs whole); a router walker over the real 20 areas, 178 families and 1,000 graphs; the FrontierCS graph with its 42 links. |
| The paper's tables, rebuilt | `t-tables` | Tables 1 (with per-run medal counts recovered from mean and SEM), 2 (sortable, with paired statistics), 3, 4, 6, and 42 checks of printed and derived numbers. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **No toy model, and no illustrative trace.** The paper is an agent and artefact paper; its mechanism is a library plus progressive disclosure, and both are public. The live ingredient therefore measures the release itself: a real exported session replayed with real file sizes (the "trace replay" row of papers.md, made exact), plus a walker over the real router. There is no without-skills trace for that session, so the before/after compares loading strategies on the same reads, which the files make exact, rather than inventing an unguided run.
- **No Then and now.** A September 2026 result paper; "What it takes to use this" covers adoption.
- **Reading tab is long (about 22 minutes against the old page's 6).** The paper has four separate benchmark protocols, a library and a release whose checks change the verdict (none of the results uses the library; MLE-bench's construction runs on the task). It was cut twice; the remaining length is mostly the evidence section and the four results. Khalid may prefer folding Results 2 to 4 into details blocks.
- **Code link is real.** Unlike the Demystifying page, the card links the release, and the page states what it does not contain (the 75 MLE-bench graphs).

## Light pass to the teaching contract (2026-10-25)

- **Top**: the idea in one sentence (DisCo distils a source or a task into a checked skill graph; the library is real, but the four gains come from skills built for each benchmark); a hero figure (`15_js_hero.js`: the four results as dumbbells, each row naming where its skills came from); You need (Claude Code for how skills load, Demystifying Agent Skills for why they help); New terms.
- **Owned elsewhere, now linked** (what this paper did kept here): progressive disclosure of skills (Claude Code; the paper's own names for the three layers stay), the statistics methods behind the intervals and the sign test (Eval statistics). MLE-bench's description stays here: the Agentic benchmarks page, which OWNERS.md names as its owner, does not carry it yet.
- **Moved into closed blocks**: how the library was built (selection, graph, verification, taxonomy), PaperBench gains as multiples, the FrontierCS leaderboard comparison, how the PassNet skill was built (Table 6 and the conv3d rule), and every correction to the old summary (gathered into one block under Why it matters). No follow-up news was found, so there is no dated block.
- **Never autoplays**: `makeAnim` waits on step 1 until the reader acts (also after a mode switch); `check_page.mjs` scrolls both animations (`mt`, `rp`) into view and fails on any frame drawn before a click, and opens every closed block. Tabs from the skill template (`99_js_tabs.js`, key `r2s-tab`, with `data-to` scrolling).
- **No real image**: the paper is CC BY-NC-SA 4.0, so its figures are not embedded; the hero is redrawn, and the page is about files, not a physical object.
- **Takeaway softened** (card, `paper.json`, `live.md`): the property credited the four gains to the library "at fixed compute" and placed the knowledge in "READMEs and issues". The new line says the gains came from skills built for each benchmark (no result uses the library), that the fixed budget excludes up to 24 GPU-hours of trials per MLE-bench competition, that FrontierCS used 1.8 times the tokens, that only MLE-bench has repeated runs, and that "verified" means structural and package-test checks.
- **Length judgement**: Reading core 22 min before (5,042 words) and 21 after (4,888), plus 3 in closed details (581 words; `audit_pages.mjs`, 230 words a minute; header from `reading.json`). The top added about 1.5 minutes and the moves took out a little more. The rest is core: four separate benchmark protocols, a released artefact whose audit changes the verdict, and the evidence section, which no other page carries. Other tabs unchanged (Follow the router 4, Tables 7, Further reading 3).
- **Ledger** (`ledger.json`, labelled by `label_ledger.py`): 264 units; core 246, depth 16, owned 1, fat 1; `ledger.py check` problems 0.
- **Source extracts**: three author emails in `inputs/paper_v1.txt` replaced with "[email removed]" (no em-dashes were present); `extract_paper.py` now redacts emails and replaces em-dashes on extraction.

## Files

- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_libdata.py`, `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an em-dash or unexpanded macro.
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `tables_v1.txt`, `anchors.txt`.
- `fetch_release.py`: the AREX-Skill release at commit `ac3fe1a` (GitHub API plus raw files, cached outside the repo) to the `inputs/release_*.json` extracts. Run it before `build.sh` only to refresh them.
- `mk_tables.py`: `tables.json` from the extracted tables (printed strings kept).
- `recompute.py`: every derived number and check, written to `inputs/recompute.json` and shown in the checks table. One check fails on purpose: the paper's 75.1% is 75.04%.
- `mk_libdata.py`: `parts/20_lib_data.js` (window.LIB, about 95 KB: the router tree, every graph's size, the session reads, the two graphs, the FrontierCS graph).
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER` (adds `takeaway_note` under the Takeaway).
- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`. `mk_coverage.py` writes `coverage.json` (40 items from `live.md`, verified against the built page).
- `check_page.mjs` (run from the repo root with node; uses `CHROME_PATH`): every control in both themes and widths, both animations stepped in every mode, the SVG nodes and bars clicked, 11 px text, NaN, errors, sideways scroll.
- `shoot.mjs`: element screenshots for review (not part of the build).
- `inputs/README.md`: where every input came from.

## Checks (3 October 2026; rerun 25 October 2026)

`checkpage.sh` fail=0, emdash 0, errbox 1, clipped 0; `check_page.mjs` 0 problems (304 actions); `mk_coverage.py` 40 of 40; `recompute.py` 42 checks, 41 reproduce plus the one deliberate rounding miss.

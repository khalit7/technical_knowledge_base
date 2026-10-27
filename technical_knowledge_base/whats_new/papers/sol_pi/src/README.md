# SoL-Pi: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3e25c17b0d0d81a0bb77f16cbc898bb5, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the Dream-RSI page's copy of the reference pieces (`build.sh`, `mk_paper.py`, `11_js_ui.js`, `10_js_common.js`, `check_page.mjs`, `mk_coverage.py` with its item list replaced by this paper's, the CSS).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card (softened takeaway, three headline numbers, verdict); the core sentence, hero figure (search funnel, where each mechanism acts in the agent loop, the full stack against Pi for both models), You need and New terms; Problem, Idea (loop diagram), The search (152 directions, families, orchestration, 535 environments, humans' role), the four mechanisms (predict question: cache writes), EdgeBench (cost against score, both models), Tokens vs dollars (predict question with the token and dollar decomposition at recovered Opus 5 prices; predict question on the hourly figure with the derivation table), Terminal-Bench 4, IMO 2026 and the swarm, each mechanism (Table 4 drawn inline as the add-one chart, Figure 6; Figure 7 in a closed block), Action Fusion's lineage (Figure 8), How much to believe, What it takes to use this, Why it matters, Connections. |
| Replay a session | `t-run` | The live ingredient: one illustrative session replayed under Pi and each mechanism with the released constants, as a step animation over plan steps (prompt size of every request, cache read against cache write, Pi's profile dashed for comparison, counters), a totals table beside the paper's measured changes, and an explorer of Online Context Compact's gate (the released `decideCompaction`, ported). |
| The paper's tables and figures, rebuilt | `t-tables` | Tables 1, 2, 4 (model toggle, printed values or change against Pi, sort), Table 3 and the swarm, Figures 6 and 7 from the PDF's printed labels, Figure 8, and all 45 checks of `recompute.py` with a filter. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **Live ingredient is a simulator of the mechanisms, not a trace replay.** papers.md suggests a trace replay for agent and harness papers, but no trajectories are released. The mechanisms themselves are released code with small, explicit rules, so the tab runs those rules (and the compaction gate, ported line for line and checked identical to the TypeScript on 50,000 random inputs by `check_occ.mjs`) on one generated session, labelled illustrative. It shows what each mechanism does to the per-request prompt and the cache, and one effect the paper does not discuss: with a 200K window, Pi's own emergency compaction already removes old large results, so ObservationPack or the reducer alone can save little or cost more.
- **Prices recovered from the table rather than looked up.** The Opus 5 dollar column fits $5 / $0.50 / $6.25 / $25 per million (input, cache read, cache write, output) with residuals under $3, so the simulator and the Reading tab's decomposition use those. The GPT-5.6 Sol column fits no fixed price list; the page says so and does not price GPT-5.6 Sol.
- **Figures from the PDF's printed labels.** The arXiv HTML has no images for Figures 5 to 8; `decode_figs.py` reads the printed bar and point labels from the PDF (no curve reading) and asserts their layout.
- **No Then and now.** A 2026 harness paper; "What it takes to use this" covers adoption.
- **Reading tab is long (about 24 minutes against the old 5).** The old page was an abstract-level summary; this one owns the method, the search, the four mechanisms with the code's constants and an evidence section that changes the reading (parity, held-out set, hourly derivation, Terminal-Bench 4).
- **Only arXiv v1 exists**, so one anchor set (`inputs/anchors_v1.txt`); `build.sh` fails on any anchor not in it.

## Light pass to the teaching contract (2026-10-26)

- **Top**: the idea in one sentence (an automated research loop pointed at the harness, selecting only cheaper changes within score tolerance, keeps four mechanisms: 44.7 to 49.0% fewer tokens, mostly re-read cache, about a third less cost than Pi, at 93.7 to 94.3% of its score, single runs); a static hero (`13_js_hero.js`): 152 directions to four survivors, where each mechanism acts in one turn of the agent loop, and the full stack as a share of Pi for tokens, cost and score on both models (from `tables.json`); You need (Building a harness, Context engineering, Harnesses for training and evaluation); New terms.
- **New inline visual**: the add-one chart in "Each mechanism" (`abSvg`, Table 4: token cut per mechanism, both models, with each score and its change against Pi). Visuals inline in the Reading tab: 1 before, 3 after (audit count), plus the two in predict reveals.
- **Owned elsewhere, now linked** (what this paper did kept here): the agent loop (Building a harness), prompt caching and compaction (Context engineering), self-improving harness search in general (Harnesses for training and evaluation). The Meta-Harness, RHSI and held-out-overfitting background stays here because the owner does not carry it yet.
- **Moved into closed blocks**: where the page came from; how the lineages were orchestrated; why only the Opus 5 dollars can be checked (the GPT-5.6 Sol price fit); the swarm's setup and checks; Figure 7 (the mechanisms combined); Action Fusion's four stages in full (one summary paragraph stays); ObservationPack's blog lineage; small blog-paper inconsistencies. The same-week Z.ai GLM-5.3 comparison moved to one dated block "Same week, beyond the paper". Deleted as fat: "Reproducing the search" (restated two evidence bullets), the old header line, the nav as a unit.
- **Never autoplays**: `makeAnim` waits on its first frame until the reader acts (also after a mode switch, in `11_js_ui.js` and the replay's own mode buttons in `16_js_run.js`); tabs from the skill template (`99_js_tabs.js`, key `sp-tab`, with `data-to` scrolling into closed blocks). `check_page.mjs` uses DOM clicks for tabs, fails on any frame drawn before a click, checks the hero and the add-one chart are drawn, and opens every closed block.
- **No real image**: nothing physical to show, and the paper's figures are redrawn or decoded from printed labels; the arXiv licence was not checked for reuse because a redraw serves better.
- **Takeaway softened** (card, `paper.json`, `live.md`): the old line said "at parity" (the score is 2.5 to 2.8 points below Pi, 93.7 to 94.3%), said the loops "discover" the techniques (humans set priors, filtered directions and refactored the code), called the fourth mechanism "delegated reading" (file reads bypass it; only long build and test logs go to a cheaper model), and gave the hourly saving without saying it is derived from two-hour tasks. The new line adds those, and Terminal-Bench 4's 15 against 18. The Notion property still carries the old line.
- **Source extracts**: no em-dashes or author emails in `inputs/`; the four `[dash]` markers in `inputs/extracts.txt` became `--`. `extract_paper.py` and `fetch_extracts.py` now replace em-dashes with `--` and emails with `[email removed]` on extraction.
- **Length judgement**: Reading core 24 min before (5,576 words) and 23 after (5,399), plus 3 in closed details (758 words, from 0; `audit_pages.mjs`, 230 words a minute; header from `reading.json`). The top added about 1.5 minutes; the moves into closed blocks took out about 3. What stays is core: the search as the paper runs it, the four mechanisms with the code's constants, the results on both models and the other tests, the token-against-dollar decomposition, the add-one evidence and an evidence section that changes the reading; no other page carries them. Other tabs unchanged (Replay 4 min, Tables 8, Further reading 3).
- **Ledger** (`ledger.json`, labelled by `label_ledger.py`): 277 units; core 248, depth 22, owned 3, volatile 1, fat 3; `ledger.py check` problems 0.

## Files

- `save_live.py`: copied the Notion fetch verbatim from the agent transcript into `live.md`.
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `tables_v1.txt`, `anchors_v1.txt`.
- `decode_figs.py`: printed labels of Figures 6, 7 and 8 from the PDF to `inputs/figs.json` (needs `uv run --with pymupdf` and the PDF in scratch space; the PDF is not kept).
- `fetch_extracts.py`: short verbatim extracts of the blog, the README, the EdgeBench README and a summary of the Z.ai post to `inputs/extracts.txt`.
- `inputs/economics.ts`: the released Online Context Compact gate (MIT), copied 3 October 2026, used by `check_occ.mjs`.
- `mk_tables.py`: `tables.json` (Tables 1 to 4, Table 3, swarm, figure labels), each number asserted against the extracted table text.
- `recompute.py`: 45 checks to `inputs/recompute.json` (38 reproduce, 1 within rounding, 2 do not, 4 added numbers; categories paper, blog, derived, added).
- `check_occ.mjs`: the page's port (`parts/14_js_occ.js`) against the original TypeScript, to `inputs/check_occ.json` (run by `build.sh`; needs Node 22 with `--experimental-strip-types`).
- `parts/15_js_sim.js`: the session simulator (plain JS, also loadable by Node).
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `mk_coverage.py` writes `coverage.json` (35 items, this paper's own, verified against the built page).
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, the animation stepped in every mode, text at least 11 px, nothing moving before a click, every closed block opened.
- `parts/13_js_hero.js`: the hero figure and the add-one chart (static). `reading.json`: the measured reading time for the header. `label_ledger.py`: labels `ledger.json`.

## Checks (3 October 2026; rerun 26 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems (1,010 actions; nothing moves before a click); `ledger.py check` problems 0; `check_occ.mjs` PASS (50,000 of 50,000 identical); `recompute.py` 38 reproduce, 1 within rounding, 2 do not; `mk_coverage.py` 35 of 35.

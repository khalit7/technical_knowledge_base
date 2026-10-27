# StateM: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81899098d8153e100691, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the HarnessDev page's copy of the reference pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Card with verdict; the core sentence, hero figure (`15_js_hero.js`), You need and New terms; Problem (Figure 1 rebuilt), Idea, Method (check-strength ladder; a before/after animation of configure-git-webserver with and without the checked `goto`), the evaluation, Results 1 to 4 (three predict-then-reveal questions: what review did to the Sol max comparator, BusinessBench held-out gain, how often gates fire), Figure 5 rebuilt with a review-outcome toggle, Where StateM intervenes, How much to believe, What it takes to use this, Why it matters, Connections. |
| Replay a real StateM run | `t-run` | The live ingredient: six real DeepSeek-V4-Flash + StateM trials from the authors' release, each StateM history stepped event by event on the runbook graph (refused transitions in red with the failing check's output); the audit of the release against §4.4; all 440 trials as a task grid with per-trial detail. |
| The paper's tables and the leaderboard, rebuilt | `t-tables` | Table 4 (sortable, gains like for like), the leaderboard submissions (raw against reviewed), Table 3 joined with the DeepSeek run, gate selection and the judge's flags, Tables 1 and 2 with the negative-transfer details, Table 5, the 38 checks, and the corrections to the earlier summary. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **Links go to PDF pages, not arXiv HTML anchors.** The arXiv HTML of this paper failed to convert; `build.sh` turns `ax:p13` into `#page=13` and the margin labels into page links.
- **The live ingredient is a replay of the authors' own released trials**, not an illustrative trace (the agent row of papers.md): the DeepSeek artifact has every StateM state, check and receipt, so the page replays real runs and audits all 440. The before/after animation in the Reading tab is labelled illustrative because no baseline trace exists.
- **Beyond the paper, the review of its leaderboard submission is part of the evidence.** The paper's headline is a raw, pre-adjudication score; the public PR thread (13 judge flags, the reviewer's report on task-shaped gate slots, closure unmerged on 2026-09-19) changes how far to trust it, so the page shows it, sourced.
- **No Then and now.** An August 2026 result; "What it takes to use this" covers adoption.
- **Reading tab about 19 minutes against the old 11.** It owns the full paper, the audit and the review thread; the DeepSeek audit, the BusinessBench negative-transfer details and the corrections moved to the other tabs to keep it there.

## Light pass to the teaching contract (2026-10-25)

- **Top**: the idea in one sentence; a hero figure (every before/after pair the paper reports as dumbbells on one scale, coloured by development set against held-out: the page's verdict in one picture); You need (Claude Code for hooks and stop conditions, Agentic benchmarks for harness spread); New terms.
- **Owned elsewhere, now linked** (what this paper did kept here): graph runtimes (LangChain and LangGraph), hooks and stop hooks (Claude Code), harness-driven score spread (Agentic benchmarks), binomial standard errors (Evaluation statistics).
- **Moved into closed blocks**: where the released code departs from the goto protocol, how costs are reported, the other three BusinessBench families, the 22-hour run and the discussion, the provenance gaps (agent versions, machines, unsourced comparators, unreleased runs) and the DeepSeek retries. The leaderboard review thread is summarised in one sentence in Result 1 (flags, task-shaped slots, closed unmerged, 92.36%) and told step by step in one dated block "Since the paper".
- **Never autoplays**: `makeAnim` waits on step 1 until the reader acts (also after a mode switch or a new replay); `check_page.mjs` scrolls both animations into view and fails on any frame drawn before a click, and opens every closed block. Tabs from the skill template (`99_js_tabs.js`, key `statem-tab`).
- **Takeaway softened** (card, `paper.json`, `live.md`): "lets DeepSeek-V4-Flash match the GPT frontier score at about 1/38 the evaluation cost" overclaimed: 88.8% needs one task's extended-timeout trials (88.09% at standard timeouts), the GPT-5.6 Sol max 88.8% is unsourced, and the $574.68 comes from a different submission (83.37% raw, 76.18% reviewed). The new line also says the Terminal-Bench numbers are on the development tasks, the 95.3% was never adjudicated, and the held-out gain was 0.55 to 1.34 points.
- **Length judgement**: Reading core 19 min before (4,366 words) and 19 after (4,380), plus 2 in closed details (`audit_pages.mjs`, 230 words a minute; header from `reading.json`). The top added about 1.5 minutes, the moves took out as much. The rest is core: the page's value is the evidence audit (development-set scores, task-shaped gates, the review) beside the method, which no other page carries. Other tabs unchanged (Replay 5 plus 0.3 closed, Tables 10 plus 2, Further reading 3).
- **Ledger** (`ledger.json`, labelled by `label_ledger.py`): 236 units; core 216, depth 11, owned 4, volatile 4, fat 1; `ledger.py check` problems 0.
- Source extracts: em-dashes in `inputs/paper_v1.txt` replaced with `--`; `extract_paper.py` now does that and redacts emails on extraction (none were found).

## Files

- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_paper.py`, writes `parts/_gen_trials.js` from `inputs/deepseek_trials.json`, assembles `parts/`, expands the link macros, fails on an em-dash or unexpanded macro.
- `extract_paper.py`: PDF to `inputs/paper_v1.txt` and `inputs/pages.txt`. `fetch_leaderboard.py`: leaderboard PRs to `inputs/tb21_leaderboard.json`. `audit_artifact.py`: the released DeepSeek trials to `inputs/deepseek_trials.json`.
- `mk_tables.py`: `tables.json` (Tables 1 to 5 transcribed from the LaTeX, plus the leaderboard extract).
- `recompute.py`: 38 checks and every derived number, to `inputs/recompute.json`.
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER` (adapted for PDF page links).
- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`. `mk_coverage.py` writes `coverage.json` (57 items, this paper's own, verified against the built page).
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, both animations stepped in every mode and every replay, the trial grid and its replay links.

## Checks (3 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems; `recompute.py` 38 of 38; `mk_coverage.py` 57 of 57.

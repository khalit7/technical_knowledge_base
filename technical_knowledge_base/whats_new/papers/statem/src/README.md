# StateM: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3c65c17b0d0d81899098d8153e100691, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the HarnessDev page's copy of the reference pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | (split layout and the checked-goto 3D stage since 2026-11-13, below) Card with verdict; the core sentence, hero figure (`15_js_hero.js`), You need and New terms; Problem (Figure 1 rebuilt), Idea, Method (check-strength ladder; the checked `goto` on configure-git-webserver as a 3D stage, soft plan against StateM), the evaluation, Results 1 to 4 (three predict-then-reveal questions: what review did to the Sol max comparator, BusinessBench held-out gain, how often gates fire), Figure 5 rebuilt with a review-outcome toggle, Where StateM intervenes, How much to believe, What it takes to use this, Why it matters, Connections. |
| Replay a real StateM run | `t-run` | The live ingredient: six real DeepSeek-V4-Flash + StateM trials from the authors' release, each StateM history stepped event by event on the runbook graph (a 3D stage with a generated step list since 2026-11-13) (refused transitions in red with the failing check's output); the audit of the release against §4.4; all 440 trials as a task grid with per-trial detail. |
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
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, both 3D stages stepped in every mode and every replay (since 2026-11-13 it asserts that each stage plays once scrolled into view; it used to forbid any autoplay), the trial grid and its replay links.
- `check_stages.mjs` (2026-11-13, from the repo root): the layout and motion rules at 1400, 920 and 390 px, reduced motion, both stage step lists of the gw stage and the generated list of every replay (at most 12 steps), the gw list's counters against `window.SMGW`, and every replay's committed and refused gotos against the 440-trial audit rows (`window.SMRP`, `window.TRIALS.rows`).
- `parts/31_js_sc_gw.js`, `parts/32_js_sc_rp.js` (2026-11-13): the two 3D scenes on the template renderer `parts/25_js_s3.js`.

## Checks (3 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems; `recompute.py` 38 of 38; `mk_coverage.py` 57 of 57.

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged, after `01_css.html`). The paper: the core sentence, You need and New terms beside the hero dumbbells; Problem beside the rebuilt Figure 1; Method's runbook and check kinds beside the check-strength ladder; a new subsection "The checked goto, on the paper's worked example" (`#s-goto`: the six-step protocol, the configure-git-webserver example, the harness toggle and two step lists) beside the gw stage; Result 3 beside the rebuilt Figure 5. Idea, the evaluation, Results 1, 2, 4 and 5 (their charts sit inside predict reveals in the left column), per-run state and failure-driven optimisation (now `#s-meth2`), How much to believe, Use it, Why it matters and Connections stay full width. Replay tab: the intro, run picker, outcome line, prompt and the generated step list left, the replay stage right; the audit card and the 440-run grid full width (a tool and a table). Tables tab: the leaderboard paragraph beside its raw/after-review chart, the table under it; every other table full width. Further reading unchanged. Section anchors kept (`s-meth` still holds Method's heading; `rp` is now the replay section).
- **Two 3D stages** (template `25_js_s3.js`, renderer v2, unchanged):
  - `31_js_sc_gw.js` (`#stg-gw`, Method): the checked goto on configure-git-webserver, eight steps with StateM and six with a soft plan (lists `sx-gw-sm`, `sx-gw-soft`, swapped by the toggle with `S3.stage(...).list`). The runbook's three states as platforms, the exit gate as a glass plate across the edge to handoff (grey, red when it refuses, green when it passes), the five services as blocks (dashed until built, green up, red and low when down), the context as a stack (plan at the bottom, execution output on top, StateM's in_hook anchor last), the verifier at the side; flows for the agent's build, test and tidy, the gate's host check (clone, push, curl) and the verifier. The camera moves in on the gate and nginx for the refusal and the repair. Illustrative, exactly the data of the 2D animation it replaces (`window.SMGW`); its captions became the step lists and its counters went into their text.
  - `32_js_sc_rp.js` (`#stg-rp`, Replay tab): a real released run on the runbook graph: eight states as platforms, the agent as a ball, committed gotos as green edges with flowing dots, every refused goto as a red glass plate across its edge (×n when repeated), the clock and counters, the verifier's answer at the last step; the camera moves in on each refused edge. One step per recorded event, the start and the first in_hook merged, so the six runs have 1 to 12 steps (the long-replay limit). The step list `sx-rp` is generated from the events (title, explanation, every check's trimmed output) and swapped on a run change. Replaces the 2D replay (`makeAnim` `rp`), its caption box and its scrolling event list; the grid's replay links load a run on the stage.
- **Kept 2D**: the hero (before/after numbers on one axis), Figure 1 (a 2D design space by definition), the check ladder (an ordering), Figure 5 (a log-scale scatter), the predict reveals (bars), the leaderboard bars and every table, and the 440-run grid (a browsing tool; its message is a count, not a shape: `viz_ideas.md` P-statem.15).
- `makeAnim` is gone from `11_js_ui.js` (no 2D step animation is left). `99_js_tabs.js` and `05z_errbox.js.html` recopied from the templates (storage key `statem-tab`); one page-specific line kept in `99_js_tabs.js`: a `data-to` link opens its target if it is a closed block, or the closed block that follows it.
- `build.sh` finds the repo root by walking up to `html_utils` (no git).
- Ledger: three units added for the stages; unit 167 ("the list scrolls with the replay") is now fat (the stage's list marks the current step instead); units 42, 165 and 166 re-keyed by hand (`label_ledger.py` `KEYS`), and the Further reading units 203, 205 and 208 to 213 re-keyed so no key carries a reading time. 239 units: core 218, depth 11, owned 4, volatile 4, fat 2; `ledger.py check` problems 0. `mk_coverage.py` 57 of 57; `recompute.py` 38 of 38.

## Length judgement (2026-11-13)
| | Before (audit, pre-pass) | After |
|---|---|---|
| The paper, core | 19.0 min (4,380 words) | 21.5 min (4,955) |
| The paper, closed | 1.8 min (422) | 1.8 min (422) |
| Replay tab | 4.6 min (1,048, first run's script-drawn text not counted before) | 5.9 min (1,352, including the first run's generated step list) |
| Tables; Further reading | 9.6 plus 2.0; 3.0 min | 9.9 plus 2.0 (2,280 words: the leaderboard paragraph gained two sentences beside its chart); 3.0 min |

The growth is the two gw step lists (about 500 words), which replace the old animation's script-drawn captions and counters (invisible to the word count before), plus a sentence each where a visual moved beside its text. Nothing was cut; every result and evidence point stays open as before. Header: "Reading: 22 min, plus 2 in closed details." from `reading.json`.

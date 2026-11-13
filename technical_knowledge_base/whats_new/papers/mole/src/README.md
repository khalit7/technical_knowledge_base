# MOLE: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3db5c17b0d0d818b9680c7b91baaf7e9, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the Demystifying Agent Skills page's copy of the reference pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | Headline card (softened Takeaway), the core sentence, hero figure (45 completed harms caught or missed in the daily top 10), You need and New terms, Problem, Idea (Figure 1 redrawn, the R@K/day definition), Setup (threat explorer from Tables 1 and 4 with Figure 6's row), What a monitor sees (two released completed-harm account-days at the three observability levels, plus the hidden prompt), RQ1 to RQ5 with three predict-then-reveal questions, How much to believe, What it takes to use this, Why it matters, Connections. |
| Run the daily audit | `t-run` | The live ingredient: the paper's robust z-score and peer-fit monitors run in the browser on the 15 released test days of the GPT-5.3 single-day corpus (2,106 account-days, 45 completed harms), animated day by day, with the review budget, the feature set and the monitor as controls, the R@K curve, the per-threat table against Figure 6, and every completed harm with its rank. |
| The paper's tables and figures, rebuilt | `t-tables` | Table 11 with Figure 3 decoded, Figure 4 with exact intervals, Table 12 and J.1 and Table 13, Figure 6 with the recomputed classical columns, Tables 19 to 21, Table 22 as a cost chart, Table 6, and every check. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **No toy model; the live ingredient is the paper's own benchmark data.** MOLE is a benchmark paper whose corpora are released, so the page runs the two classical monitors (Appendix F.2, F.3) on the real test days instead of a toy, and reproduces the printed numbers exactly. The LLM monitors cannot be rerun (their saved scores are not released), so they appear as printed reference marks.
- **A trace viewer instead of a trace replay animation.** The agent-paper row of papers.md suggests replaying an episode; here what matters is what the monitor is shown, so the Reading tab renders two released account-days the way the paper's renderer does, at each observability level. It is also where the 600-character clip that hides data-poisoning triggers became visible.
- **The before/after animation is the daily review queue**, z-score against peer-fit (organisation-wide against group-relative baselines), on the same 15 days and the same scale.
- **No Then and now** (a 2026 benchmark paper).
- **Reading tab is about 22 minutes** (core, plus 5 in closed details since the 2026-10-25 light pass) against the old page's 5: the paper page owns every detail, and the evidence section carries several findings from the released data (the elicitation preamble, the renderer clip, the held-out refit) that needed their own explanation.

## Light pass to the teaching contract (2026-10-25)

- **Top**: the idea in one sentence (MOLE grades the defender under a ten-account daily budget; the best monitor caught 24 of 45; what a monitor reads can matter as much as which model); a hero figure (`15_js_hero.js`, from `recompute.json`: the 45 completed harms as squares, filled when caught, for a random queue, GPT-4.1-nano, FACADE, GPT-5.5 and Claude Opus 4.7; the z-score and peer-fit are left out so the RQ2 prediction is not given away); You need (Agent security, Eval statistics); New terms.
- **Owned elsewhere, now linked** (what this paper did kept here): reciprocal rank fusion (The retrieval pipeline), interval methods (Eval statistics, from the Figure 4 reveal), recall at K (Evaluation metrics). The page re-taught little general machinery; its mechanisms are the paper's own.
- **Moved into closed blocks**: where the page came from (old note under the nav); who the 38 assigned accounts are; the workday in detail and the recount; label validation (other labellers, 18 practitioners); the classical monitors' exact formulas; how much of the plan the persona gives away; the GPT-5.5 input cap; Table 14's four traces (one core sentence kept); the Table 16 follow-ups; RQ5 routing and zero-cost strategies; generating new corpora and the unreported prevention protocols. Follow-up news (the 2026-09-14 field incidents, Hyper-tau-bench) moved to one dated block "Since the paper".
- **Connections**: the standing gap ("no AI security topic page") is closed; the paper now links Agent security.
- **Never autoplays** (superseded 2026-11-13 for the stages; still true of the daily audit widget): `makeAnim` waits on its first frame until the reader acts (also after a monitor switch); `check_page.mjs` uses DOM clicks for tabs, scrolls the daily audit (`aud`) into view and fails on any frame drawn before a click, checks the hero is drawn, and opens every closed block. Tabs from the skill template (`99_js_tabs.js`, key `mole-tab`, with `data-to` scrolling that opens a closed block holding the target).
- **No real image**: nothing physical to show, and the paper's Figure 1 is already redrawn; the arXiv licence of the paper was not needed.
- **Takeaway softened** (card, `paper.json`, `live.md`): the old line said "a model's stated refusal does not predict whether it actually declines", which the paper never measures (refusal and completion correlate across models, Spearman -0.73; what fails is "never refusing means completing"), and gave the 72% without the preamble that declares the sandbox harmless and asks the model not to refuse. The new line states both, gives 24 of 45 for the best monitor, and notes single runs on few positives. The Notion property still carries the old line.
- **Length judgement**: Reading core 23 min before (5,284 words) and 22 after (5,157), plus 5 in closed details (1,115 words, from 1; `audit_pages.mjs`, 230 words a minute; header from `reading.json`). The top added about 1.5 minutes and the softened takeaway half a minute; the moves took out more. What stays is core: five research questions, each with numbers, and an evidence section with four corrections from the released data (elicitation preamble, 600-character clip, held-out refit, main text against tables) that no other page carries. Other tabs unchanged (Run 3, Tables 8, Further reading 3).
- **Ledger** (`ledger.json`, labelled by `label_ledger.py`): 257 units; core 221, depth 27, owned 2, volatile 2, fat 5; `ledger.py check` problems 0.
- **Source extracts**: em-dashes in `inputs/paper_v1.txt` (68), `inputs/tables_v1.txt` (60) and `inputs/examples.json` (25) replaced with `--`; the two author emails in `paper_v1.txt` replaced with [email removed]. `extract_paper.py` and `mk_example.py` now do both on extraction; `tables.json`, `20_example.js` and `recompute.json` are byte-identical after the change. Addresses inside the simulator's released data (the fictional accounts and outside addresses the agents were given) are kept: they are part of what the agent was told.

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, added to the head after `01b_css.html` in `build.sh`): every section with a visual is text left, visual right (sticky); sections without one stay full width. The paper: the top (idea sentence and You need left, hero right), Idea (stage), The twelve threats (new wrapper `s-meth-thr`, explorer right), What a monitor sees (trace viewer right), RQ2's observability half (new section `s-r2-obs`, stage). Problem, the rest of Setup (`s-meth` and the new `s-meth-data`), RQ1 and RQ2's first half (their charts sit inside the predict reveals), RQ3, RQ4, RQ5 (a table), the trust section and the rest stay full width. Run tab: the notes left and the daily audit right; the budget curve in a split; the threat table and the list of harms full width. Tables tab: Table 11, Figure 4, Table 12 and Table 22 charts in splits with their captions moved to the left; every pure table full width. Section anchors kept; the new ones are wrappers.
- **Two 3D stages** (template `25_js_s3.js`, renderer v2, unchanged; one scene file each):
  - `31_js_sc_day.js`, Fig. 1 under Idea: one real test day (29 April 2026, test day 3 of the GPT-5.3 single-day corpus) computed in the browser by `AUD` from `21_audit_data.js`: the 142 active accounts by access group, the day's 25,021 audit events flowing into the monitor (dots per group in proportion to its events), robust z-score bars, the queue ten to a row with the reviewed row on a glass plate and flows to the security team, the five completed harms revealed (1 of 5 caught), then peer-fit re-ranking the same day (0 of 5). It replaces the 2D Figure 1 redraw (`idSvg`); its caption became step 1 and the paragraph above the list. The day is the one the trace viewer shows (tom.g0, rank 62).
  - `32_js_sc_obs.js`, Fig. 3 under RQ2: Table 12 as printed (`PAPER.tables.T12`), R@10/day for three monitors × three observability levels, built row by row on DeepSeek-V4-Flash, then the comparison GPT-4.1 with reasoning against audit-only GPT-5.5 with Table 13's interval, then all four corpora. It replaces the pr3 predict-then-reveal (its question is now the paragraph above the list; its 2D small multiples remain on the Tables tab as `t12Plot`). Two predictions remain (pr1, pr2).
- **Kept 2D**: the hero (counts of 45, a comparison on one axis), the Figure 3 and Figure 4 reveals and charts (bars and intervals), the trace viewer (text), the threat explorer (text and a table row), the budget curve, Table 22's cost chart, every table.
- **Long-replay rule**: the daily audit on the Run tab replays 15 days and the reader steers the outcome (monitor, budget, features), so it is a widget: no autoplay and no step list; `makeAnim` (`11_js_ui.js`) now opens it on test day 3 (`k0`) and its live per-day caption stays. Labels moved inside the chart no longer collide (`12_js_audit.js`).
- **Motion**: the stages autoplay once half in view, pause off screen, stop for good on a reader control or at the last step, never move under reduced motion. `99_js_tabs.js` (key `mole-tab`, keeping `data-to` opening a closed block) and `05z_errbox.js.html` recopied from the templates. `check_page.mjs` runs at 1400 px too; `check_stages.mjs` is new (stages play in view, list lengths, off-screen and reduced-motion stillness, the widget never moving by itself, and every number in the two step lists against what the scenes compute).
- **Prose**: "Tap one" and "Step through" reworded for the right-hand column; the RQ2 bullet that listed the three corpora's values and intervals now points to the steps, which carry them.

## Length judgement (2026-11-13)
| | Before | After |
|---|---|---|
| The paper, core | 22.5 min (5,172 words) | 24.8 min (5,696) |
| The paper, closed | 4.8 min (1,115) | 4.8 min (1,115) |
| Run | 2.5 min (575) | 2.8 min (653) |
| Tables; Further reading | 8.5; 2.5 min | 8.6; 2.5 min |
| Visuals in The paper (audit) | 2 | 3 |

The growth is the two step lists that explain the stages (about 520 words); no knowledge was cut. Header: Reading 25 min, plus 5 in closed details (`reading.json`).

Ledger: 267 units (core 231, depth 27, owned 2, volatile 2, fat 5); keys re-pointed for units 21, 22, 23, 42, 63, 95, 96, 98 and 200, ten units added for the numbers the step lists state; `ledger.py check` problems 0.

## Checks (13 November 2026)
`checkpage.sh` fail=0, emdash 0, errbox 1, clipped 0; `check_page.mjs` 0 problems; `check_stages.mjs` 0 problems; `verify_layout.mjs` problems 0; `mk_coverage.py` 32 of 32.

## Files

- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`. `mk_coverage.py` writes `coverage.json` (32 items from `live.md`, all verified against the built page).
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `tables_v1.txt`, `anchors.txt`. `decode_figs.py`: figure values from the vector PDFs of the arXiv e-print (needs `uv run --with pymupdf`; the e-print is not kept), including Figure 3's bars from its rectangles.
- `mk_tables.py`: `tables.json` from the extracted tables, the decoded figures and two passages of the text.
- `compute_features.py`: the released audit events (Hugging Face `forgelab/mole`, not kept: 89 to 94 MB per corpus) rolled up into `inputs/features_<split>.json` (integer counts per account-day, plus labels, groups and cohorts from the repository's bootstrap files). Done for `gpt53_single_day` and `gpt53_multiday`.
- `monitors.py`: the robust z-score, peer-fit, R@K/day, budget-AUC and AUROC in plain Python. `mk_audit_data.py`: `parts/21_audit_data.js` (the 15 test days for the page, the fitted profiles, and Python's reference results that `check_page.mjs` compares the JavaScript against).
- `mk_example.py` (needs the transcripts parquet, 250 MB, not kept) writes `inputs/examples.json`; `mk_example_js.py` trims it into `parts/20_example.js` (em-dashes in verbatim text shown as `--`).
- `clip_check.py`: where the trigger strings sit in every completed data-poisoning account-day. `elicit_check.py`: the elicitation preamble in every harmful session, sessions per account-day, median calls.
- `recompute.py`: every derived number and check, to `inputs/recompute.json`, shown on the page.
- `check_page.mjs` (run from the repo root with node): the JavaScript monitors against Python (both monitors, K = 1 to 20, two feature subsets, exact), every control in both themes and widths, the animation stepped in both modes, 11 px text, NaN, errors, sideways scroll.
- `inputs/README.md`: where every input came from.

## Checks (3 October 2026; rerun 25 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems (264 actions; JS monitors match Python exactly; nothing moves before a click); `mk_coverage.py` 32 of 32; `ledger.py check` problems 0.

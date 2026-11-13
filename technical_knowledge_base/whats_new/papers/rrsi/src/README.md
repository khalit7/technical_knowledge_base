# RRSI: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3e95c17b0d0d81dbb1a5e660ed019c8a, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the HarnessDev page's copy of the reference pieces. Since the 2026-11-13 layout rollout `02_split.html`, `25_js_s3.js`, `05z_errbox.js.html` and `99_js_tabs.js` (storage key `rrsi-tab`) are the skill's templates, and `makeAnim` in `11_js_ui.js` is the Dream-RSI page's (Agora's) version with the autoplay rules.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | (split layout since 2026-11-13) Card, the core sentence beside the hero stage (Fig. 1, 3D, its step list; it replaced the static SVG hero) (the Takeaway as scoped on 2026-10-26, with the old wording in its note), Problem with a predict-then-reveal toy (the same candidate stream through "keep the best score" and RRSI's selection rules, animated), Idea (analogy table, loop diagram), Method (Eq. 4 budget chart, the four selection rules with Eq. 17 and the weights from the code), Setup, Results (Figures 3 and 1(a) rebuilt), Ablations and cost (predict on Table 2, Figure 4(a) rebuilt), How much to believe, What it takes to use this, Why it matters, Connections. |
| Replay the released runs | `t-run` | The live ingredient: all four released evolution runs (regularized-rsi.com) stepped round by round, recorded decisions against "keep the best score"; Algorithm 2 ported from `rrsi/selection.py` re-judging every recorded candidate with sliders; the four runs side by side; the Harvey LAB held-out record against Table 1. |
| The paper's tables and figures, rebuilt | `t-tables` | Tables 1 to 6 (Table 6 against the records), budgets of every round, noise bars, all 53 checks. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **Live ingredient is a replay of the authors' own run records, not a toy model.** An agent-harness paper (the trace-replay row of papers.md), and the authors released every round of four runs plus the selection code, so the real decisions can be replayed and re-judged; the rule port reproduces 37 of 37 coding and 31 of 32 Harvey LAB decisions.
- **A small illustrative toy in the Reading tab** (behind the first predict question) for the noise-chasing argument, which no released record can show because the truth is unknown there. It does not reproduce the paper's transfer advantage, and it says so; it was not tuned until it did (`check_sim.mjs` checks the calibration and that statement).
- **No Then and now.** A September 2026 result; "What it takes to use this" covers adoption.
- **Reading tab is long (about 23 minutes plus 6 in closed details after the 2026-10-26 light pass; 26 before it, against the old 6).** The old page was written from the abstract; this one owns the method's appendix rules, the released records and an evidence section that changes the reading (records disagree with three printed numbers; the headline run predates the method as described).

## Files

- `save_live.py`: copies the Notion fetch verbatim from the session transcript into `live.md`. `mk_coverage.py` writes `coverage.json` (30 items, this paper's own, verified against the built page).
- `extract_paper.py`: arXiv HTML v2 to `inputs/paper_v2.txt`, `inputs/tables_v2.txt`, `inputs/anchors.txt`. `decode_figs.py`: Figures 1 and 4 from the vector PDFs of the arXiv e-print to `inputs/figs.json` (run with `uv run --with pymupdf`).
- `mk_runs.py`: the released run records (`regularized-rsi.com/data/evolution.js`, 1.25 MB, not kept) to the compact `inputs/runs.json` the page ships (96 KB).
- `mk_tables.py`: `tables.json`. (`mk_hero.py` and `parts/03a_hero.svg.html`, the static hero, were removed on 2026-11-13; they are in git history.) `recompute.py`: 53 checks, noise estimates, the rule replay, token spend, toy defaults, to `inputs/recompute.json`.
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`, `window.RUNS`.
- `check_sim.mjs` (from `src/`, after the build): the toy's calibration and its 400-seed averages. `check_page.mjs` (from the repo root): every control in both themes and widths, both animations stepped for every run and mode.

## Checks (3 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems; `check_sim.mjs` PASS; `recompute.py` 53 checks, 40 reproduce, 13 do not (each shown on the page); `mk_coverage.py` 30 of 30.

## The 2026-10-26 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence, then a hero redrawn as static SVG (`mk_hero.py` writes `parts/03a_hero.svg.html` from `tables.json`): the loop of Figure 2 and Algorithm 2 with what RRSI adds marked in the accent colour, over Table 2's trade on the agentic workspace (evolve 89.4 / 92.8 / 90.5, out-of-distribution average 39.7 / 40.3 / 43.6, policy tokens 1.56 / 3.80 / 2.42M for H0, unregularised, RRSI). The paper is under arXiv's non-exclusive licence, so no paper figure is embedded; nothing physical to photograph. Then "You need" (Topic: agentic-harnesses, self-improving harnesses on Harnesses for training, Eval statistics) and the new terms.
- **Owned elsewhere, a sentence kept and linked**: the general definition of a harness (Topic: agentic-harnesses); keep-the-best on a noisy score in general (Harnesses for training, section 6). Links added, content kept: binomial standard errors (Eval statistics), judge biases (LLM-as-judge).
- **Closed** (`details.more`): how the page was built; the toy's calibration; what the critic did in the released records (an open sentence keeps the one outright rejection); the old-summary note on the pruner; the eight-benchmark table (an open sentence names the suites and graders); Table 6's four decisions; protocol arithmetic and smaller slips; the detailed bullets of What it takes to use this (one open paragraph).
- **No volatile block**: nothing on the page is dated follow-up news.
- **No autoplay**: `makeAnim` patched as on Dream-RSI (waits on step 1 until the reader presses play or steps); `90_js_tabs.js` replaced by the skill template `99_js_tabs.js` (storage key `rrsi-tab`), keeping the `data-to` scroll target. `check_page.mjs` now fails if either animation draws a frame before a click (with the predict reveals open) and opens every closed block.
- **Takeaway scoped** (`paper.json`, so the card; `live.md`'s property line; `mk_coverage.py`): "+14.1 in distribution, +4.7 out of distribution, 30% fewer tokens, the first evidence" became Table 2's trade (43.6 against 39.7 and 40.3; 36% fewer tokens than unregularised, still 55% more than H0), all six held-out splits up by 1.8 to 4.7, single runs within about one standard error, and the +14.1 placed as an evolve-set gain with a secondary policy from an earlier procedure. The old wording is quoted in `takeaway_note`. The Notion property needs the same edit.
- `extract_paper.py` now writes `--` for em-dashes and redacts emails (the saved extracts had neither). Header: "Reading: 23 min, plus 6 in closed details." from `reading.json`.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 25.4 min (5,850 words) | 23.1 min (5,324) |
| The paper, closed | 0.5 min (104) | 5.5 min (1,265) |
| Replay tab | 3.9 min (907), 2 visuals | 3.9 min (898), 2 visuals |
| Tables; Further reading | 11.3; 3.3 min | unchanged |
| Visuals in Reading (audit) | 5 | 6 (the hero added) |

Why about 23 minutes is right: the top (about 300 words) went in and about 1,150 words of provenance, calibration, benchmark detail, per-decision examples, protocol arithmetic and adoption detail closed. What stays open is the problem, the seven rules in the paper's order with their equations, the results and ablations with their numbers, and an evidence section whose every point changes the reading (single runs, gains within noise, records that disagree with three printed numbers, runs that do not follow the method as written, kept edits inside their noise band). Shorter would mean closing evidence the verdict rests on.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
297 units: core 248, depth 45, owned 2, volatile 0, fat 2 (a sentence-splitter fragment and the old autoplay note). 287 drafted by `ledger.py init` from the page before the pass; 10 added. `ledger.py check`: problems 0.

## Checks (26 October 2026)
`checkpage.sh`: tabs 4, about 277 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 1,228 actions, 0 problems (no frame before a click). `check_sim.mjs` PASS. `mk_coverage.py` 30 of 30.

## The 2026-11-13 layout rollout (split layout, renderer v2 stage, autoplay)

What changed and why:
- **One 3D stage, the hero** (`parts/31_js_sc_loop.js`, template `25_js_s3.js` renderer v2): Fig. 1 runs RRSI's selection rules over the authors' released coding run (Claude Opus 4.8, `window.RUNS`, 20 rounds, 40 candidates, 37 scored). Space: rounds across, passes of 178 up (the scene's floor is 122 passes), policy tokens per trial into the depth (cheaper in front). Balls are recorded candidates coloured by recorded verdict, white pillars the incumbent after each kept edit, a purple glass sheet the floor S* − δ, a gold sheet the band top (incumbent + δ), a teal glass wall the incumbent's tokens. Six steps (`sx-loop`): round 0 (r0A kept above the band at +68% tokens, r0B rejected inside it at +26%); the floor (δ = 6.1 passes, 24 of 37 under it, three never scored); inside the band the token wall decides (r7A and r11B kept, 140 to 136 passes, 570k to 470k tokens; 8 in-band rejections); the last round's +8 (r19B, 144 of 178 on 442k); keep the best score on the same candidates differs in 5 of 20 rounds (3, 7, 11, 16, 18), all inside the band; Table 2's trade as signed bars on plinths (unregularised +3.4 / +0.6 / +144% tokens, RRSI +1.1 / +3.9 / +55%). It is what this paper adds over the other self-improving harness pages: the regulariser's geometry on real decisions. The old hero's numbers and licence line moved into the note under the list. `window.LOOPDATA` exposes the numbers; `check_stages.mjs` compares them with the list.
- **Split layout** (template `02_split.html`): the top beside the stage; Problem's toy (inside the predict reveal) as a nested split, its card right and the intro, step lists and "What the toy shows" left; Idea beside the loop card; Method's proposal side beside the Eq. 4 budget chart (the selection side full width, with a line pointing at Fig. 1); Results in two splits (Figure 3; Table 1 prose and judge-free grading beside Figure 1(a)); the Cost paragraph beside Figure 4(a). Replay tab: the intro, Try and the generated step lists beside the replay card; the re-judge paragraph and the plane's note beside the re-judge card. Full width: Setup, the Table 2 predict reveal, How much to believe, Use it, Why it matters, Connections, the two replay tables, the whole Tables tab and Further reading.
- **Long-replay rule**: the toy (`13_js_sim.js`, 20 rounds) is a start step plus four stretches of five rounds; the replay (`14_js_run.js`, 20 to 40 rounds) a start step plus up to seven stretches. Each stretch plays its rounds one at a time; the generated `ol.sx` lists (`sx-sm-g`/`sx-sm-r`, `sx-rp-rec`/`sx-rp-g`) explain each stretch (kept edits, counts by verdict, and in keep-the-best mode the rounds that differ). The old per-step caption boxes became a live line under each chart naming the candidates of the round on screen (the replay's keeps the summaries and critic notes). A new seed or run resets and replays; a slider keeps the step on screen.
- **Motion**: both animations and the stage play once half in view and stop for good on any control; `check_page.mjs` now asserts they play when scrolled into view (it used to forbid it).
- **Kept 2D**: the toy's seen-against-true curves, the replay chart (round against passes) and the re-judging plane (scatter), the budget bars, Figures 3, 1(a), 4(a), the Table 2 chart and every Tables chart: curves, scatters and bars read best flat.

## Length judgement (2026-11-13)
| | Before (audit, pre-pass) | After |
|---|---|---|
| The paper, core | 23.1 min (5,324 words) | 28.8 min (6,624) |
| The paper, closed | 5.5 min (1,265) | 5.5 min (unchanged) |
| Replay tab | 3.9 min (898) | 6.6 min (1,523) |
| Tables; Further reading | 11.3; 3.3 min | unchanged |

The growth is step lists: the stage's six steps and its note (about 800 words, carrying the old hero's numbers and the rules on the real run) and the generated lists that replaced the script-drawn captions (the audit counts both modes' lists of each animation, so a reader of one mode reads about two minutes less). Nothing was cut. Header: "Reading: 29 min, plus 6 in closed details." Pages quoting 23 minutes (Harnesses for training, Reward hacking) need `check_times.py --fix` by the lead.

Ledger: 304 units (core 255, depth 45, owned 2, fat 2); 6 added (the stage's steps, `label_ledger.py` NEW) and four re-pointed because their text was reflowed: 31 (the toy's "Switch between the rules", now "the solid line is the score the loop"), 70 (leakage screening, `KEYS`), 217 (the replay intro, the h2 now sits apart) and 221 (the Try line). `label_ledger.py` now keeps any key the page still carries and never picks a key with a reading time. `ledger.py check`: problems 0.

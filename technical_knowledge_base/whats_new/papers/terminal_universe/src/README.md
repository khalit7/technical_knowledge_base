# Terminal-Universe: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3d45c17b0d0d814abc07fde424e09a31, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the Demystifying Agent Skills page's copy of the reference pieces.

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | (split layout and three 3D stages since 2026-11-13, below) Headline card (from `paper.json`, with the database Takeaway verbatim plus its two corrections), Problem, Idea (the imitate against rebuild-and-re-solve 3D stage on a real trace), Step 1 rebuild (Table 13 bars, the funnel), Step 2 re-query (four mechanisms, the RSA pair, the multi-round session as a 3D stage, Figure 3), Step 3 verify, Data, Results (Table 3 dot chart), Ablations (three predict-then-reveal questions), How much to believe, What it takes to use this, Why it matters, Connections. |
| Replay a real trajectory | `t-run` | The live ingredient: Stage 1 replay run in the browser on five real LFM2-Terminal rows (a 3D stage, one step per turn, since 2026-11-13), earliest-version rule against replay-to-the-end, recovered files, statistics over 640 sampled rows. |
| The paper's tables and figures, rebuilt | `t-tables` | Table 3 with same-base and measured-only filters, Tables 4 to 11 switcher, the noise chart, sources (Tables 12, 14, 2), Tables 13, 19, 17, 1, Figures 5 and 6 from their labels, every number checked, corrections to the old page. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **No toy model, no Then and now.** The paper is an agent-data pipeline; there is no layer to train and it is too recent for a "then and now". The live ingredient is the agent row's trace replay, but of the paper's own Stage 1: we re-implemented the stated replay rule and run it on real rows of the paper's largest source corpus, so the reader watches the mechanism itself, not an illustration.
- **The replay's mapping from shell commands to reads and writes is ours.** The paper's replay framework is unreleased and LFM2-Terminal traces have no Read/Write/Edit tools. The mapping is stated on the page and in `replay.py`; its output is compared with Table 13 (median files reproduces; lines and seed pass rate are lower).
- **The animation's completion step uses the paper's terminal-pool medians** (2 to 13 files), labelled, because no completed workspace of any trace is published.
- **Reading is long (about 23 minutes)** because the paper has many ablations and the evidence section needs their noise; it sits within the range of the other paper pages.

## Files

- `build.sh` (finds the repo root by walking up to `html_utils`, no git): runs `recompute.py`, `check_replay.mjs` (fails the build if the in-page replay disagrees with `replay.py` on a shipped trace), `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an em-dash or unexpanded macro.
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `tables_v1.txt`, `anchors.txt`.
- `decode_figs.py`: printed labels of Figures 3, 5, 6 and the pipeline figure from the e-print's vector PDFs into `inputs/figures.json` (needs `uv run --with pymupdf`; the e-print is not kept).
- `tables.json`: Tables 1 to 14, 17, 19 transcribed with printed precision; `recompute.py` checks every number against the extracted text.
- `recompute.py`: every derived number, the checks table and the noise table, into `inputs/recompute.json`.
- `fetch_sample.py`: 640 rows of LFM2-Terminal-SFT-Processed at seeded random offsets (about 35 MB, kept out of the repo).
- `replay.py <sample dir>`: Stage 1 replay; writes `inputs/replay_stats.json`, `inputs/replay_expected.json` and `parts/21_traces.js` (the five shipped traces, outputs cut at 30 lines with the cut counted).
- `check_replay.mjs [sample dir]`: the JS port (`parts/22_js_replay.js`) against `replay.py`, on the shipped traces and, with the sample dir, on all 640 (`inputs/check_replay.json`: 14,824 commands, 0 mismatches).
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`. `mk_coverage.py` writes `coverage.json` (32 items from `live.md`, verified against the built page).
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, the three stages stepped (the replay for every trace and both rules; since 2026-11-13 each stage must play once scrolled into view), 11 px text, NaN, errors, sideways scroll.
- `check_stages.mjs` (2026-11-13, from the repo root): the layout and motion rules at 1400, 920 and 390 px, reduced motion, both fl step lists, the generated rr list of every trace under both rules (at most 8 steps, every command once, in order, one turn per step), the fl list's numbers against the page's own replay and Table 4, the mr list's styles and verdicts against `window.TUMR`.
- `parts/31_js_sc_fl.js`, `parts/32_js_sc_mr.js`, `parts/33_js_sc_rr.js` (2026-11-13): the three 3D scenes on the template renderer `parts/25_js_s3.js`.
- `inputs/README.md`: where every input came from.

## To rebuild from scratch

```
python3 fetch_sample.py <dir> && python3 replay.py <dir> && node check_replay.mjs <dir>
sh build.sh && python3 mk_coverage.py
sh ../../../../../html_utils/checkpage.sh ..     # from src/; or from the repo root with the page folder
```

## The 2026-10-25 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence, then a hero redrawn as static SVG (`mk_hero.py` writes `parts/03a_hero.svg.html`): rebuild (trajectories, replay, completion agent, LLM judge) and re-query (query types, teacher with its own tests, SFT) with the paper's printed counts, above the Table 4 bars that carry the verdict. The paper is under arXiv's non-exclusive licence, so none of its own figures is embedded. Then "You need" (Harnesses for training and evaluation, Agentic benchmarks) and the new terms.
- **Owned elsewhere, a sentence kept and linked**: what an environment for a coding agent contains and how SWE-Gym-style environments are built (Harnesses for training and evaluation), how Terminal-Bench is run (Agentic benchmarks), the unpaired standard error (Eval statistics); a link to Distillation and Small Language Models beside the distillation caveat.
- **Closed**: the three existing routes (one sentence stays open), the RSA cross-workspace example, the rollout settings, seed rules and per-type record sizes, the training and evaluation setup (a one-sentence summary with the MT@4 definition stays open), Cross-WS by category (Figure 6), the small inconsistencies, and the bullets of What it takes to use this (one summary sentence stays open).
- **Volatile**: the Mercor and SkyRL guide and the Terminal-Bench 4.0 leaderboard reading now sit in one dated closed block, "Since the paper (dated: checked 3 October 2026)"; Connections points to it instead of repeating the date.
- **No autoplay**: `makeAnim` patched as on the EnvHarness page (the Idea animation and the replay wait on step 1; a mode or trace change resets paused); `90_js_tabs.js` replaced by the skill template `99_js_tabs.js` (storage key `tu-tab`). `check_page.mjs` fails if an animation draws a frame before a click and opens every closed block.
- **Takeaway scoped** (paper.json, so the card, `live.md` and `mk_coverage.py`): "37,300 runnable environments" became 37,273 judged task-sufficient (on context, not shown to build or run); the gains are kept with their numbers, with the decisive re-solve against imitate comparison, the ablations within noise and the distillation share named; the flywheel is the motivation, not something the paper ran. The Notion property needs the same edit.
- Em-dashes in `inputs/paper_v1.txt` and `inputs/tables_v1.txt` written as `--` (no author emails were present); `extract_paper.py` now does both. Header: "Reading: 22 min, plus 4 in closed details." from `reading.json`.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 23.5 min (5,396 words) | 21.7 min (5,001) |
| The paper, closed | 0 | 4.0 min (913) |
| Replay; tables; Further reading | 3.1 (+1.0 closed); 10.1; 3.2 min | unchanged |
| Visuals in Reading (audit) | 5 | 6 (the hero added) |

Why about 22 minutes is right: the paper is a three-step pipeline with four query mechanisms, a headline result and seven ablations, and its evidence section turns on the noise of each ablation and on what "environment" means. The open text keeps every step, every result with its number and every evidence point the verdict uses; setup, examples, per-category detail and inconsistencies closed. Shorter would mean closing ablations whose noise the verdict rests on.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
317 units: core 276, depth 35, owned 3, volatile 3, fat 0. 303 drafted by `ledger.py init` from the page before the pass; 14 added (top, three owner links, script-drawn charts keyed to their static captions). Nothing was deleted. `ledger.py check`: problems 0.

## Checks (25 October 2026)
`checkpage.sh`: tabs 4, 239 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 928 actions, 0 problems (no frame before a click). `check_replay.mjs` passes in the build. `mk_coverage.py`: 32 of 32.

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

What the paper does, re-read first: it inverts environment-to-trajectory. Public agent traces are replayed into a partial workspace (the earliest version of every file the trace showed before the agent changed it), a completion agent fills in the rest, an LLM judge keeps the task-sufficient ones (judged on context, never built or run), then a teacher (Qwen3.7-Max) solves new tasks posed four ways on them under its own tests, and Qwen3.5-27B is fine-tuned on those runs. So the spatial thing to show is a trace becoming a workspace and a new run against it.

What changed and why:
- **Split layout** (template `02_split.html`, unchanged, after `01_css.html`). The paper: the core sentence, You need and New terms beside the hero (redrawn by `mk_hero.py` at 660 px instead of 700, so it fits the right column at 1400 px without scrolling; the CSS minimum width follows); Idea beside the fl stage; Step 1 in two splits (the three stages and "How much completion adds" beside the Table 13 bars; a new subsection `#s-recon2`, "Is the completion honest, and how much does it keep?", beside the funnel); Step 2's four mechanisms full width, then a new subsection `#s-mr` (the multi-round example) beside the mr stage and `#s-mr3` (the Figure 3 reading, its caption's prose moved into the text) beside Figure 3; Results beside the Table 3 dot chart. Problem, Verify, Data, Ablations (their charts sit inside predict reveals in the left column), How much to believe, Use it, Why it matters and Connections stay full width. Replay tab: the intro, trace picker, task, rule toggle and the generated step list left, the rr stage right; the file viewer full width (a tool); the 640-row paragraph beside its histogram; the mapping text full width. Tables tab: the noise paragraph beside its chart, the Figure 5 and Figure 6 captions beside their charts; every table full width. Further reading unchanged. Every old anchor kept (`s-recon`, `s-req` and the tables' `tb*` ids); new ones `s-recon2`, `s-mr`, `s-mr3`, `s-rr`, `rs`, `s-noise`, `s-fig5`, `s-fig6`.
- **Three 3D stages** (template `25_js_s3.js`, renderer v2, unchanged):
  - `31_js_sc_fl.js` (`#stg-fl`, Idea): the first shipped LFM2-Terminal trace through the page's own replay (`RP.run`): its 16 commands as tiles coloured by what replay makes of them, the workspace slab with the one replayed file (green), the six paths known only by name (pale outlines), the three files held back on a tray (orange), each flowing from the command that revealed it; completion to the terminal-pool median (2 to 13 files, Table 13, labelled as the pool median), the judge as a glass plate held over the workspace, the four query kinds, the teacher's re-solve flowing into a new SFT record, Table 4 as bars on white plinths. Imitate mode: the trace flows straight into one record over an empty outline, a red glass "not re-runnable, not verified", then base against imitate. Two step lists (`sx-fl-res`, 7 steps; `sx-fl-imit`, 4), swapped by the toggle with `S3.stage(...).list`. Replaces the 2D `makeAnim` animation (`12_js_flip.js`, deleted; git keeps it); its captions became the step lists and its counters went into their text.
  - `32_js_sc_mr.js` (`#stg-mr`, Step 2): the Table 18 session as a staircase of seven rounds rising on one workspace, coloured by style; the requirements being tracked as small blocks (our reading of the requests, labelled in the scene's header comment); each round's private verifier as a glass plate (pass green, fail red, clear where the example prints none; rounds 4 and 5 marked "pass (implied)" from the paper's rule that an extension follows only a pass); the request flowing from the user agent to the coding agent and the verdict flowing back to the user agent only. Replaces the round chips; the full abridged quotes moved to a closed block under the step list.
  - `33_js_sc_rr.js` (`#stg-rr`, Replay tab): a real trace replayed turn by turn (the long-replay rule: 4 to 6 steps for the shipped traces, at most 8, adjacent turns merge beyond that), each step playing its commands one by one with the current command written above its tile; the slab holds Ê0 (box height grows with the lines seen), the tray what replay holds back; under "replay to the last version" the agent's files sit on the slab. The step list is generated from the same events (every command with what replay makes of it, the counts after the turn) and swapped on a trace or rule change. Replaces the 2D one-step-per-command replay (`makeAnim rr`), its caption box and counters.
- **Kept 2D**: the hero (a pipeline with printed counts and three bars: a flat diagram reads best), the Table 13 bars, the funnel, Figure 3 (a stacked share bar), the Table 3 dot chart, the predict reveals, the 640-row histogram, the noise chart, Figures 5 and 6, and every table (numbers on an axis or in a grid).
- `makeAnim` removed from `11_js_ui.js` (no 2D step animation is left). `99_js_tabs.js` and `05z_errbox.js.html` recopied from the templates (storage key `tu-tab`).
- `build.sh` finds the repo root by walking up to `html_utils` (no git).
- Ledger: units 32, 35, 38 and 239 re-keyed (`label_ledger.py` `KEYS`), unit 314 re-described; five units added for the stages' step lists, the closed block of quotes and the replay's one-step-per-turn rule. 322 units: core 280, depth 36, owned 3, volatile 3, fat 0; `ledger.py check` problems 0. `mk_coverage.py` 32 of 32; `check_replay.mjs` passes in the build.

## Length judgement (2026-11-13)
| | Before (audit, pre-pass) | After |
|---|---|---|
| The paper, core | 21.7 min (5,001 words) | 24.7 min (5,681) |
| The paper, closed | 4.0 min (913) | 6.0 min (1,372) |
| Replay tab | 3.1 plus 1.0 min (706 + 233) | 4.3 plus 1.0 min (996 + 233) |
| Tables; Further reading | 10.1; 3.2 min | 10.1; 3.2 min |
| Visuals in Reading (audit) | 6 | 7 |

The growth is the step lists: the fl lists (about 430 words) and the replay's generated list replace script-drawn captions and counters that the word count could not see before; the mr list (about 330 words) is new explanation of a session that was only a set of chips; the closed block of the seven abridged requests (about 450 words) holds what the chips showed one at a time. Nothing was cut, and every result and evidence point stays open as before. Header: "Reading: 25 min, plus 6 in closed details." from `reading.json`.

# Phi-Bench: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3db5c17b0d0d81029236da6c38f5891f, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the HarnessDev page's copy of the reference pieces (`build.sh`, `mk_paper.py`, `11_js_ui.js`, `check_page.mjs`, the CSS).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | (split layout and two 3D stages since 2026-11-13) Card; the core sentence, hero figure (`15_js_hero.js`), You need and New terms; Problem; Three formats (3D stage); Construction (funnel); Scoring (predict: a tie with the reference scores 0, live reward curve per task); Results (predict: E2EO scores highest); Categories (3D stage); Iterations and effort (Figure 5 rebuilt); Errors and cheating (Figure 7); Case study; How much to believe; What it takes to use this; Why it matters; Connections. |
| Replay the MoE training run | `t-run` | The live ingredient (split since 2026-11-13; the 24 rounds play in 6 or 7 explained stretches): the iteration task's 24 rounds for three models (Figure 8), all eight best-so-far curves (Figure 6) with a BPB / task-reward lens, final table. |
| Score a submission | `t-score` | Simulated AB-BA scoring on any of the 77 real anchors, paired against unpaired; the anchors strip plot. |
| The paper's tables and figures, rebuilt | `t-tables` | Table 2 (sortable, bound, ranks), Figure 4 heatmap (since 2026-11-13), Table 3 with recomputed Full, max against high effort (leaderboard), Figure 5 against Table 3, a pointer to Figure 7 (now on The paper tab), every check. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **Two live tabs, no toy model.** A benchmark paper: the live ingredient is a trace replay (the agent row of papers.md), made exact by decoding Figures 6 and 8 from the vector SVGs, and translated into the task's own reward with the frozen constants from the released package. A second tab simulates the scoring rule itself, because the reward's zero point (the expert reference) is the fact that most changes how the headline reads.
- **No Then and now.** A September 2026 result; "What it takes to use this" covers adoption.
- **Released data used beyond the paper.** The task package (`task_catalog.json`, `tasks_index.json`, SCORING.md, all 85 `task.toml` timeouts, the a3 manifest) and the leaderboard's `bench.json` and `iter.json` are the authors' own; they expose the 30-task effort study, the E2EO selection rules and the reward constants. Each use is labelled on the page.
- **Reading tab is long (about 22 minutes against the old 5).** The old page was written without the full paper; this one owns its details and an evidence section that changes the reading of the headline number.

## Files

- `build.sh`: runs `mk_tables.py`, `recompute.py`, `mk_paper.py`, assembles `parts/`, expands the link macros, fails on an em-dash or unexpanded macro.
- `save_live.py`: copied the Notion fetch verbatim from the session transcript into `live.md`.
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper.txt`, `inputs/table_*.txt`, `inputs/anchors.txt`. `decode_figs.py` (with `svgparse.py`, from the InstructGPT page): Figures 6, 7 and 8 to `inputs/figs.json`.
- `inputs/`: `task_catalog.json`, `tasks_index.json`, `scoring.md`, `gh_readme.md`, `a3_task.toml`, `a3_manifest_extract.json` (fetched from the GitHub repository on 2026-10-03), `agent_timeouts.json` (from all 85 `task.toml` files), `lb_bench.json`, `lb_iter.json` (from faibench.org, generated 2026-08-15).
- `mk_tables.py`: `tables.json`. `recompute.py`: 44 checks and every derived number, to `inputs/recompute.json`.
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `mk_coverage.py` writes `coverage.json` (34 items, this paper's own, verified against the built page).
- `check_page.mjs` (run from the repo root with node): every control at 1400 and 920 px light and 390 px dark, the replay stepped for every model; since 2026-11-13 it asserts that the replay plays once scrolled into view (it used to forbid it).
- `check_stages.mjs` (2026-11-13, from the repo root): the layout and motion rules at three widths, reduced motion, and the numbers of the static step lists (`sx-fmt`, `sx-cat`, `sx-rp-*`) against the page's data (`window.PHIFMT`, `window.PHICAT`, `window.PHIRUN`).
- `parts/31_js_sc_fmt.js`, `parts/32_js_sc_cat.js` (2026-11-13): the two 3D scenes on the template renderer `parts/25_js_s3.js`; `parts/02_split.html` the split layout (template, unchanged).
- `viz_ideas.md`: ranked ideas, rows `P-phi_bench.<k>`.

## Light pass to the teaching contract (2026-10-25)

- **Top**: the idea in one sentence; a static hero figure (`parts/15_js_hero.js`): the reward curve on SCORING.md's worked example (kv-traffic-sol: 2.58x scores 0, 4.14x scores 0.5, 6.656x scores 1) above Table 2's Full column for the eight models with the largest possible standard error, √(m(1 − m)/85), about 5 points; You need (Agentic benchmarks, Evaluation statistics); New terms (KFC, LHI, E2EO, reference anchor, correctness-gated, AB-BA pairs, BPB).
- **Owned elsewhere, now linked** (what this paper did kept here): MoE dispatch, balancing and capacity (Mixture of experts; the iteration study now names the levers in one sentence), honest timing (Profiling, benchmarking and correctness), the same-model harness spread (Agentic benchmarks), standard errors and paired comparisons (Evaluation statistics).
- **Moved into closed blocks**: provenance and the corrections to the first summary; the three construction routes in detail (one summary sentence stays); what "speed-up" means per task and why anchors need recalibrating. The industry news under Why it matters (OpenAI's agent-workdays, AMD ROCm 10.0 Skills and Hyperloom) went to one dated closed block, "Industry context, September 2026".
- **Never autoplays**: `makeAnim` waits on step 1 until the reader presses play or steps (also after a mode switch); the replay's caption says so. `check_page.mjs` scrolls the replay into view and fails on any frame drawn before a click, clicks tabs through the DOM, and opens every closed block. Tabs from the skill template (`99_js_tabs.js`, key `phi-tab`; `90_js_tabs.js` removed).
- **Takeaway softened** (`paper.json`, so the card, `live.md` and `mk_coverage.py`): "resolves 36.53%" was a mean reward in which matching the expert scores zero, not tasks resolved; "Hardware and Edge collapsing to 5.4%" rests on 3 tasks and the 5.4% is Qwen3.7 Max's; "repository-scale work far harder than kernels" is now LHI 22 to 45% below KFC for every model; "longer reasoning budgets not reliably helping" is now best at max but not monotone, three models on 30 tasks; the behaviours come from a case study of one task and three models. Kimi K3 and Qwen3.8-Max are 0.39 points apart. The Notion property itself is Khalid's to change.
- **Length judgement**: Reading core 23 min before (5,391 words) and 24 after (5,421; 23.4 against 23.6 minutes), plus 0 then 2 in closed details (`audit_pages.mjs`, 230 words a minute; header from `reading.json`). The top added about 1.5 minutes and the moves took out as much. The rest is core: the page's value is the reading of the reward scale and the evidence audit (selection rules, task counts per category, the mislabelled effort figure) beside the benchmark's method. Other tabs unchanged (Replay 2.3, Score 2.2, Tables 5.0, Further reading 2.5).
- **Ledger** (`ledger.json`, labelled by `label_ledger.py`): 277 units; core 258, depth 11, owned 5, volatile 1, fat 2 (the old header line and the old autoplay note); `ledger.py check` problems 0.
- Source extracts: em-dashes replaced with `--` in `inputs/` (paper.txt, scoring.md, gh_readme.md, a3_task.toml, task_catalog.json, lb_bench.json, lb_iter.json, a3_manifest_extract.json; JSON kept valid, the built page unchanged); two author emails in `inputs/paper.txt` replaced with "[email removed]"; `extract_paper.py` now does both on extraction and `mk_tables.py` turns " -- " in the leaderboard blurb into ": " as it did the long dash.

## Checks (3 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems; `recompute.py` 44 of 44; `mk_coverage.py` 34 of 34.

## The 2026-11-13 layout rollout (split layout, renderer v2 stages, autoplay)

What changed and why:
- **Split layout** (template `02_split.html`, unchanged, after `01_css.html`). The paper: the top (core sentence, You need, New terms) beside the hero; Three formats beside its stage; Construction beside the funnel; the new Categories section beside its stage; Iterations and effort beside Figure 5; Errors, persistence and cheating beside Figure 7 (moved here from the tables tab, so the counts the prose quotes sit beside it). Problem, Scoring and Results (their visuals are the hero and the predict reveals), Case study, How much to believe, Use it, Why it matters and Connections stay full width. Replay tab: notes and the step lists left, the replay right; the best-so-far notes left, the lens toggle and chart right; the final table full width. Score tab: notes left, the simulator right; the anchors note left, the strip right. Tables tab: Figure 4 and the max against high slopegraph split; the tables full width. Further reading unchanged.
- **Two 3D stages** (template `25_js_s3.js`, renderer v2, unchanged):
  - `31_js_sc_fmt.js`, the three formats (five steps, `sx-fmt`): the task package (a drawn repository of file blocks on a glass base, the spec, the workloads and tests, the hidden harness), KFC's one file (camera in close), LHI's submodule, E2EO's whole repository with a workload stream and a bottleneck to find, then one cube per task by format and scoring type (51 and 4, 18 and 2, 8 and 2, counted at run time from `tasks_index.json` as the page holds it). The repository layout and the bottleneck are illustrative and labelled so. Replaces the nested-scope widget (three-mode toggle); its four bullets became steps 2 to 4 and its per-format package facts step 5.
  - `32_js_sc_cat.js`, the categories (six steps, `sx-cat`): Figure 4's 85 tasks as cubes per category (columns by task count), Opus's row of Table 2, all 72 bars, the best per category, Hardware and Edge in close beside its 3 tasks with the ±13.0 bound on the best score, and the front row streaming into the Full column in proportion to the task counts. Replaces the third predict question (how many tasks Hardware and Edge rests on), which the stage would have answered before it was asked; its heatmap moved to the tables tab as Figure 4.
- **Kept 2D**: the hero (a reward scale and eight means on one axis), the predict reveals (reward curve, Table 3 bars), the funnel (log bars), the effort chart, Figure 7, the replay and best-so-far curves (lines over rounds), the Score tab's histograms and anchors strip (log axes), every table.
- **Replay**: `makeAnim` (`11_js_ui.js`) replaced by the HarnessDev version (plays once half in view, pauses off screen, stops for good on any control or at the end, never under reduced motion, `data-playing`, one `ol.sx` per model). The long-replay rule: the 24 rounds play in 7 (Opus) or 6 (Qwen3.7 Max, DeepSeek-V4-Pro) stretches, each adding its rounds one by one; the per-round caption box went, its texts are the static step lists (`sx-rp-opus`, `sx-rp-q37`, `sx-rp-ds`).
- `99_js_tabs.js` and `05z_errbox.js.html` recopied from the templates (storage key `phi-tab`; the old copy's extra that opened a closed block after a `data-to` target was dropped: no target here is followed by one).
- `label_ledger.py`: keys never contain a reading-time figure (the Further reading entries had keys starting "(30 min)"), six keys re-pointed by hand (units 8, 87, 88, 202, 210, 240) and eight units added for the step lists.

## Length judgement (2026-11-13)
| | Before (audit, pre-pass) | After |
|---|---|---|
| The paper, core | 23.6 min (5,421 words) | 25.4 min (5,844) |
| The paper, closed | 1.8 min (423) | 1.8 min (423) |
| Replay tab | 2.3 min (538) | 4.5 min (1,040) |
| Score; Tables; Further reading | 2.2; 5.0; 2.5 min | 2.2; 5.4; 2.5 min |

The growth is the two stage step lists (about 450 words) that explain the stages and absorb the widget's bullets, and the replay's stretch lists, which replace a caption that changed every round and was readable only while it played. Two paragraphs that the stages now carry were shortened (the Hardware and Edge corrections, the package note under Three formats). Header: "Reading: 25 min, plus 2 in closed details." from `reading.json`.

Ledger: 285 units (core 266, depth 11, owned 5, volatile 1, fat 2); `ledger.py check` problems 0. `mk_coverage.py` 34 of 34; `recompute.py` 44 of 44.

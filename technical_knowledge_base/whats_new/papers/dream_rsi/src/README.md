# Dream-RSI: page source

`sh build.sh` writes `../index.html`, the whole body of the Notion row page (https://app.notion.com/p/3e25c17b0d0d813ba021d805ba80ef54, a row of the Papers database; its properties Paper, Takeaway, Topics and Year stay in Notion). The page has no child pages, databases or video. Built from `.claude/skills/explainer-page/page-kinds/paper.md`, starting from the JIT-Agent page's copy of the reference pieces (`build.sh`, `mk_paper.py`, `11_js_ui.js`, `check_page.mjs`, `mk_coverage.py` with its item list replaced, the CSS).

## Tabs

| Tab | id | What it holds |
|---|---|---|
| The paper | `t-read` | (since 2026-10-26, v2 order) Card, the core sentence and hero figure with You need and New terms, Problem, Idea, Method (tree, online rollout, replay rules with the replay stepper and its budget-preference select, v2's Eq. 1 with the area figure of one world, selection, what the area does to the starting policy), The released code against the text, the policy and agent prompts (Appendix D), Setup with the round-by-round race animation (six runs decoded from Figures 3 and 4b), Kernels with PACEvolve (predict question: VGG16 at matched performance), Maths, Lasso (predict question: datasets won), Harness (Figure 5 chart), Analysis (Table 2, Figures 6, 7), How much to believe, What it takes to use this (dated block, What changed from v1), Why it matters, Connections. |
| Dream over a recorded tree | `t-run` | The live ingredient: §3's replay simulator on illustrative 10 × 11 worlds (its step animation and the area figure sit in Reading's Method and use this tab's history); the dream sweep (504 candidates plus the fixed policy, scored by v2's Eq. 1 as the released code computes it, or by v1's Eq. 1, on t recorded worlds); the winner deployed on 300 fresh worlds at a chosen budget preference, same kind or "gains arrive later". |
| The paper's tables and figures, rebuilt | `t-tables` | (v2 numbering) Figure 3 at any budget with PACEvolve's final value; Table 1 with SimpleTES's omitted Together AI row; Figure 4(a) with per-dataset ratios against any row and an arithmetic/geometric toggle, the SimpleTES provenance box; Table 3; Table 2 on the ConvDiv curve, Figures 6 and 7 rebuilt; all 70 checks with a v1-claims filter. |
| Further reading | `t-more` | Generated from `paper.json`. |

## Departures from papers.md (and why)

- **Live ingredient is a simulator of the method, not a trace replay of the paper.** papers.md suggests a trace replay for agent papers, but no trace, tree or program is released (README release plan, 3 October 2026). The paper's mechanism is itself a replay procedure, so the tab implements §3's replay rules and Eq. 1 exactly and runs them on generated worlds, labelled illustrative; it measures what the method can and cannot do (the ceiling, the in-sample guarantee, the β dependence) rather than any paper number. The engine is checked against an independent Python implementation (`check_sim.py`, 1,512 of 1,512 pairs agree).
- **The real numbers get their own animation in Reading.** The before/after Khalid prefers is the round-by-round race of the two methods on the paper's own decoded curves, one task at a time, to scale.
- **No Then and now.** A 2026 method paper; "What it takes to use this" covers adoption.
- **The page follows arXiv v2 since 2026-10-26** (it followed v1 until then): `ax:` links and margin labels are checked against `inputs/anchors_v2.txt`, and a new `ax1:` macro links v1 (checked against `inputs/anchors_v1.txt`) from the closed "What changed from v1" block. The runs both versions draw are taken from the v1 decode (`inputs/figs.json`); `recompute.py` checks that v2 redraws them (0.0002 per ms, 0.2 ms).
- **Reading tab is long (31 minutes plus 8 in closed details since the v2 rewrite; 24 plus 4 after the light pass; the old page was 4).** The old page was an abstract-level summary; this one owns the method details, the prompts (whose objective differs from Eq. 1) and an evidence section that changes the reading.

## Files

- `save_live.py`: copied the Notion fetch verbatim from the agent transcript into `live.md`.
- `extract_paper.py`: arXiv HTML v1 to `inputs/paper_v1.txt`, `tables_v1.txt`, `anchors_v1.txt`.
- `decode_figs.py`: Figures 3(b), 4, 5 and 6 from the arXiv HTML's vector SVG to `inputs/figs.json` (transform composition, tick-mark calibration, residuals reported).
- `fetch_extracts.py`: verbatim extracts of SimpleTES (Supplementary Table 16, Table 1 rows, default budget), the project page, the README, the repository file list and the Hugging Face ranking to `inputs/extracts.txt` (em dashes in sources marked, not kept).
- `mk_tables.py`: `tables.json` (Figure 3a, Table 1, decoded figures, SimpleTES rows), with asserts against printed values.
- `recompute.py`: 56 checks to `inputs/recompute.json` (27 printed numbers reproduce, 1 partly, 3 do not; 25 added checks).
- `parts/14_js_simcore.js`: the replay engine (plain JS, also loaded by Node); `check_sim.py` checks it to `inputs/check_sim.json`.
- `check_score.py`: the page's port of v2's score against the released code (`--released <clone>` refreshes `inputs/score_released.json`; the build compares and writes `inputs/check_score.json`).
- `decode_figs.py ... v2` wrote `inputs/figs_v2.json` (harness, PACEvolve and the v2 redraws).
- `mk_paper.py`, `paper.json`: card, Further reading, `window.PAPER`.
- `mk_coverage.py` writes `coverage.json` (25 items, this paper's own, verified against the built page).
- `check_page.mjs` (run from the repo root with node): every control in both themes and widths, both animations stepped for every task and world.

## Checks (3 October 2026)

`checkpage.sh` fail=0 (emdash 0, errbox 1, clipped 0); `check_page.mjs` 0 problems; `recompute.py` 27 of 31 printed claims reproduce (1 partly, 3 do not); `check_sim.py` PASS; `mk_coverage.py` 25 of 25.

## The 2026-10-25 light pass (teaching contract)

What changed and why:
- **Top**: the core sentence, then a hero redrawn as static SVG (`mk_hero.py` writes `parts/03a_hero.svg.html`): record a run, replay a revised policy on the record, redeploy the best, on an illustrative 6 × 6 grid where the replayed policy reaches the same best in 18 of 36 attempts and never above it; below it the Lasso (550 to 317 calls, faster on 1 of 6 datasets) and VGG16 (2.43× by budget, 1.89× matched) numbers. The paper is under arXiv's non-exclusive licence and the repository's figures carry no licence, so no paper figure is embedded and no real image fits (nothing physical to show). Then "You need" (Model-based RL and planning) and the new terms.
- **Lab moved into Reading**: the replay stepper (one recorded world, fixed policy against the dreamed winner) and its predict question now sit in Method beside the replay rules they illustrate, labelled illustrative; the Dream tab keeps the sweep and the deployment, which are tools across the page.
- **Owned elsewhere, a sentence kept and linked**: Dyna, Dreamer and model-based RL in general (Model-based RL and planning).
- **Closed**: how the page was built and what it corrects, the policy prompt's rules (an open summary keeps the four that matter), the Lasso correctness rule and datasets, the discovered solver, and the bullets of What it takes to use this (one summary paragraph stays open).
- **Volatile**: one dated closed block, "Since the paper (dated: checked 25 October 2026)", inside What it takes to use this: the code release (google-research/dream-rsi, Apache 2.0, 6 October; not yet checked against the text), arXiv v2 (6 October: Pareto hypervolume objective, M = 4, a harness task, a history ablation, PACEvolve; v1 headline numbers unchanged), and the Hugging Face upvote readings. The method and evidence sections point to it where v2 answers a v1 gap.
- **Trimmed**: the third paragraph of Why it matters (it repeated Connections); the Agora comparison softened to match the Agora page (concentration on one lineage, the intervention untested).
- **No autoplay**: `makeAnim` patched as on Terminal-Universe; `90_js_tabs.js` replaced by the skill template `99_js_tabs.js` (storage key `drsi-tab`), keeping the `data-to` scroll target. `check_page.mjs` fails if either animation draws a frame before a click and opens every closed block.
- **Takeaway scoped** (paper.json with a new `takeaway_note`, so the card, `live.md` and `mk_coverage.py`; `mk_paper.py` prints the note): "competitive or better ... at substantially lower discovery cost across" three domains became one run per setting, savings in several settings with their matched-performance values, a lost maths task, a Lasso average carried by one dataset, and the uncounted development agent. The Notion property needs the same edit.
- `inputs/paper_v1.txt`: its two em-dashes written as `--`; no author emails were present. `extract_paper.py` now writes `--` and redacts emails; it extracted v2 to `inputs/paper_v2.txt`, `anchors_v2.txt` and `tables_v2.txt` (for the dated block only). Header: "Reading: 24 min, plus 4 in closed details." from `reading.json`.

## Length judgement
| | Before (audit 2026-10-23) | After |
|---|---|---|
| The paper, core | 23.4 min (5,371 words) | 24.4 min (5,607) |
| The paper, closed | 0 | 4.2 min (968) |
| Dream tab | 4.4 min (1,022), 3 visuals | 3.4 min (783), 2 visuals |
| Tables; Further reading | 9.2; 3.6 min | unchanged |
| Visuals in Reading (audit) | 1 | 3 (the hero and the replay stepper) |

Why about 24 minutes is right: the core grew by a minute because the top (about 250 words) and the replay stepper's caption and predict question moved in, while about 900 words of setup, prompt rules and adoption detail closed. What stays open is the method in the paper's order and an evidence section whose every point changes the reading (one run per arm, matched-performance ratios, the one-dataset Lasso average, the uncounted dreaming, the replay ceiling). Shorter would mean closing evidence the verdict rests on.

## Knowledge ledger (`ledger.json`, labelled by `label_ledger.py`)
304 units: core 278, depth 22, owned 1, volatile 3, fat 0. 292 drafted by `ledger.py init` from the page before the pass; 12 added. Nothing was deleted. `ledger.py check`: problems 0.

## Checks (25 October 2026)
`checkpage.sh`: tabs 4, about 174 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 938 actions, 0 problems (no frame before a click). `mk_coverage.py`: 25 of 25. `recompute.py` and `check_sim.py` run in the build unchanged.

## The 2026-10-26 v2 rewrite (Khalid's decision 12)

The page now follows arXiv v2 (6 October 2026) and the released code. What changed and why:
- **v2 against v1** (`inputs/paper_v2.txt`, re-extracted; `extract_paper.py` now unescapes math alttext after stripping tags, which had swallowed text after any `<` in a formula, in both versions): Eq. 1 is now a normalised hypervolume of (calls, attainment) points over five budget preferences ρ minus λ × completed rounds per call, matching the unchanged prompts; M = 4 (current policy plus three rewrites) and per-task T, W, B in Table 3; a ninth task, harness optimisation on Terminal-Bench 2.1 with Claude Opus 4.8 (0.7247 to 0.8090, 129 to 144 of 178 trials, no fixed-policy run); Table 2's history ablation on ConvDiv (1.90 at 786 against 1.59 at 430); PACEvolve as a kernel baseline with Appendix C (48-hour cap, 220 to 249 generations); the dagger, GPU (L40S) and machines defined; the Pro Lasso gain now said to be "driven by RCV1"; v1's "1.7×", "over 50×", "fewer than 1,000 generations", "consistently" (twice) and "generalize well" claims dropped; sections reordered (kernels 4.1, maths 4.2, Lasso 4.3, harness 4.4) and figures and appendices renumbered. The headline numbers and the decoded runs are unchanged. All of this is in the closed block "What changed from v1".
- **The code** (google-research/dream-rsi, Apache 2.0, commit 8ec35bd of 8 October 2026, cloned to scratch, never into the repo), read against the text. It matches on the frontier, the area, ρ ∈ {0, 0.25, 0.5, 0.75, 1}, M = 4, W = 10 and Table 3's rounds. Mismatches: λ = 0.05 only in the code; the penalty counts ⌈c / W⌉ rounds per batch and the code does not cap batches at W; no K₂; a batch may open several roots in any order (§3: the earliest unopened, once per round); worlds with best ≤ 0 or under 2 evaluated nodes are skipped and zero-call replays are left out of the penalty mean (text: divide by |ℛ|); selection ties go to the later rewrite and up to 9 more rewrites run if nothing qualifies; `plan_grid` (the next online grid) is not in §3, and an out-of-support plan drops that budget preference. The starting policy ignores ρ, so its area is exactly 0 and its score −0.005. Not released: the harness task, recorded trees, discovered programs; the maths and Lasso tasks come from SimpleTES (AGPL-3.0). The 39 released tests of the replay, policy and learning modules pass on CPU in 0.24 s.
- **Ported score next to the toy** (`parts/14_js_simcore.js`: `SIM.sched`, `sweep`, `front`, `Vhv`; the pool gains the fixed policy as a ρ-blind candidate, 505 in all). The toy's ρ schedule is invented (width × (0.4 + 0.6ρ), patience × (0.5 + 0.5ρ), pruning threshold + 0.1(1 − ρ)) and follows the released template's rule. `check_score.py --released <clone>` runs the released code once (3 s on CPU) and stores its outputs in `inputs/score_released.json`; the build reruns `check_score.py` without the clone and compares the page's JS with them: the score function on all 505 candidates (largest difference 2.2e-16); the released `eval.py --beta-sweep` end to end on the page's three default worlds written as released traces, for 10 policies (the released parallel-refine incumbent and nine toy policies written against the released policy API), 150 replays with 0 mismatches in calls, rounds and best and scores to 2.2e-16; and 5 hand-computed frontier cases (exact). The result is in `inputs/check_score.json` and on the page. `check_sim.py` still checks the replay and v1's Eq. 1 against an independent Python port (1,515 pairs).
- **New visuals:** the area figure of one world (Method), the harness chart (Reading), Table 2 on the ConvDiv curve and PACEvolve's line (Tables), the score toggle and deployment ρ (Dream tab); rows P-dream_rsi.v1 to v5 in `viz_ideas.md`.
- **Data:** `decode_figs.py` takes a version argument and wrote `inputs/figs_v2.json`; `mk_tables.py` reads the v2 text and adds `pace`, `harness`, `hist` and `config`, and its keys are now by content (`lasso_dyn`, `kern`, `guide`, `behav`) because v2 renumbers the figures. `recompute.py`: 70 checks; 35 of v2's numbers reproduce, 0 partly, 0 do not, 30 added, 5 test v1-only claims (verdict "v1 only"). It found that Figure 3 draws PACEvolve's line above its printed value on three panels.
- **Takeaway rescoped** (`paper.json` takeaway and takeaway_note, the card, `mk_coverage.py`): v2's objective, and the harness gain without a baseline and selected on its own suite. The Notion property needs the same edit. Venue now "11 pages (v2)".
- **Moved into closed blocks:** the four code-text differences, the rest of the code reading, the SimpleTES row provenance, and everything only v1 said.

## Length judgement (2026-10-26)
| | Before (25 October, audit) | After |
|---|---|---|
| The paper, core | 24.4 min (5,607 words) | 30.6 min (7,041) |
| The paper, closed | 4.2 min (968) | 8.1 min (1,853) |
| Dream tab | 3.4 min (783), 2 visuals | 4.3 min (986), 2 visuals |
| Tables; Further reading | 9.2; 3.6 min | 13.1; 3.8 min |
| Visuals in Reading (audit) | 3 | 5 (adds the area figure and the harness chart) |

Why about 31 minutes is right: v2 adds a ninth task in a fourth domain (harness, about 400 words with its evidence box), a second kernel baseline, a history ablation and a new objective whose consequence for the starting policy changes how the selection guarantee reads; the code check adds a section the verdict now rests on. The v1-only material went into a closed block rather than the core, and the code differences and SimpleTES provenance were closed. Shorter would mean closing evidence the verdict uses.

## Knowledge ledger (2026-10-26)
316 units: core 277, depth 34, owned 1, volatile 4, fat 0. 304 carried over (72 re-keyed or relabelled by `label_ledger.py`, 14 of them through its KEYS map; units only v1 had now sit in the closed v1 block and label depth), 12 added for v2. Nothing deleted. `ledger.py check`: problems 0.

## Checks (26 October 2026)
`checkpage.sh`: tabs 4, about 211 KB, fail=0, emdash 0, errbox 1, clipped 0. `check_page.mjs`: 970 actions, 0 problems (no frame before a click). `check_score.py` PASS, `check_sim.py` PASS, `mk_coverage.py` 25 of 25. Header "Reading: 31 min, plus 8 in closed details." from `reading.json` (audit 30.6 and 8.1).

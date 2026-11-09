# Coding benchmarks: page source

`sh build.sh` writes `../index.html`. When inputs change: `python3 recompute.py && python3 mk_data.py && sh build.sh`, then `node check_controls.mjs` (every 2D control in both themes and widths, the page's numbers against `recompute_out.json`, and Fig. 4 autoplaying in view and still under reduced motion), `node check_stages.mjs` (the three 3D stages; see below), `python3 mk_coverage.py` and `python3 ../../../../html_utils/ledger.py check technical_knowledge_base/measurement/topic_benchmarks/coding` (from the repository root).

Shape: child page per `.claude/skills/explainer-page/page-kinds/topic-child.md`, rebuilt 2026-10-24 to the teaching contract. Tabs: Reading (`t-read`), Further reading (`t-more`). Storage key `codebench-tab`. Statuses, saturation series and same-model readings are the parent's tabs (Benchmark atlas, Saturation timeline, Same model, many numbers), linked, not rebuilt.

## Data (all read 2026-10-04; large downloads kept outside the repo, reduced by `mk_inputs.py`)
- `inputs/lcb_compact.json`: LiveCodeBench board, per-problem correct counts for 28 models on 1,055 problems (from performances_generation.json).
- `inputs/humaneval31.json`: HumanEval/31 prompt, tests, and HumanEval+ v0.1.10 base and plus inputs. The three Codex samples are from the Codex paper, Appendix B (indentation restored), run in `recompute.py` with a 1 s per-input limit (this page's rule).
- `inputs/swe_django_11099.json`: the full SWE-bench Verified row (HF datasets-server) plus Django's validator tests at the base commit. `inputs/verified_stats.json`: counts over all 500 rows and the verbatim-leak rule.
- `inputs/rebench_split.json`: SWE-rebench rates before and after each model's release, from the board's embedded data.
- `inputs/realswe_page_2026-10-04.txt`: text of the Real-SWE page (per-task passes out of 8); its one em-dash was replaced by `--` on 2026-10-24 (`recompute.py` output unchanged).

## Files
| Part | What |
|---|---|
| `10_header.html` | title, subtitle with reading time, tab bar |
| `20_read_0style.html` | Reading CSS (old styles plus the moved tabs' styles, scoped under `#t-read`) |
| `20_read_a.html` | nav; the idea in one screen (core sentence, hero, you need, new terms); the one-screen table |
| `20_read_b.html` | functions and pass@k (real pass@k curves; closed: the estimator's bias animation, calculator, bias plot); weak tests (HumanEval/31 animation, BigCodeBench) |
| `20_read_c.html` | contest problems (LiveCodeBench monthly chart; closed: board for a window, five-model split, ratings ladder); SWE-bench (one task's patches and the harness stepper, Verified stats, the harness effect); SWE-bench's flaws (probes chart, leak list) |
| `20_read_d.html` | SWE-bench Pro (versions and splits to scale); three answers to contamination (SWE-rebench null result, Real-SWE drop-a-task, SchrodingerRepo bars) |
| `20_read_e.html` | other benchmarks; how to read a reported coding score; what to use; dated readings (closed table); closes the tab |
| JS | `21_js_rd_common.js` (skill template, never autoplays), `22_js_data.js` (generated), `23_js_math.js`, `24_js_rd_pk.js`, `25_js_rd_he.js`, `26_js_rd_misc.js`, `27_js_rd_hero.js` (hero and probes chart, `window.RDB`), `28_js_rd_pklab.js`, `29_js_rd_lcb.js`, `30_js_rd_task.js`, `99_js_tabs.js` (skill template) |
| `39_tab_more.html` | Further reading |

Scripts: `recompute.py`, `mk_data.py`, `mk_inputs.py`, `mk_coverage.py` (56 coding facts from the old Math and coding page; 56 verified after the rebuild), `check_controls.mjs` (replaces `check_page.mjs`), `ledger.json`, `viz_ideas.md`.

## The 2026-10-24 rebuild: what changed and why
- **Top**: the core idea in one sentence (a coding score also measures the tests, the tasks and the harness; the field moved function, contest, repository as each broke) and a new static hero: the pipeline task, model in a harness, tests, score, with one published same-model pair per lever (MBPP 95.5 to MBPP+ 80.2 for o1-preview; SWE-Bench Pro V2 public 99.4 to private 81.6 for Claude Opus 5; Verified 46.8 to transformed 35.6 for GPT-5.4-mini; Pro V1 public 23.3 at 200 turns to 41.8 at 250 uncapped for GPT-5). Then "You need" (parent, harness pages, test-time compute, eval statistics) and seven new terms.
- **Lab tabs moved inline** (each explained one mechanism): pass@k's real curves now sit beside the pass@k claim (the bias animation, calculator and bias plot in one closed block, since pass@k estimation belongs to Test-time compute); the LiveCodeBench monthly chart sits beside the calendar claim (board-for-a-window and the five-model split closed); the One SWE-bench task stepper is now the SWE-bench section's worked example (gold patch and test patch shown, issue text and pass-to-pass names closed; the duplicate Verified stats panel dropped). The three tabs are gone.
- **New visuals**: the hero; a probes chart for SWE-bench's flaws (SWE-Bench+ 12.47 to 3.97; Illusion file-path 76 vs 53 and 5-gram 35 vs 18). Every visual title now says what to notice; predict prompts before the HumanEval/31 animation, the LiveCodeBench chart, the harness stepper, the SWE-rebench split and the Real-SWE grid.
- **Volatile scores** ("where it stands" sentences, board tops, vendor claims) moved into one dated table in a closed block at the end (19 rows, vendor figures marked).
- **Scaffold dependence** is now its own subsection with the GPT-5 23.3 against 41.8 pair, linking Harnesses for training and Other coding harnesses; **how to read a reported coding score** is a seven-question checklist that absorbed the old Common mistakes list (each mistake now a question with its evidence).
- **Depth into closed blocks**: provenance (Codex's 159 GB, temperatures), EvalPlus input counts, BigCodeBench variants, LiveCodeBench scenarios and grading, the ratings ladder, Lite and Multimodal, SWE-bench-Live, Real-SWE failure modes and cost, Aider's old benchmark, Phi-Bench categories, Doc2Harness, every correction to the old page.
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates; the HumanEval and harness steppers no longer start on a mode switch; `check_controls.mjs` scrolls each animation into view with normal motion and fails if it moves.
- **Deleted as fat** (16 ledger units): the old tab bar and nav, "This tab is about 27 minutes", pointers to removed tabs, wind-ups, a stats-panel heading duplicating the Verified bars, a restatement in What to use.
- **Images**: none. The page is about procedures and scores, not a physical object; the one canonical figure (SWE-bench's Figure 1, the task pipeline) is a mechanism the harness stepper shows on a real task, so a redraw or embed would repeat it.

## Length judgement
| | Before (audit 2026-10-23) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute, `html_utils/audit_pages.mjs`) | 30.4 min | 29.3 min |
| Closed details | 1.3 min Reading + 1.1 min One SWE-bench task | 13.0 min |
| Lab tabs, core | pass@k lab 2.5 + LiveCodeBench by date 2.9 + One SWE-bench task 3.5 = 8.9 min | gone (moved inline) |
| Core total excluding Further reading | 39.3 min | 29.3 min |
| Further reading | 2.7 min | 2.9 min |
| Visuals counted by the audit in Reading (SVG, canvas, img) | 1 | 6 (plus HTML-drawn visuals the audit does not count: HumanEval grid, harness stepper, Verified bars, Pro splits, SWE-rebench split, Real-SWE grid, SchrodingerRepo bars) |

Why about 29 minutes is right: the page owns some twenty coding benchmarks across three generations plus the two ideas every coding score depends on (pass@k as reported, scaffold dependence), and each benchmark keeps exactly what is needed to read its score: unit of work, how it is graded, its defence against leakage, its failure, with the number. About a quarter of the core words are captions, counters and labels of the eleven inline visuals. The ten minutes cut came from moving the three lab tabs into the flow (their prose overlapped the Reading's), the dated scores into one closed table, and provenance, corrections and secondary benchmarks into closed blocks.

## Knowledge ledger (`ledger.json`; `ledger.py check`: problems 0)
313 units: core 223, depth 58, volatile 16 (in the closed dated table), fat 16 (each with a `note`), owned 0. 308 were drafted by `ledger.py init` from the pre-rebuild page; 5 were added by hand for script-drawn visuals (hero, probes chart, pass@k curves, monthly chart, harness stepper), keyed on their static titles and captions. Keys were proposed from each unit's numbers and quoted phrases, checked for rarity on the page, and set by hand where weak.

## Departures and notes
- The pass@k estimator's bias stays on this page, closed: OWNERS gives pass@k estimation to Test-time compute and reasoning, but that page carries the unbiased form only, not the plug-in's bias or the animation. Move it there, or record this page as the owner of the estimator's bias.
- Verified's status: an independent run (Vals AI, 1 Sep 2026) has Claude Opus 5 at 97.0%; the parent atlas still cites Epoch AI's 83.5% (April 2026). The parent atlas row could be updated.
- OpenAI's Verified post refused automated reading; the "more than two thirds filtered" share is from secondary summaries and is labelled so.

2026-10-26 (final follow-up sweep): the SWE-bench flaws section adds OpenAI's audit (material problems in 59.4% of 138 Verified tasks; about 30% of SWE-bench Pro broken), absorbed from Re-grading six physics benchmarks, which cites it.

## 2026-11-09: split layout, three 3D stages, explained and autoplaying step lists (the 2026-11-06 rollout)
- **Templates** `02_split.html`, `25_js_s3.js` (renderer v2), `21_js_rd_common.js` and `99_js_tabs.js` (key `codebench-tab`) copied unchanged; `build.sh` cats `02_split.html` after the Reading CSS, and its em-dash check now writes the character as bytes (`ED=$(printf ...)`), so the file holds none. `#t-read .an-ctl` rules no longer reach the stage bars (`:not(.stg-bar)`).
- **Three stages**, each with an `ol.sx` step list on the left and no per-step caption; scenes publish what they compute in `window.CBN`, which `check_stages.mjs` compares with the step lists:
  - Fig. 1 `stg-hero` (6 steps, `31_js_sc_hero.js`) replaces the static 2D hero: the pipeline (task, model in a glass harness, a wall of tests, the score) with flows, then one lever per step with the camera in close and its published pair as two bars (MBPP 95.5 to MBPP+ 80.2 with the wall growing from 3 asserts to 35 times as many; Pro V2 public 99.4 to private 81.6 with the stack split into public and a glass-boxed private set; Verified 46.8 to transformed 35.6; Pro V1 23.3 at 200 turns to 41.8 at 250 uncapped with the harness widening, one tick per 10 turns), then all four.
  - Fig. 2 `stg-he` (6 steps, `32_js_sc_he.js`) replaces the 2D HumanEval/31 grid and its sample chips: the three Codex samples as cards, each with a glass plate of 13 HumanEval and 154 HumanEval+ input cells that light as they run (green passed, orange wrong, grey over 1 s), from `CD.he.res`; the camera moves in on sample 6. The code of the three samples is static text under the list (`25_js_rd_hecode.js`).
  - Fig. 3 `stg-swe` (4 modes of 6 steps, `33_js_sc_swe.js`) replaces the 2D harness stepper: the container at the base commit with the repository as a stack of files, the candidate patch and the test patch landing on `validators.py` and its test file, the 3 fail-to-pass and 19 pass-to-pass cubes, the verdict. The candidate chips swap four static step lists; the per-username results moved into a closed block that follows the chosen candidate (`window.TKD` in `30_js_rd_task.js`).
- **Fig. 4** (the estimator's bias, 2D `RD.anim`, in its closed block): the 20 draws are grouped into five stretches of four (the long-replay rule), 7 steps explained by `sx-pk`; the script caption became that list, with the values computed by `CM` (checked).
- **Splits**: the idea (Fig. 1); pass@k as reported (text beside the real pass@k curves); Fig. 4 inside its closed block; weak tests (Fig. 2); contest problems (LiveCodeBench intro beside the monthly chart); SWE-bench (Fig. 3; then the Verified paragraphs beside the Verified counts); SWE-bench's flaws (beside the probes chart); SWE-bench Pro (beside the splits to scale); SWE-rebench, Real-SWE and SchrodingerRepo (each beside its chart). Full width: You need and terms, the one-screen table, the HumanEval and MBPP history, BigCodeBench, LiveCodeBench Pro and Codeforces, the patches and issue, the harness subsection, the three answers cards, Other benchmarks, Read a score, Dated readings and every closed block's widgets.
- **Kept 2D**: the pass@k curves, the LiveCodeBench monthly chart, the probes, the Verified counts, the Pro splits, the SWE-rebench interval chart, the Real-SWE grid, the SchrodingerRepo bars, all tables: curves, intervals, counts and tables read best flat. No 3D pass@k-from-samples stage: Agentic benchmarks Fig. 3 draws the same estimator on real runs and is linked from the pass@k section (with Agent and trajectory evaluation, which owns the formula).
- **Checks**: `check_stages.mjs` (new, adapted from Agentic benchmarks); `check_controls.mjs`: the HumanEval and harness stepper loops are replaced by the candidate chips and their username checks, and the no-autoplay check is inverted (Fig. 4 plays once in view, stays still under reduced motion).
- **Ledger**: 331 units (core 238, depth 60, volatile 17, fat 16): 3 keys moved to the step lists (29, 47, 49), 8 units added for facts that are now static step-list text.
- **Length** (`audit_pages.mjs`, 230 wpm): Reading core 31.3 to 36.2 min (7,201 to 8,336 words), closed 13.3 to 14.4, Further reading 3.0 unchanged; visuals counted 6 to 8. The growth is the step lists, which carry what the script captions said (text the audit did not count) plus the explanation of each stage; about 3 minutes of it are the three candidate lists of Fig. 3 that are hidden until their chip is chosen, so a reader reads about 33 minutes. Nothing was cut.

# Synthetic data: rephrasing, textbooks and model collapse (source)

Child 6 of Topic: data-curation-and-datasets. Built 2026-10-14. `sh build.sh` writes `../index.html` from `parts/` and `data/`.

## Layout
- `parts/`: `01_head.html` (shared CSS), `02_split.html` (split layout, skill template), `10_header.html`, `20_read_a` to `20_read_h` plus `20_read_z` (Reading: `a` CSS and the top, `b` sections 1 and 2, `c` 3, `d` 4 and 5, `e` 6, `f` 7, `g` 8 and 9, `h` closed depth), `21_js_rd_common.js` and `99_js_tabs.js` (the explainer-page skill templates; animations play once in view, 2026-11-09; storage key `sy-tab`), `25_js_s3.js` (3D renderer v2, template), scenes `26_js_sc_op.js`, `27_js_sc_rw.js`, `28_js_sc_col.js`, `22_sy_rd0_hero.js` (hero), `22_sy_rd1.js`, `23_sy_rd2.js`, `24_sy_rd3_rephrase.js` (four styles, run and pairs tables, moved from the old Rephrasing lab), `25_sy_rd4_collapse.js` (categorical collapse, moved from the old Collapse lab), `33_*` Diversity meter, `39_tab_more.html`.
- `img/`: Shumailov et al.'s Figure 1 (CC BY 4.0), credits in `img/CREDITS.md`. `ledger.json`: the knowledge ledger. `check_controls.mjs`: clicks every control at 390 dark, 920 light and under reduced motion. `check_stages.mjs` (2026-11-09): stages and the 2D animation autoplay on view, step to their end with one list item per step, stop off screen and under reduced motion; the widgets never autoplay; splits two columns at 1400 px; step-list numbers recomputed from `window.SY` and `SYC`.
- `data/syn_data.json` (embedded as `window.SY`) and `data/facts.json` (prose numbers, `@@key@@`), both made by `build_data.py` from the recorded runs; `data/collapse_ref.json` is the Python reference run of the collapse lab.
- `scripts/`: every measurement (see below). `notes/sources.md`: verified facts with their sources. `inputs/`: sample manifest (repo, revision, file, row group, sha256), the five Nemotron-CC source records, sha256 of the Nemotron-CC slices.
- `coverage.md`: the old Notion page's claims (synthetic half), verified, corrected or moved. `viz_ideas.md`: visuals built and rejected.

## Runs (all CPU, Apple M1 Pro, 2026-10-14; large outputs in the scratchpad under `dc/data/syn/` and `dc/syn/`)
| Script | What | Time |
|---|---|---|
| `get_nemotron_synth.sh` | first 3,000 rows of 8 Nemotron-CC files for CC-MAIN-2024-30 (real high/low, 5 synthetic kinds, low rephrased) | 2 min |
| `get_synth_samples.py` | 1,000-row seeded samples of 8 Cosmopedia subsets, Cosmopedia v2, TinyStories, 3 MegaMath synthetic subsets; plus the full TinyStories validation split | 1 min |
| `get_sources.py` | the Common Crawl records behind 5 Nemotron-CC rows (record ids checked), extracted with jusText and trafilatura | 1 min |
| `measure_sets.py` | distinct-n, gzip ratio, openings, MinHash near-duplicates, benchmark 13-grams, LLM-phrase rate for 24 sets | 3 min |
| `embed_sets.py` | FineWeb-Edu classifier scores and embedding similarity, 300 docs per set, 4 threads | about 70 min (shared machine) |
| `budget_curves.py` | distinct-n and gzip at 5 word budgets (for the meter's own-text comparison) | 15 s |
| `cosmo_examples.py` | the 4 Cosmopedia rows shown, and the "Once upon a time" avoidance table | 5 s |
| `collapse_categorical.py` | the categorical collapse reference run and 50-seed spread | 25 s |
| `collapse_bigram.py` | bigram LM refit 10 generations on TinyStories, three workflows | 1 min |
| `run_rephrase.py` + `analyze_rephrase.py` | 200 running-example pages x WRAP's 4 styles, Qwen3-4B Q4_K_M via llama-server on the GPU (4 parallel requests), then CPU analysis with the FineWeb-Edu classifier (an earlier 2-page CPU smoke test checked the pipeline) | 73 min GPU + 1.5 min CPU |
| `check_page.py` | embedded data equals `data/`, all facts filled, 13 facts recomputed independently | 1 s |

## GPU run (`scripts/run_pending.sh`)
Job 1: rephrase 200 running-example pages in WRAP's 4 styles with Qwen3-4B (Q4_K_M, llama-server on the GPU, 4 parallel requests, `-cram 0`), then `analyze_rephrase.py` on CPU. Run 2026-10-16 under the bench lock (see the Rephrasing lab). A second job (a 3.66M-parameter GPT trained replace-vs-accumulate on TinyStories) was dropped on 2026-10-15 (Khalid: skip expensive runs that teach little); the Collapse lab cites Gerstgrasser et al.'s Table 2 and the two CPU toys instead.

## Departures from the child-page method
Reading, one tool tab (Diversity meter), Further reading; the two mechanism labs moved inline on 2026-10-24. The collapse simulation on the parent page (one-dimensional Gaussian) is linked, not rebuilt; this page uses a categorical model and a bigram language model instead.

## The 2026-10-24 rebuild to the teaching contract
- **Top**: the core idea in one sentence; a static hero (`22_sy_rd0_hero.js`: three lanes, generate from seeds, rephrase or transform, generate and verify, into a measuring gate, a mix that keeps all real data, the student, and the red collapse loop; a stacked layout below 640 px); "You need"; new terms. The families table and the "five things" box: the table is a closed reference block; the five things were recaps of sections 2, 3, 5, 6, 7 (fat).
- **Lab tabs moved inline**, because each explained one mechanism: the Rephrasing lab's WRAP four-style stepper now opens section 3 (the before/after of one real page, as the brief asked), its 200-page table and the Nemotron-CC pairs table sit in closed blocks; the Collapse lab's categorical simulation is now section 7's picture of tails dying, with its settings and the Python parity check in a closed block. The Diversity meter stays a tab (a tool used across the page).
- **New**: the instruction-data strategies table in section 2 (Self-Instruct, Evol-Instruct, Persona Hub, Magpie, distillation data, as generation strategies; numbers as on Post-training data, which keeps the datasets and Self-Instruct's filter animation); MegaMath's Table 6 as bars in section 4; Shumailov et al.'s Figure 1 (CC BY 4.0) beside "The experiment, exactly".
- **Moved to closed blocks**: phi details, Cosmopedia v2, WRAP's self-contradictions, Nemotron-CC's settings, later rephrasing studies (REWIRE, BeyondWeb, Kimi K2, Kang et al., FinePhrase; a core "where the evidence agrees" box stays), the LLM-phrase measurement, collapse theory and image-model papers, the pipeline's eight stages, mistakes that teach, two design questions.
- **No autoplay**: template `21_js_rd_common.js`; mode switches reset to step 0 instead of playing. `check_controls.mjs` checks that every animation is still on step 0 after 2.5 s.
- Corrections made on the way: the Diversity meter said "Twelve measures" (it has 11); the survival calculator's default is now 1 in 100,000 so the card's title holds at the defaults (at most 1.0% survive 10 generations; (1 - e^-1)^10).

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 words a minute) | 41.7 min | 36.9 min |
| Reading, closed details | 3.4 min | 12.1 min |
| Other tabs, core | Rephrasing lab 6.2 + Collapse lab 2.9 + Diversity meter 2.5 = 11.6 min | Diversity meter 2.5 min |
| Core total, excluding Further reading | 53.3 min | 39.4 min |
| Visuals drawn in Reading (svg, img) | 1 | 5 |

Why about 37 minutes is right: the page owns five subjects (generation from seeds, rephrasing, checked synthesis, measuring a set, model collapse) plus the licence table other pages link to, and the ledger's core is almost all evidence with its source. About 1,000 core words are the real example documents shown in the steppers (read as images, not prose) and about 1,000 are captions and tables of visuals. What made the old page long, besides the two lab tabs, is now in closed blocks.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
426 units: core 314, depth 84, fat 28. 415 drafted by `ledger.py init`; 11 added by hand for the hero, script-rendered tables and new material (section "added 2026-10-24"). Fat units carry a `note` (recaps, headings, pointers to removed tabs, interview answers that restated sections).

## Topic close (2026-10-24)
The root was rebuilt as a map; this page's Further reading now quotes the root as "31 min, plus 7" and siblings as their headers, and its ledger keys that quoted old times were re-keyed.

## 2026-11-09: split layout, three 3D stages, explained and autoplaying animations (the 2026-11-06 rollout)
- **Templates** copied unchanged: `02_split.html` (after `01_head.html` in `build.sh`), `25_js_s3.js` (renderer v2), `21_js_rd_common.js`, `99_js_tabs.js` (key `sy-tab`). `build.sh` writes its em-dash check from octal bytes. The Reading CSS no longer forces SVG text to 11 px; the hero's labels are 12 px.
- **Fig. 1 `stg-op`** (section 2, 5 steps, `26_js_sc_op.js`; replaces the nine-set openings bars as the visual, which moved into a closed block): 1,000 documents as cubes (one per five), seeds through the generator plate into TinyStories, then sorted by first three words into towers and a flat field; Cosmopedia's stories by whether the prompt banned "Once upon a time"; FineWeb sorted the same way; MinHash's glass plate finding no near-duplicate. Data: `SY.sets` openings, `SY.cosmo.avoid`. Placed after the TinyStories predict-then-reveal, so it does not answer it first.
- **Fig. 2 `stg-rw`** (section 3, 5 steps, `27_js_sc_rw.js`): one running-example page's words as cubes (height is length; gold names), WRAP's four prompts as glass plates, each rewrite as a block with copied words teal, then the 200-page run's numbers kept, names kept and new 4-grams per style. Data: `SY.rephrase_smoke` (copy test as `SYT.kept`, names as `SYRE.stats`), `SY.rephrase_stats`. A page picker replays it. The two shown pages contain no numbers, so the per-page blocks mark names.
- **Fig. 3** (section 3, 2D, the Nemotron-CC pipeline, 6 steps): the pill row and per-step caption became the step list `sx-nm`; the generation-settings block it repeated was removed (its facts are in the steps); it autoplays on view.
- **Fig. 4 `stg-col`** (section 7, 5 steps, `28_js_sc_col.js`): the categorical toy (`SYC.run`, the JavaScript twin of `collapse_categorical.py`, now exposed by `25_sy_rd4_collapse.js`) as a surface of rank bins by generation, replace then accumulate, then the four workflows' types alive at generation 30 over 50 seeds (`SY.collapse_ref`).
- **Widgets (long-replay rule, no autoplay)**: the categorical toy (31 frames, opens on generation 30), the bigram toy (opens on generation 10), the WRAP rewrite viewer (opens on Easy; Fig. 2 is its explained animation).
- **Splits** (Reading): the idea with the hero; Cosmopedia with its anatomy card; the diversity fix (Fig. 1); rephrasing (Fig. 2); the 200-page paragraph with the rewrite viewer; WRAP with its bars; Nemotron-CC (Fig. 3); MegaMath; mixing shares; the classifier bars; why the tails go first (Fig. 4); the categorical widget; the survival calculator; Shumailov's Figure 1 beside "The experiment, exactly"; the bigram toy; the cost calculator. Full width: section 1, TinyStories and phi, instruction methods table, evidence box and studies table, the measured table and measures of section 6, collapse follow-ups, section 8, depth. Diversity meter tab: kept full width (a reader-driven tool). Further reading unchanged.
- **Kept 2D**: the hero (a three-lane comparison), WRAP and MegaMath bars and mixing shares (numbers on one axis, from papers with different metrics, so heights across them would mislead), the Cosmopedia anatomy and Nemotron-CC pipeline (the texts are the lesson), the measured table and classifier bars, the survival calculator, the collapse curves, the cost calculator. Math and code with a checker was not built in 3D: the page has no per-item checker data, and the mechanism is Post-training data's Fig. 1 (now linked from section 4).
- **Checks**: `check_stages.mjs` new; `check_controls.mjs`'s never-autoplay assertion inverted (nothing off screen moves; widgets open where they should).
- **Ledger**: 24 Further-reading keys that began with a minutes figure re-keyed on the words after it; 8 keys re-keyed after rewording; 8 units added (section "added 2026-11-09").
- **Length** (`audit_pages.mjs`, 230 wpm): Reading core 8,638 to 9,608 words (37.6 to 41.8 min), closed 2,898 to 2,936 (12.6 to 12.8); Diversity meter 2.5 and Further reading 2.7 unchanged. The growth is the four step lists (about 1,000 words) that explain the stages and the Nemotron-CC animation; the Nemotron-CC captions they replace were written by script and not counted before, and the generation-settings block they repeated was removed. No knowledge was cut; this length stays right for the reason given in the 2026-10-24 judgement. Visuals counted in Reading 5 to 8 (the audit counts SVG and canvas; the HTML bar cards are not counted).
- **Ledger** after this pass: 437 units: core 325, depth 84, fat 28; problems 0.

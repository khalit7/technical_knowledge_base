# Synthetic data: rephrasing, textbooks and model collapse (source)

Child 6 of Topic: data-curation-and-datasets. Built 2026-10-14. `sh build.sh` writes `../index.html` from `parts/` and `data/`.

## Layout
- `parts/`: `01_head.html` (shared CSS), `10_header.html`, `20_read_a` to `20_read_h` plus `20_read_z` (Reading: `a` CSS and the top, `b` sections 1 and 2, `c` 3, `d` 4 and 5, `e` 6, `f` 7, `g` 8 and 9, `h` closed depth), `21_js_rd_common.js` and `99_js_tabs.js` (the explainer-page skill templates, never autoplay; storage key `sy-tab`), `22_sy_rd0_hero.js` (hero), `22_sy_rd1.js`, `23_sy_rd2.js`, `24_sy_rd3_rephrase.js` (four styles, run and pairs tables, moved from the old Rephrasing lab), `25_sy_rd4_collapse.js` (categorical collapse, moved from the old Collapse lab), `33_*` Diversity meter, `39_tab_more.html`.
- `img/`: Shumailov et al.'s Figure 1 (CC BY 4.0), credits in `img/CREDITS.md`. `ledger.json`: the knowledge ledger. `check_controls.mjs`: clicks every control at 390 dark, 920 light and under reduced motion.
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

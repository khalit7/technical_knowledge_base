# Synthetic data: rephrasing, textbooks and model collapse (source)

Child 6 of Topic: data-curation-and-datasets. Built 2026-10-14. `sh build.sh` writes `../index.html` from `parts/` and `data/`.

## Layout
- `parts/`: `01_head.html` (shared CSS, copied from the root), `10_header.html`, `20_read_a` to `20_read_z` (Reading; `a` holds the Reading CSS copied from the root's `20_read.html`), `21_js_rd_common.js` (root's RD helpers), `22_sy_rd1.js` and `23_sy_rd2.js` (Reading visuals), `31_*` Rephrasing lab, `32_*` Collapse lab, `33_*` Diversity meter, `39_tab_more.html`, `99_js_tabs.js` (storage key `sy-tab`).
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
| `run_rephrase.py` | CPU smoke test: 2 running-example pages x WRAP's 4 styles, Qwen3-4B Q4_K_M via llama.cpp | 12 min |
| `collapse_gpt.py` | CPU smoke test only (20 steps) | 3 min |
| `check_page.py` | embedded data equals `data/`, all facts filled, 10 facts recomputed independently | 1 s |

## Pending GPU runs (`scripts/run_pending.sh`)
1. Rephrase 200 running-example pages in 4 styles with Qwen3-4B on the GPU, then `analyze_rephrase.py` (CPU): 1.5 to 2 hours. Fills the Rephrasing lab's table (the dashed box disappears when `rephrase_stats.json` exists and `build_data.py` is rerun).
2. Word-level GPT (3.66M parameters) on 2M TinyStories tokens, 5 iterations, replace against accumulate: 2 to 3 hours on MPS. Fills the Collapse lab's table.

## Departures from the child-page method
None of substance: Reading, three labs, Further reading. The collapse simulation on the parent page (one-dimensional Gaussian) is linked, not rebuilt; this page uses a categorical model and a bigram language model instead.

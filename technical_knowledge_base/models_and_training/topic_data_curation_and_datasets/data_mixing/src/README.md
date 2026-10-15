# Source of "Data mixing, curricula and continued-pretraining ratios" (prefix mx2)

Child page of Topic: data-curation-and-datasets. Reuses the old Notion page "Data mixing" (old text in the root's `src/read/old/03_data_mixing.md`; claim-by-claim status in `coverage.md`).

## Build and check
- `sh build.sh`: runs `recompute.py` (every derived number and every check; writes `data/mx2_data.json` and `data/checks.json`), writes `parts/22_js_data.js`, assembles `../index.html`. Links `{{text|url}}`, `{{text|n:<notion id>}}`, `{{text|#t-<tab>}}`.
- From the repo root: `sh html_utils/checkpage.sh <page folder>` and `node <page folder>/src/check_page.mjs` (every control at 390 px dark and 920 px light with reduced motion; embedded data equals `data/mx2_data.json`; the page's JS reproduces `recompute.py` and `scripts/regmix_fit.py`; prose numbers match the data).

## Data and scripts
- `inputs/`: published tables cut by `scripts/extract_inputs.py` from arXiv HTML text and repos at pinned commits: `pile_table1.json` (The Pile, Table 1), `doremi_weights.json` (DoReMi Table 1 and repo configs at 7cde52d), `regmix_data/*.csv` (RegMix's released runs, MIT, at dd9d1c3), `regmix_1b_mixtures.json`, `smollm3_stages.json` (huggingface/smollm at 438be18), code excerpts `doremi_trainer_py_239_262.txt` and `megatron_helpers_cpp_77_135.txt` (NVIDIA/Megatron-LM at 80781ab). OLMo 2 tables are read from the OLMo 2 paper page's `tables.json` in this repo.
- `scripts/regmix_fit.py`: refits RegMix (linear, LightGBM with the notebook's settings, Data Mixing Laws form) on the released runs; writes `data/regmix_fit.json`. Run with `uv run --no-project --with numpy --with pandas --with scipy --with scikit-learn --with lightgbm`.
- `scripts/snippet_sampling.py` and `.out`: the code shown in Reading section 1 and its real output.
- `scripts/proxy_mix.py`: the tiny-proxy experiment (prep, train, sweep, doremi), designed for reuse by the root's Mixing lab; `scripts/fetch_pools.py` streams larger pools; `scripts/collect_runs.py` writes `data/proxy_runs.json`; `scripts/run_pending.sh` is the GPU-queue plan with time estimates. Only the CPU smoke test has run (`data/smoke.json`).
- Large outputs live in the topic scratch (`mix2/`), never in the repo.

## Shape, and why
Child-page method (topic_pages.md Part B): Reading by the subject's own logic (weights, repetition, proxy methods, online mixing and loaders, stages, CPT, local experiment, mistakes, interview), three lab tabs (DoReMi step by step, Mixing-law fitter, Token-budget planner), Further reading. Departures: the running example is The Pile's 22 domains rather than the topic's Common Crawl slice, because every mixing method with public results was run on The Pile; the topic's samples appear in the proxy experiment. The CMR calculator, replay toy, stage animation and anneal split are linked on the CPT and Pretraining pages rather than rebuilt.

## Parts
`01_head.html` (root CSS), `10_header.html`, `20_read_a` (labels, s0) to `20_read_e` (s6 to s9), `21_js_rd_common.js` (root helpers; `onRender`, `onResize` and `anim` take a tab id), `22_js_data.js` (generated), `23_js_mx2_rd.js`, `24_js_mx2_rd2.js` (Reading widgets), `30_tab_dr.html` + `31_js_mx2_dr.js`, `32_tab_fit.html` + `33_js_mx2_fit.js`, `34_tab_plan.html` + `35_js_mx2_plan.js`, `39_tab_more.html`, `99_js_tabs.js` (storage key `mx2-tab`).

Page size about 300 KB, mostly RegMix's runs (needed for the in-browser fits).

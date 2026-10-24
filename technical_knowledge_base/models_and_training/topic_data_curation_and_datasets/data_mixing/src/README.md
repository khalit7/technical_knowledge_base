# Source of "Data mixing, curricula and continued-pretraining ratios" (prefix mx2)

Child page of Topic: data-curation-and-datasets. Reuses the old Notion page "Data mixing" (old text in the root's `src/read/old/03_data_mixing.md`; claim-by-claim status in `coverage.md`).

## Build and check
- `sh build.sh`: runs `recompute.py` (every derived number and every check; writes `data/mx2_data.json` and `data/checks.json`), writes `parts/22_js_data.js`, assembles `../index.html`. Links `{{text|url}}`, `{{text|n:<notion id>}}`, `{{text|#t-<tab>}}`.
- From the repo root: `sh html_utils/checkpage.sh <page folder>` and `node <page folder>/src/check_page.mjs` (every control at 390 px dark and 920 px light with reduced motion; embedded data equals `data/mx2_data.json`; the page's JS reproduces `recompute.py` and `scripts/regmix_fit.py`; prose numbers match the data).

## Data and scripts
- `inputs/`: published tables cut by `scripts/extract_inputs.py` from arXiv HTML text and repos at pinned commits: `pile_table1.json` (The Pile, Table 1), `doremi_weights.json` (DoReMi Table 1 and repo configs at 7cde52d), `regmix_data/*.csv` (RegMix's released runs, MIT, at dd9d1c3), `regmix_1b_mixtures.json`, `smollm3_stages.json` (huggingface/smollm at 438be18), code excerpts `doremi_trainer_py_239_262.txt` and `megatron_helpers_cpp_77_135.txt` (NVIDIA/Megatron-LM at 80781ab). OLMo 2 tables are read from the OLMo 2 paper page's `tables.json` in this repo.
- `scripts/regmix_fit.py`: refits RegMix (linear, LightGBM with the notebook's settings, Data Mixing Laws form) on the released runs; writes `data/regmix_fit.json`. Run with `uv run --no-project --with numpy --with pandas --with scipy --with scikit-learn --with lightgbm`.
- `scripts/snippet_sampling.py` and `.out`: the code shown in Reading section 1 and its real output.
- `scripts/proxy_mix.py`: the tiny-proxy experiment (prep, train, sweep, doremi), designed for reuse by the root's Mixing lab; `scripts/fetch_pools.py` streams the five pools (about 100M characters each, pinned revisions); `scripts/collect_runs.py` writes `data/proxy_runs.json` (pools, the reference run, the DoReMi trajectory, weights and held-out losses); `scripts/run_pending.sh` records the exact commands. Run 2026-10-16: pools, tokenization, natural-share mix, and DoReMi (reference plus Group DRO proxy, 4,000 steps each, MPS, bench lock, about 35 + 52 min). Dropped by Khalid's decision of 2026-10-15 (expensive, teaches little): the RegMix-style sweep and the rank check; the page says "not run here" and cites the published results. `data/smoke.json` is the earlier CPU smoke test.
- Large outputs live in the topic scratch (`mix2/`), never in the repo.

## The 2026-10-24 rebuild: what changed and why
Rebuilt to the teaching contract (`.claude/skills/explainer-page/teaching/teaching-contract.md`) and **merged with the Continued Pretraining (CPT) page** (`models_and_training/topic_llm_training_and_post_training/continued_pretraining_cpt`), which this page now owns: domain weights and how they are chosen, upsampling and repetition, curricula and anneal mixes, and CPT (domain adaptation, replay ratios, forgetting, learning-rate re-warming, infinite schedules, CMR and D-CPT, recipes).
- **Top**: the core idea in one sentence, a static hero (`25_js_mx2_hero.js`: SmolLM3's three stage mixes from its configs with the WSD learning-rate shape, beside DeepSeekMath's 56/44 CPT mix; markers 1 to 3 for weights, order, CPT), "You need", new terms, the methods table (two CPT rows added).
- **Tabs moved inline** (each explained one mechanism): the measured DoReMi run is now the main visual of 3a (starts at step 0, with a prediction first); the DoReMi toy and its before/after are a closed block in 3a; the mixing-law fitter is inline in 3c (draws lazily when near the screen), its recommendations and coefficients a closed block. The CPT page's forgetting animation (6a), frontier chart (6b), schedule toggle (6c) and CMR calculator (6d) are inline; its Replay toy tab is a closed block in 6b and the D-CPT card a closed block in 6d.
- **Tabs kept**: Token-budget planner (a tool across sections 1, 2, 5) and CPT recipes compared (a dataset view; the "what labs did" summary moved to its top).
- **Depth into closed blocks**: code excerpts (sampling snippet, DoReMi trainer, Megatron blend), the experiment's setup and the not-run box, the refit table, other mixing methods, other stage recipes, the repetition law's limits, CPT's other findings and cost pipelines, mistakes (merged, 12) and interview (6).
- **No autoplay**: `21_js_rd_common.js` and `99_js_tabs.js` are the skill templates (storage key `mx2-tab`) with two page additions (an optional tab id for `onRender`, `anim`, `onResize`, used by the planner; a redraw when a `<details>` opens); mode switches reset without playing. `check_page.mjs` part 3 confirms nothing starts by itself.
- **Pointers fixed** while absorbing CPT: "Anneal a toy tab" is now Pretraining Reading section 5; "Pretraining, section 4" for the anneal is now section 5.
- **Images**: none. The page is about mechanisms and mixtures, not a physical object; the canonical figures (RegMix, DoReMi) are rebuilt from released data instead.
- CPT's data and scripts are copied into `cpt/` (`recompute_cpt.py` writes `parts/26_js_cpt_data.js`, identical data to the CPT page's; `cpt/inputs/`, `cpt/toy/train.py`, `cpt/toy/runs/`; the toy corpus is gitignored: English books of the Pretraining toy and German Gutenberg ids 2229, 22367, 5323, 2403, 69327, 34811). The CPT folder itself was not edited except `src/ledger.json`.

## Length judgement
| | Before (2026-10-23 audit) | After (2026-10-24) |
|---|---|---|
| Reading, core (230 wpm, `audit_pages.mjs`) | 32 min (plus CPT page Reading 19) | 40 min |
| Reading, closed details | 3 min (CPT 1) | 22 min |
| Other tabs, core | DoReMi 4.4 + fitter 2.6 + planner 2.0 (CPT: toy 3.2 + recipes 2.8) | planner 2.0 + CPT recipes 3.6 |
| Visuals drawn in Reading (open) | 5 (CPT 5) | 15 |

Why 40 minutes is right: it carries two former pages (51 min of Reading core and about 66 min across all tabs before) with nothing important lost: weights and epochs, repetition, three proxy methods and their check, loaders, stages, then CPT's forgetting, two levers, schedules and ratio laws. Every core unit is needed for one of these; a fifth of the core words are figure captions. What made the pages long (code, setups, per-method lists, other findings, cost pipelines, mistakes, interview, the toy grid) is closed and optional.

## Knowledge ledger (`ledger.json`; `python3 html_utils/ledger.py check`: problems 0)
574 units: core 382, depth 171, fat 21. Units 1 to 346 were drafted from the old page, 347 to 357 added by hand for script-rendered tables and charts (keys in their static captions), 358 to 574 are the CPT page's 217 units (section "absorbed from continued_pretraining_cpt"). The CPT folder's own `src/ledger.json` lists the same 217 units, 212 labelled `owned:` this page and 5 fat, so the merge is checkable there.

## Shape before the rebuild
Child-page method (topic_pages.md Part B): Reading by the subject's own logic (weights, repetition, proxy methods, online mixing and loaders, stages, CPT, local experiment, mistakes, interview), three lab tabs (DoReMi step by step, Mixing-law fitter, Token-budget planner), Further reading. Departures: the running example is The Pile's 22 domains rather than the topic's Common Crawl slice, because every mixing method with public results was run on The Pile; the topic's samples appear in the proxy experiment. The CMR calculator, replay toy, stage animation and anneal split are linked on the CPT and Pretraining pages rather than rebuilt.

## Parts
`01_head.html`, `10_header.html`, `20_read_a` (top, s1) to `20_read_e` (checklist, depth), `21_js_rd_common.js` (template), `22_js_data.js` (generated), `23_js_mx2_rd.js`, `24_js_mx2_rd2.js`, `25_js_mx2_dr.js` (DoReMi measured run and toy), `25_js_mx2_fit.js` (fitter), `25_js_mx2_hero.js`, `26_js_cpt_data.js` (generated), `27_js_cp_plot.js`, `28_js_cp_*.js` (forgetting, frontier, toy grid, schedules, CMR and D-CPT, prose fill), `34_tab_plan.html` + `35_js_mx2_plan.js`, `36_tab_rcp.html` + `37_js_cp_rcp.js`, `39_tab_more.html`, `99_js_tabs.js` (template, storage key `mx2-tab`). `shot_el.mjs` screenshots single cards.

Page size about 505 KB (with the CPT data, 47 KB): RegMix's runs (needed for the in-browser fits) and the measured DoReMi trajectory.

## Topic close (2026-10-24)
The root was rebuilt as a map; this page's Further reading now quotes the root as "31 min, plus 7" and siblings as their headers, and its ledger keys that quoted old times were re-keyed.

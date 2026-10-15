# Mixing lab (root tab `t-mix`, prefix `mx`)

Overview-depth tab of Topic: data-curation-and-datasets. The depth lives on the child page
`../../data_mixing/` (DoReMi step by step, mixing-law fitter on RegMix's 1,088 runs, token-budget planner).
This tab does not rebuild any of those and runs no experiment of its own: it reuses the child's proxy experiment.

## Files
- `../parts/34_tab_mix_a.html` (CSS and intro) to `34_tab_mix_d.html` (closes the tab div); `34_js_mx_0data.js` (generated),
  `34_js_mx_1core.js` (helpers, calculator maths), `34_js_mx_2calc.js` (domains, calculator), `34_js_mx_3stage.js`
  (OLMo 2 before/after animation, final-stage sizes), `34_js_mx_4more.js` (RegMix Table 4, proxy experiment, horizons, CMR).
- `build_data.py`: computes every number the tab shows, writes `mx_data.json` and `../parts/34_js_mx_0data.js`
  (standard library only). Reads `inputs/`, the child's `data/mx2_data.json`, `data/smoke.json` and, once it exists,
  `data/proxy_runs.json`, and the OLMo 2 paper page's `tables.json`.
- `inputs/cards.json`: the five domains' published sizes, quoted from each dataset card at a pinned revision (2026-10-15).
- `inputs/units_measured.json`: characters, bytes, words and token counts (GPT-2, GPT-NeoX, Comma v0.1; FineMath's own
  `token_count` field) on the topic's samples, measured by `measure_units.py` (2026-10-15). Comma tokenizer:
  `common-pile/comma-v0.1-1t` tokenizer.json at commit 5af40911.
- `inputs/nemotron_cc.json`: Nemotron-CC (arXiv 2412.02595v2) Table 4, Appendix E and quotes, transcribed.
- `check_mix.mjs`: embedded data equals `mx_data.json`; page JS reproduces the build's examples; prose numbers match;
  every control at 390 px dark, 920 px light and 390 px reduced motion with no errors, NaN, sideways scroll or wide SVG.

## Build and check (from the repo root)
```sh
python3 technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/src/mix/build_data.py
sh technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/src/build.sh
node technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/src/mix/check_mix.mjs \
  technical_knowledge_base/models_and_training/topic_data_curation_and_datasets/index.html [screenshot dir]
```

## Pending GPU run
The child's `data_mixing/src/scripts/run_pending.sh` (about 4 to 7 hours). After it, rerun `build_data.py` and
`build.sh`: the fit explorer in section 3 fills from `proxy_runs.json`. The fit explorer was tested with a
synthetic `proxy_runs.json` in the scratch area only; no fake result is in the repo.

## Approximations, stated on the page
- Muennighoff et al.'s repetition law (fitted on one corpus) is applied per domain and to whole corpora.
- Wikipedia's GPT-2 tokens: dataset bytes minus url and title bytes per row (60.6, measured on the sample), divided by
  UTF-8 bytes per GPT-2 token on the sample. The samples are the first documents of one file, not random.
- OLMo 2 stage 1 is drawn with the 3.90T pool's shares (Table 4); the 7B trained 4T tokens on it.

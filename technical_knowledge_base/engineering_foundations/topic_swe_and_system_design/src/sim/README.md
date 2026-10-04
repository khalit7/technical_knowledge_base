# src/sim: Scale simulator (t-sim)

- `defaults.json`: every default with kind (published, derived, fitted, illustrative), source and date (fetched 2026-10-04).
- `model.py`: the model in Python; `model_tmpl.js` the same in JS; `gen_js.py` writes `../parts/31_js_sim_model.js` with `defaults.json` embedded. Rerun it after editing either.
- `recompute.py` -> `recompute.json` (presets, fix chains, 40 random settings); `node check_js.mjs` compares the page's JS to it (1,404 numbers, exact).
- `des_check.py` -> `des_check.json`, `des_check.log`: Erlang C and the sojourn quantiles against a discrete-event simulation; M/D/c for the GPU slot; a two-queue line.
- `check_ui.mjs` (run from the repo root): clicks every preset, fix, view, undo and control at 390 dark and 920 light.
- `inputs/`: TensorRT-LLM perf table extract, SQS price list JSON, Llama 3.3 70B FP8 config.
- UI parts: `../parts/31_tab_sim.html`, `31_js_sim_dia.js` (diagram), `31_js_sim_model.js` (generated), `31_js_sim_ui.js`.

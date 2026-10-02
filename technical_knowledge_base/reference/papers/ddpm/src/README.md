# DDPM paper page: source

`sh build.sh` writes `../index.html` (runs `recompute.py` and `mk_paper.py` first). Then `sh html_utils/checkpage.sh <folder>` and `node src/check_page.mjs` from the repo root, and `python3 mk_coverage.py` (53 of 53 facts of `live.md` verified).

## Files
- `live.md`: the Notion row page as fetched 2026-09-20 (save_live.py). `inputs/`: arXiv HTML v2 text and tables (extract_paper.py), later papers' abstracts and table extracts, `recompute.json`.
- `paper.json`, `tables.json` (Tables 1 to 4 as printed), `recompute.py` (every derived number, 10 of 10 checks), `mk_paper.py` (card, Further reading, data).
- Toy models: `toy.py` (data, schedule, MLP, Eq. 4, 7, 11, 13, bound), `train.py` (four Table 2 variants; `eval`; `export`), `export.py` (8-bit weights to `parts/20_model_data.js`, quantisation cost), `rd.py` (rate and distortion as Figure 5), `check_forward.py` + `check_forward.mjs` (JS against NumPy float64 and PyTorch). Logs and reports in `model/`.
  Rerun: `OMP_NUM_THREADS=2 STEPS=300000 uv run --with torch --with numpy python train.py <variant>` (one variant per run, in the background; about 20 to 40 minutes each), then `train.py eval`, `export.py 8`, `rd.py`, `check_forward.py`, `node check_forward.mjs`, `python3 recompute.py`.
- `parts/`: HTML and JS parts; `13_js_read.js` (background sampler, forward process, the forward/reverse animation, predict reveals), `22_js_model.js` (the DDPM in JS), `23_js_run.js` (Sample tab), `24_js_tables.js`, `25_js_then.js`.

## Departures from html_utils/methods/papers.md
- No "What it takes to use this": a 2020 classic whose recipe is standard; Then and now covers what replaced each part.
- The live ingredient is a training-recipe ablation more than an architecture: four toy models that differ only in parameterisation and objective (Table 2), not a model with a component removed. All four run live (1,000 real network evaluations per sample) because the sampling chain itself is the mechanism.
- Weights are 8-bit, not 6-bit: at 6 bits the mu-predicting models broke down entirely (bound 7.9 to 16.9 bits/dim); 8-bit costs the eps model 0.005 bits/dim. Weights take 90 KB.
- Then and now is a recipe card that changes line by line (13 steps), not an architecture morph.
- Reading time is 18 minutes by the build's count (old page: 9); equations inflate the word count, and the network/recipe/cost list, progressive generation, autoregression, interpolation and NCSN comparison are folded into details blocks.

# Pretraining: HTML-only page source

Replaces all text of https://app.notion.com/p/3c65c17b0d0d814f82cffd0d5c0dd5ba (saved verbatim in `live.md`, fetched 2026-09-22 state). No child pages, databases or video on the live page.

## Build and data
- `sh build.sh` runs `recompute.py`, `mk_toy.py` and `mk_speedjs.py`, then assembles `../index.html` from `parts/` (one `<script>` per JS part, tab wiring last, hidden error box). Links are written `{{text|url}}`, `{{text|n:<notion id>}}` or `{{text|#t-<tab>}}`.
- `recompute.py` recomputes every derived number shown (T5 ranges in standard deviations, per-512 objective counters, tokens per parameter, OLMo 2 LR at the cut and anneal share, Table 11 split and GSM* standard errors, SmolLM3 maths tokens, speedrun speed-up and shares) into `data/recompute.json`.
- `mk_speedrun.py` parses the record table of `inputs/modded_nanogpt_README.md` (fetched 2026-10-03) into `data/speedrun.json`, with this page's category per record (the CAT lists in the script); `mk_speedjs.py` writes `parts/36_js_speed_data.js`.
- `toy/train.py` is the toy experiment (character-level GPT, 818,688 parameters; stage 1 of 6,000 steps at constant LR, then four 1,200-step branches: LR flat or linearly to zero, crossed with 3% or 25% maths sequences; seeds 1 to 3). Run: `cd toy && OMP_NUM_THREADS=2 uv run --with torch python train.py` (about 11 minutes per seed on two CPU threads). The corpus is six Project Gutenberg books in `toy/corpus/` (gitignored, about 4 MB; fetch with `curl -sL https://www.gutenberg.org/cache/epub/<id>/pg<id>.txt` for ids 1342, 11, 1661, 84, 98, 2701). Outputs go to `toy/runs/` (`meta.json`, `seed<k>.json`, about 100 KB each); `mk_toy.py` packs them into `parts/31_js_toy_data.js` and writes `data/toy_summary.json`.
- `mk_coverage.py` writes `coverage.json` (every fact of `live.md`, where the HTML carries it, probe-checked against `index.html`).
- `check_page.mjs` exercises every control (all objectives and steps, the three recipes, the anneal predict question and benchmarks, every toy measure, range and seed, every heatmap branch, the speedrun replay, chips and points) with reduced motion, reports script errors, NaN/undefined text and the error box, and screenshots the main cards. Run it from `html_utils/` so puppeteer resolves (copy it there or set NODE_PATH); it launches Chrome with `headless: 'shell'`.

## Shape, and why it departs from the methods
A deep-dive child page (no method file covers these yet). Tabs: Reading (sections by decision: objective, loss, size against tokens, data stages, what the anneal buys, open recipes, running it well, common mistakes), **Anneal a toy** (the page's own experiment), **Speedrun records**, Further reading. The comparison with other stages, the recipes grid, the price list and the scaling calculator are the parent page's and are linked by tab name rather than rebuilt; the LR-schedule family and optimisers belong to Optimisers and learning-rate schedulers (Topic: ml-fundamentals), filtering to Topic: data-curation-and-datasets. The toy tab exists because the only published ablation that separates an anneal's two levers (OLMo 2 Table 11) lacks the "new data at constant LR" cell; the toy fills it, labelled toy-scale.

## Parts
- `20_read.html` Reading; JS `21_js_rd_common.js` (step-animation controller, copied from the parent page), `22_js_rd_obj.js` (one sentence, five objectives), `23_js_rd_t5.js` (T5 families against variants), `24_js_rd_run.js` (a run stage by stage: GPT-3, OLMo 2 7B, SmolLM3), `25_js_rd_anneal.js` (Table 11 split, predict then reveal).
- `30_tab_toy.html`, `31_js_toy_data.js` (generated), `32_js_toy.js`.
- `35_tab_speed.html`, `36_js_speed_data.js` (generated), `37_js_speed.js`.
- `39_tab_more.html` Further reading; `99_js_tabs.js` tab wiring (storage key `pretrain-tab`).

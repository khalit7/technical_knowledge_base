Source of the interactive HTML on the Notion page "Continued Pretraining (CPT)" (deep-dive child of Topic: llm-training-and-post-training). `live.md` is the old Notion page, saved verbatim (fetched 2026-10-03, last edited 2026-09-24); no child pages, databases or video on it.

## Build
- `sh build.sh` runs `recompute.py` (published tables and the toy runs into `parts/20_js_data.js` and `inputs/recompute.json`), then assembles `../index.html` from `parts/` (one `<script>` per JS part, tab wiring last, hidden error box) and fills the reading time with `rtime.py`. Links are written `{{text|url}}`, `{{text|n:<notion id>}}` or `{{text|#t-<tab>}}`.
- `python3 mk_coverage.py` (after the build) writes `coverage.json`: every fact of `live.md`, where the HTML carries it, probe-checked against `index.html`.
- Checks: `sh html_utils/checkpage.sh <page folder>`, and from the repo root `node <page folder>/src/check_page.mjs` (every control in light 920 px and dark 390 px with reduced motion, card screenshots in `.shots/`; Chrome launched with `headless: 'shell'`).

## Data
- `inputs/ibrahim2024_extract.txt`, `gupta2023_extract.txt`, `cmr2024_extract.txt`, `dcpt2024_extract.txt`: tables and key passages cut from the arXiv HTML pages (2026-10-03).
- `inputs/recipes.json`: the Recipes compared rows (curated); `inputs/recipes_research.md`: verbatim quotes, anchors and what could not be verified, per recipe.
- `toy/train.py`: the toy experiment (character-level GPT, 815,616 parameters; 5,000 English pretraining steps, then nine 1,500-step CPT runs on German, peak {1, 0.33, 0.1}× crossed with replay {0, 5, 25}%, plus a from-scratch run on the union; seeds 1 to 3). Run: `cd toy && OMP_NUM_THREADS=2 uv run --with torch python train.py` (about 30 minutes per seed on two CPU threads). Corpus in `toy/corpus/` (gitignored): `en/` the six English books of the Pretraining page's toy, `de/` six German books, fetched with `curl -sL https://www.gutenberg.org/cache/epub/<id>/pg<id>.txt` for ids 2229, 22367, 5323, 2403, 69327, 34811. Outputs in `toy/runs/` (`meta.json`, `seed<k>.json`).

## Shape, and why
A deep-dive child page (no method file covers these). Reading by question: what CPT is and when to use it, forgetting watched (before/after animation of the toy with and without replay), the two levers (frontier chart of Ibrahim et al.'s tables), schedules that resume, choosing the mix (CMR calculator, D-CPT tolerance), other findings, what labs did, what it costs, checklist, mistakes. Tabs: Replay toy (the page's own experiment, because the main study ran one seed and no toy elsewhere separates replay from the re-warm), Recipes compared (18 disclosed recipes), Further reading. The stage comparison, prices and the anneal are the parent's and the Pretraining page's, linked rather than rebuilt.

## Parts
`01_head.html`, `02_css.html`, `10_header.html`, `20_read_a/b/c.html` (Reading), `30_tab_toy.html`, `32_tab_rcp.html`, `39_tab_more.html`; JS `20_js_data.js` (generated), `21_js_common.js` (the parent's RD.anim controller, copied), `21_js_plot.js` (SVG helper), `22_js_fg.js` (forgetting animation), `23_js_fr.js` (frontier), `24_js_sc.js` (schedules), `25_js_cm.js` (CMR and D-CPT), `26_js_fill.js` (toy numbers in the prose), `31_js_toy.js`, `33_js_rcp.js`, `99_js_tabs.js` (storage key `cpt-tab`).

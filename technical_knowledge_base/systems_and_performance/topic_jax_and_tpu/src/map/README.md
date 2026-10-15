# Tool map tab (t-map): source

Parts: `../parts/36_tab_map_a.html` (styles, intro, 2023 vs 2026 animation, tool table), `_b` (picker, lineage, JAX API changes, import check, interview questions; closes the tab div). JS: `36_js_tm_0data.js` (generated, do not edit), `1core` (helpers, legend, filters, table, detail panel), `2more` (animation, picker, lineage chart, API table, import table). Ids carry the `tm-` prefix; CSS is scoped under `#t-map`.

## Data flow
1. `python3 -B src/map/fetch_meta.py pypi|gh|feeds` writes `inputs/` (PyPI JSON API; GitHub REST API, one call per repo, 60 an hour without a token; GitHub Atom feeds for releases, tags and default-branch commits). Read 2026-10-15.
2. `atlas_tools.py` (50 tools and 13 lineage hand-overs) and `atlas_api.py` (13 JAX API changes from the CHANGELOG, the picker, the animation's slots and events) are curated by hand from the sources linked in each entry. Versions, dates, licences and the archived flag are never typed there.
3. `JAX_PLATFORMS=cpu <shared venv>/bin/python -I src/map/check_imports.py` imports the libraries installed in the topic's shared environment and probes the API-change rows against the installed jax; writes `out/imports.json`.
4. `python3 -B src/map/gen_data.py` merges everything into `../parts/36_js_tm_0data.js` and fails on unknown ids or on a status that contradicts GitHub's archived flag.
5. `sh src/build.sh`, then `python3 -B src/map/validate.py` (page embeds the data verbatim; prose facts exist in the data; no em dashes or private strings) and `node src/map/check_tab.mjs index.html <shots>` (every control at 390 px dark and 920 px light, no network requests).

## Departures
Shape taken from the data-curation topic's Tool map (table, chooser, lineage). Here the before/after animation is the same ten jobs in October 2023 and October 2026, because what changed in the JAX world is mostly which tool owns a job (Haiku and Linen to NNX, JetStream to vLLM TPU, PyTorch/XLA to torchax and TorchTPU, pmap to shard_map).

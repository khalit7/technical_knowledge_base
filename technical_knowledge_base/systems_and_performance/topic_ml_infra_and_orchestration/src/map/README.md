# Tool map tab (t-map): source

Parts: `../parts/36_tab_map_a.html` (styles, intro, 2023 vs 2026 animation, tool table), `_b` (picker, lineage and owners, versions in the labs, interview questions; closes the tab div). JS: `36_js_tm_0data.js` (generated, do not edit), `1core` (helpers, legend, filters, table, detail panel), `2more` (animation, picker, lineage chart, versions table). Ids carry the `tm-` prefix; CSS is scoped under `#t-map`. Shape and code adapted from the JAX topic's Tool map.

## Data flow
1. `python3 -B src/map/fetch_meta.py pypi|gh|feeds` writes `inputs/` (PyPI JSON API; GitHub REST API, one call per repo, 60 an hour without a token; GitHub Atom feeds for releases, tags and commits). Read 2026-10-16.
2. `atlas_tools.py` (61 tools, 6 hand-overs, 9 ownership changes) and `atlas_more.py` (animation slots and 15 dated events, the picker) are curated by hand from the sources linked in each entry. Versions, dates and the archived flag are machine-read; licences are typed only where GitHub cannot detect one (read from LICENSE/COPYING) or for closed products. Lustre's version is typed from lustre.org because its GitHub mirror has only development tags.
3. `check_versions.py` reads what the topic's labs actually ran (venv, Slurm containers, kind cluster) and writes `out/versions.json` (scrubbed: versions only).
4. `python3 -B src/map/gen_data.py` merges everything into `../parts/36_js_tm_0data.js`; it fails on unknown ids and on a status that contradicts GitHub's archived flag.
5. `sh src/build.sh`, then `python3 -B src/map/validate.py` (page embeds the data verbatim; prose facts exist in the data; no em dashes or private strings), `python3 -B src/map/check_urls.py` (every source link answers) and `node src/map/check_tab.mjs index.html <shots>` (every control at 390 px dark and 920 px light, no network requests).

`facts.md` holds the verified facts also appended to the topic's shared FACTS.md.

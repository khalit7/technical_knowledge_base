# Tool map tab (t-map): source

Parts: `../parts/36_tab_map_a.html` (styles, intro, atlas), `_b` (picker, lineage, licences), `_c` (toy toolkits, storage and loading, interview questions; closes the tab div). JS: `36_js_tm_0data.js` (generated, do not edit), `1core` (helpers, animation controller, atlas), `2pick`, `3line` (lineage, corpus table, licences), `4toy` (toy before/after, storage, packing). Ids carry the `tm-` prefix; CSS is scoped under `#t-map`.

## Data flow
1. `python3 src/map/fetch_meta.py pypi|gh|feeds|hfd|hfm|cc` writes `inputs/` (PyPI JSON API; GitHub REST API, one call per repo, 60 an hour without a token; GitHub Atom feeds for releases, tags and default-branch commits; Hugging Face API for dataset and model cards; Common Crawl's collinfo.json). `inputs/arxiv_meta.json` comes from the arXiv API. Four Ai2 repositories were read from the GitHub API before the rate limit and typed into `github_repos.json` with a note.
2. `atlas_tools.py` and `atlas_corpora.py` are curated by hand from the sources linked in each entry (read 2026-10-14). Versions, dates, licences and the archived flag are never typed there.
3. Measured runs (outside the repo, with the topic's shared venvs): `toy/toy_datatrove.py` and `toy/toy_dolma.py` on `toy/toy_docs.jsonl` (12 illustrative documents written for the test), then `toy/merge.py`; `storage/storage_sizes.py` on the running example, then `storage/finalize.py`. Results land in `out/`.
4. `python3 src/map/gen_data.py` merges everything into `../parts/36_js_tm_0data.js` and fails on unknown ids, on archived/status contradictions, and on any corpus date that disagrees with the arXiv or Hugging Face record.
5. `sh src/build.sh`, then `python3 src/map/validate.py` (page embeds the data verbatim; quoted numbers exist in the data; no em dashes or private strings) and `node src/map/check_tab.mjs index.html <shots>` (every control at 390 px dark and 920 px light).

## Departures
The RAG topic's Tool map was the reference shape (atlas, chooser, timeline). Here the timeline is a corpus lineage, because for data curation the corpora and what they were built from are as much the map as the tools; and the measured centrepiece is the same input through two toolkits, because their designs (inline filters vs tag then mix) are what differ.

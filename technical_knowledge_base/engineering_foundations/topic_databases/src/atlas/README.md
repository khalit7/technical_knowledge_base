# Database atlas (t-atlas) data

One row per system, every cell from a primary source read on 2026-10-04.

- `research/g1..g4/<id>.json`: the researched rows (schema: see `build_atlas.py` FIELDS; per-cell source URLs in `src`). g1 relational and distributed SQL, g2 OLAP, lakehouse and graph, g3 key-value, document and wide-column, g4 search, vector and time-series.
- `overrides.json`: edits on top of the research, each with `_why`.
- `chooser.json`: the five-question chooser's attributes per row (this page's judgement, derived from the cells).
- `lic_to.json`: licence class each dated licence event moved to (colours the timeline; empty = owner changed, licence unchanged).
- `claims.json`: the old Notion page's claims, each verified, corrected or unconfirmed, with sources.
- `meta.json`: families, engines, licence classes, column views, glossary, chooser questions, lead text.
- `measure_tps.py` -> `inputs/pg_tps.json`: local pgbench write TPS (claim pg_tps).
- `build_atlas.py` -> `atlas.json` and `../parts/33_js_atlas_data.js`.
- Checks: `node test_atlas.mjs` (every control, 390 dark and 920 light), `python3 recompute.py` (arithmetic, quoted measurements, chooser re-implemented, dates), `python3 check_versions.py` (GitHub releases re-read), `node shot_atlas.mjs dark 390` (section screenshots).
- `viz_ideas.md`: ideas built and rejected.

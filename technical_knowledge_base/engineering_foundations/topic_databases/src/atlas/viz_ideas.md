# Database atlas (t-atlas): visual ideas, built and rejected

The question the tab answers: "the default is Postgres; which other store, if any, does my workload force, and what does it cost me?" The old page held this as a mermaid taxonomy plus a twelve-row comparison table by family. The atlas turns the families into about sixty systems on the same columns so the reader can filter to his situation and see the reason for each candidate.

## Built

| # | Idea | Why it earns its place | Score (R 2, P 2, D 4, I 2, S 2) |
|---|---|---|---|
| A1 | **The atlas table**: 59 rows, column sets (Overview, Guarantees, Scale and run, Licence, Versions, Choosing, Chat product), sticky name column, sort on every header, filters by family / storage engine / licence class / how it runs with live counts, free-text search | A data page's table is the main visual (Methodology: categorical facts per item become a matrix read verbatim). Column sets keep a phone readable without dropping any field. | 12 |
| A2 | **Row detail with numbered sources per cell**, Jepsen findings with versions and dates, licence events with links, notes on corrections | "Every cell sourced and dated": the detail is where each cell shows the URL it rests on. | 11 |
| A3 | **Compare 2 or 3 side by side** (fields as rows, systems as columns) | The topic-page method's "compare 2 or 3" for data tabs; differences between, say, CockroachDB, Spanner and Postgres are the lesson. | 10 |
| A4 | **The five-question chooser**: the old page's five questions as buttons; each row has chooser attributes (what it is built to answer, transaction scope, write level, ad hoc flexibility, how it can be run) in `chooser.json`; candidates get a green edge and a list with a reason per answer, plus "why not the default" for Postgres and the nearest misses | Turns the old page's prose checklist into something the reader uses, and keeps Postgres as the stated default (the Reading's spine). The attributes are this page's judgement, labelled as such and derived from the row cells; `recompute.py` re-implements the rules in Python and compares candidates for ten answer sets. | 13 |
| A5 | **Licence and ownership timeline**: one lane per system with dated events coloured by the licence class moved to (grey: owner changed, licence unchanged), tap to open the row | The 2018 to 2026 wave of licence changes (MongoDB SSPL, Elastic, Redis, CockroachDB, ScyllaDB) and the forks and returns (Valkey, OpenSearch, Elastic AGPL, Redis AGPL) are a trajectory over years: the Methodology's "lay the subject on one axis, time". | 10 |
| A6 | **Checking the old page**: each claim with verdict pill (verified / corrected / unconfirmed), the finding, the corrected sentence, sources and linked rows; filter by verdict | Treat the old page as unverified notes and show corrections, not hide them. | 9 |
| A7 | **Glossary in plain words** (collapsed) for every term a cell uses | Teach from zero: no term before it is explained; the cells are terse. | 7 |

## Rejected

- **Radar charts per system** (scores on consistency, scale, ops): the scores would be invented numbers; the cells are categorical and say more in words.
- **A taxonomy tree like the old mermaid diagram**: the family filter chips with counts carry the same grouping and are interactive; a tree would repeat the Reading's section 6.
- **Benchmark columns (QPS, latency)**: no independent benchmark covers these 59 systems on the same hardware; mixing vendor numbers across rows would splice incomparable runs (Methodology: never splice). Measured numbers live in the claims (pg_tps) and in the SWE root's numbers tab.
- **GitHub stars or DB-Engines popularity**: popularity is not a reason to choose and changes weekly.
- **Price columns**: managed prices depend on instance shape, region and request mix; a single number per row would mislead. Left to the Reading and to provider calculators.
- **An animation**: the atlas is a lookup and choosing tool; the Reading carries the before/after animations (B-tree vs LSM, row vs column).

## Data and checks
- `research/g1..g4/<id>.json`: one file per system from primary sources (docs, licence files, release notes, Jepsen), researched 2026-10-04.
- `measure_tps.py` -> `inputs/pg_tps.json`: pgbench tpcb-like write TPS on the laptop (claim pg_tps).
- `build_atlas.py` validates enums, lengths, sources per cell, dates, em-dashes; writes `atlas.json` and `../parts/33_js_atlas_data.js`.
- `test_atlas.mjs` clicks every control at 390 dark and 920 light; `recompute.py` checks the arithmetic, the quoted measurements, the chooser and date hygiene; `check_versions.py` re-reads GitHub releases for every row with a GitHub version source.

## What the Methodology lacked for this page
A rule for editorial attributes (the chooser's): when a tool ranks things by judgement, store the judgement as data beside the facts, label it as the page's, show the reason per row, and test the rules independently. Recorded here for the orchestrator to consider.

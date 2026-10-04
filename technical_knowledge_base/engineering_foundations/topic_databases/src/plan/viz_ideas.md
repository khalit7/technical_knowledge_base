# Query plans tab (t-plan): visual ideas

Question the tab answers: what does the database actually do to answer a query, and how much work (pages) does each fix save?

## Built
| # | Idea | Why it earns its place | Data |
|---|---|---|---|
| QP1 | Eight cases, each a before/after (or 3-way) toggle of real `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` plans | Real plans on the reader's running example, 10M messages; no illustrative numbers | inputs/c1..c8.json from measure.py |
| QP2 | Interactive plan tree: one box per node with rows (est), time, own pages and a share-of-pages bar; misestimate badge at 3x and 10x; click for meaning, actual vs estimated rows (per loop, per process, total), pages, conditions in plain words | Teaches reading EXPLAIN node by node; the badge makes case 5's cause visible | same |
| QP3 | "Every node in plain words, bottom up": a generated sentence per node from its numbers | The brief's "plain-words reading of every node", always consistent with the data | same |
| QP4 | Pages-being-read animation: one lane per variant, one square per page (or per 10^k pages, stated), squares coloured hit/read, all lanes on one clock from measured times; play/pause/step/scrub/speed, on-screen only, paused under reduced motion | Before/after of the same query drawn to scale (Khalid's MLA pattern) | root node buffers and median ms |
| QP5 | Log-scale bars for page visits and time per variant | Ratios of 300x to 1000x do not fit a linear chart | same |
| QP6 | Raw psql-style text rebuilt from the JSON, collapsible | What the reader will see in psql | same |
| QP7 | Case 6 bytes table (PG table vs each Parquet column) and DuckDB operator tree from its JSON profile | Row vs column made concrete in bytes | inputs/c6_duck.json |
| QP8 | Case 5 decoded `pg_stats_ext.dependencies` table | Shows what CREATE STATISTICS learned | c5.json |
| QP9 | Claims-checked box (correlated predicates; QORL) | The old page's planner claims verified against sources | Postgres docs, Leis et al. 2015, rohanbansal.com/qorl |

## Rejected
- Linear-time-only animation without the log bars: the fast lane is invisible; kept the animation but added the log bars.
- One square per page always: 1M page visits (case 5) cannot be drawn; unit becomes 10^k pages, said in the caption.
- SVG tree with curved edges: clips at 390 px with deep plans (8 levels); used an indented HTML list instead.
- Visual EXPLAIN flame graph (as in explain.dalibo.com / pev2): good for experts, but loops and parallel processes make inclusive time misleading for a beginner; the per-node sentences teach better.
- Comparing to a real server: no server available; laptop numbers are labelled as ratios.

## Notes for the methodology
- Measured data replaces "reproduce a published figure": every number is a local measurement with its script; the published claims (QORL, Leis) are checked in text.
- macOS `purge` needs root; the OS cache was flushed by reading a 20 GB file, verified by I/O wait per page (0.13 ms per random page cold vs 0.002 ms from the OS cache).

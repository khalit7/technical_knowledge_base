# Query planning and performance: EXPLAIN, statistics, slow queries, tuning

Notion: https://app.notion.com/p/3ef5c17b0d0d817f9e15f445b079e9c8 (child of Topic: databases, https://app.notion.com/p/3cd5c17b0d0d815d8841ec845f5f3324)

HTML-only page, built 2026-10-04. `index.html` is the whole page; source in `src/` (see `src/README.md`).

- **Reading** (about 45 minutes): what a planner does; the cost model with formulas reproduced exactly; statistics (pg_stats, sample size, staleness, extended statistics); why estimates fail (independence, joins, patterns, parameters; Leis et al. 2015); join ordering (dynamic programming against GEQO, measured); reading EXPLAIN; the slow-query workflow (pg_stat_statements, auto_explain, a replayed workload, animated before/after); fixes ranked with N+1 and batching measured; settings (work_mem spills and parallel workers measured, random_page_cost corrected, JIT); prepared statements and a measured generic-plan regression; plan regressions and pinning (pg_hint_plan measured); learned optimizers (Neo, Bao, Balsa, QORL corrected); production setup; mistakes; glossary.
- **Cost model**: price a sequential, index and bitmap scan from real pg_class and pg_stats values; 150 of 150 PostgreSQL cost figures reproduced.
- **Plan reading lab**: eight real EXPLAIN (ANALYZE, BUFFERS) plans to diagnose, with answers.
- **Further reading**.

Measured on PostgreSQL 16.2 with the root's chat dataset plus one 4M-row billing table.

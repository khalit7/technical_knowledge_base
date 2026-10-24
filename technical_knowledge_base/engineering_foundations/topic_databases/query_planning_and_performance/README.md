# Query planning and performance: EXPLAIN, statistics, slow queries, tuning

Notion: https://app.notion.com/p/3ef5c17b0d0d817f9e15f445b079e9c8 (child of Topic: databases, https://app.notion.com/p/3cd5c17b0d0d815d8841ec845f5f3324)
Site: https://khalit7.github.io/technical_knowledge_base/engineering_foundations/topic_databases/query_planning_and_performance/

HTML-only page, built 2026-10-04, rebuilt 2026-10-24 to the teaching contract. `index.html` is the whole page; source in `src/` (see `src/README.md`).

- **Reading** (40 minutes, plus 10 in closed details): the idea in one screen with a hero; what a planner does; the cost model with the calculator inline (formulas reproduce 150 of 150 EXPLAIN figures); statistics (pg_stats, sample size, staleness, extended statistics); why estimates fail (independence, joins, patterns, parameters; Leis et al. 2015); the three join algorithms measured, and join ordering (dynamic programming against GEQO); reading EXPLAIN, with a bottom-up stepper through a real plan; the slow-query workflow (pg_stat_statements, auto_explain, a replayed workload); fixes ranked with N+1, batching, offset against keyset pagination and connections measured; settings (work_mem spills and parallel workers measured, random_page_cost corrected, JIT); prepared statements and a measured generic-plan regression; plan regressions and pinning (pg_hint_plan measured); production setup; learned optimizers (Neo, Bao, Balsa, QORL corrected) in a closed block.
- **Plan reading lab**: eight real EXPLAIN (ANALYZE, BUFFERS) plans to diagnose, with answers.
- **Further reading**.

Measured on PostgreSQL 16.2 with the root's chat dataset plus one 4M-row billing table.

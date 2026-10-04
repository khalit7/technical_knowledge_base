# SQL and data modelling: visualisation ideas (built and rejected)

Question the page keeps returning to: "will this query, schema or schema change give the right answer, and keep giving it while the product changes and traffic flows?" The reader is new to SQL in depth, so most visuals are real queries he can run and change.

## Built (score: computable / reproduces / shows what prose cannot / corrects a misconception / measures the central question)
| # | Idea | Placement | Score | Data |
|---|---|---|---|---|
| 1 | **Runnable example boxes** (38): every example runs live in the page's SQLite (sql.js 1.14.2, the root's engine) next to the PostgreSQL 16.2 result recorded offline; disagreements flagged per statement | Reading, every section | 2+2+2+2+2 | examples.py, pg/run_examples.py, inputs/examples.json |
| 2 | **Normalisation before/after animation**: user 7's 59 real message rows; the same rename and the same buggy code path in a wide table (59 rows to write, 5 written, two names) and in the normalised schema (1 row) | Reading 9 | 2+2+2+2+2 | root data.json; counters checked by recompute.py |
| 3 | **Lock queue before/after animation** from three measured runs: long transaction without lock_timeout (7 reads wait up to 3.26 s for a 1 ms change), with lock_timeout 500 ms and retry (worst 0.27 s), no long transaction | Reading 11 | 2+2+2+2+2 | pg/measure_queue.py, inputs/queue.json (pg_locks snapshot shown) |
| 4 | **ALTER TABLE, measured** tab: 21 changes on 2,000,000 rows, locks read from pg_locks, rewrite from relfilenode, read/write blocking probed, safe recipe, linear scaling to your row count (labelled estimate); cards on phones | Own tab | 2+2+2+2+2 | pg/measure_alter.py, inputs/alter.json |
| 5 | **Exercises lab** tab: 28 graded exercises in 4 levels, graded by comparing result sets in the page's engine; offline expectations checked | Own tab | 2+1+2+1+2 | ex/exercises.py, ex/check.py, check_page.mjs |
| 6 | **Join explorer**: 8 joins (incl. semi, anti, NOT IN) on the same 5 users and 3 markets, with a NULL-market toggle that empties NOT IN | Reading 2 | 2+1+2+2+1 | in page |
| 7 | **Window frame stepper** over chat 11's real rows: SUM, 3-row AVG, LAG, RANK, LAST_VALUE default vs whole frame | Reading 4 | 2+1+2+2+1 | values checked against recompute.py |
| 8 | **B-tree leaf before/after** (illustrative, 6 keys per page): sequential vs random keys, fill, splits, pages touched | Reading 8 | 1+1+2+1+1 | model re-implemented in recompute.py |
| 9 | **Key type bars, measured**: bigint vs UUID v4 vs v7 at 1M and 10M rows: insert time, index size, WAL | Reading 8 | 2+2+1+2+1 | pg/measure_keys.py |
| 10 | **N+1 bars, measured** with SQLAlchemy 2.1.3: lazy vs selectinload vs joinedload vs one SQL, N = 10/50/200, direct and through a 1 ms delay proxy; the queries x round trip model shown against the measurement | Reading 12 | 2+2+1+2+1 | pg/measure_n1.py, pg/delay_proxy.py |
| 11 | **Live SQL injection** (concatenated vs bound, five payloads incl. a stacked UPDATE) | Reading 13 | 2+0+2+2+1 | in page |
| 12 | Real Alembic autogenerate output and its offline SQL | Reading 11 | 2+0+1+1+1 | pg/alembic_demo.py |
| 13 | Predict-then-reveal on NOT IN | Reading 2 | 1+1+1+2+1 | recorded results |

## Rejected
- Rebuilding the root's logical-order animation and INNER/LEFT join animation: linked instead.
- PGlite (Postgres in WebAssembly) so Postgres-only examples run live: several MB, over budget; recorded results cover it.
- A query-plan or join-algorithm visual: owned by Query planning and performance and the root's Query plans tab.
- Isolation-level animation for upserts: owned by Transactions and concurrency.
- Entity-relationship editor: high build cost; the schema diagram plus the relationship cards teach the same.
- Measuring UUID point-lookup latency: differences inside noise at these sizes on a shared laptop.

## Methodology notes for this page
- Timings were noisy because other measurements ran on the same laptop: the page shows all repetitions and leans on index size and WAL bytes, which are stable.
- Keys generated inside the database cost more than the insert itself (gen_random_uuid 12.9 s per 1M here), so generation is timed apart.

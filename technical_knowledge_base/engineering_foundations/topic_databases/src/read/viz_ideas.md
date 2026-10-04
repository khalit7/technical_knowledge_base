# Reading tab: visual ideas (Topic: databases, 2026-10-04)

Central question of the Reading: *what problem forces each piece of a database (or each extra store) into existence, and what does it cost?* A visual earns its place when it shows a problem and its fix on the same input, with a counter that measures the difference.

Scores 0 to 2 on: parameter the reader controls / reproduces a measured or published figure / inputs computable / shows what a sentence cannot / corrects a misconception / measures the central question.

## Built
| # | Visual | Section | Score | Data | Notes |
|---|---|---|---|---|---|
| R1 | The chat product's data at three moments (file, one Postgres, fleet), drawn at measured width, stacked on phones | One screen | 1+0+2+2+1+2 = 8 | none (diagram) | Each store coloured by the section that introduces it |
| R2 | Four chat tables with sample rows; click a row to follow its foreign keys both ways | 1 | 2+0+2+2+1+1 = 8 | 22_js_rd_data.js | Teaches keys by doing |
| R3 | One query evaluated clause by clause (FROM, JOIN, JOIN, WHERE, GROUP BY, SELECT, ORDER BY), every intermediate table computed live | 2 | 2+1+2+2+2+1 = 10 | sample rows; result checked by recompute.py | Corrects "SQL runs top to bottom" |
| R4 | The last credit spent from two tabs: read committed read-then-write, SELECT FOR UPDATE, serializable | 3 | 2+2+2+2+2+2 = 12 | outcomes measured with two real psql sessions (measure_read.py) | Shows that BEGIN/COMMIT alone did not prevent the lost update at the default level |
| R5 | Crash during a commit: pages written in place against a write-ahead log, then replay | 4 | 2+1+2+2+1+2 = 10 | mechanism from the Postgres WAL docs; drawing illustrative | Before/after on the same transaction and the same crash moment |
| R6 | Lookup of one chat: sequential scan against B-tree index; pages read, rows, time | 4 | 2+2+2+2+2+2 = 12 | measured: 19,349 pages / 28 ms against 12 pages / 0.061 ms (PG 16.2, 1M rows) | Tree shape drawn, labelled; the chat's rows placed where they sit (about 42% into an append-ordered table) |
| R7 | SUM(tokens) GROUP BY model row by row against column by column; bytes read | 5 | 2+2+2+2+2+2 = 12 | measured: 157.7 MB against 1.68 MB (94x); Parquet chunk sizes from file metadata | Times from two engines shown only as a sanity check; QP tab repeats at 10M (87x) |
| R8 | A rename with Postgres alone, cache with TTL only, cache with delete on write; expensive queries, hits, stale answers | 6 | 2+0+2+2+2+2 = 10 | illustrative sequence | Caption says a cache pays only for expensive answers (0.067 ms PK lookup measured against Redis docs' 0.143 ms example) |

## Rejected
- **Isolation-level matrix as an interactive grid**: the static table from the Postgres docs is clearer; the animation R4 carries the teaching.
- **Live B-tree insert and split animation**: belongs to the storage-engines child; at root level the lookup counter teaches more.
- **MVCC version-chain animation**: one more animation in section 3 would push the root past its time budget; noted for the transactions child.
- **Vector ANN (HNSW greedy walk) animation**: the RAG topic and a vector child own it; section 8 stays prose plus arithmetic.
- **A database chooser widget**: the Database atlas tab owns the chooser; the Reading applies the five questions to the chat product in a table instead.
- **Latency ladder**: owned by the SWE root's Numbers to know tab; linked.
- **B-tree height measured with pageinspect**: the pgserver wheel lacks the extension; the drawn tree is labelled as shape only.
- **Commit cost measured in measure_read.py**: the first attempt ran 500 inserts in one transaction and measured nothing; removed; the page quotes the SWE root's commit figures and the atlas's pgbench runs instead.

## What the methodology lacked here
A teaching root for a reader new to the subject needs a "problem appears, idea, cost" rhythm per section; the scoring rewards measurement but not ordering. Measuring the problem (the lost update, the full scan, the bytes read) on the running example was the strongest ingredient: each "before" is a real run, not a story.

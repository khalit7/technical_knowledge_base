# Visualisation ideas: Analytics: columnar engines, DuckDB and the lakehouse

Central question: what makes an analytic query cheap (bytes read, CPU per value, files touched, dollars billed), and what do you have to decide when the data is written for that to happen?

Scores 0 to 2 on: parameter to move, reproduces a measured or published figure (x2), computable from real data (x2), shows what a sentence cannot, corrects a misconception, measures the central question, absent elsewhere; build cost subtracted; +1 for a step animation against the method it replaced.

| # | Idea | What it shows, what the reader does | Data and sources | Placement | Score | Status |
|---|---|---|---|---|---|---|
| A1 | **Pruning before/after animation** | One query over the real 82-row-group Parquet file, row group by row group, without and with min/max statistics, one day or one chat; counters for row groups, bytes, rows decoded | anatomy.json (every row group's stats and chunk sizes from the footer); final bytes with pruning reproduce DuckDB's measured 1,197,073 bytes for the day query exactly (independently, from the footer); the chat query computes 708,747 against 741,532 measured | Reading 3 | 15 | built |
| A2 | **Parquet lab** | 36 real files (4 sort orders x 3 row-group sizes x 3 codecs); choose one: size, row groups, bytes read (counted) and footer-predicted, median time for 4 queries; scatter of all 36 | parquet_lab.py, lab.json | Own tab | 14 | built |
| A3 | **Inside a Parquet file** | A 23,047-byte file drawn to scale region by region; click to decode page headers and footer; the role column decoded to bits | anatomy.py + thrift_compact.py, checked against pyarrow | Own tab | 13 | built |
| A4 | **Iceberg, step by step** | Every file pyiceberg wrote over 8 commits, live versus superseded, each decoded (metadata.json, manifest list, manifests); Delta toggle with its JSON log | iceberg_walk.py, delta_walk.py | Own tab (+ a static mini tree in Reading 9) | 13 | built |
| A5 | Encodings explorer | Per column, every encoding x codec, column chunk bytes, log bars; sorted toggle for role/model | encodings.py | Reading 2 | 11 | built |
| A6 | Three engines, five queries | DuckDB, Postgres, SQLite bars, default and one thread; answers checked identical | engines.py | Reading 1 | 11 | built |
| A7 | Row at a time against vectors | One-column sum: SQLite, Postgres, Python loop, DuckDB 1 thread, numpy | engines.py, vec_ooc.py | Reading 4 | 9 | built |
| A8 | HTTP range map | Which byte ranges DuckDB fetched over HTTP for three queries, drawn on the 534 MB file | remote_small.py (local Range server log) | Reading 6 | 10 | built |
| A9 | Small files bars | 1 / 100 / ~1,000 / ~10,000 files: time and bytes; compaction time | remote_small.py | Reading 9 | 8 | built |
| A10 | Dashboard bill calculator | Rows and refreshes per day: BigQuery on-demand against Snowflake XS and Redshift Serverless 60 s minimums | list prices 2026-10-04; BigQuery data type sizes; labelled derived | Reading 8 | 8 | built |
| A11 | Sort order bars | Bytes read per query across sort orders at 100k rows, Snappy | lab.json | Reading 5 | 7 | built |
| R1 | ClickHouse parts-and-merge animation | Parts appearing per insert and merging | real system.parts shown as text instead; the merge has only two real states (10 parts, 1 part), so an animation would invent intermediate merges | Reading 7 (text) | rejected |
| R2 | Warehouse price history tab | | A pattern Khalid removed elsewhere; prices are dated in a table instead | none | rejected |
| R3 | Spark against DuckDB benchmark chart | | No run of our own on Spark; the Coiled figures are vendor-run and only summarised in words | none | rejected |
| R4 | Late materialisation animation | | Its effect is visible in the lab's needed-versus-read column; a separate animation would repeat A1's shape | Lab note | rejected |
| R5 | Re-drawing the root's rows-vs-columns animation | | Owned by the root's Reading section 5 and Query plans case 6: linked | none | rejected |

What the methodology lacked here: a rule for "measured on a shared machine". Timings were taken with each engine's own in-process cache sized to hold the data (OS page cache was being evicted by other jobs), and the page says timings within about 2x are equal.

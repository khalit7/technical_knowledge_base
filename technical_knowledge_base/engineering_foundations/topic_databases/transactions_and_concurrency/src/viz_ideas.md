# Visualisation ideas: Transactions and concurrency

What the text needs to be understood: (1) what an interleaving is and how one goes wrong; (2) that the same interleaving behaves differently by level and by database; (3) where row versions and snapshots live, so MVCC is not magic; (4) what locks do to waiting; (5) what correctness costs under load.

## Built

| Rank | Idea | Score (teach / real data / cost) | Placement | Data |
|---|---|---|---|---|
| 1 | **Recorded interleavings**: every anomaly as two or three live sessions, one row per step, blocked statements dashed, late finishes marked; chips for every level on both databases | 5 / 5 / 3 | Reading, section 3 (one card per anomaly) | `inputs/matrix_pg.json`, `matrix_mysql.json` from `measure/run_matrix.py` |
| 2 | **Before/after MVCC animation**: the lost update three ways (read committed, FOR UPDATE, serializable with a retry) with the real heap page (pageinspect: xmin, xmax, lock-only flag, commit status) and each session's real snapshot after every step | 5 / 5 / 4 | Reading, section 5 | `inputs/mvcc_trace.json` from `measure/mvcc_trace.py` (Postgres 16.15, conda-forge, for pageinspect) |
| 3 | **Isolation lab** tab: pick anomaly, database, level (or fix), step through the recording with play/scrub; also the lock recordings | 5 / 5 / 3 | Tab | same, plus `extras_pg.json` |
| 4 | **Measured matrix**: 8 anomalies x 4 levels x 2 databases, cell says happened or how prevented, click opens the lab | 5 / 5 / 1 | Reading, section 4 | matrix files |
| 5 | **Contention benchmark** bars: commits/s, retries per commit, p99, lost updates; 4 ways x 2, 8, 32 clients x hot/spread | 4 / 5 / 2 | Reading, section 9 | `inputs/bench_pg.json` from `measure/bench.py` |
| 6 | Lock recordings with mode switches: job queue (FOR UPDATE / SKIP LOCKED / NOWAIT), lock queue (with and without lock_timeout), deadlock (opposite and ordered) | 4 / 5 / 1 | Reading, sections 6 and 7 | `extras_pg.json` |
| 7 | Durability bars (4 settings) and long-transaction stat tiles | 3 / 5 / 1 | Reading, sections 2 and 10 | `extras_pg.json` |

Inspiration: Kleppmann's Hermitage (two-session scripts per anomaly), Jepsen reports (anomaly by level), the PostgreSQL wiki SSI examples, the root's own three-mode lost-update animation (this page adds the row versions and snapshots instead of repeating it).

## Rejected
- **A simulated scheduler** that generates interleavings in the browser: everything here can be recorded for real, and a simulation would have to model InnoDB's update-reads-latest rule and SSI's false positives, which is exactly where simulations go wrong.
- **A dependency-graph (Adya DSG) drawing per anomaly**: precise but abstract for a reader new to the subject; the recordings plus the matrix carry the same lesson. Candidate for a later "deeper" tab.
- **Lock compatibility matrix (8 x 8 table modes)** as a visual: reference material, linked to the Postgres docs instead; the lock-queue recording teaches the one consequence that bites.
- **Animated deadlock wait-for graph**: the two-column recording with the real 40P01 detail ("Process X waits for ShareLock on transaction ...") already names the cycle.
- **InnoDB undo-chain animation**: no equivalent of pageinspect was used for InnoDB; a table comparing the two designs, sourced from the MySQL manual, instead.

## What the methodology lacked for this page
Nothing structural. One addition worth recording: when the subject is concurrency, a *recorded* trace (real sessions, a coordinator, block detection through the server's own wait events) is both cheaper and more trustworthy than an illustrative animation, and a single harness then feeds the Reading cards, the matrix and the lab tab.

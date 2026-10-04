# Source of Running Postgres in production

Child of Topic: databases. `sh build.sh` runs `build_data.py` (inputs/*.json to `parts/22_js_data.js`) and writes `../index.html`.

Shape: Reading (one screen plus 13 standalone sections, 2 animations, 9 inline charts and calculators, 20 real transcripts), Incident lab, Lab notebook, Production checklist, Further reading. Follows Part B of `html_utils/methods/topic_pages.md`. It departs in one way: the evidence on an operations page is command output, so instead of recomputing published figures the page shows what real servers printed; every transcript is captured by a script and rendered from JSON (`parts/23_js_tr.js`), and numbers in prose are either bound to the JSON (`data-v`) or checked by `recompute.py`.

## Files
- `lab/`: the measured runs, each under 5 minutes, all servers in a scratch folder (`RP_DATA`): `pitr.py` (dump, base backup, archiving, the bad DELETE, both recoveries, pg_waldump), `replication.py` (replica, lag, replay pause, synchronous levels, stopped sync standby, slot retention and cap, promote, split brain, pg_rewind), `vacuum.py` (HOT, autovacuum sawtooth, forgotten transaction, VACUUM vs VACUUM FULL with a lock_timeout reader), `wraparound.py` (pg_resetwal to just short of the stop limit, a forgotten prepared transaction, warning, refusal, fix), `connections.py` (backend memory, connection setup, pgbench -C, max_connections, PgBouncer with 1,000 clients, SET leak, prepared statements), `upgrade.py` (pg_upgrade check/copy/link 16 to 17, logical replication upgrade with the sequence trap), `monitor.py` (runaway query, timeouts, idle in transaction, lock queue, dashboard views); helpers in `pgc.py`.
- `inputs/`: one JSON per run; `research.json`: 83 dated facts (versions, defaults, prices, incidents) read from primary sources on 2026-10-04.
- `build_data.py`, `recompute.py` (checks 35 claims against the runs and writes `recompute_out.json`), `check_page.mjs` (clicks every control at 390 dark and 920 light, every incident-lab step, every notebook run, the checklist; compares the page's JavaScript with recompute; screenshots each visual into `../.shots/`).
- `coverage.json`: root mentions and old-child facts this page owns, what is left to siblings, corrections shown.
- `viz_ideas.md`: visuals built and rejected.

## Reproduce (from a scratch directory; never `uv run` inside the repo without --no-project)
```
# PostgreSQL 17 for upgrade.py (conda-forge, via a standalone micromamba binary) and PgBouncer for connections.py (built from source; needs libevent)
curl -Ls https://micro.mamba.pm/api/micromamba/osx-arm64/latest | tar -xj bin/micromamba
MAMBA_ROOT_PREFIX=$PWD/mroot ./bin/micromamba create -y -p ./cenv -c conda-forge "postgresql=17"
curl -sL https://www.pgbouncer.org/downloads/files/1.24.1/pgbouncer-1.24.1.tar.gz | tar xz && (cd pgbouncer-1.24.1 && ./configure --prefix=$PWD/../pgbi --with-libevent=/opt/homebrew/opt/libevent --without-openssl && make && make install)
export RP_DATA=$PWD/rp_data PG17_BIN=$PWD/cenv/bin PGBOUNCER=$PWD/pgbi/bin/pgbouncer
for s in pitr replication vacuum wraparound connections upgrade monitor; do
  uv run --no-project --python 3.12 --with pgserver --with 'psycopg[binary]' python <src>/lab/$s.py; done
sh build.sh && python3 recompute.py && node check_page.mjs
```
`connections.py` waits 35 s after each `pgbench -C` run so closed connections leave TIME_WAIT (macOS has about 16k ephemeral ports). `upgrade.py` puts pg_upgrade's socket in `~/.rpg_sock` (the scratch path is longer than the 103-byte socket limit) and removes it.

Measured on 2026-10-04/05, Apple M1 Pro, 16 GB, macOS. macOS fsync does not flush the drive cache, so commit rates are higher than on a server; the page says so.

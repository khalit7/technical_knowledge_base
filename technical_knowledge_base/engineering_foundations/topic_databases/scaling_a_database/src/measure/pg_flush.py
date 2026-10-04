"""Fair insert-latency baseline for crdb.py: the same 1,000 single-row inserts on one local Postgres with
wal_sync_method = fsync_writethrough (a real flush to the SSD on macOS, as CockroachDB's Go runtime does with F_FULLFSYNC),
then the setting restored. Adds 'postgres_flush' to ../inputs/crdb.json."""
import json, os, time, random
import psycopg
from pgc import PG, INPUTS
P = PG('big', 56401); P.start()
P.psql("ALTER SYSTEM SET wal_sync_method = 'fsync_writethrough'"); P.psql('SELECT pg_reload_conf()'); time.sleep(1)
assert P.psql('SHOW wal_sync_method') == 'fsync_writethrough'
v = []
with psycopg.connect(P.dsn(), autocommit=True) as c:
    for i in range(1000):
        t0 = time.perf_counter()
        c.execute("INSERT INTO crdb_cmp (user_id, id, chat_id, tokens, content) VALUES (%s, %s, 1, 10, 'x')", (random.randint(1, 100000), 20_000_000 + i))
        v.append((time.perf_counter() - t0) * 1000)
P.psql('ALTER SYSTEM RESET wal_sync_method'); P.psql('SELECT pg_reload_conf()')
v.sort(); p = os.path.join(INPUTS, 'crdb.json'); R = json.load(open(p))
R['insert_latency']['postgres_flush'] = {'p50': round(v[500], 3), 'p99': round(v[990], 3), 'n': 1000}
json.dump(R, open(p, 'w'), indent=1); print(R['insert_latency'])

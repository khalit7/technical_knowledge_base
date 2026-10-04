"""Monitoring queries and three small incidents, with real output (PostgreSQL 16.2). About 2 minutes.

1. A runaway query (an inequality join: 2,000 x 1,000,000 comparisons, minutes of CPU): found in pg_stat_activity, cancelled with pg_cancel_backend; then statement_timeout doing it for you.
2. Idle-in-transaction sessions (an app that opened a transaction and went away): pg_stat_activity by state, then
   idle_in_transaction_session_timeout ending them.
3. A migration stuck behind a long transaction, and everything queued behind the migration: pg_blocking_pids.
4. The dashboard queries after a pgbench run: pg_stat_database, pg_stat_user_tables, biggest relations, WAL directory.
Writes ../inputs/monitor.json.
"""
import os, sys, time, subprocess, threading
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pgc import *
import psycopg

T = []
def rec(step, cmd, out, secs=None, **kw):
    T.append({'step': step, 'cmd': cmd, 'out': out, 'secs': secs, **kw}); print('==', step, secs, '\n', cmd, '\n', str(out)[:900], flush=True)

M = Cluster('mon', 55500)
M.initdb(); M.conf(timezone='UTC', log_line_prefix='%m [%p] ', track_io_timing='on'); M.start()
load_chat(M)
M.psql("CREATE ROLE app LOGIN; GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app; GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO app;")
DSN = f'host=127.0.0.1 port={M.port} dbname=chat'

# ---- 1. runaway query ----
res = {}
def runaway():
    c = psycopg.connect(DSN + ' user=app', autocommit=True)
    try:
        c.execute("SELECT count(*) FROM messages a JOIN messages b ON a.content < b.content WHERE a.id <= 2000")
    except Exception as e:
        res['err'] = str(e).strip()
th = threading.Thread(target=runaway); th.start(); time.sleep(4)
act = """SELECT pid, usename, state, now() - query_start AS running_for, wait_event, left(query, 40) AS query
FROM pg_stat_activity WHERE state <> 'idle' AND pid <> pg_backend_pid() ORDER BY query_start LIMIT 5"""
rec('runaway_find', act + ';', M.table(act))
M.psql("SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE usename = 'app' AND state = 'active'")
th.join()
rec('runaway_cancel', "SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE pid = <pid>;  -- the app sees:", res.get('err', ''))
M.psql("ALTER ROLE app SET statement_timeout = '2s'")
t = time.time()
c = psycopg.connect(DSN + ' user=app', autocommit=True)
try:
    c.execute("SELECT count(*) FROM messages a JOIN messages b ON a.content < b.content WHERE a.id <= 2000"); err = ''
except Exception as e:
    err = str(e).strip()
dt = round(time.time() - t, 2); c.close()
rec('statement_timeout', "ALTER ROLE app SET statement_timeout = '2s';  -- then the same query again", err, dt)

# ---- 2. idle in transaction ----
idle = []
for i in range(6):
    c = psycopg.connect(DSN + ' user=app'); c.execute('UPDATE chats SET title = title WHERE id = %s', (i + 1,)); idle.append(c)
for i in range(4):
    c = psycopg.connect(DSN + ' user=app', autocommit=True); c.execute('SELECT 1'); idle.append(c)
time.sleep(2)
q = """SELECT state, count(*), max(now() - state_change) AS longest FROM pg_stat_activity WHERE backend_type = 'client backend' AND pid <> pg_backend_pid() GROUP BY state ORDER BY 2 DESC"""
rec('idle_states', q + ';', M.table(q))
M.psql("ALTER ROLE app SET idle_in_transaction_session_timeout = '3s'")
c = psycopg.connect(DSN + ' user=app'); c.execute('SELECT 1'); time.sleep(4.5)
try:
    c.execute('SELECT 1'); e2 = ''
except Exception as e:
    e2 = str(e).strip()
rec('idle_timeout', "ALTER ROLE app SET idle_in_transaction_session_timeout = '3s';  -- a new session opens a transaction, waits 4.5 s, then:", e2)
for c in idle:
    try: c.close()
    except Exception: pass

# ---- 3. a migration queued behind a long transaction ----
M.psql("ALTER ROLE app RESET statement_timeout; ALTER ROLE app RESET idle_in_transaction_session_timeout")
longtx = psycopg.connect(DSN + ' user=postgres'); longtx.execute('SELECT count(*) FROM users').fetchone()       # holds ACCESS SHARE on users
mig = subprocess.Popen([M.b('psql'), '-h', '127.0.0.1', '-p', str(M.port), '-U', 'postgres', '-X', '-c', "ALTER TABLE users ADD COLUMN locale text", 'chat'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
time.sleep(1)
readers = [subprocess.Popen([M.b('psql'), '-h', '127.0.0.1', '-p', str(M.port), '-U', 'app', '-X', '-c', "SELECT email FROM users WHERE id = 7", 'chat'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True) for _ in range(3)]
time.sleep(1.5)
bq = """SELECT pid, pg_blocking_pids(pid) AS blocked_by, wait_event_type, now() - query_start AS waiting, left(query, 38) AS query
FROM pg_stat_activity WHERE cardinality(pg_blocking_pids(pid)) > 0 OR pid IN (SELECT unnest(pg_blocking_pids(a.pid)) FROM pg_stat_activity a)
ORDER BY query_start"""
rec('lock_queue', bq + ';', M.table(bq))
longtx.close(); mig.communicate(); [r.communicate() for r in readers]

# ---- 4. dashboard ----
INS = os.path.join(ROOT, 'insert_mon.sql')
open(INS, 'w').write("\\set c random(1, 100000)\nINSERT INTO messages(chat_id, role, model, tokens, content, created_at) VALUES (:c, 'user', 'mini', 42, repeat('x', 120), now());\nSELECT count(*) FROM messages WHERE chat_id = :c;\n")
sh(M.b('pgbench'), '-h', '127.0.0.1', '-p', M.port, '-U', 'postgres', '-n', '-c', '4', '-T', '10', '-f', INS, 'chat')
db = """SELECT numbackends, xact_commit, xact_rollback, round(100.0 * blks_hit / nullif(blks_hit + blks_read, 0), 2) AS cache_hit_pct,
 deadlocks, temp_files, pg_size_pretty(temp_bytes) AS temp_bytes, pg_size_pretty(pg_database_size(datname)) AS size
FROM pg_stat_database WHERE datname = 'chat'"""
rec('stat_database', db + ';', M.table(db))
ut = """SELECT relname, n_live_tup, n_dead_tup, round(100.0 * n_dead_tup / nullif(n_live_tup + n_dead_tup, 0), 1) AS dead_pct,
 seq_scan, idx_scan, last_autovacuum IS NOT NULL AS autovacuumed
FROM pg_stat_user_tables ORDER BY n_dead_tup DESC LIMIT 5"""
rec('stat_tables', ut + ';', M.table(ut))
big = """SELECT relname, relkind, pg_size_pretty(pg_total_relation_size(c.oid)) AS total
FROM pg_class c WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r', 'i') ORDER BY pg_total_relation_size(c.oid) DESC LIMIT 6"""
rec('biggest', big + ';', M.table(big))
wal = "SELECT count(*) AS wal_files, pg_size_pretty(sum(size)) AS wal_size FROM pg_ls_waldir()"
rec('waldir', wal + ';', M.table(wal))
M.stop()
dump('monitor.json', {'machine': machine(), 'version': '16.2 (pgserver wheel)', 'steps': T})

"""Locks, deadlocks, lock queues, SKIP LOCKED, optimistic updates, long transactions and the price of durability,
each on a real PostgreSQL 16.2 (pgserver wheel) with real concurrent sessions.
Run from a scratch directory:
  TX_SCRATCH=$PWD uv run --no-project --python 3.12 --with pgserver --with 'psycopg[binary]' python <repo>/.../src/measure/extras.py
Writes src/inputs/extras_pg.json."""
import os, sys, json, time, datetime, statistics, platform, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from txharness import *
from scenarios import RESET

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'inputs', 'extras_pg.json')
srv = PG(pgserver_bin(), os.path.join(SCR, 'pg_extras'), '55732')
print(srv.start()); srv.ensure_db()
res = {'date': datetime.date.today().isoformat(), 'version': srv.version(), 'machine': 'Apple M1 Pro laptop, macOS ' + platform.mac_ver()[0]}
def keep(tr):
    return {'steps': tr['steps'], 'final': tr['final']}

# 1. deadlock: two transfers in opposite order, then the same two in a fixed order
T = 'UPDATE credits SET balance = balance %s %d WHERE user_id = %d'
dead = [dict(s='A', sql='BEGIN', note='transfer 5 from 7 to 12'), dict(s='B', sql='BEGIN', note='transfer 3 from 12 to 7'),
        dict(s='A', sql=T % ('-', 5, 7), note='A locks row 7'), dict(s='B', sql=T % ('-', 3, 12), note='B locks row 12'),
        dict(s='A', sql=T % ('+', 5, 12), note='A needs row 12: waits for B'), dict(s='B', sql=T % ('+', 3, 7), note='B needs row 7: waits for A. A cycle.'),
        dict(s='A', sql='COMMIT'), dict(s='B', sql='COMMIT')]
res['deadlock'] = keep(run_trace(srv, ['A', 'B'], dead, RESET, {'balances': 'SELECT user_id, balance FROM credits ORDER BY user_id'}))
ordered = [dict(s='A', sql='BEGIN', note='transfer 5 from 7 to 12'), dict(s='B', sql='BEGIN', note='transfer 3 from 12 to 7'),
           dict(s='A', sql='SELECT user_id FROM credits WHERE user_id IN (7, 12) ORDER BY user_id FOR UPDATE', note='lock both rows, lowest id first'),
           dict(s='B', sql='SELECT user_id FROM credits WHERE user_id IN (7, 12) ORDER BY user_id FOR UPDATE', note='same order: waits for A, no cycle'),
           dict(s='A', sql=[T % ('-', 5, 7), T % ('+', 5, 12)]), dict(s='A', sql='COMMIT'),
           dict(s='B', sql=[T % ('-', 3, 12), T % ('+', 3, 7)]), dict(s='B', sql='COMMIT')]
res['deadlock_ordered'] = keep(run_trace(srv, ['A', 'B'], ordered, RESET, {'balances': 'SELECT user_id, balance FROM credits ORDER BY user_id'}))

# 2. the lock queue: a migration waits behind a long read, and every later query waits behind the migration
q = [dict(s='A', sql='BEGIN', note='an analytics query left in an open transaction'),
     dict(s='A', sql='SELECT count(*) FROM messages', note='holds an ACCESS SHARE lock until commit'),
     dict(s='B', sql='ALTER TABLE messages ADD COLUMN flagged boolean', note='a migration needs ACCESS EXCLUSIVE: waits for A'),
     dict(s='C', sql='SELECT count(*) FROM messages WHERE user_id = 7', note='an ordinary read: queues behind the migration'),
     dict(s='A', sql='COMMIT', note='the analytics transaction ends'),
     dict(s='C', sql="SELECT 'C done'")]
res['lock_queue'] = keep(run_trace(srv, ['A', 'B', 'C'], q, RESET, {}))
q2 = [q[0], q[1], dict(s='B', sql=["SET lock_timeout = '200ms'", 'ALTER TABLE messages ADD COLUMN flagged boolean'], note='the same migration with lock_timeout'),
      q[3], q[4]]
res['lock_queue_timeout'] = keep(run_trace(srv, ['A', 'B', 'C'], q2, RESET, {}))

# 3. a job queue: FOR UPDATE, SKIP LOCKED, NOWAIT
JR = RESET + ['DROP TABLE IF EXISTS jobs', "CREATE TABLE jobs (id int PRIMARY KEY, status text NOT NULL)",
              "INSERT INTO jobs SELECT i, 'queued' FROM generate_series(1, 5) i"]
NEXT = "SELECT id FROM jobs WHERE status = 'queued' ORDER BY id LIMIT 1 FOR UPDATE"
for mode, suffix in (('plain', ''), ('skip', ' SKIP LOCKED'), ('nowait', ' NOWAIT')):
    st = [dict(s='A', sql='BEGIN'), dict(s='A', sql=NEXT + suffix, note='worker A claims the next job'),
          dict(s='B', sql='BEGIN'), dict(s='B', sql=NEXT + suffix, note='worker B claims the next job'),
          dict(s='A', sql="UPDATE jobs SET status = 'done' WHERE id = 1"), dict(s='A', sql='COMMIT'), dict(s='B', sql='COMMIT')]
    res['jobs_' + mode] = keep(run_trace(srv, ['A', 'B'], st, JR, {}))

# 4. optimistic concurrency: a version column and compare-and-set, no transaction held open
R = 'SELECT balance, version FROM credits WHERE user_id = 7'
CAS = lambda key, d: (lambda n: 'UPDATE credits SET balance = %d, version = version + 1 WHERE user_id = 7 AND version = %d'
                      % (n[key]['rows'][0][0] - d, n[key]['rows'][0][1]))
opt = [dict(s='A', sql=R, key='a1', note='A reads balance and version'), dict(s='B', sql=R, key='b1', note='B reads the same'),
       dict(s='A', sql=CAS('a1', 10), note='A: write if the version is still the one I read'),
       dict(s='B', sql=CAS('b1', 5), note='B: same, but the version moved: 0 rows'),
       dict(s='B', sql=R, key='b2', note='B re-reads'), dict(s='B', sql=CAS('b2', 5), note='B retries the write')]
res['optimistic'] = keep(run_trace(srv, ['A', 'B'], opt, RESET, {'row': R}))

# 5. advisory locks: a lock on a number, not a row
adv = [dict(s='A', sql='SELECT pg_try_advisory_lock(7)', note='A: only one summariser per user'),
       dict(s='B', sql='SELECT pg_try_advisory_lock(7)', note='B tries the same user'),
       dict(s='A', sql='SELECT pg_advisory_unlock(7)'), dict(s='B', sql='SELECT pg_try_advisory_lock(7)'),
       dict(s='B', sql='SELECT pg_advisory_unlock(7)')]
res['advisory'] = keep(run_trace(srv, ['A', 'B'], adv, RESET, {}))

# 6. a long transaction stops clean-up: dead row versions pile up until it ends
import psycopg
c = srv.connect()
for s in RESET: c.execute(s)
c.execute('ALTER TABLE credits SET (autovacuum_enabled = false)')
def size(): return c.execute("SELECT pg_relation_size('credits')").fetchone()[0]
def lat(n=300):
    ts = []
    for _ in range(n):
        t = time.perf_counter(); c.execute('SELECT balance FROM credits WHERE user_id = 7').fetchone(); ts.append((time.perf_counter() - t) * 1e6)
    return round(statistics.median(ts), 1)
def vac():
    msgs = []
    f = lambda d: msgs.append(d.message_primary)
    c.add_notice_handler(f)
    c.execute('VACUUM (VERBOSE) credits'); c.remove_notice_handler(f)
    m = ' '.join(msgs)
    r = re.search(r'tuples: (\d+) removed, (\d+) remain, (\d+) are dead but not yet removable', m)
    return {'removed': int(r.group(1)), 'remain': int(r.group(2)), 'dead_not_removable': int(r.group(3))} if r else {'raw': m[:600]}
N = 20000
long = {'updates': N, 'size_before': size(), 'lat_before_us': lat()}
L = srv.connect(); L.execute('BEGIN ISOLATION LEVEL REPEATABLE READ'); L.execute('SELECT 1')   # the forgotten transaction
t = time.perf_counter()
for _ in range(N): c.execute('UPDATE credits SET balance = balance + 1 WHERE user_id = 7')
long['update_s_held'] = round(time.perf_counter() - t, 2)
long['size_held'] = size(); long['lat_held_us'] = lat(); long['vacuum_held'] = vac(); long['size_after_vacuum_held'] = size()
L.execute('COMMIT'); L.close()
long['vacuum_after'] = vac(); long['size_after'] = size(); long['lat_after_us'] = lat()
t = time.perf_counter()
for _ in range(N): c.execute('UPDATE credits SET balance = balance + 1 WHERE user_id = 7')
long['update_s_free'] = round(time.perf_counter() - t, 2); long['size_free'] = size()
c.execute('VACUUM credits'); long['size_free_vacuumed'] = size()
res['long_tx'] = long; c.close()

# 7. the price of durability: one client, one INSERT per transaction, 5 seconds per setting
def commits(sync, secs=5):
    k = srv.connect()
    k.execute('DROP TABLE IF EXISTS ticks'); k.execute('CREATE TABLE ticks (id bigserial PRIMARY KEY, at timestamptz DEFAULT now())')
    k.execute(f'SET synchronous_commit = {sync}')
    n = 0; t = time.perf_counter()
    while time.perf_counter() - t < secs:
        k.execute('INSERT INTO ticks DEFAULT VALUES'); n += 1
    dt = time.perf_counter() - t; k.close()
    return {'commits_per_s': round(n / dt), 'ms_per_commit': round(dt / n * 1000, 3)}
dur = {}
k = srv.connect(); dur['wal_sync_method_default'] = k.execute('SHOW wal_sync_method').fetchone()[0]; k.close()
for sync in ('on', 'off'): dur['default_' + sync] = commits(sync)
srv.stop(); srv.start('-c wal_sync_method=fsync_writethrough')
for sync in ('on', 'off'): dur['writethrough_' + sync] = commits(sync)
res['durability'] = dur
srv.stop()
json.dump(res, open(OUT, 'w'), indent=1)
print(json.dumps({k: v for k, v in res.items() if k in ('long_tx', 'durability')}, indent=1))

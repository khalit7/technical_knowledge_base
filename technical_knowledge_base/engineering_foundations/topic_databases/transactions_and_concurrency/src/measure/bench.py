"""What correctness costs under contention: the "spend one credit and save the message" transaction, run by 2, 8 and 32
concurrent clients for 8 seconds each, on a real PostgreSQL 16.2 (pgserver wheel), four ways:
  rc_naive       read committed, read the balance, write back read - 1        (fast and wrong: lost updates)
  rc_atomic      read committed, UPDATE ... SET balance = balance - 1 WHERE balance > 0 RETURNING
  rc_for_update  read committed, SELECT ... FOR UPDATE, then write
  ser_retry      serializable, the naive code unchanged, wrapped in a retry loop on SQLSTATE 40001 / 40P01
Two contention levels: every client spends from one of 4 hot users, or from 10,000 users.
Each client is its own OS process with its own connection, so Python's interpreter lock does not throttle the clients.
Run from a scratch directory:
  TX_SCRATCH=$PWD uv run --no-project --python 3.12 --with pgserver --with 'psycopg[binary]' python <repo>/.../src/measure/bench.py
Writes src/inputs/bench_pg.json."""
import os, sys, json, time, random, threading, datetime, platform
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from txharness import PG, pgserver_bin, SCR, sh
import psycopg
from psycopg import errors

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'inputs', 'bench_pg%s.json' % os.environ.get('TAG', ''))
SECS = 8; CLIENTS = (2, 8, 32); POOLS = {'hot': 4, 'spread': 10000}; START = 10**9

# ---- the retry loop shown on the page (verbatim) ----
RETRYABLE = (errors.SerializationFailure, errors.DeadlockDetected)   # SQLSTATE 40001 and 40P01

def run_in_transaction(conn, work, max_attempts=10):
    """Run work(conn) in a transaction; on a serialization failure or deadlock, roll back and run it again."""
    for attempt in range(1, max_attempts + 1):
        try:
            with conn.transaction():          # BEGIN ... COMMIT, or ROLLBACK if work raises
                return work(conn), attempt
        except RETRYABLE:
            if attempt == max_attempts:
                raise
            time.sleep(random.uniform(0, min(0.05, 0.001 * 2 ** attempt)))   # full jitter, capped

def spend_naive(conn, uid):
    bal = conn.execute('SELECT balance FROM credits WHERE user_id = %s', (uid,)).fetchone()[0]
    if bal <= 0: return False
    conn.execute('INSERT INTO messages (user_id, day) VALUES (%s, 20261004)', (uid,))
    conn.execute('UPDATE credits SET balance = %s WHERE user_id = %s', (bal - 1, uid))
    return True

def spend_atomic(conn, uid):
    r = conn.execute('UPDATE credits SET balance = balance - 1 WHERE user_id = %s AND balance > 0 RETURNING balance', (uid,)).fetchone()
    if r is None: return False
    conn.execute('INSERT INTO messages (user_id, day) VALUES (%s, 20261004)', (uid,))
    return True

def spend_for_update(conn, uid):
    bal = conn.execute('SELECT balance FROM credits WHERE user_id = %s FOR UPDATE', (uid,)).fetchone()[0]
    if bal <= 0: return False
    conn.execute('INSERT INTO messages (user_id, day) VALUES (%s, 20261004)', (uid,))
    conn.execute('UPDATE credits SET balance = %s WHERE user_id = %s', (bal - 1, uid))
    return True

MODES = {'rc_naive': ('READ_COMMITTED', spend_naive), 'rc_atomic': ('READ_COMMITTED', spend_atomic),
         'rc_for_update': ('READ_COMMITTED', spend_for_update), 'ser_retry': ('SERIALIZABLE', spend_naive)}

# PG_BIN: another PostgreSQL build to compare (default: the pgserver wheel's 16.2); ONLY: comma list of mode:clients:contention to run
PG_BIN = os.environ.get('PG_BIN') or pgserver_bin()
TAG = os.environ.get('TAG', '')
srv = PG(PG_BIN, os.path.join(SCR, 'pg_bench' + TAG), '55733')
print(srv.start('-c max_connections=120')); srv.ensure_db()

def reset(pool):
    c = srv.connect()
    c.execute('DROP TABLE IF EXISTS credits'); c.execute('DROP TABLE IF EXISTS messages')
    c.execute('CREATE TABLE credits (user_id int PRIMARY KEY, balance int NOT NULL CHECK (balance >= 0))')
    c.execute('INSERT INTO credits SELECT i, %s FROM generate_series(1, %s) i', (START, pool))
    c.execute('CREATE TABLE messages (id bigserial PRIMARY KEY, user_id int NOT NULL, day int NOT NULL)')
    c.execute('CREATE INDEX ON messages (user_id)'); c.execute('VACUUM ANALYZE credits'); c.close()

def client(mode, pool, seed, t_start, t_stop, q):
    """one client = one OS process with its own connection (no shared Python interpreter lock)"""
    iso, work = MODES[mode]
    rnd = random.Random(seed)
    conn = psycopg.connect(host='127.0.0.1', port=srv.port, user='postgres', dbname='txlab', autocommit=True)
    conn.isolation_level = getattr(psycopg.IsolationLevel, iso)
    s = {'commits': 0, 'attempts': 0, 'gave_up': 0, 'lat': []}
    while time.time() < t_start: time.sleep(0.001)
    while time.time() < t_stop:
        uid = rnd.randint(1, pool); t = time.perf_counter()
        try:
            _, att = run_in_transaction(conn, lambda c: work(c, uid))
            s['commits'] += 1; s['attempts'] += att; s['lat'].append(time.perf_counter() - t)
        except RETRYABLE:
            s['gave_up'] += 1; s['attempts'] += 10
    conn.close(); q.put(s)

def run(mode, clients, pool):
    import multiprocessing as mp
    reset(pool)
    ctx = mp.get_context('fork'); q = ctx.Queue()
    t_start = time.time() + 1.0; t_stop = t_start + SECS
    ps = [ctx.Process(target=client, args=(mode, pool, i, t_start, t_stop, q)) for i in range(clients)]
    [p.start() for p in ps]
    stats = []
    try:
        for _ in ps: stats.append(q.get(timeout=max(1, t_stop + 60 - time.time())))
    except Exception:
        # stalled: record what the server is doing, kill everything, restart the server
        a = srv.connect()
        act = a.execute("SELECT state, wait_event_type, wait_event, left(query, 60), extract(epoch FROM now() - xact_start)::int FROM pg_stat_activity WHERE datname = 'txlab' AND pid <> pg_backend_pid()").fetchall()
        a.close()
        [p.kill() for p in ps]
        sh(f'{srv.B}/pg_ctl', '-D', srv.data, '-m', 'immediate', '-w', 'stop'); srv.start('-c max_connections=120')
        r = {'mode': mode, 'clients': clients, 'pool': pool, 'stalled': True, 'finished_clients': len(stats),
             'activity': [list(map(str, x)) for x in act]}
        print(json.dumps(r), flush=True); return r
    [p.join() for p in ps]
    dt = SECS
    c = srv.connect()
    msgs = c.execute('SELECT count(*) FROM messages').fetchone()[0]
    charged = c.execute('SELECT %s::bigint * count(*) - sum(balance) FROM credits', (START,)).fetchone()[0]
    c.close()
    commits = sum(s['commits'] for s in stats); attempts = sum(s['attempts'] for s in stats)
    lat = sorted(x for s in stats for x in s['lat'])
    q_ = lambda p: round(lat[min(len(lat) - 1, int(p * len(lat)))] * 1000, 2) if lat else None
    r = {'mode': mode, 'clients': clients, 'pool': pool, 'seconds': dt, 'commits': commits,
         'commits_per_s': round(commits / dt), 'retries': attempts - commits, 'retries_per_commit': round((attempts - commits) / max(commits, 1), 3),
         'gave_up': sum(s['gave_up'] for s in stats), 'p50_ms': q_(.5), 'p99_ms': q_(.99),
         'messages_saved': msgs, 'credits_charged': int(charged), 'lost_updates': msgs - int(charged)}
    print(json.dumps(r), flush=True); return r

out = {'date': datetime.date.today().isoformat(), 'version': srv.version(), 'machine': 'Apple M1 Pro laptop (10 cores), macOS ' + platform.mac_ver()[0],
       'seconds_per_run': SECS, 'runs': []}
ONLY = [x.split(':') for x in os.environ.get('ONLY', '').split(',') if x]
for pname, pool in POOLS.items():
    for mode in MODES:
        for n in CLIENTS:
            if ONLY and [mode, str(n), pname] not in ONLY: continue
            r = run(mode, n, pool); r['contention'] = pname; out['runs'].append(r)
            json.dump(out, open(OUT, 'w'), indent=1)
srv.stop()

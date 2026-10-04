"""Real experiments for "Queues, streams and async work", on a local PostgreSQL (binaries from the pgserver wheel).

Run from the scratchpad (never from the repo without --no-project):
  uv run --no-project --python 3.12 --with pgserver --with "psycopg[binary]" python pg_lab.py OUT.json

Three experiments, all on one laptop, all with real processes, real transactions and real row locks:
 1. throughput: a jobs table drained by 1, 2, 4, 8 worker threads, each holding the row lock while it works
    (5 ms of simulated work), with SELECT ... FOR UPDATE SKIP LOCKED against plain FOR UPDATE.
 2. redelivery: a lease-style queue (the SQS model: a claimed job becomes invisible for a visibility timeout,
    and comes back if not deleted in time). Workers are real OS processes; a crash is os._exit() at a chosen point.
    The side effect ("send the receipt e-mail") goes to a separate database, so it is outside the queue's transaction,
    like a real e-mail or payment provider. Modes: at-most-once (delete first), at-least-once naive,
    at-least-once with an idempotent receiver (unique key on the message id), and a visibility timeout shorter
    than some jobs.
 3. dual write vs outbox: an order service writes orders to its database and publishes "order placed" events to a
    broker (a separate database, standing in for Kafka or SQS: no shared transaction). Crashes are injected between
    the two writes (naive), or between publish and mark-sent in the outbox relay.
"""
import os, sys, json, time, random, shutil, tempfile, subprocess, threading, datetime, platform
import multiprocessing as mp
import psycopg

PORT = '54337'
def dsn(db='postgres'): return f'host=127.0.0.1 port={PORT} user=postgres dbname={db}'

# ---------------------------------------------------------------- server
def start_server():
    import pgserver
    B = os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin')
    d = tempfile.mkdtemp(prefix='pgq'); data = os.path.join(d, 'data')
    subprocess.run([f'{B}/initdb', '-D', data, '-U', 'postgres', '--auth=trust'], capture_output=True, check=True)
    subprocess.run([f'{B}/pg_ctl', '-D', data, '-o', f'-p {PORT} -k {d} -c max_connections=200', '-l', d + '/log', '-w', 'start'],
                   capture_output=True, check=True)
    return B, d, data

def stop_server(B, d, data):
    subprocess.run([f'{B}/pg_ctl', '-D', data, '-m', 'fast', '-w', 'stop'], capture_output=True)
    shutil.rmtree(d, ignore_errors=True)

def sql(q, db='postgres', args=None, fetch=False):
    with psycopg.connect(dsn(db), autocommit=True) as c:
        cur = c.execute(q, args)
        return cur.fetchall() if fetch else None

# ---------------------------------------------------------------- 1. throughput
def exp_throughput(n_jobs=400, work_s=0.005, workers=(1, 2, 4, 8)):
    out = []
    for mode in ('skip_locked', 'for_update'):
        for w in workers:
            sql('DROP TABLE IF EXISTS jobs; CREATE TABLE jobs (id bigserial PRIMARY KEY, payload text)')
            sql('INSERT INTO jobs (payload) SELECT md5(g::text) FROM generate_series(1,%s) g', args=(n_jobs,))
            done = [0] * w; empty = [0] * w
            lock_clause = 'FOR UPDATE SKIP LOCKED' if mode == 'skip_locked' else 'FOR UPDATE'
            def worker(i):
                with psycopg.connect(dsn()) as c:
                    while True:
                        with c.transaction():
                            r = c.execute(f'SELECT id FROM jobs ORDER BY id LIMIT 1 {lock_clause}').fetchone()
                            if r is None:
                                left = c.execute('SELECT count(*) FROM jobs').fetchone()[0]
                                if left == 0: return
                                empty[i] += 1; continue
                            time.sleep(work_s)          # the job's work, done while holding the row lock
                            c.execute('DELETE FROM jobs WHERE id = %s', (r[0],))
                        done[i] += 1
            t0 = time.perf_counter()
            ts = [threading.Thread(target=worker, args=(i,)) for i in range(w)]
            [t.start() for t in ts]; [t.join() for t in ts]
            dt = time.perf_counter() - t0
            out.append({'mode': mode, 'workers': w, 'jobs': sum(done), 'seconds': round(dt, 3),
                        'jobs_per_s': round(sum(done) / dt, 1), 'empty_claims': sum(empty),
                        'ideal_jobs_per_s': round(w / work_s, 1)})
            print('throughput', out[-1], flush=True)
    return out

# ---------------------------------------------------------------- 2. redelivery
def setup_queue(n_jobs):
    sql('DROP TABLE IF EXISTS jobs; CREATE TABLE jobs (id bigserial PRIMARY KEY, order_id int NOT NULL, '
        'visible_at timestamptz NOT NULL DEFAULT now(), receives int NOT NULL DEFAULT 0)')
    sql('INSERT INTO jobs (order_id) SELECT g FROM generate_series(1,%s) g', args=(n_jobs,))
    sql('DROP TABLE IF EXISTS emails; CREATE TABLE emails (seq bigserial PRIMARY KEY, job_id bigint NOT NULL, '
        'order_id int NOT NULL, at timestamptz DEFAULT clock_timestamp())', db='maildb')
    sql('DROP TABLE IF EXISTS emails_idem; CREATE TABLE emails_idem (job_id bigint PRIMARY KEY, order_id int NOT NULL, '
        'at timestamptz DEFAULT clock_timestamp())', db='maildb')
    sql('DROP TABLE IF EXISTS dedup_hits; CREATE TABLE dedup_hits (n bigserial, job_id bigint)', db='maildb')

CLAIM = ('UPDATE jobs SET visible_at = clock_timestamp() + make_interval(secs => %s), receives = receives + 1 '
         'WHERE id = (SELECT id FROM jobs WHERE visible_at <= clock_timestamp() ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED) '
         'RETURNING id, order_id, receives')

def q_worker(seed, mode, vt, work_mean, work_dist, p_crash, stop_at):
    """One worker process. Exits with code 3 to simulate a crash (os._exit: no cleanup, no ack)."""
    rnd = random.Random(seed)
    q = psycopg.connect(dsn(), autocommit=True)
    m = psycopg.connect(dsn('maildb'), autocommit=True)
    while time.time() < stop_at:
        r = q.execute(CLAIM, (vt,)).fetchone()
        if r is None:
            left = q.execute('SELECT count(*) FROM jobs').fetchone()[0]
            if left == 0: os._exit(0)
            time.sleep(0.02); continue
        job_id, order_id, receives = r
        if mode == 'at_most_once':                        # delete (ack) first, then work
            q.execute('DELETE FROM jobs WHERE id = %s', (job_id,))
            if rnd.random() < p_crash: os._exit(3)        # crash after the ack, before the e-mail: the job is lost
        w = work_mean if work_dist == 'fixed' else rnd.expovariate(1 / work_mean)
        time.sleep(w)
        if mode == 'idempotent':
            cur = m.execute('INSERT INTO emails_idem (job_id, order_id) VALUES (%s,%s) ON CONFLICT (job_id) DO NOTHING',
                            (job_id, order_id))
            if cur.rowcount == 0: m.execute('INSERT INTO dedup_hits (job_id) VALUES (%s)', (job_id,))
        else:
            m.execute('INSERT INTO emails (job_id, order_id) VALUES (%s,%s)', (job_id, order_id))
        if mode != 'at_most_once':
            if rnd.random() < p_crash: os._exit(3)        # crash after the e-mail, before the ack
            q.execute('DELETE FROM jobs WHERE id = %s', (job_id,))
    os._exit(0)

def exp_redelivery(cond, seed):
    n = cond['jobs']; setup_queue(n)
    ctx = mp.get_context('spawn')
    stop_at = time.time() + cond.get('max_s', 120)
    procs = {}; crashes = 0; k = 0
    def launch(slot):
        nonlocal k; k += 1
        p = ctx.Process(target=q_worker, args=(seed * 1000 + k, cond['mode'], cond['vt'], cond['work_mean'],
                                                cond['work_dist'], cond['p_crash'], stop_at))
        p.start(); procs[slot] = p
    t0 = time.time()
    for s in range(cond['workers']): launch(s)
    while procs:
        time.sleep(0.05)
        for s, p in list(procs.items()):
            if p.exitcode is None: continue
            if p.exitcode == 3:
                crashes += 1; launch(s)                   # a supervisor (systemd, Kubernetes) restarts it
            else: del procs[s]
    dt = time.time() - t0
    tbl = 'emails_idem' if cond['mode'] == 'idempotent' else 'emails'
    rows = sql(f'SELECT count(*), count(DISTINCT order_id) FROM {tbl}', db='maildb', fetch=True)[0]
    dedup = sql('SELECT count(*) FROM dedup_hits', db='maildb', fetch=True)[0][0]
    left = sql('SELECT count(*), coalesce(sum(receives),0) FROM jobs', fetch=True)[0]
    res = dict(cond, seed=seed, crashes=crashes, seconds=round(dt, 2), effects=rows[0], distinct_orders=rows[1],
               duplicates=rows[0] - rows[1], lost=n - rows[1], dedup_hits=dedup, jobs_left=left[0])
    print('redelivery', res, flush=True)
    return res

# ---------------------------------------------------------------- 3. dual write vs outbox
def setup_orders():
    sql('DROP TABLE IF EXISTS orders; CREATE TABLE orders (id int PRIMARY KEY, total_cents int NOT NULL)')
    sql('DROP TABLE IF EXISTS outbox; CREATE TABLE outbox (seq bigserial PRIMARY KEY, event_id uuid NOT NULL UNIQUE, '
        'order_id int NOT NULL, payload jsonb NOT NULL, sent_at timestamptz)')
    sql('DROP TABLE IF EXISTS events; CREATE TABLE events (seq bigserial PRIMARY KEY, event_id uuid NOT NULL, '
        'order_id int NOT NULL)', db='brokerdb')

def producer(seed, mode, n, p_crash):
    rnd = random.Random(seed)
    db = psycopg.connect(dsn()); br = psycopg.connect(dsn('brokerdb'), autocommit=True)
    import uuid
    if mode == 'naive_publish_first':
        # where to resume: the last order the broker heard about (the next one may have been published, not saved)
        start = (br.execute('SELECT coalesce(max(order_id),0) FROM events').fetchone()[0] or 0) + 1
    else:
        start = (db.execute('SELECT coalesce(max(id),0) FROM orders').fetchone()[0] or 0) + 1; db.commit()
    for oid in range(start, n + 1):
        total = rnd.randint(100, 9999); ev = str(uuid.uuid4())
        if mode == 'naive':                                 # 1) commit the order  2) publish the event
            with db.transaction(): db.execute('INSERT INTO orders VALUES (%s,%s)', (oid, total))
            if rnd.random() < p_crash: os._exit(3)
            br.execute('INSERT INTO events (event_id, order_id) VALUES (%s,%s)', (ev, oid))
        elif mode == 'naive_publish_first':                 # 1) publish  2) commit
            br.execute('INSERT INTO events (event_id, order_id) VALUES (%s,%s)', (ev, oid))
            if rnd.random() < p_crash: os._exit(3)
            with db.transaction(): db.execute('INSERT INTO orders VALUES (%s,%s)', (oid, total))
        else:                                               # outbox: order and event row in ONE transaction
            with db.transaction():
                db.execute('INSERT INTO orders VALUES (%s,%s)', (oid, total))
                db.execute('INSERT INTO outbox (event_id, order_id, payload) VALUES (%s,%s,%s)',
                           (ev, oid, json.dumps({'type': 'order_placed', 'order_id': oid, 'total_cents': total})))
            if rnd.random() < p_crash: os._exit(3)          # a crash here loses nothing: both rows are committed
    os._exit(0)

def relay(seed, p_crash, stop_at, batch=10):
    rnd = random.Random(seed)
    db = psycopg.connect(dsn()); br = psycopg.connect(dsn('brokerdb'), autocommit=True)
    idle = 0
    while time.time() < stop_at:
        with db.transaction():
            rows = db.execute('SELECT seq, event_id, order_id FROM outbox WHERE sent_at IS NULL ORDER BY seq '
                              'LIMIT %s FOR UPDATE SKIP LOCKED', (batch,)).fetchall()
            for seq, ev, oid in rows:
                br.execute('INSERT INTO events (event_id, order_id) VALUES (%s,%s)', (ev, oid))   # publish
                if rnd.random() < p_crash: os._exit(3)     # crash after publishing, before marking sent
                db.execute('UPDATE outbox SET sent_at = clock_timestamp() WHERE seq = %s', (seq,))
        if not rows:
            idle += 1
            if idle > 40: os._exit(0)
            time.sleep(0.025)
        else: idle = 0
    os._exit(0)

def run_supervised(ctx, target, argf, max_s=120):
    crashes = 0; k = 0; t_end = time.time() + max_s
    p = ctx.Process(target=target, args=argf(k)); p.start()
    while True:
        p.join(0.05)
        if p.exitcode is None:
            if time.time() > t_end: p.kill(); break
            continue
        if p.exitcode == 3:
            crashes += 1; k += 1; p = ctx.Process(target=target, args=argf(k)); p.start()
        else: break
    return crashes

def exp_outbox(mode, n, p_crash, seed):
    setup_orders(); ctx = mp.get_context('spawn')
    t0 = time.time()
    pc = run_supervised(ctx, producer, lambda k: (seed * 100 + k, mode, n, p_crash))
    rc = 0
    if mode == 'outbox':
        stop_at = time.time() + 120
        rc = run_supervised(ctx, relay, lambda k: (seed * 100 + 50 + k, p_crash, stop_at))
    dt = time.time() - t0
    orders = {r[0] for r in sql('SELECT id FROM orders', fetch=True)}
    ev = sql('SELECT event_id, order_id FROM events', db='brokerdb', fetch=True)
    ev_orders = {r[1] for r in ev}; distinct_events = len({r[0] for r in ev})
    res = {'mode': mode, 'orders_attempted': n, 'p_crash': p_crash, 'seed': seed, 'producer_crashes': pc,
           'relay_crashes': rc, 'orders_saved': len(orders), 'events_in_broker': len(ev), 'distinct_events': distinct_events,
           'lost_events': len(orders - ev_orders), 'phantom_events': len(ev_orders - orders),
           'duplicate_events': len(ev) - distinct_events,
           'after_dedup_exact': (len(orders - ev_orders) == 0 and len(ev_orders - orders) == 0), 'seconds': round(dt, 2)}
    print('outbox', res, flush=True)
    return res

# ---------------------------------------------------------------- main
if __name__ == '__main__':
    outp = sys.argv[1]
    B, d, data = start_server()
    try:
        sql('CREATE DATABASE maildb'); sql('CREATE DATABASE brokerdb')
        ver = sql('SHOW server_version', fetch=True)[0][0]
        result = {'date': datetime.date.today().isoformat(), 'postgres': ver, 'psycopg': psycopg.__version__,
                  'machine': f'{platform.machine()} laptop, macOS {platform.mac_ver()[0]}, {os.cpu_count()} cores, TCP loopback',
                  'note': 'Crashes are injected with os._exit() at the named point; everything else (locks, leases, redelivery, '
                          'transactions) is real PostgreSQL behaviour.'}
        result['throughput'] = exp_throughput()
        conds = [
            {'name': 'at-most-once (delete first), 5% crashes', 'mode': 'at_most_once', 'jobs': 1000, 'workers': 4, 'vt': 2.0,
             'work_mean': 0.01, 'work_dist': 'fixed', 'p_crash': 0.05},
            {'name': 'at-least-once, 5% crashes', 'mode': 'naive', 'jobs': 1000, 'workers': 4, 'vt': 2.0,
             'work_mean': 0.01, 'work_dist': 'fixed', 'p_crash': 0.05},
            {'name': 'at-least-once + idempotent receiver, 5% crashes', 'mode': 'idempotent', 'jobs': 1000, 'workers': 4, 'vt': 2.0,
             'work_mean': 0.01, 'work_dist': 'fixed', 'p_crash': 0.05},
            {'name': 'at-least-once, no crashes, visibility timeout 0.3 s, work exponential mean 0.1 s', 'mode': 'naive',
             'jobs': 600, 'workers': 4, 'vt': 0.3, 'work_mean': 0.1, 'work_dist': 'exp', 'p_crash': 0.0},
            {'name': 'same, idempotent receiver', 'mode': 'idempotent',
             'jobs': 600, 'workers': 4, 'vt': 0.3, 'work_mean': 0.1, 'work_dist': 'exp', 'p_crash': 0.0},
        ]
        result['redelivery'] = [exp_redelivery(c, s) for c in conds for s in (1, 2, 3)]
        result['outbox'] = [exp_outbox(m, 500, 0.05, s) for m in ('naive', 'naive_publish_first', 'outbox') for s in (1, 2, 3)]
    finally:
        stop_server(B, d, data)
    json.dump(result, open(outp, 'w'), indent=1)
    print('wrote', outp)

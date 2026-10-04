"""What a Postgres connection costs, and what PgBouncer changes (PostgreSQL 16.2, PgBouncer 1.24.1 built from source). About 4 minutes.

1. Memory: the postgres processes' physical footprint (macOS vmmap) with 0, 50 and 100 idle connections; one backend
   before and after it has touched the catalogs (information_schema) and run a sort.
2. Setup time: 300 sequential connect + SELECT 1 + close, direct and through PgBouncer (transaction mode); and pgbench
   with a new connection per transaction (-C) against persistent connections, both ways.
3. Exhaustion: a non-superuser role opens connections until max_connections (100) refuses one; then 1,000 clients
   through PgBouncer share 20 server connections (SHOW POOLS).
4. Transaction pooling pitfalls: session state (SET) leaking between clients, and protocol-level prepared statements
   with max_prepared_statements = 0 against 200.
Writes ../inputs/connections.json.
"""
import os, sys, time, subprocess, re, statistics, resource, threading
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pgc import *
import psycopg

resource.setrlimit(resource.RLIMIT_NOFILE, (8192, resource.getrlimit(resource.RLIMIT_NOFILE)[1]))
T = []
def rec(step, cmd, out, secs=None, **kw):
    T.append({'step': step, 'cmd': cmd, 'out': out, 'secs': secs, **kw}); print('==', step, secs, '\n', cmd, '\n', str(out)[:900], flush=True)

C = Cluster('conn', 55460)
C.initdb()
C.conf(log_line_prefix='%m [%p] ', timezone='UTC')
C.start()
load_chat(C, users=10_000, chats=100_000, msgs=200_000)
C.psql("CREATE ROLE app LOGIN; GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO app;")
DSN = f'host=127.0.0.1 port={C.port} user=app dbname=chat'
PB_PORT = 6460; BDSN = f'host=127.0.0.1 port={PB_PORT} user=app dbname=chat'

def backend_pids():
    return [int(x) for x in C.one("SELECT string_agg(pid::text, ' ') FROM pg_stat_activity WHERE backend_type = 'client backend' AND usename = 'app'", db='postgres').split()] if C.one("SELECT count(*) FROM pg_stat_activity WHERE usename = 'app'", db='postgres') != '0' else []

def footprint(pid):
    r = sh('vmmap', '-summary', pid)
    m = re.search(r'Physical footprint:\s+([\d.]+)([KMG])', r.stdout)
    if not m: return None
    return float(m.group(1)) * {'K': 1 / 1024, 'M': 1, 'G': 1024}[m.group(2)]

def rss(pid):
    r = sh('ps', '-o', 'rss=', '-p', pid); return int(r.stdout.strip() or 0) / 1024

# ---- 1. memory ----
mem = []
for n in (1, 50, 100 - 3 - 1):      # 3 slots are reserved for superusers; one more for our own psql probes
    conns = [psycopg.connect(DSN) for _ in range(n)]
    for c in conns: c.execute('SELECT 1')
    pids = backend_pids()
    fp = [footprint(p) for p in pids[:12]]; fp = [x for x in fp if x]
    mem.append({'n': n, 'footprint_mb_median': round(statistics.median(fp), 2), 'rss_mb_median': round(statistics.median([rss(p) for p in pids[:12]]), 2)})
    print(mem[-1], flush=True)
    for c in conns: c.close()
one = psycopg.connect(DSN); one.execute('SELECT 1'); pid = backend_pids()[0]
f0 = footprint(pid)
one.execute('SELECT count(*) FROM information_schema.columns').fetchone()
f1 = footprint(pid)
one.execute("SET work_mem = '64MB'"); one.execute('SELECT * FROM messages ORDER BY content LIMIT 5').fetchall()
f2 = footprint(pid)
one.close()
rec('memory', 'vmmap -summary <backend pid>  (Physical footprint)', f'fresh idle backend: {f0:.1f} MB\nafter reading information_schema.columns: {f1:.1f} MB\nafter a 64 MB work_mem sort of 200k rows: {f2:.1f} MB', None,
    per_n=mem, fresh=f0, catalog=f1, sort=f2)

# ---- PgBouncer ----
PBD = os.path.join(ROOT, 'pgbouncer'); os.makedirs(PBD, exist_ok=True)
open(os.path.join(PBD, 'userlist.txt'), 'w').write('"app" ""\n"postgres" ""\n')
def pgbouncer(pool_size=20, prepared=0, mode='transaction'):
    sh('pkill', '-f', 'pgbouncer.ini')
    time.sleep(0.5)
    ini = os.path.join(PBD, 'pgbouncer.ini')
    open(ini, 'w').write(f"""[databases]
chat = host=127.0.0.1 port={C.port} dbname=chat
[pgbouncer]
listen_addr = 127.0.0.1
listen_port = {PB_PORT}
auth_type = trust
auth_file = {PBD}/userlist.txt
admin_users = postgres
pool_mode = {mode}
default_pool_size = {pool_size}
max_client_conn = 5000
max_prepared_statements = {prepared}
logfile = {PBD}/pgbouncer.log
pidfile = {PBD}/pgbouncer.pid
unix_socket_dir =
""")
    p = subprocess.Popen([PGB, ini], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1); return p
pgb = pgbouncer()

# ---- 2. setup time ----
def connect_times(dsn, n=300):
    ts = []
    for _ in range(n):
        t = time.perf_counter(); c = psycopg.connect(dsn); c.execute('SELECT 1').fetchone(); c.close(); ts.append((time.perf_counter() - t) * 1000)
    ts.sort(); return {'median_ms': round(statistics.median(ts), 3), 'p99_ms': round(ts[int(0.99 * len(ts)) - 1], 3)}
connect_times(DSN, 20); connect_times(BDSN, 20)
cd, cb = connect_times(DSN), connect_times(BDSN)
rec('setup', 'connect, SELECT 1, close: 300 times each way', f"direct to Postgres: median {cd['median_ms']} ms, p99 {cd['p99_ms']} ms\nthrough PgBouncer: median {cb['median_ms']} ms, p99 {cb['p99_ms']} ms", None, direct=cd, bouncer=cb)
S1 = os.path.join(ROOT, 'select1.sql'); open(S1, 'w').write('SELECT 1;\n')
def bench(port, reconnect, user='app'):
    a = [C.b('pgbench'), '-h', '127.0.0.1', '-p', str(port), '-U', user, '-n', '-c', '8', '-j', '4', '-f', S1]
    # with -C every transaction opens a TCP connection; a fixed count (8 x 400) keeps clear of the OS's ephemeral port limit
    a += ['-C', '-t', '400'] if reconnect else ['-T', '8']
    out = sh(*a, 'chat').stdout
    m = re.search(r'tps = ([\d.]+)', out); return float(m.group(1)) if m else None
pg_rows = []
for label, port in (('direct', C.port), ('PgBouncer', PB_PORT)):
    for rc in (False, True):
        pg_rows.append({'path': label, 'reconnect': rc, 'tps': bench(port, rc)}); print(pg_rows[-1], flush=True)
        if rc: time.sleep(35)        # let closed connections leave TIME_WAIT
rec('pgbench', 'pgbench -c 8 -f select1.sql  (-T 8 on persistent connections; -C -t 400: a new connection for every transaction)', '\n'.join(f"{r['path']:<10} {'new connection each time' if r['reconnect'] else 'persistent connections':<26} {r['tps']:,.0f} tps" for r in pg_rows), None, rows=pg_rows)

# ---- 3. exhaustion ----
sh('pkill', '-f', 'pgbouncer.ini'); time.sleep(1)     # PgBouncer's idle server connections would count against the limit
held, err = [], ''
for i in range(200):
    try:
        held.append(psycopg.connect(DSN))
    except Exception as e:
        err = str(e).strip(); break
n_ok = len(held)
for c in held: c.close()
rec('exhaust', 'open connections as role app until one is refused (max_connections = 100)', f'{n_ok} connections opened, then:\n{err}', None, opened=n_ok)
pgb = pgbouncer()
clients, lock = [], threading.Lock()
def client_work(c):
    with c.transaction(): c.execute('SELECT pg_sleep(0.05)')
for i in range(1000):
    clients.append(psycopg.connect(BDSN, autocommit=True))
ths = [threading.Thread(target=client_work, args=(c,)) for c in clients[:300]]
for t in ths: t.start()
time.sleep(0.3)
raw = sh(C.b('psql'), '-h', '127.0.0.1', '-p', PB_PORT, '-U', 'postgres', '-X', '-A', '-F', '|', '-c', 'SHOW POOLS', 'pgbouncer').stdout.splitlines()
hdr = raw[0].split('|'); want = ['database', 'user', 'cl_active', 'cl_waiting', 'sv_active', 'sv_idle', 'maxwait', 'pool_mode']
rows = [dict(zip(hdr, l.split('|'))) for l in raw[1:] if l.startswith('chat|')]
pools = '  '.join(f'{w:>10}' for w in want) + '\n' + '\n'.join('  '.join(f'{r.get(w, ""):>10}' for w in want) for r in rows)
srv = C.one("SELECT count(*) FROM pg_stat_activity WHERE usename = 'app'", db='postgres')
t0 = time.time()
for t in ths: t.join()
batch = round(time.time() - t0 + 0.3, 2)
for c in clients: c.close()
pools_short = pools
rec('bouncer_1000', '1,000 clients connected to PgBouncer, 300 of them running a 50 ms transaction at once; SHOW POOLS;',
    pools_short + f'\n\nserver connections seen by Postgres: {srv}', batch, server_conns=int(srv), batch_secs=batch)

# ---- 4. transaction pooling pitfalls ----
pgb = pgbouncer(pool_size=2)
a = psycopg.connect(BDSN, autocommit=True, prepare_threshold=None); b = psycopg.connect(BDSN, autocommit=True, prepare_threshold=None)   # no automatic prepares here
a.execute("SET statement_timeout = '5s'")
seen_a = [a.execute('SHOW statement_timeout').fetchone()[0] for _ in range(10)]
seen_b = [b.execute('SHOW statement_timeout').fetchone()[0] for _ in range(10)]
a.close(); b.close()
rec('set_leak', "client A: SET statement_timeout = '5s'; then SHOW statement_timeout ten times from client A and ten from client B (pool of 2 server connections)",
    f"client A saw: {' '.join(seen_a)}\nclient B saw: {' '.join(seen_b)}", None, a=seen_a, b=seen_b)
def prepared_run():
    """psycopg 3's default: a query run 5 times on one connection is prepared on the server as _pg3_0, _pg3_1, ..."""
    out, errs = [], 0
    cs = [psycopg.connect(BDSN, autocommit=True) for _ in range(3)]
    for i in range(30):
        c = cs[i % 3]
        try:
            c.execute('SELECT count(*) FROM messages WHERE chat_id = %s', (1 + i,)).fetchone()
        except Exception as e:
            errs += 1; out.append(type(e).__name__ + ': ' + str(e).strip().splitlines()[0])
    for c in cs: c.close()
    return errs, out[:2]
e0, m0 = prepared_run()
pgb = pgbouncer(pool_size=2, prepared=200)
e1, m1 = prepared_run()
sh('pkill', '-f', 'pgbouncer.ini')
rec('prepared', 'three psycopg 3 clients with default settings take turns running the same query 30 times, through PgBouncer in transaction mode, 2 server connections',
    f"max_prepared_statements = 0:   {e0} of 30 failed" + (f"; first error: {m0[0]}" if m0 else '') + f"\nmax_prepared_statements = 200: {e1} of 30 failed", None, fail0=e0, fail200=e1)
C.stop()
dump('connections.json', {'machine': machine(), 'version': '16.2 (pgserver wheel); PgBouncer 1.24.1', 'psycopg': psycopg.__version__, 'steps': T})

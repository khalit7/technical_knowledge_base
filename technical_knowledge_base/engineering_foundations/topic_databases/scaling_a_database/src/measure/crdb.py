"""CockroachDB v26.3.0 (single binary, insecure, local only): 3 nodes on one laptop (SQL ports 56257 to 56259, HTTP 56280 to 56282).
Shows ranges, replicas and leaseholders; measures a writer that keeps inserting while one node is killed (kill -9), then a second
(majority lost), then both restarted; compares single-row insert latency with one local Postgres; reads the follower-read staleness.
Writes ../inputs/crdb.json. About 4 minutes.
Run: SCL_DATA=... CRDB=<path to cockroach binary> uv run --no-project --python 3.12 --with pgserver --with psycopg[binary] python crdb.py
"""
import os, sys, json, time, signal, subprocess, threading, statistics, random
import psycopg
from pgc import PG, save, ROOT, in_use
BIN = os.environ['CRDB']; D = os.path.join(ROOT, 'crdb'); os.makedirs(D, exist_ok=True)
os.environ['COCKROACH_SKIP_ENABLING_DIAGNOSTIC_REPORTING'] = 'true'
SQL = [56257, 56258, 56259]; HTTP = [56280, 56281, 56282]
JOIN = ','.join(f'localhost:{p}' for p in SQL)
procs = {}
def start(i):
    for p in (SQL[i], HTTP[i]):
        if in_use(p) and i not in procs: raise RuntimeError(f'port {p} in use; refusing')
    log = open(os.path.join(D, f'n{i}.log'), 'a')
    procs[i] = subprocess.Popen([BIN, 'start', '--insecure', f'--store={D}/n{i}', f'--listen-addr=localhost:{SQL[i]}',
        f'--http-addr=localhost:{HTTP[i]}', f'--join={JOIN}', '--cache=256MiB', '--max-sql-memory=256MiB'], stdout=log, stderr=log)
def sql(q, port=SQL[0]):
    r = subprocess.run([BIN, 'sql', '--insecure', f'--host=localhost:{port}', '--format=tsv', '-e', q], capture_output=True, text=True)
    if r.returncode: raise RuntimeError(r.stderr[-500:])
    return r.stdout.strip()
R = {'date': time.strftime('%Y-%m-%d'), 'version': subprocess.run([BIN, 'version', '--build-tag'], capture_output=True, text=True).stdout.strip(),
     'machine': 'Apple M1 Pro laptop, 3 nodes on one machine over loopback'}
subprocess.run(['rm', '-rf'] + [f'{D}/n{i}' for i in range(3)])
for i in range(3): start(i)
time.sleep(3)
print(subprocess.run([BIN, 'init', '--insecure', f'--host=localhost:{SQL[0]}'], capture_output=True, text=True).stdout, flush=True)
for _ in range(60):
    try:
        sql('SELECT 1'); break
    except Exception: time.sleep(1)
time.sleep(5)
R['license_note'] = sql("SHOW CLUSTER SETTING enterprise.license")
sql("""CREATE DATABASE chat; CREATE TABLE chat.messages (user_id INT8 NOT NULL, id INT8 NOT NULL, chat_id INT8 NOT NULL, tokens INT4 NOT NULL,
  content STRING NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(), PRIMARY KEY (user_id, id));
INSERT INTO chat.messages SELECT 1 + (i % 100000), i, i / 10, 50, md5(i::STRING), now() FROM generate_series(1, 200000) AS g(i);
ALTER TABLE chat.messages SPLIT AT VALUES (25000), (50000), (75000);""")
time.sleep(8)
R['ranges'] = sql("SELECT start_key, end_key, range_id, replicas, lease_holder FROM [SHOW RANGES FROM TABLE chat.messages WITH DETAILS]")
R['range_max_bytes'] = sql("SELECT raw_config_sql FROM [SHOW ZONE CONFIGURATION FROM TABLE chat.messages]")
R['explain'] = sql("EXPLAIN ANALYZE SELECT count(*) FROM chat.messages WHERE user_id = 4242")
R['follower_staleness_s'] = sql("SELECT extract(epoch FROM now() - follower_read_timestamp())")
# insert latency: CockroachDB (each write replicated by Raft to a majority of 3) against one local Postgres
BIG = PG('big', 56401); BIG.start()
BIG.psql('DROP TABLE IF EXISTS crdb_cmp; CREATE TABLE crdb_cmp (user_id int8, id int8, chat_id int8, tokens int4, content text, created_at timestamptz DEFAULT now(), PRIMARY KEY (user_id, id))')
def lat(dsn, table, n=1000, base=10_000_000):
    v = []
    with psycopg.connect(dsn, autocommit=True) as c:
        for i in range(n):
            t0 = time.perf_counter()
            c.execute(f"INSERT INTO {table} (user_id, id, chat_id, tokens, content) VALUES (%s, %s, 1, 10, 'x')", (random.randint(1, 100000), base + i))
            v.append((time.perf_counter() - t0) * 1000)
    v.sort(); return {'p50': round(v[n // 2], 3), 'p99': round(v[int(n * .99)], 3), 'n': n}
CR = lambda p: f'host=localhost port={p} user=root dbname=chat sslmode=disable'
R['insert_latency'] = {'crdb': lat(CR(SQL[0]), 'messages'), 'postgres': lat(BIG.dsn(), 'crdb_cmp')}
print(R['insert_latency'], flush=True)
# writer through node 1 while nodes die
events = []; W = []; stop = threading.Event()
def writer():
    nid = 50_000_000; c = None
    while not stop.is_set():
        try:
            if c is None:
                c = psycopg.connect(CR(SQL[0]), autocommit=True); c.execute("SET statement_timeout = '3s'")
            nid += 1; t0 = time.time()
            c.execute("INSERT INTO messages (user_id, id, chat_id, tokens, content) VALUES (%s, %s, 1, 10, 'live')", (random.randint(1, 100000), nid))
            W.append((t0, time.time() - t0, 'ok'))
        except Exception as e:
            W.append((t0, time.time() - t0, type(e).__name__ + ': ' + str(e)[:120]))
            try:
                c.close()
            except Exception: pass
            c = None; time.sleep(0.05)
T0 = time.time(); th = threading.Thread(target=writer); th.start()
def mark(name): events.append({'t': round(time.time() - T0, 2), 'event': name}); print(name, round(time.time() - T0, 1), flush=True)
time.sleep(10); mark('kill -9 node 3'); procs[2].send_signal(signal.SIGKILL)
time.sleep(25); mark('kill -9 node 2 (majority lost)'); procs[1].send_signal(signal.SIGKILL)
time.sleep(15); mark('restart node 2'); start(1)
time.sleep(15); mark('restart node 3'); start(2)
time.sleep(15); stop.set(); th.join(); mark('end')
# per-second timeline
end = time.time() - T0
sec = [{'s': s, 'ok': 0, 'err': 0, 'max_ms': 0.0} for s in range(int(end) + 1)]
for t0, d, st in W:
    s = int(t0 - T0)
    if s < len(sec):
        sec[s]['ok' if st == 'ok' else 'err'] += 1; sec[s]['max_ms'] = round(max(sec[s]['max_ms'], d * 1000), 1)
R['events'] = events; R['timeline'] = sec
R['errors'] = sorted({st for _, _, st in W if st != 'ok'})[:6]
R['ranges_after'] = sql("SELECT range_id, replicas, lease_holder FROM [SHOW RANGES FROM TABLE chat.messages WITH DETAILS]")
for p in procs.values(): p.send_signal(signal.SIGTERM)
time.sleep(3)
for p in procs.values():
    if p.poll() is None: p.kill()
save('crdb.json', R); print('saved')

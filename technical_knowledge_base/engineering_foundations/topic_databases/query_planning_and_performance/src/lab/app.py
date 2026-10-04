"""Application-side fixes, measured from Python with psycopg 3 over TCP on the same laptop (loopback, so every
round trip is as cheap as it can be): the ORM "N+1" pattern against one query, and inserting 10,000 rows
row by row against batching and COPY. Writes ../inputs/app.json.
Run: uv run --no-project --python 3.12 --with 'psycopg[binary]' python app.py (QPP_ROOT set, server started)."""
import os, sys, json, time, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qpcommon import PORT
import psycopg
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'inputs', 'app.json')
conn = psycopg.connect(f'host=127.0.0.1 port={PORT} user=postgres dbname=chat', autocommit=True)
cur = conn.cursor()
ONLY = sys.argv[1:]
o = json.load(open(OUT)) if ONLY and os.path.exists(OUT) else {}
o.update({'psycopg': psycopg.__version__, 'prepare_threshold': conn.prepare_threshold})
cur.execute('SELECT user_id FROM chats GROUP BY user_id HAVING count(*) >= 20 ORDER BY user_id LIMIT 200')
users = [r[0] for r in cur.fetchall()]
def nplus1(u):
    cur.execute('SELECT id, title FROM chats WHERE user_id = %s ORDER BY created_at DESC LIMIT 20', (u,))
    chats = cur.fetchall(); out = []
    for cid, title in chats:      # what a lazy-loading ORM does: one more query per chat
        cur.execute('SELECT left(content, 60), created_at FROM messages WHERE chat_id = %s ORDER BY created_at DESC LIMIT 1', (cid,))
        out.append((cid, title, cur.fetchone()))
    return out
def joined(u):
    cur.execute('''SELECT c.id, c.title, m.snippet, m.created_at FROM
      (SELECT id, title, created_at FROM chats WHERE user_id = %s ORDER BY created_at DESC LIMIT 20) c
      LEFT JOIN LATERAL (SELECT left(content, 60) AS snippet, created_at FROM messages WHERE chat_id = c.id ORDER BY created_at DESC LIMIT 1) m ON true
      ORDER BY c.created_at DESC''', (u,))
    return cur.fetchall()
def bench(f, xs, reps=3):
    for x in xs: nplus1(x); joined(x)            # warm every page both versions touch, so neither pays first reads
    ts = []
    for _ in range(reps):
        for x in xs:
            t = time.perf_counter(); f(x); ts.append((time.perf_counter() - t) * 1000)
    return {'median_ms': round(statistics.median(ts), 3), 'p90_ms': round(sorted(ts)[int(0.9 * len(ts))], 3), 'n': len(ts)}
if not ONLY or 'nplus1' in ONLY:
  assert [r[:2] for r in nplus1(users[0])] == [r[:2] for r in joined(users[0])]
  o['nplus1'] = {'users': len(users), 'nplus1': bench(nplus1, users), 'joined': bench(joined, users), 'queries_nplus1': 21, 'queries_joined': 1}
  t = time.perf_counter(); [cur.execute('SELECT 1') for _ in range(2000)]; o['nplus1']['select1_ms'] = round((time.perf_counter() - t) / 2000 * 1000, 4)
  print(o['nplus1'], flush=True)
# batch against row by row
N = 10000
rows = [(i, i % 1000 + 1, 'assistant', 'standard', 100 + i % 900, 'reply ' + str(i)) for i in range(N)]
def reset(): cur.execute('DROP TABLE IF EXISTS batch_test; CREATE UNLOGGED TABLE IF NOT EXISTS batch_dummy(); DROP TABLE batch_dummy; CREATE TABLE batch_test (id bigint, chat_id bigint, role text, model text, tokens int, content text)')
res = {}
def timed(name, f):
    reset(); t = time.perf_counter(); f(); res[name] = round((time.perf_counter() - t) * 1000, 1)
    cur.execute('SELECT count(*) FROM batch_test'); assert cur.fetchone()[0] == N, name
    print(name, res[name], flush=True)
def autocommit_each():
    for r in rows: cur.execute('INSERT INTO batch_test VALUES (%s, %s, %s, %s, %s, %s)', r)
def one_tx_each():
    with conn.transaction():
        for r in rows: cur.execute('INSERT INTO batch_test VALUES (%s, %s, %s, %s, %s, %s)', r)
def executemany():
    with conn.transaction(): cur.executemany('INSERT INTO batch_test VALUES (%s, %s, %s, %s, %s, %s)', rows)
def multirow():
    with conn.transaction():
        for i in range(0, N, 1000):
            chunk = rows[i:i + 1000]
            cur.execute('INSERT INTO batch_test VALUES ' + ','.join(['(%s,%s,%s,%s,%s,%s)'] * len(chunk)), [v for r in chunk for v in r])
def unnest():
    cols = list(zip(*rows))
    cur.execute('INSERT INTO batch_test SELECT * FROM unnest(%s::bigint[], %s::bigint[], %s::text[], %s::text[], %s::int[], %s::text[])', [list(c) for c in cols])
def copy():
    with conn.transaction():
        with cur.copy('COPY batch_test FROM STDIN') as cp:
            for r in rows: cp.write_row(r)
for name, f in ([] if ONLY and 'batch' not in ONLY else [('autocommit_each', autocommit_each), ('one_tx_each', one_tx_each), ('executemany', executemany), ('multirow_1000', multirow), ('unnest_arrays', unnest), ('copy', copy)]):
    best = None
    for _ in range(3):
        timed(name, f); best = res[name] if best is None else min(best, res[name])
    res[name] = best
if not ONLY or 'batch' in ONLY: o['batch'] = {'rows': N, 'ms': res, 'fsync': None}
cur.execute('SHOW fsync'); fs = cur.fetchone()[0]; cur.execute('SHOW synchronous_commit'); sc = cur.fetchone()[0]; cur.execute('SHOW wal_sync_method'); wm = cur.fetchone()[0]
o['batch']['fsync'] = {'fsync': fs, 'synchronous_commit': sc, 'wal_sync_method': wm}
cur.execute('DROP TABLE IF EXISTS batch_test')
json.dump(o, open(OUT, 'w'), indent=1)
print(o, flush=True)

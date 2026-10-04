"""Measurements behind the Reading tab's animations (Topic: databases).
A local PostgreSQL from the pgserver wheel plus DuckDB; nothing installed system-wide.
Run from a scratch directory (data directory about 1 GB is created there):
  uv run --no-project --python 3.12 --with pgserver --with duckdb python <repo>/.../src/read/measure_read.py
Writes read/inputs/read_measure.json next to this script.
Measures:
  1. lookup: messages of one chat, sequential scan against a B-tree index on chat_id (pages touched, EXPLAIN BUFFERS), plus an index-only count (the index path alone)
  2. rows_cols: SUM(tokens) GROUP BY model over the same table: bytes a row store reads (heap size) against the bytes of the two needed column chunks in Parquet
  3. credits: the last credit spent by two sessions (two browser tabs), read committed read-then-write against SELECT ... FOR UPDATE and serializable
"""
import os, sys, subprocess, json, time, datetime, threading
import pgserver, duckdb
B = os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin')
ROOT = os.path.abspath('rd_pgdata'); DATA = ROOT + '/data'; PORT = '54351'
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'inputs', 'read_measure.json')
N_CHATS, N_MSGS = 100_000, 1_000_000
def sh(*a): return subprocess.run(list(a), capture_output=True, text=True)
def psql(sql, db='chat'):
    r = sh(f'{B}/psql', '-h', '127.0.0.1', '-p', PORT, '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-At', '-c', sql, db)
    if r.returncode: raise RuntimeError(r.stderr + sql[:300])
    return r.stdout.strip()
res = {'date': datetime.date.today().isoformat(), 'rows': N_MSGS, 'chats': N_CHATS}
os.makedirs(ROOT, exist_ok=True)
if not os.path.exists(DATA):
    print(sh(f'{B}/initdb', '-D', DATA, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C').stdout[-100:])
print(sh(f'{B}/pg_ctl', '-D', DATA, '-o', f"-p {PORT} -k '' -h 127.0.0.1", '-l', ROOT + '/log', '-w', 'start').stdout[-100:])
res['pg_version'] = psql('SHOW server_version', 'postgres')
psql('DROP DATABASE IF EXISTS chat', 'postgres'); psql('CREATE DATABASE chat', 'postgres')
t = time.time()
psql(f'''SELECT setseed(0.44);
CREATE TABLE messages(id bigint PRIMARY KEY, chat_id bigint NOT NULL, role text NOT NULL, model text NOT NULL,
  tokens int NOT NULL, content text NOT NULL, created_at timestamptz NOT NULL);
INSERT INTO messages SELECT i, c, CASE WHEN i % 2 = 1 THEN 'user' ELSE 'assistant' END,
  (ARRAY['mini','standard','large','reasoning'])[1 + (c % 4)],
  CASE WHEN i % 2 = 1 THEN 10 + floor(190 * random())::int ELSE 50 + floor(1450 * random()^2)::int END,
  left(repeat(md5(i::text), 4), 30 + floor(100 * random())::int),
  timestamptz '2025-09-01 00:00+00' + (i * interval '3 seconds')
FROM (SELECT i, greatest(1, least({N_CHATS}, (i / 10) + floor(2000 * (random() - 0.5))::bigint)) AS c FROM generate_series(1, {N_MSGS}) i) s;''')
psql('VACUUM ANALYZE messages')
res['gen_seconds'] = round(time.time() - t, 1)
res['heap_bytes'] = int(psql("SELECT pg_relation_size('messages')")); res['heap_pages'] = res['heap_bytes'] // 8192
res['chat'] = 42000
def ex(sql, pre=''):
    j = json.loads(psql(pre + 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + sql))[0]
    p = j['Plan']; return {'node': p['Node Type'], 'rows': p['Actual Rows'], 'hit': p.get('Shared Hit Blocks', 0), 'read': p.get('Shared Read Blocks', 0),
                           'ms': round(j['Execution Time'], 3), 'plan': j['Plan']}
q = f"SELECT id, role, tokens FROM messages WHERE chat_id = {res['chat']} ORDER BY id"
# warm everything twice, then measure
for _ in range(2): ex(q)
seq = ex(q); res['lookup_seq'] = {k: seq[k] for k in ('node', 'rows', 'hit', 'read', 'ms')}
res['lookup_seq']['pages'] = seq['hit'] + seq['read']
psql('CREATE INDEX messages_chat_idx ON messages(chat_id); ANALYZE messages;')
for _ in range(2): ex(q)
ix = ex(q); res['lookup_idx'] = {k: ix[k] for k in ('node', 'rows', 'hit', 'read', 'ms')}; res['lookup_idx']['pages'] = ix['hit'] + ix['read']
def walk(p, acc):
    acc.append({'node': p['Node Type'], 'hit': p.get('Shared Hit Blocks', 0), 'read': p.get('Shared Read Blocks', 0), 'rows': p.get('Actual Rows')})
    for c in p.get('Plans', []): walk(c, acc)
    return acc
res['lookup_idx']['nodes'] = walk(ix['plan'], [])
res['index_bytes'] = int(psql("SELECT pg_relation_size('messages_chat_idx')"))
# index pages alone: an index-only count touches the B-tree path (plus the visibility map)
psql('VACUUM messages')
io = ex(f"SELECT count(*) FROM messages WHERE chat_id = {res['chat']}"); res['index_only'] = walk(io['plan'], [])
# distinct heap pages holding the chat's rows
res['chat_heap_pages'] = int(psql(f"SELECT count(DISTINCT (ctid::text::point)[0]) FROM messages WHERE chat_id = {res['chat']}"))
# 2. rows against columns
agg = "SELECT model, sum(tokens) FROM messages GROUP BY model ORDER BY model"
for _ in range(2): ex(agg)
a = ex(agg); res['agg_row'] = {'pages': a['hit'] + a['read'], 'bytes': (a['hit'] + a['read']) * 8192, 'ms': a['ms']}
res['agg_result'] = psql(agg)
csv = os.path.abspath('rd_messages.csv'); pq = os.path.abspath('rd_messages.parquet')
psql(f"COPY messages TO '{csv}' WITH (FORMAT csv, HEADER)")
con = duckdb.connect()
con.execute(f"COPY (SELECT * FROM read_csv_auto('{csv}') ORDER BY id) TO '{pq}' (FORMAT parquet, COMPRESSION zstd)")
res['duckdb_version'] = duckdb.__version__
cols = con.execute(f"SELECT path_in_schema, sum(total_compressed_size), sum(total_uncompressed_size) FROM parquet_metadata('{pq}') GROUP BY 1 ORDER BY 1").fetchall()
res['parquet_cols'] = {c: {'compressed': int(x), 'uncompressed': int(y)} for c, x, y in cols}
res['parquet_file_bytes'] = os.path.getsize(pq)
res['parquet_row_groups'] = con.execute(f"SELECT count(DISTINCT row_group_id) FROM parquet_metadata('{pq}')").fetchone()[0]
ts = []
for _ in range(5):
    t = time.time(); r = con.execute(f"SELECT model, sum(tokens) FROM '{pq}' GROUP BY model ORDER BY model").fetchall(); ts.append(time.time() - t)
res['agg_col'] = {'ms_median': round(sorted(ts)[2] * 1000, 2), 'result': [list(x) for x in r]}
os.remove(csv)
# 3. the last seat: two sessions, real interleaving with a pause
psql("CREATE TABLE credits(user_id int PRIMARY KEY, balance int NOT NULL CHECK (balance >= 0)); CREATE TABLE sent(user_id int, tab text);")
def session(who, mode, out):
    lock = 'FOR UPDATE' if mode == 'lock' else ''
    iso = 'SET TRANSACTION ISOLATION LEVEL SERIALIZABLE;' if mode == 'serializable' else ''
    script = f"""BEGIN; {iso}
SELECT balance AS n FROM credits WHERE user_id=17 {lock} \\gset
SELECT pg_sleep(0.5);
SELECT (:n > 0) AS ok \\gset
\\if :ok
INSERT INTO sent VALUES (17, '{who}');
UPDATE credits SET balance = :n - 1 WHERE user_id=17;
\\endif
COMMIT;
"""
    f = os.path.abspath(f'rd_{who}.sql'); open(f, 'w').write(script)
    r = sh(f'{B}/psql', '-h', '127.0.0.1', '-p', PORT, '-U', 'postgres', '-X', '-q', '-At', '-f', f, 'chat')
    out[who] = (r.stdout + r.stderr).strip()[-300:]
for mode in ('naive', 'lock', 'serializable'):
    psql("DELETE FROM sent; DELETE FROM credits; INSERT INTO credits VALUES (17, 1);")
    out = {}; th = [threading.Thread(target=session, args=(w, mode, out)) for w in ('tab_a', 'tab_b')]
    th[0].start(); time.sleep(0.1); th[1].start(); [x.join() for x in th]
    res['credits_' + mode] = {'sent': psql("SELECT coalesce(string_agg(tab, ',' ORDER BY tab), '') FROM sent"), 'balance': psql("SELECT balance FROM credits"), 'session_output': out}
res['wal_sync_method'] = psql('SHOW wal_sync_method'); res['fsync'] = psql('SHOW fsync')
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump(res, open(OUT, 'w'), indent=1, default=str)
print(json.dumps({k: v for k, v in res.items() if k not in ('lookup_idx',)}, default=str)[:3000])
sh(f'{B}/pg_ctl', '-D', DATA, '-m', 'fast', '-w', 'stop')

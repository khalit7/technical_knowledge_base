"""The "latest 50 messages of a chat" query: a normalised Postgres table against a Cassandra partition designed for that query.
Postgres 16.2 (pgserver wheel) and Apache Cassandra 5.0.9 (tarball, OpenJDK 17 from conda-forge), both in the scratch directory.
The messages are the root's 1M-message table (src/read/measure_read.py: same SQL, seed 0.44) with one addition: 2% of messages
belong to 20 long-running chats (ids 1 to 20, about 1,000 messages each, spread over the 35 days), so "the latest 50" exists.
Then Cassandra's tombstones: a partition with deleted rows, read through.
About 8 minutes. Writes inputs/wide.json.
"""
import os, sys, time, json, re, subprocess, shutil, signal, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import pgserver

res = machine()
PGB = os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin')
PGR = os.path.join(S, 'wide_pg'); PGD = PGR + '/data'
CASS = os.path.join(S, 'apache-cassandra-5.0.9')
JAVA_HOME = os.path.join(S, 'env', 'lib', 'jvm')
N_CHATS, N_MSGS, LONG = 100_000, 1_000_000, 7

def psql(sql, db='chat'):
    r = sh(f'{PGB}/psql', '-h', '127.0.0.1', '-p', str(PGP), '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-At', '-c', sql, db)
    if r.returncode: raise RuntimeError(r.stderr + sql[:300])
    return r.stdout.strip()

Q = f"SELECT id, role, tokens, content, created_at FROM messages WHERE chat_id = {LONG} ORDER BY created_at DESC LIMIT 50"
def ex(label):
    for _ in range(3): psql('EXPLAIN (ANALYZE) ' + Q)
    j = json.loads(psql('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + Q))[0]
    txt = psql('EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF, SUMMARY OFF) ' + Q)
    nodes = []
    def walk(p):
        nodes.append({'node': p['Node Type'], 'rows': p.get('Actual Rows'), 'hit': p.get('Shared Hit Blocks', 0), 'read': p.get('Shared Read Blocks', 0),
                      'removed': p.get('Rows Removed by Filter', 0), 'index': p.get('Index Name')})
        for c in p.get('Plans', []): walk(c)
    walk(j['Plan'])
    blocks = [int(float(x)) for x in psql(f"SELECT (ctid::text::point)[0] FROM (SELECT ctid FROM messages WHERE chat_id = {LONG} ORDER BY created_at DESC LIMIT 50) s").split()]
    pages = len(set(blocks))
    ms = []
    for _ in range(20):
        jj = json.loads(psql('EXPLAIN (ANALYZE, FORMAT JSON) ' + Q))[0]; ms.append(jj['Execution Time'])
    top = j['Plan']
    out = {'label': label, 'buffers': top.get('Shared Hit Blocks', 0) + top.get('Shared Read Blocks', 0), 'heap_pages_holding_rows': int(pages), 'blocks': blocks,
           'all_blocks_of_chat': sorted({int(float(x)) for x in psql(f"SELECT (ctid::text::point)[0] FROM messages WHERE chat_id = {LONG}").split()}),
           'ms_p50': round(pct(ms, .5), 3), 'nodes': nodes, 'explain': txt}
    print(label, out['buffers'], pages, out['ms_p50'], flush=True); return out

def pg_part():
    global PGP
    PGP = free_port(56450); res['pg_port'] = PGP
    shutil.rmtree(PGR, ignore_errors=True); os.makedirs(PGR)
    sh(f'{PGB}/initdb', '-D', PGD, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C')
    print(sh(f'{PGB}/pg_ctl', '-D', PGD, '-o', f"-p {PGP} -k '' -h 127.0.0.1", '-l', PGR + '/log', '-w', 'start').stdout[-80:])
    res['pg_version'] = psql('SHOW server_version', 'postgres')
    psql('CREATE DATABASE chat', 'postgres')
    psql(f'''SELECT setseed(0.44);
CREATE TABLE messages(id bigint PRIMARY KEY, chat_id bigint NOT NULL, role text NOT NULL, model text NOT NULL,
  tokens int NOT NULL, content text NOT NULL, created_at timestamptz NOT NULL);
INSERT INTO messages SELECT i, CASE WHEN r2 < 0.02 THEN 1 + floor(r2 * 1000)::bigint ELSE c END,
  CASE WHEN i % 2 = 1 THEN 'user' ELSE 'assistant' END,
  (ARRAY['mini','standard','large','reasoning'])[1 + (c % 4)],
  CASE WHEN i % 2 = 1 THEN 10 + floor(190 * random())::int ELSE 50 + floor(1450 * random()^2)::int END,
  left(repeat(md5(i::text), 4), 30 + floor(100 * random())::int),
  timestamptz '2025-09-01 00:00+00' + (i * interval '3 seconds')
FROM (SELECT i, greatest(21, least({N_CHATS}, (i / 10) + floor(2000 * (random() - 0.5))::bigint)) AS c, random() AS r2
      FROM generate_series(1, {N_MSGS}) i) s;''')
    psql('VACUUM ANALYZE messages')
    pg = {'rows': int(psql('SELECT count(*) FROM messages')), 'heap_pages': int(psql("SELECT pg_relation_size('messages') / 8192")),
          'long_chat': LONG, 'long_chat_rows': int(psql(f'SELECT count(*) FROM messages WHERE chat_id = {LONG}')),
          'long_chat_span_days': float(psql(f"SELECT round(extract(epoch from max(created_at) - min(created_at)) / 86400, 1) FROM messages WHERE chat_id = {LONG}")),
          'long_chats': int(psql('SELECT count(DISTINCT chat_id) FROM messages WHERE chat_id <= 20'))}
    runs = [ex('No index on chat_id: read every page, sort, keep 50')]
    psql('CREATE INDEX messages_chat_created ON messages(chat_id, created_at); ANALYZE messages')
    runs.append(ex('Index on (chat_id, created_at): walk the index backwards, fetch each row'))
    t = time.time(); psql('CLUSTER messages USING messages_chat_created; ANALYZE messages'); pg['cluster_seconds'] = round(time.time() - t, 1)
    runs.append(ex('After CLUSTER: rows of a chat stored together, like a partition'))
    pg['runs'] = runs
    # export the table for Cassandra (same rows)
    psql(f"COPY (SELECT chat_id, id, role, model, tokens, content, extract(epoch from created_at)::bigint FROM messages ORDER BY id) TO '{S}/wide_msgs.csv' WITH (FORMAT csv)")
    sh(f'{PGB}/pg_ctl', '-D', PGD, '-m', 'fast', '-w', 'stop')
    res['pg'] = pg

def utc(ts): return datetime.datetime.fromtimestamp(ts, datetime.timezone.utc).replace(tzinfo=None)

def cass_conf(cp, sp, ssp, jmx):
    y = open(CASS + '/conf/cassandra.yaml').read()
    if not os.path.exists(CASS + '/conf/cassandra.yaml.orig'):
        open(CASS + '/conf/cassandra.yaml.orig', 'w').write(y)
    y = open(CASS + '/conf/cassandra.yaml.orig').read()
    res['cassandra_defaults'] = {k: re.search(rf'^{k}: (.*)$', y, re.M).group(1) for k in
                                 ('commitlog_sync', 'commitlog_sync_period', 'tombstone_warn_threshold', 'tombstone_failure_threshold')}
    y = re.sub(r'^native_transport_port: .*$', f'native_transport_port: {cp}', y, flags=re.M)
    y = re.sub(r'^storage_port: .*$', f'storage_port: {sp}', y, flags=re.M)
    y = re.sub(r'^ssl_storage_port: .*$', f'ssl_storage_port: {ssp}', y, flags=re.M)
    y = y.replace('listen_address: localhost', 'listen_address: 127.0.0.1').replace('rpc_address: localhost', 'rpc_address: 127.0.0.1')
    y = y.replace('- seeds: "127.0.0.1:7000"', f'- seeds: "127.0.0.1:{sp}"')
    open(CASS + '/conf/cassandra.yaml', 'w').write(y)
    e = open(CASS + '/conf/cassandra-env.sh').read()
    e = re.sub(r'^JMX_PORT="\d+"', f'JMX_PORT="{jmx}"', e, flags=re.M)
    open(CASS + '/conf/cassandra-env.sh', 'w').write(e)

def nodetool(*a):
    env = dict(os.environ, JAVA_HOME=JAVA_HOME)
    return subprocess.run([CASS + '/bin/nodetool', '-h', '127.0.0.1', '-p', str(JMX), *a], capture_output=True, text=True, env=env).stdout

def load_all(sess, stmt, rows):
    from cassandra.concurrent import execute_concurrent_with_args
    todo = rows
    for attempt in range(5):
        out = execute_concurrent_with_args(sess, stmt, todo, concurrency=32, raise_on_first_error=False)
        todo = [r for r, (ok, _) in zip(todo, out) if not ok]
        if not todo: return attempt
        print('retrying', len(todo), flush=True)
    raise RuntimeError('writes kept failing')

def trace_of(sess, q, params=None):
    from cassandra.query import SimpleStatement
    st = SimpleStatement(q); rs = sess.execute(st, params, trace=True)
    rows = list(rs); tr = rs.get_query_trace(max_wait_sec=30)
    ev = [e.description for e in tr.events]
    return rows, ev, tr.duration.total_seconds() * 1000

def cass_part(keep=False):
    global JMX
    cp = free_port(56470); sp = free_port(cp + 1); ssp = free_port(sp + 1); JMX = free_port(ssp + 1)
    res['cass_ports'] = [cp, sp, ssp, JMX]
    if not keep: shutil.rmtree(CASS + '/data', ignore_errors=True); shutil.rmtree(CASS + '/logs', ignore_errors=True)
    cass_conf(cp, sp, ssp, JMX)
    env = dict(os.environ, JAVA_HOME=JAVA_HOME, MAX_HEAP_SIZE='2G', HEAP_NEWSIZE='400M')
    p = subprocess.Popen([CASS + '/bin/cassandra', '-f'], stdout=open(S + '/cass.out', 'w'), stderr=subprocess.STDOUT, env=env)
    try:
        wait_port(cp, 240); time.sleep(3)
        from cassandra.cluster import Cluster
        from cassandra.concurrent import execute_concurrent_with_args
        cl = Cluster(['127.0.0.1'], port=cp); s = cl.connect(); s.default_timeout = 120
        res['cass_version'] = list(s.execute('SELECT release_version FROM system.local'))[0].release_version
        loaded = keep and bool(list(s.execute("SELECT keyspace_name FROM system_schema.keyspaces WHERE keyspace_name = 'chat'")))
        if not loaded: s.execute("CREATE KEYSPACE chat WITH replication = {'class': 'SimpleStrategy', 'replication_factor': 1}")
        s.set_keyspace('chat')
        ddl = '''CREATE TABLE messages_by_chat (
  chat_id bigint, bucket int, created_at timestamp, message_id bigint,
  role text, model text, tokens int, content text,
  PRIMARY KEY ((chat_id, bucket), created_at, message_id)
) WITH CLUSTERING ORDER BY (created_at DESC, message_id DESC)'''
        if not loaded: s.execute(ddl)
        res['cass_ddl'] = ddl
        comp = list(s.execute("SELECT compaction FROM system_schema.tables WHERE keyspace_name='chat' AND table_name='messages_by_chat'"))[0].compaction
        res['cass_compaction_default'] = dict(comp)
        ins = s.prepare('INSERT INTO messages_by_chat (chat_id, bucket, created_at, message_id, role, model, tokens, content) VALUES (?,?,?,?,?,?,?,?)')
        import csv
        T0 = 1756684800  # 2025-09-01 00:00 UTC
        rows = []
        for r in csv.reader(open(S + '/wide_msgs.csv')):
            ts = int(r[6]); rows.append((int(r[0]), (ts - T0) // (10 * 86400), utc(ts), int(r[1]), r[2], r[3], int(r[4]), r[5]))
        if not loaded:
            t = time.time(); load_all(s, ins, rows); load = time.time() - t
            nodetool('flush', 'chat')
            res['cass_load'] = {'rows_loaded': len(rows), 'load_seconds': round(load, 1), 'write_rows_per_s': round(len(rows) / load), 'client': 'Python cassandra-driver 3.30.1, 32 requests in flight'}
        c = dict(res.get('cass_load', {}))
        lastb = max(x[1] for x in rows if x[0] == LONG)
        c['bucket_days'] = 10; c['latest_bucket'] = lastb
        c['long_chat_partitions'] = sorted({x[1] for x in rows if x[0] == LONG})
        c['rows_in_latest_partition'] = sum(1 for x in rows if x[0] == LONG and x[1] == lastb)
        q = 'SELECT message_id, role, tokens, content, created_at FROM messages_by_chat WHERE chat_id = %s AND bucket = %s LIMIT 50'
        got, ev, ms = trace_of(s, q, (LONG, lastb))
        c['latest50'] = {'rows': len(got), 'trace': ev, 'trace_ms': round(ms, 2)}
        same = [x[3] for x in sorted([x for x in rows if x[0] == LONG], key=lambda x: (x[2], x[3]), reverse=True)[:50]]
        c['same_rows_as_postgres'] = [g.message_id for g in got] == same
        lat = []
        for _ in range(300):
            t = time.perf_counter(); list(s.execute(q, (LONG, lastb))); lat.append((time.perf_counter() - t) * 1000)
        c['latest50_ms_p50'] = round(pct(lat, .5), 3)
        # the wrong query: not by partition key
        try:
            s.execute(f'SELECT * FROM messages_by_chat WHERE message_id = 123 LIMIT 1'); c['by_message_id'] = 'ran'
        except Exception as e:
            c['by_message_id'] = str(e)[:400]
        # tombstones: one partition, 30,000 messages; the newest 5,000 deleted one by one
        TP = 900000 + int(time.time()) % 90000   # a fresh partition on every run
        trows = [(TP, 0, utc(T0 + i), i, 'user', 'mini', 10, 'x' * 60) for i in range(130_000)]
        load_all(s, ins, trows)
        dl = s.prepare('DELETE FROM messages_by_chat WHERE chat_id = ? AND bucket = 0 AND created_at = ? AND message_id = ?')
        tomb = []
        for nd in (0, 5000, 101000):
            done = sum(1 for x in tomb)
            todo = [(TP, utc(T0 + i), i) for i in range(130_000 - nd, 130_000 - done)]
            if todo: load_all(s, dl, todo)
            tomb.extend(todo); nodetool('flush', 'chat')
            try:
                got, ev, ms = trace_of(s, 'SELECT message_id FROM messages_by_chat WHERE chat_id = %s AND bucket = 0 LIMIT 50', (TP,))
                lat = []
                for _ in range(30):
                    t = time.perf_counter(); list(s.execute('SELECT message_id FROM messages_by_chat WHERE chat_id = %s AND bucket = 0 LIMIT 50', (TP,))); lat.append((time.perf_counter() - t) * 1000)
                rr = {'deleted': nd, 'rows': len(got), 'trace': [e for e in ev if 'tombstone' in e.lower() or 'live rows' in e.lower() or 'sstable' in e.lower()], 'ms_p50': round(pct(lat, .5), 2)}
            except Exception as e:
                rr = {'deleted': nd, 'error': type(e).__name__ + ': ' + str(e)[:400]}
            print(rr, flush=True); c.setdefault('tombstones', []).append(rr)
        log = open(CASS + '/logs/system.log').read()
        c['log_tombstone_lines'] = [l[:400] for l in log.splitlines() if 'tombstone' in l.lower()][:6]
        res['cass'] = c; cl.shutdown()
    finally:
        p.send_signal(signal.SIGTERM)
        try: p.wait(60)
        except Exception: p.kill()

if __name__ == '__main__':
    only = sys.argv[1:] or ['pg', 'cass']
    if os.path.exists(os.path.join(INPUTS, 'wide.json')): res.update(json.load(open(os.path.join(INPUTS, 'wide.json'))))
    if 'pg' in only: pg_part(); save('wide.json', res)
    if 'cass' in only: cass_part(); save('wide.json', res)
    if 'cassq' in only: cass_part(keep=True); save('wide.json', res)

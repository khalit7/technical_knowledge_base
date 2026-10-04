"""Citus 14.2 on the chat product: a coordinator and 3 workers on one laptop (ports 56411 to 56414), then a 4th worker (56415)
and an online shard rebalance with writes running. Same 10M messages as the root page, copied from server "big" (56401).
Citus is built from source against the pgserver wheel's PostgreSQL 16.2 (see README: one local patch to the columnar
extension, which this page does not use). Writes ../inputs/citus.json. About 10 minutes.
Run: SCL_DATA=... CITUS_PG=<dir with bin/> uv run --no-project --python 3.12 --with pgserver --with psycopg[binary] python citus_run.py
"""
import os, sys, json, time, random, statistics, subprocess, threading
import psycopg
import pgc
from pgc import PG, save, ROOT, in_use
from citus_common import CPG, CONF
BIG = PG('big', 56401); BIG.start()
co = CPG('c_coord', 56411); ws = [CPG(f'c_w{i}', 56412 + i) for i in range(3)]; w4 = CPG('c_w3', 56415)
R = {'date': time.strftime('%Y-%m-%d'), 'machine': 'Apple M1 Pro laptop, 10 cores, 16 GB, macOS 27; every node on the same laptop'}
def t(f):
    t0 = time.time(); r = f(); return r, round(time.time() - t0, 2)
fresh = 'reuse' not in sys.argv
if fresh:
    for n in [co] + ws + [w4]:
        if n.running(): n.stop()
        subprocess.run(['rm', '-rf', n.dir])
    for n in [co] + ws:
        n.init(CONF); print(n.start()[-40:], flush=True)
        n.psql('CREATE DATABASE chat', db='postgres'); n.psql('CREATE EXTENSION citus')
    co.psql("SELECT citus_set_coordinator_host('127.0.0.1', 56411)")
    for w in ws: co.psql(f"SELECT citus_add_node('127.0.0.1', {w.port})")
    co.psql("""
CREATE TABLE users(id bigint PRIMARY KEY, email text NOT NULL, country text NOT NULL, city text NOT NULL, plan text NOT NULL, created_at timestamptz NOT NULL, timezone text NOT NULL);
CREATE TABLE chats(id bigint NOT NULL, user_id bigint NOT NULL, title text NOT NULL, model text NOT NULL, created_at timestamptz NOT NULL);
CREATE TABLE messages(id bigint NOT NULL, chat_id bigint NOT NULL, user_id bigint NOT NULL, role text NOT NULL, model text NOT NULL,
  tokens int NOT NULL, content text NOT NULL, created_at timestamptz NOT NULL);
CREATE TABLE models(name text PRIMARY KEY, usd_per_mtok numeric NOT NULL);
SELECT create_distributed_table('users', 'id');
SELECT create_distributed_table('chats', 'user_id', colocate_with => 'users');
SELECT create_distributed_table('messages', 'user_id', colocate_with => 'users');
SELECT create_reference_table('models');
INSERT INTO models VALUES ('mini', 0.4), ('standard', 2), ('large', 10), ('reasoning', 15);""")
    # a primary key that leaves out the distribution column is refused
    try:
        co.psql('ALTER TABLE chats ADD PRIMARY KEY (id)'); R['pk_error'] = None
    except RuntimeError as e:
        R['pk_error'] = str(e).split('\n')[0]
    co.psql('ALTER TABLE chats ADD PRIMARY KEY (user_id, id); ALTER TABLE messages ADD PRIMARY KEY (user_id, id)')
    def copy(src_sql, table):
        a = subprocess.Popen([f'{pgc.B}/psql', '-h', '127.0.0.1', '-p', '56401', '-U', 'postgres', '-X', '-q', '-c', f'COPY ({src_sql}) TO STDOUT', 'chat'], stdout=subprocess.PIPE)
        b = subprocess.run([f'{CB}/psql', '-h', '127.0.0.1', '-p', '56411', '-U', 'postgres', '-X', '-q', '-c', f'COPY {table} FROM STDIN', 'chat'], stdin=a.stdout, capture_output=True, text=True)
        a.wait()
        if b.returncode: raise RuntimeError(b.stderr)
    R['load_s'] = {}
    _, R['load_s']['users'] = t(lambda: copy('SELECT * FROM users', 'users'))
    _, R['load_s']['chats'] = t(lambda: copy('SELECT * FROM chats', 'chats'))
    _, R['load_s']['messages'] = t(lambda: copy('SELECT m.id, m.chat_id, c.user_id, m.role, m.model, m.tokens, m.content, m.created_at FROM messages m JOIN chats c ON c.id = m.chat_id', 'messages'))
    print('loaded', R['load_s'], flush=True)
    _, R['load_s']['indexes'] = t(lambda: [co.psql(x) for x in ('CREATE INDEX ON chats (user_id, created_at)', 'CREATE INDEX ON messages (chat_id, created_at)', 'CREATE INDEX ON users (email)', 'ANALYZE')])
BIG.psql('CREATE INDEX IF NOT EXISTS users_email ON users (email)')
R['shard_count'] = int(co.psql("SELECT count(*) FROM pg_dist_shard WHERE logicalrelid = 'messages'::regclass"))
R['nodes'] = co.psql("SELECT string_agg(nodename||':'||nodeport, ', ' ORDER BY nodeport) FROM pg_dist_node")
def shard_sizes():
    return [dict(zip(['shardid', 'port', 'mb', 'rows_est'], (int(a), int(b), float(c), int(d)))) for a, b, c, d in
            (r.split('|') for r in co.psql("""SELECT s.shardid, s.nodeport, round(s.shard_size/1048576.0, 1),
              (SELECT 0) FROM citus_shards s WHERE s.table_name = 'messages'::regclass ORDER BY s.shardid""").splitlines())]
R['shards_before'] = shard_sizes()
# real per-shard row counts (run_command_on_shards counts each shard)
cnt = co.psql("SELECT shardid, result FROM run_command_on_shards('messages', 'SELECT count(*) FROM %s')").splitlines()
rc = {int(a): int(b) for a, b in (r.split('|') for r in cnt)}
for s in R['shards_before']: s['rows'] = rc[s['shardid']]
R['user1_shard'] = int(co.psql("SELECT get_shard_id_for_distribution_column('messages', 1)"))
# EXPLAIN output for one router query and one multi-shard query
def explain(sql):
    return co.psql('EXPLAIN (COSTS OFF) ' + sql, tuples=True)
R['explain_router'] = explain('SELECT id, title FROM chats WHERE user_id = 4242 ORDER BY created_at DESC LIMIT 20')
R['explain_scatter'] = explain("SELECT id, chat_id, created_at FROM messages WHERE content LIKE '%c0ffee%' ORDER BY created_at DESC LIMIT 50")
R['explain_email'] = explain("SELECT id FROM users WHERE email = 'user4242@example.com'")
R['explain_ref_join'] = explain("SELECT m.model, sum(m.tokens) * max(r.usd_per_mtok) / 1e6 AS usd FROM messages m JOIN models r ON r.name = m.model WHERE m.created_at >= timestamptz '2026-08-07 00:00+00' GROUP BY m.model")
# latency of point queries: same statements on one big Postgres and through the Citus coordinator
random.seed(7)
users = random.sample(range(1, 100001), 300)
chat_of = dict((int(a), int(b)) for a, b in (r.split('|') for r in BIG.psql('SELECT user_id, max(id) FROM chats WHERE user_id IN (' + ','.join(map(str, users)) + ') GROUP BY user_id').splitlines()))
users = [u for u in users if u in chat_of][:250]
point = {
 'chat_list': ("SELECT id, title FROM chats WHERE user_id = %s ORDER BY created_at DESC LIMIT 20", "SELECT id, title FROM chats WHERE user_id = %s ORDER BY created_at DESC LIMIT 20", lambda u: (u,)),
 'open_chat': ("SELECT id, role, tokens FROM messages WHERE chat_id = %s ORDER BY created_at DESC LIMIT 50", "SELECT id, role, tokens FROM messages WHERE user_id = %s AND chat_id = %s ORDER BY created_at DESC LIMIT 50", None),
 'login_email': ("SELECT id, plan FROM users WHERE email = %s", "SELECT id, plan FROM users WHERE email = %s", lambda u: (f'user{u}@example.com',)),
}
def lat(dsn, sql, args_list):
    out = []
    with psycopg.connect(dsn, autocommit=True) as c:
        for a in args_list[:20]: c.execute(sql, a).fetchall()  # warm up
        for a in args_list:
            t0 = time.perf_counter(); c.execute(sql, a).fetchall(); out.append((time.perf_counter() - t0) * 1000)
    out.sort(); return {'p50': round(out[len(out) // 2], 3), 'p99': round(out[int(len(out) * 0.99)], 3), 'mean': round(sum(out) / len(out), 3), 'n': len(out)}
R['point'] = {}
for k, (sb, sc, fa) in point.items():
    if k == 'open_chat':
        ab = [(chat_of[u],) for u in users]; ac = [(u, chat_of[u]) for u in users]
    else:
        ab = ac = [fa(u) for u in users]
    R['point'][k] = {'big': lat(BIG.dsn(), sb, ab), 'citus': lat(co.dsn(), sc, ac)}
    print(k, R['point'][k], flush=True)
# heavy queries: median of 5 warm runs
heavy = {
 'mention': "SELECT id, chat_id, created_at FROM messages WHERE content LIKE '%c0ffee%' ORDER BY created_at DESC LIMIT 50",
 'dashboard': "SELECT m.model, sum(m.tokens) AS tokens FROM messages m WHERE m.created_at >= timestamptz '2026-08-07 00:00+00' GROUP BY m.model",
 'count_all': "SELECT count(*) FROM messages",
}
def runs(dsn, sql, n=5):
    v = []
    with psycopg.connect(dsn, autocommit=True) as c:
        c.execute(sql).fetchall()
        for _ in range(n):
            t0 = time.perf_counter(); r = c.execute(sql).fetchall(); v.append((time.perf_counter() - t0) * 1000)
    return {'ms': round(statistics.median(v), 1), 'all': [round(x, 1) for x in v], 'rows': len(r)}
R['heavy'] = {k: {'big': runs(BIG.dsn(), s), 'citus': runs(co.dsn(), s)} for k, s in heavy.items()}
print(R['heavy'], flush=True)
R['mention_hits'] = BIG.psql("SELECT count(*) FROM messages WHERE content LIKE '%c0ffee%'")
# a join that is not on the distribution column
for x in ("DROP TABLE IF EXISTS chat_tags", "CREATE TABLE chat_tags(chat_id bigint, tag text)", "SELECT create_distributed_table('chat_tags', 'chat_id')",
          "INSERT INTO chat_tags SELECT id, (ARRAY['work','travel','code','health'])[1 + id % 4] FROM chats WHERE id % 10 = 0"):
    co.psql(x)
J = "SELECT t.tag, count(*) FROM chats c JOIN chat_tags t ON t.chat_id = c.id GROUP BY t.tag"
try:
    co.psql(J); R['join_error'] = None
except RuntimeError as e:
    R['join_error'] = str(e).split('\n')[0]
R['repartition_join'] = runs(co.dsn(), 'SET citus.enable_repartition_joins = on; ' + J, 3) if False else None
with psycopg.connect(co.dsn(), autocommit=True) as c:
    c.execute('SET citus.enable_repartition_joins = on'); c.execute(J).fetchall()
    v = []
    for _ in range(3):
        t0 = time.perf_counter(); c.execute(J).fetchall(); v.append((time.perf_counter() - t0) * 1000)
    R['repartition_join'] = round(statistics.median(v), 1)
with psycopg.connect(BIG.dsn(), autocommit=True) as c:
    c.execute("DROP TABLE IF EXISTS chat_tags; CREATE TABLE chat_tags AS SELECT id AS chat_id, (ARRAY['work','travel','code','health'])[1 + id % 4] AS tag FROM chats WHERE id % 10 = 0; ANALYZE chat_tags")
    c.execute(J).fetchall(); v = []
    for _ in range(3):
        t0 = time.perf_counter(); c.execute(J).fetchall(); v.append((time.perf_counter() - t0) * 1000)
    R['join_big'] = round(statistics.median(v), 1)
# transactions: one user (one shard) against two users on different nodes (two-phase commit)
pair = None
node_of = lambda u: int(co.psql(f"SELECT nodeport FROM citus_shards WHERE shardid = get_shard_id_for_distribution_column('users', {u}) AND table_name = 'users'::regclass"))
a = 11
for b in range(12, 200):
    if node_of(b) != node_of(a): pair = (a, b); break
def tx(dsn, ids, n=300):
    v = []
    with psycopg.connect(dsn) as c:
        for i in range(n):
            t0 = time.perf_counter()
            with c.transaction():
                for u in ids: c.execute('UPDATE users SET plan = plan WHERE id = %s', (u,))
            v.append((time.perf_counter() - t0) * 1000)
    v.sort(); return {'p50': round(v[len(v) // 2], 3), 'p99': round(v[int(len(v) * .99)], 3)}
R['tx'] = {'pair': pair, 'one_shard': tx(co.dsn(), [a]), 'same_node_two_users': None, 'two_nodes_2pc': tx(co.dsn(), list(pair)), 'big_two_users': tx(BIG.dsn(), list(pair))}
print('tx', R['tx'], flush=True)
save('citus.json', R)
print('saved; now run citus_rebal.py')

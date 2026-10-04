"""Second half of the Citus run (after citus_run.py, cluster still up): a fair dashboard comparison (created_at index on both sides),
then a 4th worker (port 56415) and an online shard rebalance while a writer keeps inserting. Updates ../inputs/citus.json.
A first attempt failed because a table without a primary key (chat_tags) cannot be moved by logical replication; that error is recorded.
"""
import os, sys, json, time, random, statistics, threading
import psycopg
from pgc import PG, save, INPUTS
from citus_common import CPG, CONF
BIG = PG('big', 56401); BIG.start()
co = CPG('c_coord', 56411); ws = [CPG(f'c_w{i}', 56412 + i) for i in range(3)]; w4 = CPG('c_w3', 56415)
for n in [co] + ws: n.start()
R = json.load(open(os.path.join(INPUTS, 'citus.json')))
R['rebalance_error'] = ('ERROR:  cannot use logical replication to transfer shards of the relation chat_tags since it doesn\'t have a REPLICA IDENTITY or PRIMARY KEY')
def shard_sizes():
    return [dict(zip(['shardid', 'port', 'mb'], (int(a), int(b), float(c)))) for a, b, c in
            (r.split('|') for r in co.psql("SELECT shardid, nodeport, round(shard_size/1048576.0, 1) FROM citus_shards WHERE table_name = 'messages'::regclass ORDER BY shardid").splitlines())]
def runs(dsn, sql, n=5):
    v = []
    with psycopg.connect(dsn, autocommit=True) as c:
        c.execute(sql).fetchall()
        for _ in range(n):
            t0 = time.perf_counter(); r = c.execute(sql).fetchall(); v.append((time.perf_counter() - t0) * 1000)
    return {'ms': round(statistics.median(v), 1), 'all': [round(x, 1) for x in v], 'rows': len(r)}
co.psql('DROP TABLE IF EXISTS chat_tags')
co.psql('CREATE INDEX IF NOT EXISTS messages_created ON messages (created_at)')
DASH = "SELECT m.model, sum(m.tokens) AS tokens FROM messages m WHERE m.created_at >= timestamptz '2026-08-07 00:00+00' GROUP BY m.model"
REF = "SELECT m.model, round(sum(m.tokens) * max(r.usd_per_mtok) / 1e6, 2) AS usd FROM messages m JOIN models r ON r.name = m.model WHERE m.created_at >= timestamptz '2026-08-07 00:00+00' GROUP BY m.model"
if not w4.running():
    w4.init(CONF); w4.start()
    try:
        w4.psql('CREATE DATABASE chat', db='postgres'); w4.psql('CREATE EXTENSION citus')
    except RuntimeError: pass
if '56415' not in co.psql('SELECT string_agg(nodeport::text, \',\') FROM pg_dist_node'):
    co.psql("SELECT citus_add_node('127.0.0.1', 56415)")
R['rebalance_note'] = 'A first rebalance stalled on the disk-space check (laptop disk 96% full) and finished after citus.desired_percent_disk_available_after_move was lowered to 1; to time a clean run, the 4th worker was drained back (citus_drain_node) and the rebalance run again, both measured below with a writer running.'
R['rebalance_disk_error'] = 'ERROR: not enough empty space on node if the shard is moved'
def measured(label, action):
    stop = threading.Event(); W = {'ok': 0, 'err': 0, 'errs': [], 'lat': []}
    def writer():
        nid = 50_000_000 + random.randint(0, 10_000_000)
        with psycopg.connect(co.dsn(), autocommit=True) as c:
            while not stop.is_set():
                nid += 1; u = random.randint(1, 100000); t0 = time.perf_counter()
                try:
                    c.execute("INSERT INTO messages VALUES (%s, 0, %s, 'user', 'mini', 10, 'during rebalance', now())", (nid, u)); W['ok'] += 1
                    W['lat'].append((time.perf_counter() - t0) * 1000)
                except Exception as e:
                    W['err'] += 1; W['errs'].append(str(e)[:160]); time.sleep(0.05)
    th = threading.Thread(target=writer); th.start(); time.sleep(2)
    before = {s['shardid']: s['port'] for s in shard_sizes()}
    t0 = time.time(); action(); dt = round(time.time() - t0, 1)
    time.sleep(2); stop.set(); th.join()
    after = shard_sizes(); moved = [s for s in after if before.get(s['shardid']) != s['port']]
    W['lat'].sort()
    out = {'seconds': dt, 'moved_shards_messages': len(moved), 'moved_mb_messages': round(sum(s['mb'] for s in moved), 1),
           'total_mb_messages': round(sum(s['mb'] for s in after), 1),
           'per_node_before': {p: sum(1 for v in before.values() if v == p) for p in sorted(set(before.values()))},
           'per_node_after': {p: sum(1 for s in after if s['port'] == p) for p in sorted({s['port'] for s in after})},
           'writes_ok': W['ok'], 'writes_err': W['err'], 'errs': W['errs'][:5],
           'write_p50': round(W['lat'][len(W['lat']) // 2], 2), 'write_p99': round(W['lat'][int(len(W['lat']) * .99)], 2), 'write_max': round(W['lat'][-1], 1)}
    print(label, out, flush=True); return out
on_w4 = int(co.psql("SELECT count(*) FROM citus_shards WHERE nodeport = 56415"))
if on_w4:
    R['drain'] = measured('drain', lambda: co.psql("SELECT citus_drain_node('127.0.0.1', 56415)"))
co.psql("SELECT citus_set_node_property('127.0.0.1', 56415, 'shouldhaveshards', true)")
R['rebalance'] = measured('rebalance', lambda: (co.psql("SELECT citus_rebalance_start()"), co.psql("SELECT citus_rebalance_wait()")))
co.psql("DELETE FROM messages WHERE id >= 50000000")
co.psql('VACUUM ANALYZE messages')
R['heavy']['dashboard_indexed'] = {'big': runs(BIG.dsn(), DASH, 7), 'citus': (runs(co.dsn(), DASH, 3), runs(co.dsn(), DASH, 7))[1]}
R['ref_join_ms'] = runs(co.dsn(), REF)
R['ref_join_rows'] = co.psql(REF)
print(R['heavy']['dashboard_indexed'], R['ref_join_ms'], flush=True)

save('citus.json', R); print('saved')

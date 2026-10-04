"""Postgres declarative partitioning on the chat product's 10M messages (server "big" from gen_chat.py, port 56401).
Builds messages_month (RANGE by created_at, 12 monthly partitions) and messages_hash (HASH by chat_id, 8 partitions),
then measures with EXPLAIN (ANALYZE, BUFFERS): partition pruning, what pruning cannot do, retention by DROP against DELETE,
and planning time against the number of partitions. Writes ../inputs/part.json. About 6 minutes on an M1 Pro.
"""
import json, time, statistics, sys
from pgc import *
P = PG('big', 56401); print(P.start())
q = P.psql
def ex(sql, runs=5, pre=''):
    """median execution time over runs (warm), plus the last plan's summary"""
    ts, plan = [], None
    for _ in range(runs):
        out = q(pre + 'EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + sql)
        plan = json.loads(out[out.index('['):])[0]
        ts.append(plan['Execution Time'])
    root = plan['Plan']
    def walk(n, acc):
        t = n['Node Type']
        if t in ('Seq Scan', 'Index Scan', 'Index Only Scan', 'Bitmap Heap Scan'):
            acc['scans'].append({'node': t, 'rel': n.get('Relation Name'), 'rows': n.get('Actual Rows'), 'loops': n.get('Actual Loops')})
        if 'Subplans Removed' in n: acc['removed'] += n['Subplans Removed']
        for c in n.get('Plans', []): walk(c, acc)
        return acc
    acc = walk(root, {'scans': [], 'removed': 0})
    return {'ms': round(statistics.median(ts), 2), 'all_ms': [round(t, 2) for t in ts], 'planning_ms': round(plan['Planning Time'], 3),
            'shared_hit': root.get('Shared Hit Blocks', 0), 'shared_read': root.get('Shared Read Blocks', 0),
            'rows': root.get('Actual Rows'), 'top': root['Node Type'], 'scans': acc['scans'], 'subplans_removed': acc['removed'],
            'n_scanned': len({s['rel'] for s in acc['scans']})}
R = {'date': time.strftime('%Y-%m-%d'), 'version': q('SELECT version()'), 'machine': 'Apple M1 Pro laptop, 16 GB, macOS 27',
     'settings': dict(l.split('|') for l in q("SELECT name, current_setting(name) FROM pg_settings WHERE name IN ('shared_buffers','work_mem','max_parallel_workers_per_gather','enable_partition_pruning','enable_partitionwise_join','enable_partitionwise_aggregate','jit')").splitlines())}
R['span'] = q("SELECT min(created_at)||'|'||max(created_at)||'|'||count(*) FROM messages")
def step(name, sql):
    t = time.time(); q(sql); dt = round(time.time() - t, 1); print(name, dt, flush=True); return dt
R['build'] = {}
if 'skipbuild' not in sys.argv:
    q('DROP TABLE IF EXISTS messages_month, messages_hash CASCADE')
    # the error Postgres gives for a primary key that does not include the partition key
    try:
        q("CREATE TABLE pk_try(id bigint PRIMARY KEY, created_at timestamptz NOT NULL) PARTITION BY RANGE (created_at)")
        R['pk_error'] = None
    except RuntimeError as e:
        R['pk_error'] = str(e).split('\n')[0:2]
    months = [f'2025-{m:02d}-01' for m in range(9, 13)] + [f'2026-{m:02d}-01' for m in range(1, 10)]
    ddl = ['CREATE TABLE messages_month (LIKE messages INCLUDING DEFAULTS, PRIMARY KEY (id, created_at)) PARTITION BY RANGE (created_at);']
    for a, b in zip(months, months[1:]):
        ddl.append(f"CREATE TABLE messages_m{a[:7].replace('-', '_')} PARTITION OF messages_month FOR VALUES FROM ('{a} 00:00+00') TO ('{b} 00:00+00');")
    R['build']['month_ddl'] = step('month ddl', '\n'.join(ddl))
    R['ddl_example'] = ddl[:3]
    R['build']['month_load'] = step('month load', 'INSERT INTO messages_month SELECT * FROM messages')
    R['build']['month_index'] = step('month index', 'CREATE INDEX ON messages_month (chat_id, created_at)')
    q('CREATE TABLE messages_hash (LIKE messages INCLUDING DEFAULTS, PRIMARY KEY (id, chat_id)) PARTITION BY HASH (chat_id);' +
      ''.join(f'CREATE TABLE messages_h{i} PARTITION OF messages_hash FOR VALUES WITH (MODULUS 8, REMAINDER {i});' for i in range(8)))
    R['build']['hash_load'] = step('hash load', 'INSERT INTO messages_hash SELECT * FROM messages')
    R['build']['hash_index'] = step('hash index', 'CREATE INDEX ON messages_hash (chat_id, created_at)')
    R['build']['analyze'] = step('analyze', 'ANALYZE messages, messages_month, messages_hash')
R['parts'] = json.loads(q("""SELECT json_agg(json_build_object('name', c.relname, 'bound', pg_get_expr(c.relpartbound, c.oid), 'rows', c.reltuples::bigint,
  'mb', round(pg_relation_size(c.oid)/1048576.0, 1)) ORDER BY c.relname) FROM pg_inherits i JOIN pg_class c ON c.oid = i.inhrelid
  WHERE i.inhparent = 'messages_month'::regclass"""))
R['sizes_mb'] = {t: float(q(f"SELECT round(pg_total_relation_size('{t}')/1048576.0, 1)")) if t == 'messages' else
                 float(q(f"SELECT round(sum(pg_total_relation_size(inhrelid))/1048576.0, 1) FROM pg_inherits WHERE inhparent = '{t}'::regclass"))
                 for t in ('messages', 'messages_month', 'messages_hash')}
# The chat product's two everyday queries plus the dashboard query
LAST7 = "created_at >= timestamptz '2026-08-07 00:00+00'"
CH = 512345
lo, hi = q(f"SELECT date_trunc('day', min(created_at))::date||'|'||(date_trunc('day', max(created_at))::date + 1) FROM messages WHERE chat_id = {CH}").split('|')
qs = {
 'dash': "SELECT model, sum(tokens) FROM {t} WHERE " + LAST7 + " GROUP BY model",
 'chat': "SELECT id, role, tokens, created_at FROM {t} WHERE chat_id = %d ORDER BY created_at DESC LIMIT 50" % CH,
 'chat_week': "SELECT id, role, tokens, created_at FROM {t} WHERE chat_id = %d AND created_at >= timestamptz '%s 00:00+00' AND created_at < timestamptz '%s 00:00+00' ORDER BY created_at DESC LIMIT 50" % (CH, lo, hi),
}
R['chat_id'] = CH; R['chat_span'] = q(f"SELECT min(created_at)||'|'||max(created_at)||'|'||count(*) FROM messages WHERE chat_id = {CH}")
R['q'] = {k: v.format(t='messages') for k, v in qs.items()}
M = {}
for name, tmpl in qs.items():
    for t in ('messages', 'messages_month', 'messages_hash'):
        M[f'{name}|{t}'] = ex(tmpl.format(t=t)); print(name, t, M[f'{name}|{t}']['ms'], M[f'{name}|{t}']['n_scanned'], flush=True)
# fairness: a plain index on created_at also fixes the dashboard query without partitioning
q('CREATE INDEX IF NOT EXISTS messages_created ON messages (created_at)')
M['dash|messages+index'] = ex(qs['dash'].format(t='messages'))
M['dash|messages_month|nopruning'] = ex(qs['dash'].format(t='messages_month'), runs=3, pre='SET enable_partition_pruning = off; ')
# run-time pruning: the bound is a parameter, so the planner cannot prune; the executor does
q("DEALLOCATE ALL")
M['dash|messages_month|generic'] = ex("SELECT model, sum(tokens) FROM messages_month WHERE created_at >= (SELECT max(created_at) FROM messages_m2026_08) - interval '7 days' GROUP BY model")
R['m'] = M
# Retention: drop the oldest month. DELETE on the plain table (rolled back afterwards) against DETACH + DROP.
def wal():
    return int(q("SELECT pg_current_wal_lsn() - '0/0'::pg_lsn"))
w0 = wal(); t0 = time.time()
n_del = q("BEGIN; DELETE FROM messages WHERE created_at < timestamptz '2025-10-01 00:00+00'; SELECT pg_current_wal_lsn() - '0/0'::pg_lsn; ROLLBACK;")
R['ret_delete'] = {'s': round(time.time() - t0, 1), 'wal_mb': round((int(n_del.split()[-1]) - w0) / 1048576, 1),
                   'rows': int(q("SELECT count(*) FROM messages WHERE created_at < timestamptz '2025-10-01 00:00+00'"))}
q("CREATE TABLE IF NOT EXISTS sep_copy (LIKE messages_m2025_09 INCLUDING ALL)")
w0 = wal(); t0 = time.time()
q("ALTER TABLE messages_month DETACH PARTITION messages_m2025_09; DROP TABLE messages_m2025_09;")
R['ret_drop'] = {'s': round(time.time() - t0, 3), 'wal_mb': round((wal() - w0) / 1048576, 3)}
# put September back so the script can be rerun
q("CREATE TABLE messages_m2025_09 PARTITION OF messages_month FOR VALUES FROM ('2025-09-01 00:00+00') TO ('2025-10-01 00:00+00'); INSERT INTO messages_month SELECT * FROM messages WHERE created_at < '2025-10-01'; ANALYZE messages_month")
# Planning cost against partition count (empty tables; planning does not read data)
PL = []
for n in (12, 100, 1000, 3000):
    q(f'DROP TABLE IF EXISTS pc_{n} CASCADE; CREATE TABLE pc_{n} (k int, v int) PARTITION BY RANGE (k);' +
      ''.join(f'CREATE TABLE pc_{n}_{i} PARTITION OF pc_{n} FOR VALUES FROM ({i*10}) TO ({i*10+10});' for i in range(n)))
    def plan_ms(sql):
        v = []
        for _ in range(7):
            o = q('EXPLAIN (SUMMARY, FORMAT JSON) ' + sql); v.append(json.loads(o)[0]['Planning Time'])
        return round(statistics.median(v), 3)
    PL.append({'n': n, 'pruned': plan_ms(f'SELECT * FROM pc_{n} WHERE k = 5'), 'all': plan_ms(f'SELECT * FROM pc_{n} WHERE v = 5')})
    q(f'DROP TABLE pc_{n} CASCADE'); print('plan', PL[-1], flush=True)
R['planning'] = PL
save('part.json', R); print('saved')

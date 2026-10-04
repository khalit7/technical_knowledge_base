"""M4: two things new or practical in PostgreSQL 18, measured against 16.
  a. skip scan: an index on (model, created_at) and a query on created_at alone (no condition on the first column),
     on the 1M-message table, in PostgreSQL 16.2 and 18.6: the plan each picks, buffers and time (and forced index use on 16);
  b. primary keys: 3M rows inserted into a table whose primary key is a bigint sequence, a random UUID (gen_random_uuid, version 4)
     or a time-ordered UUID (uuidv7, new in 18): seconds, WAL bytes, index size and leaf density (shared_buffers 128 MB).
Writes inputs/m4_pg18.json. About 4 minutes.
"""
import sys, os, time, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sepg import *
R = {'date': time.strftime('%Y-%m-%d')}
Q = "SELECT count(*) FROM messages WHERE created_at >= '2025-09-20' AND created_at < '2025-09-20 01:00'"
def summary(j):
    p = j['Plan']; out = []
    def walk(p, d=0):
        out.append({'node': p['Node Type'], 'index': p.get('Index Name'), 'rows': p.get('Actual Rows'), 'index_searches': p.get('Index Searches'),
                    'buffers': p.get('Shared Hit Blocks', 0) + p.get('Shared Read Blocks', 0), 'depth': d})
        for c in p.get('Plans', []): walk(c, d + 1)
    walk(p); return {'ms': j['Execution Time'], 'nodes': out}
for ver, mk in [('16', pg16), ('18', pg18)]:
    pg = mk('m4_' + ver, 54774).init(fresh=True); print(pg.start())
    pg.psql('CREATE DATABASE chat', 'postgres')
    pg.psql(messages_sql()); pg.psql('CREATE INDEX messages_model_created ON messages(model, created_at)'); pg.psql('VACUUM ANALYZE messages')
    pg.explain(Q)
    d = {'version': pg.psql('SHOW server_version'), 'default': summary(pg.explain(Q, pre='SET max_parallel_workers_per_gather = 0; ')),
         'forced_index': summary(pg.explain(Q, pre='SET max_parallel_workers_per_gather = 0; SET enable_seqscan = off; SET enable_bitmapscan = off; '))}
    d['plan_text'] = pg.psql('SET max_parallel_workers_per_gather = 0; EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF, SUMMARY OFF) ' + Q, tuples=False)
    d['seq'] = summary(pg.explain(Q, pre='SET max_parallel_workers_per_gather = 0; SET enable_indexscan = off; SET enable_bitmapscan = off; SET enable_indexonlyscan = off; '))
    R['skip_' + ver] = d; print(json.dumps(d)[:600], flush=True)
    if ver == '18':
        R['pk'] = []
        for name, col, default in [('bigint sequence', 'bigint', 'GENERATED ALWAYS AS IDENTITY'), ('uuid v4 (random)', 'uuid', 'DEFAULT gen_random_uuid()'), ('uuid v7 (time-ordered)', 'uuid', 'DEFAULT uuidv7()')]:
            pg.psql(f'DROP TABLE IF EXISTS k; CREATE TABLE k(id {col} {default} PRIMARY KEY, chat_id bigint, body text)')
            pg.psql('CREATE EXTENSION IF NOT EXISTS pgstattuple'); pg.psql('CHECKPOINT'); a = pg.psql('SELECT pg_current_wal_lsn()')
            secs = 0
            for _ in range(30):  # 30 statements of 100k rows, as an application inserting in batches would
                secs += pg.timed("INSERT INTO k(chat_id, body) SELECT g % 1000, 'hello' FROM generate_series(1, 100000) g")
            b = pg.psql('SELECT pg_current_wal_lsn()')
            st = pg.jsql("SELECT index_size, leaf_pages, avg_leaf_density FROM pgstatindex('k_pkey')")[0]
            R['pk'].append({'key': name, 'rows': 3_000_000, 'seconds': round(secs, 1), 'wal_bytes': int(pg.psql(f"SELECT '{b}'::pg_lsn - '{a}'")),
                            'heap_bytes': int(pg.psql("SELECT pg_relation_size('k')")), **st}); print(R['pk'][-1], flush=True)
    pg.stop()
save(R, 'm4_pg18.json')

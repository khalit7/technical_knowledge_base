"""M3: what indexes cost and what each kind buys. PostgreSQL 16.2 + pageinspect + pgstattuple.
  a. write cost: 1M messages inserted (one INSERT ... SELECT, three repeats) into a table with 0, 1, 3 and 6 indexes: seconds, WAL bytes, sizes;
     plus single-row inserts with pgbench (4 clients, 15 s, synchronous_commit off so the flush does not hide the index cost);
  b. B-tree depth: bt_metap on a bigint key at 1e3 ... 1e8 rows, and a 36-character text key (uuid as text) at 1e6;
  c. page splits: the same 1M keys inserted in key order against random order into an existing index: leaf pages, density;
     deduplication on a 4-value column with deduplicate_items on and off;
  d. BRIN against B-tree on created_at of a 10M-message table (time ordered), and BRIN on a shuffled copy;
  e. partial, expression, covering (INCLUDE) and hash indexes on the 1M table: sizes and buffers.
Writes inputs/m3_indexes.json. About 10 minutes.
"""
import sys, os, time, re, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sepg import *
# Sections run in order; pass names to run only some (results are merged into the existing JSON):
#   python3 m3_indexes.py [write depth extra splits kinds brin]
SECTIONS = sys.argv[1:] or ['write', 'depth', 'extra', 'splits', 'kinds', 'brin']
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'inputs', 'm3_indexes.json')
fresh = SECTIONS[0] == 'write'
pg = pg16('m3', 54773).init(fresh=fresh); print(pg.start())
if fresh:
    pg.psql('CREATE DATABASE chat', 'postgres'); pg.psql('CREATE EXTENSION pageinspect; CREATE EXTENSION pgstattuple')
R = {} if fresh or not os.path.exists(OUT) else json.load(open(OUT))
R.update({'pg_version': pg.psql('SHOW server_version'), 'date': time.strftime('%Y-%m-%d')})
def done(name): print('section done', name, flush=True); save(R, 'm3_indexes.json')
lsn = lambda: pg.psql('SELECT pg_current_wal_lsn()')
size = lambda rel: int(pg.psql(f"SELECT pg_relation_size('{rel}')"))
if not int(pg.psql("SELECT count(*) FROM pg_class WHERE relname = 'src'")):
    pg.psql(messages_sql(name='src')); pg.psql('VACUUM ANALYZE src')
R['src_bytes'] = size('src')
IDX = [
  ('t_pkey', 'ALTER TABLE t ADD PRIMARY KEY (id)'),
  ('t_chat_created', 'CREATE INDEX t_chat_created ON t(chat_id, created_at)'),
  ('t_created', 'CREATE INDEX t_created ON t(created_at)'),
  ('t_model_tokens', 'CREATE INDEX t_model_tokens ON t(model, tokens)'),
  ('t_role_chat', 'CREATE INDEX t_role_chat ON t(role, chat_id)'),
  ('t_content', 'CREATE INDEX t_content ON t(content)')]
open('m3_ins.sql', 'w').write("\\set c random(1, 100000)\nINSERT INTO t(id, chat_id, role, model, tokens, content, created_at) VALUES (nextval('tid'), :c, 'user', 'mini', 42, md5(random()::text) || md5(random()::text), now());\n")
if 'write' in SECTIONS:
  R['write_cost'] = []
  for k in [0, 1, 3, 6]:
      runs = []
      for rep in range(3):
          pg.psql('DROP TABLE IF EXISTS t; DROP SEQUENCE IF EXISTS tid; CREATE TABLE t (LIKE src); CREATE SEQUENCE tid START 2000000')
          for name, ddl in IDX[:k]: pg.psql(ddl)
          pg.psql('CHECKPOINT'); a = lsn()
          s = pg.timed('INSERT INTO t SELECT * FROM src'); b = lsn()
          runs.append({'s': round(s, 2), 'wal': int(pg.psql(f"SELECT '{b}'::pg_lsn - '{a}'"))})
      sizes = {'heap': size('t'), **{n: size(n) for n, _ in IDX[:k]}}
      r = sh(f'{pg.B}/pgbench', '-h', '127.0.0.1', '-p', pg.port, '-U', 'postgres', '-n', '-f', 'm3_ins.sql', '-c', '4', '-j', '4', '-T', '15', 'chat',
             env={**os.environ, 'PGOPTIONS': '-c synchronous_commit=off'})
      tps = float(re.search(r'tps = ([\d.]+)', r.stdout).group(1))
      R['write_cost'].append({'indexes': k, 'names': [n for n, _ in IDX[:k]], 'runs': runs, 'median_s': statistics.median(x['s'] for x in runs),
                              'median_wal': statistics.median(x['wal'] for x in runs), 'sizes': sizes, 'single_row_tps': round(tps)})
      print(R['write_cost'][-1], flush=True)
  pg.psql('DROP TABLE t'); done('write')
# b. depth
def stats(ix):
    m = pg.jsql(f"SELECT level, root FROM bt_metap('{ix}')")[0]
    st = pg.jsql(f"SELECT leaf_pages, internal_pages, avg_leaf_density, index_size FROM pgstatindex('{ix}')")[0]
    return {'levels': m['level'] + 1, 'root_items': int(pg.psql(f"SELECT live_items FROM bt_page_stats('{ix}', {m['root']})")),
            'leaf_items_first': int(pg.psql(f"SELECT live_items FROM bt_page_stats('{ix}', 1)")), **st}
if 'depth' in SECTIONS:
    R['depth'] = [d for d in R.get('depth', []) if d['key'] != 'bigint']
    for n in [10**3, 10**4, 10**5, 10**6, 10**7, 10**8]:
        pg.psql(f'DROP TABLE IF EXISTS d; CREATE TABLE d(k bigint); INSERT INTO d SELECT generate_series(1, {n})')
        pg.psql('CREATE INDEX d_k ON d(k)')
        R['depth'].append({'rows': n, 'key': 'bigint', **stats('d_k')}); print(R['depth'][-1], flush=True)
    pg.psql('DROP TABLE d'); done('depth')
# extra: a 36-character text key (UUID as text) at 1M rows; the same 1M bigint keys built by CREATE INDEX; deduplication on and off
if 'extra' in SECTIONS:
    R['depth'] = [d for d in R.get('depth', []) if d['key'] != 'text36']
    pg.psql("DROP TABLE IF EXISTS u; CREATE TABLE u(k text); INSERT INTO u SELECT md5(g::text)::uuid::text FROM generate_series(1, 1000000) g"); pg.psql('CREATE INDEX u_k ON u(k)')
    R['depth'].append({'rows': 10**6, 'key': 'text36', **stats('u_k')}); pg.psql('DROP TABLE u')
    pg.psql('DROP TABLE IF EXISTS s; CREATE TABLE s(k bigint); INSERT INTO s SELECT generate_series(1, 1000000); CREATE INDEX s_k ON s(k)')
    R['splits_built'] = {'order': 'built by CREATE INDEX (sorted)', **pg.jsql("SELECT leaf_pages, internal_pages, avg_leaf_density, index_size FROM pgstatindex('s_k')")[0]}
    pg.psql('DROP TABLE s')
    R['dedup'] = {}
    for d in ['on', 'off']:
        pg.psql(f'DROP INDEX IF EXISTS src_model; CREATE INDEX src_model ON src(model) WITH (deduplicate_items = {d})')
        R['dedup'][d] = size('src_model')
    pg.psql('DROP INDEX src_model'); done('extra')
# c. splits: the same 1M keys inserted in key order against random order into an existing index
if 'splits' in SECTIONS:
    R['splits'] = []
    for order in ['k', 'random()']:
        pg.psql('DROP TABLE IF EXISTS s; CREATE TABLE s(k bigint); CREATE INDEX s_k ON s(k)')
        t = pg.timed(f'INSERT INTO s SELECT g FROM generate_series(1, 1000000) g ORDER BY {"g" if order == "k" else "random()"}')
        st = pg.jsql("SELECT leaf_pages, internal_pages, avg_leaf_density, index_size FROM pgstatindex('s_k')")[0]
        R['splits'].append({'order': 'ascending' if order == 'k' else 'random', 'insert_s': round(t, 2), **st}); print(R['splits'][-1], flush=True)
    pg.psql('DROP TABLE s'); done('splits')
def buf(sql, pre=''):
    j = pg.explain(sql, pre=pre); p = j['Plan']
    def nodes(p): return [p['Node Type']] + sum((nodes(c) for c in p.get('Plans', [])), [])
    return {'nodes': nodes(p), 'hit': p.get('Shared Hit Blocks', 0) + p.get('Shared Read Blocks', 0), 'ms': j['Execution Time']}
# e. partial, expression, covering, hash on the 1M table
if 'kinds' in SECTIONS:
    for ix in ['src_chat', 'src_chat_hash', 'src_tokens', 'src_long', 'src_chat_incl']: pg.psql(f'DROP INDEX IF EXISTS {ix}')
    pg.psql('CREATE INDEX src_chat ON src(chat_id)'); pg.psql('VACUUM ANALYZE src')
    E = {'btree_chat': size('src_chat')}
    pg.psql('CREATE INDEX src_chat_hash ON src USING hash (chat_id)'); E['hash_chat'] = size('src_chat_hash')
    pg.psql('CREATE INDEX src_tokens ON src(tokens)'); E['btree_tokens'] = size('src_tokens')
    pg.psql("CREATE INDEX src_long ON src(tokens) WHERE role = 'assistant' AND tokens > 1000"); E['partial_long'] = size('src_long')
    E['partial_rows'] = int(pg.psql("SELECT count(*) FROM src WHERE role = 'assistant' AND tokens > 1000"))
    E['q_plain'] = buf('SELECT role, tokens FROM src WHERE chat_id = 42000')
    pg.psql('CREATE INDEX src_chat_incl ON src(chat_id) INCLUDE (role, tokens)'); E['covering'] = size('src_chat_incl'); pg.psql('VACUUM ANALYZE src')
    E['q_covering'] = buf('SELECT role, tokens FROM src WHERE chat_id = 42000')
    E['q_partial'] = buf("SELECT id FROM src WHERE role = 'assistant' AND tokens > 1450")
    E['q_hash'] = buf('SELECT id FROM src WHERE chat_id = 42000', pre='SET enable_bitmapscan = off; SET enable_indexonlyscan = off; ')
    R['kinds'] = E; print(E, flush=True); done('kinds')
# d. BRIN against B-tree on a 10M-row time-ordered table, and BRIN on a shuffled copy
if 'brin' in SECTIONS:
    if not int(pg.psql("SELECT count(*) FROM pg_class WHERE relname = 'big'")):
        t = time.time(); pg.psql(messages_sql(n=10_000_000, chats=1_000_000, name='big')); pg.psql('VACUUM ANALYZE big'); R['big_load_s'] = round(time.time() - t, 1)
    for ix in ['big_brin', 'big_bt']: pg.psql(f'DROP INDEX IF EXISTS {ix}')
    D = {'heap': size('big'), 'rows': int(pg.psql('SELECT count(*) FROM big'))}
    t = pg.timed('CREATE INDEX big_brin ON big USING brin (created_at)'); D['brin_build_s'] = round(t, 2); D['brin'] = size('big_brin')
    t = pg.timed('CREATE INDEX big_bt ON big(created_at)'); D['btree_build_s'] = round(t, 2); D['btree'] = size('big_bt')
    pg.psql('ANALYZE big')
    q1 = "SELECT count(*), sum(tokens) FROM big WHERE created_at >= '2025-09-10' AND created_at < '2025-09-10 01:00'"
    q2 = "SELECT count(*), sum(tokens) FROM big WHERE created_at >= '2025-09-10' AND created_at < '2025-09-11'"
    NOPAR = 'SET max_parallel_workers_per_gather = 0; '
    modes = {'btree': NOPAR + 'SET enable_bitmapscan = off; SET enable_seqscan = off; ',
             'brin': NOPAR + 'SET enable_indexscan = off; SET enable_indexonlyscan = off; SET enable_seqscan = off; ',
             'seq': NOPAR + 'SET enable_indexscan = off; SET enable_bitmapscan = off; SET enable_indexonlyscan = off; '}
    for name, q in [('hour', q1), ('day', q2)]:
        for kind, pre in modes.items():
            buf(q, pre=pre)  # warm the cache once, then measure
            D[f'{name}_{kind}'] = buf(q, pre=pre)
    rp = int(pg.psql("SELECT lastrevmappage + 1 FROM brin_metapage_info(get_raw_page('big_brin', 0))"))
    D['brin_items'] = pg.jsql(f"SELECT blknum, value FROM brin_page_items(get_raw_page('big_brin', {rp}), 'big_brin') ORDER BY blknum LIMIT 3")
    pg.psql('DROP TABLE IF EXISTS shuf'); pg.psql('CREATE TABLE shuf AS SELECT * FROM big ORDER BY random() LIMIT 2000000')
    pg.psql('CREATE INDEX shuf_brin ON shuf USING brin (created_at)'); pg.psql('VACUUM ANALYZE shuf')
    D['shuffled_rows'] = 2000000; D['shuffled_heap_pages'] = size('shuf') // 8192
    D['shuffled_hour_brin'] = buf(q1.replace('big', 'shuf'), pre=modes['brin'])
    D['shuffled_hour_seq'] = buf(q1.replace('big', 'shuf'), pre=modes['seq'])
    R['brin'] = D; print(D, flush=True); done('brin')
pg.stop()

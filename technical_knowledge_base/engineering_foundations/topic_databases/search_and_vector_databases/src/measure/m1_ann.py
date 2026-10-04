"""ANN measurements on BEIR Quora (522,931 questions, all-MiniLM-L6-v2, 384 dims) in PostgreSQL 18.6 + pgvector 0.8.7.
Stages (each saves to ../inputs/m1_ann.json as it goes; rerun skips finished stages unless FORCE=1):
 load      table, COPY in binary, sizes
 truth     exact top-10 for 1,000 test queries (numpy dot product on unit vectors) and a check against Postgres exact scans
 exact     exact scan latency in Postgres (sequential scan, 0 and 2 parallel workers; cosine and inner product)
 hnsw      HNSW builds (m, ef_construction) with time and size; recall@10 and latency over hnsw.ef_search
 ivf       IVFFlat build (lists = rows/1000) with time and size; recall@10 and latency over ivfflat.probes
 quant     halfvec HNSW and binary-quantised HNSW (with and without re-ranking): size, build time, recall, latency
 filter    a selective filter (1% and 10% of rows): default scan, iterative scans, B-tree pre-filter; rows returned, recall, latency
Latency: wall time of one query from the Python client on the same machine (localhost TCP), second pass of the query set
(the first warms caches); shared_buffers is 4 GB so every index is in memory."""
import os, sys, json, time
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import svpg
from svpg import lat_summary
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'inputs', 'm1_ann.json')
R = json.load(open(OUT)) if os.path.exists(OUT) else {}
FORCE = os.environ.get('FORCE') == '1'
def done(k): return (k in R) and not FORCE
def save(): svpg.save(R, 'm1_ann.json')
NQ = 1000
E, Q, meta = svpg.load_emb('quora')
Q = Q[:NQ]; N = len(E)
svpg.init(); print(svpg.start()); svpg.ensure_db()
c = svpg.connect()
c.execute("select pg_reload_conf()")
R['env'] = {'postgres': c.execute('select version()').fetchone()[0],
            'pgvector': c.execute("select extversion from pg_extension where extname='vector'").fetchone()[0],
            'machine': 'Apple M1 Pro, 10 cores, 16 GB RAM', 'rows': N, 'dims': int(E.shape[1]), 'queries': NQ,
            'settings': {k: c.execute(f'show {k}').fetchone()[0] for k in ['shared_buffers', 'maintenance_work_mem', 'max_parallel_maintenance_workers', 'max_parallel_workers_per_gather', 'work_mem']}}

if not done('load'):
    c.execute('drop table if exists q cascade')
    c.execute('create table q (id int primary key, body text not null, tenant int not null, tenant10 int not null, embedding vector(384) not null)')
    t = time.perf_counter()
    with c.cursor().copy('copy q (id, body, tenant, tenant10, embedding) from stdin with (format binary)') as cp:
        cp.set_types(['int4', 'text', 'int4', 'int4', 'vector'])
        for i in range(N):
            cp.write_row((i + 1, meta['texts'][i], (i + 1) % 100, (i + 1) % 10, E[i]))
    tl = time.perf_counter() - t
    c.execute('vacuum analyze q')
    R['load'] = {'copy_s': round(tl, 1), 'heap_bytes': svpg.size(c, 'q'),
                 'total_bytes': c.execute("select pg_total_relation_size('q')").fetchone()[0],
                 'toast_bytes': c.execute("select coalesce(pg_relation_size(reltoastrelid),0) from pg_class where relname='q'").fetchone()[0],
                 'vector_column_bytes': c.execute('select sum(pg_column_size(embedding)) from q').fetchone()[0],
                 'one_vector_bytes': c.execute('select pg_column_size(embedding) from q limit 1').fetchone()[0],
                 'avg_row_bytes': c.execute('select avg(pg_column_size(q.*))::int from q').fetchone()[0]}
    save()

# ground truth: exact top-10 by cosine (dot product of unit vectors)
S = Q @ E.T
GT = np.argsort(-S, axis=1)[:, :10] + 1  # ids are 1-based
GTd = -np.sort(-S, axis=1)[:, :10]
def recall(rows, i, k=10):
    return len(set(rows[:k]) & set(GT[i, :k].tolist())) / k
def run_set(sql, pre=(), n=NQ, rec=True, passes=2):
    for s in pre: c.execute(s)
    ms = []; rc = []; got = []
    for p in range(passes):
        ms = []; rc = []; got = []
        for i in range(n):
            t = time.perf_counter(); rows = [r[0] for r in c.execute(sql, (Q[i],)).fetchall()]; ms.append((time.perf_counter() - t) * 1000)
            got.append(len(rows))
            if rec: rc.append(recall(rows, i))
    out = lat_summary(ms)
    if rec: out['recall10'] = round(float(np.mean(rc)), 4)
    out['rows_mean'] = round(float(np.mean(got)), 2)
    return out
KNN = 'select id from q order by embedding <=> %s limit 10'

if not done('truth'):
    c.execute('drop index if exists q_hnsw, q_ivf'); c.execute('set max_parallel_workers_per_gather = 2')
    agree = []
    for i in range(50):
        rows = [r[0] for r in c.execute(KNN, (Q[i],)).fetchall()]; agree.append(recall(rows, i))
    R['truth'] = {'pg_exact_vs_numpy_recall10_50q': round(float(np.mean(agree)), 4),
                  'example_query': meta['queries'][0], 'example_top3': [meta['texts'][j - 1] for j in GT[0, :3].tolist()],
                  'example_top3_cos': [round(float(x), 4) for x in GTd[0, :3]]}
    save()

if not done('exact'):
    ex = {}
    for name, op, w in [('cos_w2', '<=>', 2), ('cos_w0', '<=>', 0), ('ip_w2', '<#>', 2)]:
        ex[name] = run_set(f'select id from q order by embedding {op} %s limit 10', pre=[f'set max_parallel_workers_per_gather = {w}'], n=60)
    c.execute('set max_parallel_workers_per_gather = 2')
    ex['plan'] = c.execute('explain (analyze, buffers, costs off) ' + KNN.replace('%s', "(select embedding from q where id = 1)")).fetchall()
    ex['plan'] = [r[0] for r in ex['plan']]
    R['exact'] = ex; save()

def build(sql, name):
    c.execute(f'drop index if exists {name}')
    t = time.perf_counter(); c.execute(sql); tb = time.perf_counter() - t
    return {'build_s': round(tb, 1), 'bytes': svpg.size(c, name)}

if not done('hnsw'):
    H = R.get('hnsw_partial', {})
    for m, efc in [(16, 64), (8, 32), (32, 128)]:
        key = f'm{m}_efc{efc}'
        if key in H: continue
        b = build(f'create index q_hnsw on q using hnsw (embedding vector_cosine_ops) with (m = {m}, ef_construction = {efc})', 'q_hnsw')
        curve = []
        for ef in [10, 20, 40, 80, 160, 320, 640]:
            r = run_set(KNN, pre=[f'set hnsw.ef_search = {ef}']); r['ef_search'] = ef; curve.append(r)
            print(key, r, flush=True)
        H[key] = {'m': m, 'ef_construction': efc, **b, 'curve': curve}
        if m == 16:
            c.execute('set hnsw.ef_search = 40')
            H[key]['plan'] = [r[0] for r in c.execute('explain (analyze, buffers, costs off) ' + KNN.replace('%s', "(select embedding from q where id = 1)")).fetchall()]
        R['hnsw_partial'] = H; save()
    R['hnsw'] = H; save()

if not done('ivf'):
    c.execute('drop index if exists q_hnsw')
    V = {}
    for lists in [523, 2000]:
        b = build(f'create index q_ivf on q using ivfflat (embedding vector_cosine_ops) with (lists = {lists})', 'q_ivf')
        curve = []
        for pr in [1, 2, 4, 8, 16, 23, 32, 64, 128]:
            r = run_set(KNN, pre=[f'set ivfflat.probes = {pr}']); r['probes'] = pr; curve.append(r); print(lists, r, flush=True)
        V[f'lists{lists}'] = {'lists': lists, **b, 'curve': curve}
        R['ivf'] = V; save()
    c.execute('drop index if exists q_ivf')

def ensure_hnsw():
    if not c.execute("select 1 from pg_class where relname='q_hnsw'").fetchone():
        return build('create index q_hnsw on q using hnsw (embedding vector_cosine_ops)', 'q_hnsw')

if not done('quant'):
    ensure_hnsw()
    U = {}
    b = build('create index q_hh on q using hnsw ((embedding::halfvec(384)) halfvec_cosine_ops)', 'q_hh')
    HSQL = 'select id from q order by embedding::halfvec(384) <=> %s::halfvec(384) limit 10'
    U['halfvec'] = {**b, 'curve': []}
    for ef in [40, 160]:
        r = run_set(HSQL, pre=[f'set hnsw.ef_search = {ef}']); r['ef_search'] = ef; U['halfvec']['curve'].append(r); print('half', r, flush=True)
    c.execute('drop index q_hh')
    b = build('create index q_hb on q using hnsw ((binary_quantize(embedding)::bit(384)) bit_hamming_ops)', 'q_hb')
    BSQL = 'select id from q order by binary_quantize(embedding)::bit(384) <~> binary_quantize(%s::vector) limit 10'
    U['binary'] = {**b, 'curve': []}
    r = run_set(BSQL, pre=['set hnsw.ef_search = 40']); r['mode'] = 'no rerank, ef_search 40'; U['binary']['curve'].append(r); print('bin', r, flush=True)
    for cand, ef in [(40, 40), (100, 100), (400, 400)]:
        RSQL = (f'select id from (select id, embedding from q order by binary_quantize(embedding)::bit(384) <~> binary_quantize(%(v)s::vector) limit {cand}) s '
                'order by embedding <=> %(v)s limit 10')
        def f(i, RSQL=RSQL): return [r[0] for r in c.execute(RSQL, {'v': Q[i]}).fetchall()]
        c.execute(f'set hnsw.ef_search = {ef}')
        for p in range(2):
            ms = []; rc = []
            for i in range(NQ):
                t = time.perf_counter(); rows = f(i); ms.append((time.perf_counter() - t) * 1000); rc.append(recall(rows, i))
        r = lat_summary(ms); r['recall10'] = round(float(np.mean(rc)), 4); r['mode'] = f'rerank top {cand} by full vectors, ef_search {ef}'
        U['binary']['curve'].append(r); print('binr', r, flush=True)
    c.execute('drop index q_hb')
    U['sizes_note'] = 'index bytes from pg_relation_size; the heap keeps full float32 vectors in every case'
    R['quant'] = U; save()

if not done('filter'):
    ensure_hnsw(); c.execute('set hnsw.ef_search = 40')
    c.execute('drop index if exists q_tenant, q_tenant10')
    F = {}
    ids = np.arange(1, N + 1)
    for col, mod in [('tenant', 100), ('tenant10', 10)]:
        vals = [(i * 7 + 3) % mod for i in range(NQ)]
        gts = []
        for i in range(NQ):
            mask = (ids % mod) == vals[i]
            sub = ids[mask]; s = E[mask] @ Q[i]
            gts.append(set(sub[np.argsort(-s)[:10]].tolist()))
        def runf(sql, pre, cte=False):
            for s in pre: c.execute(s)
            for p in range(2):
                ms = []; rc = []; got = []
                for i in range(NQ):
                    t = time.perf_counter(); rows = [r[0] for r in c.execute(sql, {'v': Q[i], 't': vals[i]}).fetchall()]
                    ms.append((time.perf_counter() - t) * 1000); got.append(len(rows)); rc.append(len(set(rows) & gts[i]) / 10)
            r = lat_summary(ms); r['recall10'] = round(float(np.mean(rc)), 4); r['rows_mean'] = round(float(np.mean(got)), 2)
            r['zero_rows_share'] = round(float(np.mean([g == 0 for g in got])), 4); return r
        FSQL = f'select id from q where {col} = %(t)s order by embedding <=> %(v)s limit 10'
        PRE = f'with s as materialized (select id, embedding from q where {col} = %(t)s) select id from s order by embedding <=> %(v)s limit 10'
        res = {}
        # no index on the filter column yet: the planner can only use the HNSW index or scan the table
        res['hnsw_post_filter'] = runf(FSQL, ['set hnsw.iterative_scan = off', 'set enable_seqscan = off'])
        res['hnsw_strict'] = runf(FSQL, ['set hnsw.iterative_scan = strict_order'])
        res['hnsw_relaxed'] = runf(FSQL, ['set hnsw.iterative_scan = relaxed_order'])
        c.execute('set hnsw.iterative_scan = off'); c.execute('reset enable_seqscan')
        c.execute(f'create index q_{col}_bt on q ({col})'); c.execute('analyze q')
        res['btree_prefilter_exact'] = runf(PRE, [])
        res['planner_default_plan'] = [r[0] for r in c.execute('explain (analyze, costs off) ' + FSQL.replace('%(t)s', str(vals[0])).replace('%(v)s', '(select embedding from q where id = 1)')).fetchall()]
        res['planner_default'] = runf(FSQL, [])
        res['share_of_rows'] = 1 / mod
        c.execute(f'drop index q_{col}_bt')
        F[col] = res; print(col, {k: v for k, v in res.items() if k != 'planner_default_plan'}, flush=True)
        R['filter'] = F; save()
    c.execute('reset hnsw.iterative_scan')

if not done('ops'):
    ensure_hnsw(); O = {}
    # insert cost with the HNSW index present: 5,000 single-row inserts (each its own transaction), new rows copied from existing vectors
    c.execute('drop table if exists q_ins'); c.execute('create table q_ins (like q)')
    c.execute('insert into q_ins select * from q where id <= 200000'); c.execute('vacuum analyze q_ins')
    t = time.perf_counter(); c.execute('create index q_ins_h on q_ins using hnsw (embedding vector_cosine_ops)'); O['build_200k_s'] = round(time.perf_counter() - t, 1)
    t = time.perf_counter()
    for i in range(5000):
        c.execute('insert into q_ins values (%s, %s, 0, 0, %s)', (900000 + i, 'x', E[200000 + i]))
    O['insert_5000_single_rows_with_hnsw_s'] = round(time.perf_counter() - t, 2)
    c.execute('drop index q_ins_h'); c.execute('delete from q_ins where id >= 900000')
    t = time.perf_counter()
    for i in range(5000):
        c.execute('insert into q_ins values (%s, %s, 0, 0, %s)', (900000 + i, 'x', E[200000 + i]))
    O['insert_5000_single_rows_no_vector_index_s'] = round(time.perf_counter() - t, 2)
    # deletes: delete 10% of rows, query before vacuum, vacuum time, reindex time
    c.execute('create index q_ins_h on q_ins using hnsw (embedding vector_cosine_ops)')
    c.execute('delete from q_ins where id % 10 = 0')
    t = time.perf_counter(); c.execute('vacuum q_ins'); O['vacuum_after_10pct_delete_s'] = round(time.perf_counter() - t, 1)
    t = time.perf_counter(); c.execute('reindex index q_ins_h'); O['reindex_s'] = round(time.perf_counter() - t, 1)
    # a build that does not fit in maintenance_work_mem
    c.execute("set maintenance_work_mem = '64MB'"); c.execute('drop index q_ins_h')
    notices = []
    c.add_notice_handler(lambda d: notices.append(d.message_primary))
    t = time.perf_counter(); c.execute('create index q_ins_h on q_ins using hnsw (embedding vector_cosine_ops)'); O['build_200k_64MB_s'] = round(time.perf_counter() - t, 1)
    O['notices_64MB'] = notices[:3]
    c.execute("reset maintenance_work_mem"); c.execute('drop table q_ins')
    R['ops'] = O; save()
c.close()
print('ALL DONE', flush=True)

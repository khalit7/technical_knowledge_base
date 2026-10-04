"""Cost-model tab inputs: real pg_class, pg_stats and B-tree metapage values for two range scans, and the
planner's own costs and row estimates for each access path (seq scan, index scan, bitmap scan) forced in turn,
plus measured times (EXPLAIN ANALYZE, warm cache, best of 3) at a few sizes. Serial plans only
(max_parallel_workers_per_gather = 0) so the three formulas compare like with like.
Writes ../inputs/cost_model.json. Run from the scratchpad with QPP_ROOT set (see qpcommon.py)."""
import os, sys, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qpcommon import *
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'inputs', 'cost_model.json')
PRE = 'SET max_parallel_workers_per_gather = 0; '
FORCE = {'seq': 'SET enable_indexscan=off; SET enable_bitmapscan=off; SET enable_indexonlyscan=off; ',
         'index': 'SET enable_seqscan=off; SET enable_bitmapscan=off; SET enable_indexonlyscan=off; ',
         'bitmap': 'SET enable_seqscan=off; SET enable_indexscan=off; SET enable_indexonlyscan=off; '}
PRESETS = {
 'users': dict(table='users', index='users_pkey', col='id', a=5001, ns=[1, 10, 30, 100, 300, 1000, 2000, 3000, 5000, 10000, 20000, 40000, 60000, 90000], timed=[10, 300, 3000, 20000, 90000]),
 'messages': dict(table='messages', index='messages_pkey', col='id', a=500001, ns=[1, 10, 100, 1000, 10000, 100000, 300000, 1000000, 3000000, 6000000, 9000000], timed=[100, 10000, 1000000, 9000000]),
}
def node(plan):
    p = plan['Plan']
    while p['Node Type'] in ('Aggregate', 'Gather', 'Result') and 'Plans' in p: p = p['Plans'][0]
    return p
out = {'settings': dict(l.split('|') for l in psql("SELECT name, setting FROM pg_settings WHERE name IN ('seq_page_cost','random_page_cost','cpu_tuple_cost','cpu_index_tuple_cost','cpu_operator_cost','effective_cache_size','work_mem','block_size')").splitlines()), 'presets': {}}
for k, p in PRESETS.items():
    t, ix, c = p['table'], p['index'], p['col']
    rel = psql(f"SELECT relpages, reltuples FROM pg_class WHERE relname = '{t}'").split('|')
    irel = psql(f"SELECT relpages, reltuples FROM pg_class WHERE relname = '{ix}'").split('|')
    meta = psql(f"SELECT level, fastlevel FROM bt_metap('{ix}')").split('|')
    st = psql(f"SELECT null_frac, n_distinct, correlation, histogram_bounds::text FROM pg_stats WHERE tablename = '{t}' AND attname = '{c}'").split('|')
    hist = [int(x) for x in st[3].strip('{}').split(',')]
    d = dict(table=t, index=ix, col=c, a=p['a'], relpages=int(rel[0]), reltuples=float(rel[1]), idxpages=int(irel[0]), idxtuples=float(irel[1]),
             btlevel=int(meta[0]), fastlevel=int(meta[1]), null_frac=float(st[0]), n_distinct=float(st[1]), correlation=float(st[2]), hist=hist, rows=[])
    for n in p['ns']:
        q = f"SELECT * FROM {t} WHERE {c} BETWEEN {p['a']} AND {p['a'] + n - 1}"
        r = {'n': n}
        for path, f in FORCE.items():
            e = node(explain(q, pre=PRE + f, opts='COSTS'))
            r[path] = {'node': e['Node Type'], 'startup': e['Startup Cost'], 'total': e['Total Cost'], 'rows': e['Plan Rows']}
            if 'Plans' in e: r[path]['inner'] = {'startup': e['Plans'][0]['Startup Cost'], 'total': e['Plans'][0]['Total Cost']}
        r['chosen'] = node(explain(q, pre=PRE, opts='COSTS'))['Node Type']
        if n in p['timed']:
            r['ms'] = {}
            for path, f in FORCE.items():
                best = None
                for _ in range(3):
                    e = explain(q, pre=PRE + f, opts='ANALYZE, BUFFERS')
                    ms = e['Execution Time']
                    if best is None or ms < best[0]:
                        nd = node(e); best = (ms, nd.get('Shared Hit Blocks', 0) + nd.get('Shared Read Blocks', 0), nd['Actual Rows'])
                r['ms'][path] = {'ms': round(best[0], 3), 'pages': best[1], 'rows': best[2]}
        d['rows'].append(r); print(k, n, r['chosen'], {x: r[x]['total'] for x in FORCE}, r.get('ms'), flush=True)
    out['presets'][k] = d
out['version'] = psql('SELECT version()')
json.dump(out, open(OUT, 'w'), indent=1)

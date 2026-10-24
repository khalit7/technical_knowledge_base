"""Copy the three measurements this page now owns from the pages that recorded them into inputs/ (run once; outputs committed).
- inputs/joins.json: the three join algorithms, each with the planner's choice and the forced alternative, from the
  Topic: databases root's Query plans case 4 (src/plan/inputs/c4.json, measured 2026-10-04 by src/plan/measure.py on the same data).
- inputs/pagination.json: offset against keyset pagination at six depths, from Building a backend API
  (src/inputs/pagination_pg.json, recorded 2026-10-04 on PostgreSQL 16.2, 1,000,000 rows).
- inputs/pooling.json: pgbench with and without a new connection per transaction, direct and through PgBouncer, from
  Running Postgres in production (src/inputs/connections.json, recorded 2026-10-05).
Run: python3 import_inputs.py"""
import json, os
H = os.path.dirname(os.path.abspath(__file__)); KB = os.path.normpath(os.path.join(H, '..', '..', '..', '..'))
def J(*p): return json.load(open(os.path.join(KB, *p)))
def W(name, obj): json.dump(obj, open(os.path.join(H, 'inputs', name), 'w'), indent=1); print('wrote', name)
c4 = J('engineering_foundations', 'topic_databases', 'src', 'plan', 'inputs', 'c4.json')
def pages(p): return p.get('Shared Hit Blocks', 0) + p.get('Shared Read Blocks', 0)
def find_join(p):
    if p['Node Type'] in ('Nested Loop', 'Hash Join', 'Merge Join'): return p
    for c in p.get('Plans', []):
        r = find_join(c)
        if r: return r
joins = {}
for k, v in c4.items():
    top = v['plan']['Plan']; j = find_join(top)
    joins[k] = {'label': v['label'], 'sql': v['sql'], 'pre': v.get('pre', ''), 'median_ms': v['median_ms'], 'pages': pages(top),
                'join': j['Node Type'], 'join_est': j['Plan Rows'], 'join_act': j['Actual Rows'], 'join_loops': j['Actual Loops'], 'cost': top['Total Cost']}
W('joins.json', {'source': 'Topic: databases, src/plan/inputs/c4.json (Query plans case 4), PostgreSQL 16.2, Apple M1 Pro, 2026-10-04, median of 5 runs', 'cases': joins})
pg = J('engineering_foundations', 'topic_swe_and_system_design', 'building_a_backend_api', 'src', 'inputs', 'pagination_pg.json')
W('pagination.json', {'source': 'Building a backend API, src/inputs/pagination_pg.json', **{k: pg[k] for k in ['date', 'postgres', 'rows', 'page', 'machine', 'method']},
                      'rows_by_depth': [{'depth': r['depth'], 'offset_ms': r['offset']['ms'], 'offset_pages': r['offset']['buffers'], 'keyset_ms': r['keyset']['ms'], 'keyset_pages': r['keyset']['buffers']} for r in pg['results']]})
cn = J('engineering_foundations', 'topic_databases', 'running_postgres_in_production', 'src', 'inputs', 'connections.json')
st = {s['step']: s for s in cn['steps']}
W('pooling.json', {'source': 'Running Postgres in production, src/inputs/connections.json', 'date': cn['machine']['date'], 'version': cn['version'],
                   'pgbench_cmd': st['pgbench']['cmd'], 'pgbench': [{'path': r['path'], 'reconnect': r['reconnect'], 'tps': round(r['tps'])} for r in st['pgbench']['rows']],
                   'setup': {'direct': st['setup']['direct'], 'bouncer': st['setup']['bouncer']}, 'bouncer_1000': {'server_conns': st['bouncer_1000']['server_conns'], 'out': st['bouncer_1000']['out']}})

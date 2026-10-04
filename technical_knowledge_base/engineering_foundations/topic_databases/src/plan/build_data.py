"""Turn the raw measurements in inputs/*.json into ../parts/32_js_qp_data.js (window.QP_DATA), compact trees for the page.
Run: python3 build_data.py   (plain Python, no packages)
"""
import json, os
HERE = os.path.dirname(os.path.abspath(__file__)); IN = os.path.join(HERE, 'inputs')
L = lambda f: json.load(open(os.path.join(IN, f)))

KEEP = ['Index Cond', 'Recheck Cond', 'Filter', 'Rows Removed by Filter', 'Rows Removed by Index Recheck', 'Heap Fetches', 'Hash Cond',
        'Merge Cond', 'Join Filter', 'Rows Removed by Join Filter', 'Sort Key', 'Sort Method', 'Sort Space Used', 'Group Key', 'Strategy',
        'Partial Mode', 'Hash Buckets', 'Original Hash Buckets', 'Hash Batches', 'Peak Memory Usage', 'Exact Heap Blocks', 'Lossy Heap Blocks',
        'Workers Planned', 'Workers Launched', 'Scan Direction', 'Parent Relationship', 'Inner Unique', 'Join Type', 'Cache Key', 'Cache Hits', 'Cache Misses']

def node(n):
    o = {'t': n['Node Type'], 'er': n['Plan Rows'], 'ar': n.get('Actual Rows'), 'lp': n.get('Actual Loops'),
         'tt': n.get('Actual Total Time'), 'st': n.get('Actual Startup Time'), 'c': n['Total Cost'], 'sc': n['Startup Cost'], 'wd': n['Plan Width'],
         'hit': n.get('Shared Hit Blocks', 0), 'rd': n.get('Shared Read Blocks', 0), 'dt': n.get('Shared Dirtied Blocks', 0),
         'io': round(n.get('I/O Read Time', 0) or 0, 3)}
    if n.get('Parallel Aware'): o['pa'] = 1
    for k, kk in (('Relation Name', 'rel'), ('Index Name', 'idx'), ('Alias', 'al')):
        if k in n: o[kk] = n[k]
    info = [[k, n[k]] for k in KEEP if k in n]
    if info: o['i'] = info
    if 'Workers' in n: o['wk'] = len(n['Workers'])
    if n.get('Plans'): o['k'] = [node(c) for c in n['Plans']]
    return o

def var(r, key, role, g=''):
    p = r['plan']
    return {'key': key, 'role': role, 'g': g, 'label': r['label'], 'sql': r['sql'], 'pre': r['pre'].strip(), 'ms': r['median_ms'],
            'times': r['times_ms'], 'plan_ms': round(p['Planning Time'], 3), 'exec_ms': round(p['Execution Time'], 3), 'tree': node(p['Plan'])}

def sizes():
    g = L('sizes.json'); d = {s['name']: {'pages': s['pages'], 'bytes': s['bytes'], 'rows': s['rows']} for s in g['relations']}
    for t, n in g['exact_rows'].items(): d[t]['rows'] = n
    return d

D = {'gen': L('gen_log.json'), 'sizes': sizes(), 'cases': []}
c1 = L('c1.json'); c2 = L('c2.json'); c3 = L('c3.json'); c4 = L('c4.json'); c5 = L('c5.json'); c6 = L('c6_pg.json'); c7 = L('c7_before.json'); c8 = L('c8.json')
D['env'] = c7['env_after']
D['cases'].append({'id': 1, 'v': [var(c1['before'], 'before', 'before'), var(c1['after'], 'after', 'after')], 'x': {'index_bytes': c1['index_bytes'], 'index_seconds': c1['index_seconds']}})
D['cases'].append({'id': 2, 'v': [var(c2['used'], 'used', 'alt'), var(c2['before'], 'before', 'before'), var(c2['after'], 'after', 'after')], 'x': {'index_bytes': c2['index_bytes'], 'index_seconds': c2['index_seconds']}})
D['cases'].append({'id': 3, 'v': [var(c3['before'], 'before', 'before', 'One day of messages'), var(c3['after'], 'after', 'after', 'One day of messages'), var(c3['before2'], 'before2', 'before', 'A user by email, ignoring capitals'), var(c3['after2'], 'after2', 'after', 'A user by email, ignoring capitals')], 'x': {'timezone': c3['timezone']}})
D['cases'].append({'id': 4, 'v': [var(c4[k], k, r, g) for k, r, g in (('small', 'after', 'Small: one user\'s chats'), ('small_forced', 'before', 'Small: one user\'s chats'),
        ('large', 'after', 'Large: every chat with its user'), ('large_forced', 'before', 'Large: every chat with its user'), ('large_rpc', 'alt', 'Large: every chat with its user'),
        ('sorted', 'after', 'Sorted: chats in id order'), ('sorted_forced', 'before', 'Sorted: chats in id order'))]})
D['cases'].append({'id': 5, 'v': [var(c5['before'], 'before', 'before'), var(c5['after'], 'after', 'after')], 'x': {'actual_users': c5['actual_users'], 'single': c5['single'], 'dependencies': c5['dependencies']}})
c6d = L('c6_duck.json')
def dnode(n):
    # DuckDB adds internal projections that compress and decompress strings; fold them into their child
    ex = n.get('extra_info', {}) or {}
    if n.get('operator_type') == 'PROJECTION' and any('__internal' in x for x in ex.get('Projections', [])) and len(n.get('children', [])) == 1:
        return dnode(n['children'][0])
    o = {'t': n.get('operator_name') or n.get('operator_type') or n.get('query_name', 'QUERY'), 'ar': n.get('operator_cardinality'), 'tt': round((n.get('operator_timing') or 0) * 1000, 3),
         'ex': n.get('extra_info', {}), 'scanned': n.get('operator_rows_scanned')}
    if n.get('children'): o['k'] = [dnode(c) for c in n['children']]
    return o
D['cases'].append({'id': 6, 'v': [var(c6['parallel'], 'pg_par', 'before'), var(c6['serial'], 'pg_one', 'before')],
                   'x': {'table_bytes': c6['table_bytes'], 'pg_result': c6['result'], 'wall': c6.get('wall'),
                         'duck': {k: c6d[k] for k in c6d if k not in ('explain_analyze', 'profile')}, 'duck_tree': dnode(c6d['profile']['children'][0]), 'duck_latency_ms': round(c6d['profile']['latency'] * 1000, 2), 'duck_cpu_ms': round(c6d['profile']['cpu_time'] * 1000, 1)}})
D['cases'].append({'id': 7, 'v': [var(c7['before'], 'before', 'before'), var(c7['after'], 'after', 'after')], 'x': {'vis_before': c7['env_before']['visibility'], 'vis_after': c7['env_after']['visibility'], 'vacuum_seconds': c7['vacuum_seconds']}})
D['cases'].append({'id': 8, 'v': [var(c8[k], k, r, 'One chat\'s history (50 newest)' if k.startswith('h') else 'One day of messages') for k, r in (('history_disk', 'before'), ('history_os', 'alt'), ('history_warm', 'after'), ('day_disk', 'before'), ('day_os', 'alt'), ('day_warm', 'after'))],
                   'x': {k: v for k, v in c8.items() if k.startswith('evict')}})
js = '// ---- Query plans tab: measured data, generated by src/plan/build_data.py from src/plan/inputs/*.json (do not edit by hand) ----\nwindow.QP_DATA=' + json.dumps(D, separators=(',', ':')) + ';\n'
open(os.path.join(HERE, '..', 'parts', '32_js_qp_data.js'), 'w').write(js)
print(len(js), 'bytes')

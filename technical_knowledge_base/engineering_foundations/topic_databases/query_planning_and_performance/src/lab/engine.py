"""Engine settings, measured: work_mem and spills (sort, hash join, hash aggregate), parallel query by workers,
EXPLAIN ANALYZE's timing overhead, and the planner's search (dynamic programming against GEQO) on a many-table join.
Writes ../inputs/engine.json. Warm cache: every query runs once before it is timed; times are the best of 3."""
import os, sys, json, re, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from qpcommon import *
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'inputs', 'engine.json')
only = sys.argv[1:] or ['spill', 'parallel', 'timing', 'geqo']
o = json.load(open(OUT)) if os.path.exists(OUT) else {}
def walk(p):
    yield p
    for c in p.get('Plans', []): yield from walk(c)
def best(sql, pre, n=3):
    explain(sql, pre=pre)  # warm
    r = None
    for _ in range(n):
        e = explain(sql, pre=pre)
        if r is None or e['Execution Time'] < r['Execution Time']: r = e
    return r
SER = 'SET max_parallel_workers_per_gather = 0; '
if 'spill' in only:
    o['spill'] = {}
    Q = {'sort': 'SELECT * FROM chats ORDER BY title, id',
         'hashjoin': 'SELECT count(*), sum(m.tokens) FROM messages m JOIN chats c ON c.id = m.chat_id WHERE m.id <= 3000000',
         'hashagg': 'SELECT chat_id, count(*), sum(tokens) FROM messages WHERE id <= 3000000 GROUP BY chat_id'}
    for k, q in Q.items():
        rows = []
        for wm in ['1MB', '4MB', '16MB', '64MB', '256MB']:
            pre = SER + f"SET work_mem = '{wm}'; " + ("SET enable_mergejoin = off; SET enable_nestloop = off; " if k == 'hashjoin' else '') + ("SET enable_sort = off; " if k == 'hashagg' else '')
            e = best(q, pre); top = e['Plan']
            info = {'work_mem': wm, 'ms': round(e['Execution Time'], 1), 'temp_written': top.get('Temp Written Blocks', 0), 'temp_read': top.get('Temp Read Blocks', 0)}
            for p in walk(top):
                if p['Node Type'] == 'Sort': info.update(method=p.get('Sort Method'), space_kb=p.get('Sort Space Used'), space_type=p.get('Sort Space Type'))
                if p['Node Type'] == 'Hash': info.update(batches=p.get('Hash Batches'), orig_batches=p.get('Original Hash Batches'), peak_kb=p.get('Peak Memory Usage'), buckets=p.get('Hash Buckets'))
                if p['Node Type'] == 'Aggregate' and p.get('Strategy') == 'Hashed': info.update(batches=p.get('HashAgg Batches'), peak_kb=p.get('Peak Memory Usage'), disk_kb=p.get('Disk Usage'), planned_partitions=p.get('Planned Partitions'))
            rows.append(info); print(k, info, flush=True)
        o['spill'][k] = {'sql': q, 'rows': rows, 'text_small': explain_text(q, pre=SER + "SET work_mem = '4MB'; " + ("SET enable_mergejoin = off; SET enable_nestloop = off; " if k == 'hashjoin' else '') + ("SET enable_sort = off; " if k == 'hashagg' else '')),
                         'text_big': explain_text(q, pre=SER + "SET work_mem = '256MB'; " + ("SET enable_mergejoin = off; SET enable_nestloop = off; " if k == 'hashjoin' else '') + ("SET enable_sort = off; " if k == 'hashagg' else ''))}
    o['spill']['hash_mem_multiplier'] = psql('SHOW hash_mem_multiplier')
if 'parallel' in only:
    q = 'SELECT model, count(*), sum(tokens) FROM messages GROUP BY model'
    rows = []
    for w in [0, 1, 2, 3, 4, 6, 8]:
        e = best(q, f'SET max_parallel_workers_per_gather = {w}; SET max_parallel_workers = 8; ')
        g = [p for p in walk(e['Plan']) if p['Node Type'] in ('Gather', 'Gather Merge')]
        rows.append({'workers': w, 'ms': round(e['Execution Time'], 1), 'launched': g[0].get('Workers Launched') if g else 0, 'planned': g[0].get('Workers Planned') if g else 0, 'cost': e['Plan']['Total Cost']})
        print(rows[-1], flush=True)
    dflt = explain(q)
    g = [p for p in walk(dflt['Plan']) if p['Node Type'] in ('Gather', 'Gather Merge')]
    o['parallel'] = {'sql': q, 'rows': rows, 'default_planned': g[0].get('Workers Planned') if g else 0,
                     'text4': explain_text(q, pre='SET max_parallel_workers_per_gather = 4; '),
                     'settings': psql("SELECT json_object_agg(name, setting) FROM pg_settings WHERE name IN ('max_worker_processes','max_parallel_workers','max_parallel_workers_per_gather','min_parallel_table_scan_size','parallel_setup_cost','parallel_tuple_cost')")}
if 'timing' in only:
    def tq(sql, pre=''):
        r = sh(f'{B}/psql', '-h', '127.0.0.1', '-p', PORT, '-U', 'postgres', '-X', '-q', 'chat', input=pre + '\\timing on\n' + (sql + ';\n') * 4)
        return min(float(x) for x in re.findall(r'Time: ([0-9.]+) ms', r.stdout))
    q = 'SELECT count(*) FROM messages'
    plain = tq(q, SER)
    on = best(q, SER, 3)['Execution Time']; off = explain(q, pre=SER, opts='ANALYZE, TIMING OFF')['Execution Time']
    off = min(off, *[explain(q, pre=SER, opts='ANALYZE, TIMING OFF')['Execution Time'] for _ in range(3)])
    q2 = 'SELECT count(*) FROM messages m JOIN chats c ON c.id = m.chat_id WHERE c.user_id = 2'
    o['timing'] = {'sql': q, 'plain_ms': plain, 'analyze_timing_on_ms': round(on, 1), 'analyze_timing_off_ms': round(off, 1),
                   'sql2': q2, 'plain2_ms': tq(q2, SER), 'on2_ms': round(best(q2, SER)['Execution Time'], 3),
                   'pg_test_timing': sh(f'{B}/pg_test_timing', '-d', '2').stdout}
    print(o['timing'], flush=True)
if 'geqo' in only:
    N = 16
    psql('DROP TABLE IF EXISTS gq_fact CASCADE;' + ''.join(f'DROP TABLE IF EXISTS gq_d{i};' for i in range(1, N)))
    cols = ', '.join(f'd{i} int' for i in range(1, N))
    psql(f'CREATE TABLE gq_fact (id int, {cols}, v int)')
    sizes = [10 * (i * 7 % 13 + 1) ** 2 for i in range(1, N)]
    psql(f"INSERT INTO gq_fact SELECT g, {', '.join(f'(g * {2 * i + 1}) % {sizes[i - 1]}' for i in range(1, N))}, g % 1000 FROM generate_series(1, 200000) g")
    for i in range(1, N):
        psql(f'CREATE TABLE gq_d{i} (id int PRIMARY KEY, name text, f int); INSERT INTO gq_d{i} SELECT g, \'n\' || g, g % 10 FROM generate_series(0, {sizes[i - 1] - 1}) g;')
    psql('ANALYZE')
    rows = []
    for n in range(2, N + 1):
        k = n - 1
        q = 'SELECT count(*) FROM gq_fact f, ' + ', '.join(f'gq_d{i} d{i}' for i in range(1, k + 1)) + ' WHERE f.v < 50 AND ' + ' AND '.join(f'f.d{i} = d{i}.id' for i in range(1, k + 1)) + ' AND d1.f = 3'
        r = {'tables': n}
        for mode, pre in [('dp', 'SET geqo = off; '), ('geqo', 'SET geqo = on; SET geqo_threshold = 2; '), ('default', '')]:
            ts = []
            for _ in range(3):
                e = explain(q, pre=pre + 'SET statement_timeout = 120000; ', opts='ANALYZE, SUMMARY')
                ts.append((e['Planning Time'], e['Execution Time'], e['Plan']['Total Cost']))
            r[mode] = {'plan_ms': round(min(t[0] for t in ts), 2), 'exec_ms': round(min(t[1] for t in ts), 2), 'cost': ts[0][2]}
        rows.append(r); print(r, flush=True)
    o['geqo'] = {'rows': rows, 'sizes': sizes, 'settings': psql("SELECT json_object_agg(name, setting) FROM pg_settings WHERE name LIKE 'geqo%' OR name LIKE '%collapse_limit'"),
                 'example_sql': q}
    # GEQO is randomised: different seeds, different plans on the 16-table query
    o['geqo']['seeds'] = []
    for s in [0, 0.25, 0.5, 0.75, 1]:
        e = explain(q, pre=f'SET geqo_seed = {s}; ', opts='ANALYZE, SUMMARY')
        o['geqo']['seeds'].append({'seed': s, 'cost': e['Plan']['Total Cost'], 'plan_ms': round(e['Planning Time'], 2), 'exec_ms': round(e['Execution Time'], 2)})
    print(o['geqo']['seeds'], flush=True)
json.dump(o, open(OUT, 'w'), indent=1)

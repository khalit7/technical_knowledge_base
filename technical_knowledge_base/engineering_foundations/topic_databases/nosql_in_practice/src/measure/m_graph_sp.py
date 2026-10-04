"""Shortest path between the two users Neo4j connected in m_graph.py, written in PostgreSQL 16.2 two ways:
a recursive CTE that carries the path (and stops at the first hit), and a breadth-first search driven from the client, one query per hop,
keeping a visited set. Same graph files as m_graph.py (run that first). About 2 minutes. Adds 'pg_shortest' to inputs/graph.json.
"""
import os, sys, time, json, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import pgserver, psycopg

G = os.path.join(S, 'graph'); res = json.load(open(os.path.join(INPUTS, 'graph.json')))
A, Bu, HOPS = res['neo4j']['shortest']['a'], res['neo4j']['shortest']['b'], res['neo4j']['shortest']['hops']
B = os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin'); root = os.path.join(S, 'graph_pg'); D = root + '/data'
port = free_port(56580)
shutil.rmtree(root, ignore_errors=True); os.makedirs(root)
sh(f'{B}/initdb', '-D', D, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C')
sh(f'{B}/pg_ctl', '-D', D, '-o', f"-p {port} -k '' -h 127.0.0.1 -c work_mem=64MB", '-l', root + '/log', '-w', 'start')
out = {'a': A, 'b': Bu}
try:
    cn = psycopg.connect(host='127.0.0.1', port=port, user='postgres', dbname='postgres', autocommit=True)
    cn.execute("CREATE TABLE friends(a int, b int, PRIMARY KEY (a, b))")
    with cn.cursor().copy('COPY friends FROM STDIN WITH (FORMAT csv)') as cp:
        cp.write(open(G + '/both.csv').read())
    cn.execute('VACUUM ANALYZE friends'); cn.execute('SET statement_timeout = 120000')
    rec = f'''WITH RECURSIVE p(node, depth, path) AS (
  SELECT {A}, 0, ARRAY[{A}]
  UNION ALL
  SELECT f.b, p.depth + 1, p.path || f.b FROM p JOIN friends f ON f.a = p.node
  WHERE p.depth < {HOPS} AND f.b <> ALL(p.path))
SELECT path FROM p WHERE node = {Bu} LIMIT 1'''
    out['sql_recursive'] = rec
    xs = []
    for _ in range(3):
        t = time.perf_counter()
        try:
            r = cn.execute(rec).fetchone(); xs.append((time.perf_counter() - t) * 1000); out['recursive_path'] = r[0] if r else None
        except Exception as e:
            out['recursive_error'] = str(e)[:200]; xs.append(None); break
    out['recursive_ms'] = [round(x, 1) if x else None for x in xs]
    j = cn.execute('EXPLAIN (ANALYZE, FORMAT JSON) ' + rec).fetchone()[0][0]
    def walk(p, acc):
        acc.append({'node': p['Node Type'], 'rows': p.get('Actual Rows'), 'loops': p.get('Actual Loops')})
        for c in p.get('Plans', []): walk(c, acc)
        return acc
    out['recursive_plan'] = walk(j['Plan'], [])
    # client-driven BFS: one query per hop over the frontier, with a visited set
    def bfs():
        seen = {A: None}; frontier = [A]; depth = 0
        while frontier and depth < 8:
            depth += 1
            rows = cn.execute('SELECT a, b FROM friends WHERE a = ANY(%s)', (frontier,)).fetchall()
            nxt = []
            for a, b in rows:
                if b not in seen:
                    seen[b] = a; nxt.append(b)
                    if b == Bu:
                        path = [b]
                        while seen[path[-1]] is not None: path.append(seen[path[-1]])
                        return path[::-1], depth, len(seen)
            frontier = nxt
        return None, depth, len(seen)
    bfs(); xs = []
    for _ in range(5):
        t = time.perf_counter(); path, depth, seen = bfs(); xs.append((time.perf_counter() - t) * 1000)
    out['bfs'] = {'ms_p50': round(pct(xs, .5), 1), 'path': path, 'hops': depth, 'visited': seen}
    print(out, flush=True)
    res['pg_shortest'] = out; save('graph.json', res)
finally:
    sh(f'{B}/pg_ctl', '-D', D, '-m', 'fast', '-w', 'stop')

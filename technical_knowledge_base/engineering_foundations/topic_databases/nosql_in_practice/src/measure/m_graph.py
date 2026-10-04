"""Friends of friends: PostgreSQL 16.2 (recursive CTE, and one DISTINCT join per hop) against Neo4j Community 2026.09.0 (OpenJDK 25)
and Kuzu 0.11.3 (embedded; the project was archived on 2025-10-10) on the same graph.
Graph: 100,000 users, each new user befriends 10 existing ones chosen in proportion to their friend count (Barabasi-Albert, seed 7):
1M friendships, a few very popular users, as in real social graphs.
About 8 minutes. Writes inputs/graph.json.
"""
import os, sys, time, json, random, subprocess, shutil, signal
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import pgserver

res = machine()
N, M, SEED = 100_000, 10, 7
G = os.path.join(S, 'graph'); os.makedirs(G, exist_ok=True)

def gen():
    random.seed(SEED); targets = list(range(1, M + 1)); rep = []; edges = []
    for u in range(M + 1, N + 1):
        chosen = set()
        while len(chosen) < M:
            chosen.add(random.choice(rep) if rep and random.random() < 0.9 else random.randint(1, u - 1))
        for v in chosen: edges.append((u, v))
        rep.extend(chosen); rep.extend([u] * M)
    return edges

edges = gen()
deg = {}
for a, b in edges: deg[a] = deg.get(a, 0) + 1; deg[b] = deg.get(b, 0) + 1
ds = sorted(deg.values())
res['graph'] = {'users': N, 'friendships': len(edges), 'degree_median': ds[len(ds) // 2], 'degree_p99': ds[int(.99 * len(ds))], 'degree_max': ds[-1],
                'degree_mean': round(2 * len(edges) / N, 1)}
random.seed(11); SAMPLE = sorted(random.sample(range(1, N + 1), 10)); res['sample_users'] = SAMPLE
with open(G + '/nodes.csv', 'w') as f:
    f.write('uid:ID,:LABEL\n'); f.writelines(f'{i},User\n' for i in range(1, N + 1))
with open(G + '/rels.csv', 'w') as f:
    f.write(':START_ID,:END_ID,:TYPE\n'); f.writelines(f'{a},{b},FRIEND\n' for a, b in edges)
with open(G + '/both.csv', 'w') as f:
    f.writelines(f'{a},{b}\n{b},{a}\n' for a, b in edges)
print(res['graph'], flush=True)
HOPS = [1, 2, 3, 4]

def pg():
    B = os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin'); root = os.path.join(S, 'graph_pg'); D = root + '/data'
    port = free_port(56580); res['pg_port'] = port
    def psql(sql, db='g'):
        r = sh(f'{B}/psql', '-h', '127.0.0.1', '-p', str(port), '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-At', '-c', sql, db)
        if r.returncode: raise RuntimeError(r.stderr + sql[:300])
        return r.stdout.strip()
    shutil.rmtree(root, ignore_errors=True); os.makedirs(root)
    sh(f'{B}/initdb', '-D', D, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C')
    sh(f'{B}/pg_ctl', '-D', D, '-o', f"-p {port} -k '' -h 127.0.0.1 -c work_mem=64MB", '-l', root + '/log', '-w', 'start')
    try:
        psql('CREATE DATABASE g', 'postgres')
        psql(f"CREATE TABLE friends(a int, b int, PRIMARY KEY (a, b)); COPY friends FROM '{G}/both.csv' WITH (FORMAT csv)"); psql('VACUUM ANALYZE friends')
        rec = lambda u, k: f'''WITH RECURSIVE r(node, depth) AS (SELECT {u}, 0 UNION SELECT f.b, r.depth + 1 FROM r JOIN friends f ON f.a = r.node WHERE r.depth < {k})
SELECT count(DISTINCT node) - 1 FROM r'''
        def hop(u, k):
            # one DISTINCT join per hop: the frontier never holds a user twice
            ls = [f'l0 AS (SELECT {u} AS n)'] + [f'l{i} AS (SELECT DISTINCT f.b AS n FROM l{i-1} JOIN friends f ON f.a = l{i-1}.n)' for i in range(1, k + 1)]
            return 'WITH ' + ', '.join(ls) + ' SELECT count(*) - 1 FROM (' + ' UNION '.join(f'SELECT n FROM l{i}' for i in range(k + 1)) + ') z'
        out = {'recursive_cte': {}, 'join_per_hop': {}, 'counts': {}}
        import psycopg
        cn = psycopg.connect(host='127.0.0.1', port=port, user='postgres', dbname='g', autocommit=True)
        cn.execute('SET statement_timeout = 120000')
        for k in HOPS:
            for name, fn in (('recursive_cte', rec), ('join_per_hop', hop)):
                ms, cnt = [], []
                for u in SAMPLE: cn.execute(fn(u, k)).fetchall()      # warm the cache
                for u in SAMPLE:
                    t = time.perf_counter()
                    try:
                        cnt.append(cn.execute(fn(u, k)).fetchone()[0])
                    except Exception as e:
                        cnt.append(None); out[name].setdefault('errors', {})[k] = str(e)[:120]
                    ms.append((time.perf_counter() - t) * 1000)
                out[name][k] = {'ms_p50': round(pct(ms, .5), 1), 'ms_max': round(max(ms), 1)}
                out['counts'].setdefault(k, cnt)
                if cnt != out['counts'][k]: out.setdefault('count_mismatch', []).append([name, k])
                print('pg', name, k, out[name][k], flush=True)
        # how much work: rows produced inside the recursive CTE at 3 hops, for the first sample user
        j = cn.execute('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + rec(SAMPLE[0], 3)).fetchone()[0][0]
        def walk(p, acc):
            acc.append({'node': p['Node Type'], 'rows': p.get('Actual Rows'), 'loops': p.get('Actual Loops'), 'buffers': p.get('Shared Hit Blocks', 0) + p.get('Shared Read Blocks', 0)})
            for c2 in p.get('Plans', []): walk(c2, acc)
            return acc
        out['plan_recursive_3'] = walk(j['Plan'], [])
        cn.close()
        out['sql_recursive'] = rec('$user', 3); out['sql_join_per_hop_2'] = hop('$user', 2)
        res['pg'] = out
    finally:
        sh(f'{B}/pg_ctl', '-D', D, '-m', 'fast', '-w', 'stop')

def neo():
    home = os.path.join(S, 'neo4j-community-2026.09.0')
    jdk = os.path.dirname(os.path.dirname([os.path.join(dp, 'java') for dp, dn, fn in os.walk(os.path.join(S, 'jdk25')) if 'java' in fn and dp.endswith('bin')][0]))
    env = dict(os.environ, JAVA_HOME=jdk, NEO4J_HOME=home)
    bolt = free_port(56600); http = free_port(bolt + 1); res['neo4j_ports'] = [bolt, http]
    conf = os.path.join(home, 'conf', 'neo4j.conf')
    if not os.path.exists(conf + '.orig'): shutil.copy(conf, conf + '.orig')
    c = open(conf + '.orig').read() + f'''
dbms.security.auth_enabled=false
server.bolt.listen_address=127.0.0.1:{bolt}
server.http.listen_address=127.0.0.1:{http}
server.memory.heap.initial_size=1g
server.memory.heap.max_size=1g
server.memory.pagecache.size=1g
'''
    open(conf, 'w').write(c)
    shutil.rmtree(os.path.join(home, 'data', 'databases', 'neo4j'), ignore_errors=True); shutil.rmtree(os.path.join(home, 'data', 'transactions', 'neo4j'), ignore_errors=True)
    t = time.time()
    r = subprocess.run([home + '/bin/neo4j-admin', 'database', 'import', 'full', 'neo4j', f'--nodes={G}/nodes.csv', f'--relationships={G}/rels.csv', '--overwrite-destination=true'],
                       capture_output=True, text=True, env=env)
    res['neo4j_import_s'] = round(time.time() - t, 1); print('import', r.returncode, r.stdout[-300:], r.stderr[-300:], flush=True)
    p = subprocess.Popen([home + '/bin/neo4j', 'console'], stdout=open(G + '/neo.out', 'w'), stderr=subprocess.STDOUT, env=env)
    try:
        wait_port(bolt, 180); time.sleep(5)
        from neo4j import GraphDatabase
        drv = GraphDatabase.driver(f'bolt://127.0.0.1:{bolt}')
        with drv.session() as s:
            res['neo4j_version'] = s.run('CALL dbms.components() YIELD versions RETURN versions[0] AS v').single()['v']
            s.run('CREATE INDEX user_uid IF NOT EXISTS FOR (u:User) ON (u.uid)').consume()
            s.run('CALL db.awaitIndexes(300)').consume()
            out = {'counts': {}}
            q = lambda k: f'MATCH (u:User {{uid: $u}})-[:FRIEND*1..{k}]-(v) WHERE v <> u RETURN count(DISTINCT v) AS n'
            for k in HOPS:
                ms, cnt = [], []
                for u in SAMPLE: s.run(q(k), u=str(u)).consume()
                for u in SAMPLE:
                    t = time.perf_counter(); cnt.append(s.run(q(k), u=str(u)).single()['n']); ms.append((time.perf_counter() - t) * 1000)
                out[k] = {'ms_p50': round(pct(ms, .5), 1), 'ms_max': round(max(ms), 1)}; out['counts'][k] = cnt
                print('neo4j', k, out[k], flush=True)
            prof = s.run('PROFILE ' + q(3), u=str(SAMPLE[0])).consume().profile
            def ops(p, acc):
                acc.append({'op': p['operatorType'].split('@')[0], 'rows': p.get('rows'), 'dbHits': p.get('dbHits')})
                for c2 in p.get('children', []): ops(c2, acc)
                return acc
            out['profile_3hops'] = ops(prof, [])
            out['cypher'] = q(3)
            a, b = SAMPLE[0], SAMPLE[1]
            sp = 'MATCH p = shortestPath((a:User {uid: $a})-[:FRIEND*..8]-(b:User {uid: $b})) RETURN length(p) AS hops, [n IN nodes(p) | n.uid] AS path'
            s.run(sp, a=str(a), b=str(b)).consume()
            t = time.perf_counter(); r = s.run(sp, a=str(a), b=str(b)).single(); out['shortest'] = {'a': a, 'b': b, 'hops': r['hops'], 'path': r['path'], 'ms': round((time.perf_counter() - t) * 1000, 1)}
            out['isolation'] = 'read committed (Neo4j docs)'
            res['neo4j'] = out
        drv.close()
    finally:
        p.send_signal(signal.SIGTERM)
        try: p.wait(60)
        except Exception: p.kill()

def kz():
    import kuzu
    d = os.path.join(G, 'kuzu_db'); shutil.rmtree(d, ignore_errors=True)
    db = kuzu.Database(d); c = kuzu.Connection(db)
    c.execute('CREATE NODE TABLE User(uid INT64, PRIMARY KEY (uid))'); c.execute('CREATE REL TABLE FRIEND(FROM User TO User)')
    with open(G + '/k_nodes.csv', 'w') as f: f.writelines(f'{i}\n' for i in range(1, N + 1))
    with open(G + '/k_rels.csv', 'w') as f: f.writelines(f'{a},{b}\n' for a, b in edges)
    c.execute(f"COPY User FROM '{G}/k_nodes.csv'"); c.execute(f"COPY FRIEND FROM '{G}/k_rels.csv'")
    out = {'version': kuzu.__version__, 'counts': {}}
    for k in HOPS:
        q = f'MATCH (u:User)-[:FRIEND*1..{k}]-(v:User) WHERE u.uid = $u AND v.uid <> $u RETURN count(DISTINCT v.uid)'
        ms, cnt = [], []
        for u in SAMPLE:
            t = time.perf_counter(); r = c.execute(q, {'u': u}); cnt.append(r.get_next()[0]); ms.append((time.perf_counter() - t) * 1000)
        out[k] = {'ms_p50': round(pct(ms, .5), 1), 'ms_max': round(max(ms), 1)}; out['counts'][k] = cnt
        print('kuzu', k, out[k], flush=True)
    res['kuzu'] = out

if __name__ == '__main__':
    only = sys.argv[1:] or ['pg', 'neo', 'kuzu']
    if os.path.exists(os.path.join(INPUTS, 'graph.json')):
        old = json.load(open(os.path.join(INPUTS, 'graph.json'))); old.update(res); res = old
    if 'pg' in only: pg(); save('graph.json', res)
    if 'neo' in only: neo(); save('graph.json', res)
    if 'kuzu' in only: kz(); save('graph.json', res)

"""Run every guided lesson variant on real PostgreSQL (pgserver wheel) and on SQLite (Python's sqlite3), each from a fresh
copy of the same data, and store the results the page shows.
Run (from anywhere, never inside the repo without --no-project):
  uv run --no-project --python 3.12 --with pgserver --with 'psycopg[binary]' python recompute.py
Writes results.json: {"meta": {...}, "runs": {"<lesson>:<variant>": {"pg": [...], "sqlite": [...]}}}.
Each statement result: {"sql", "cols", "rows" (first 30), "n" (row count), "changes" or "status", "error"}.
Then: node run_sqljs.mjs  (the page's own engine, sql.js, in node) and python3 recompute.py --check, which compares all three
and asserts the facts the lesson text quotes."""
import os, sys, json, sqlite3, tempfile, subprocess, shutil, datetime, decimal, platform
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lessons import LESSONS, variants, split

D = json.load(open(os.path.join(HERE, 'data.json')))
SCHEMA = open(os.path.join(HERE, 'schema_sqlite.sql')).read()
SCHEMA_PG = open(os.path.join(HERE, 'schema_pg.sql')).read()
ROWCAP = 30

def norm(v):
    if isinstance(v, decimal.Decimal): v = float(v)
    if isinstance(v, float) and v.is_integer() and abs(v) < 1e15: return v  # keep floats as floats
    if isinstance(v, (datetime.datetime, datetime.date)): return str(v)
    return v

def inserts():
    for t in ('users', 'chats', 'messages', 'credits'):
        cols = D['cols'][t]
        yield t, cols, D[t]

def run_sqlite():
    base = sqlite3.connect(':memory:', isolation_level=None)
    base.executescript(SCHEMA)
    for t, cols, rows in inserts():
        base.executemany(f'INSERT INTO {t} ({",".join(cols)}) VALUES ({",".join("?" * len(cols))})', rows)
    out = {}
    for l in LESSONS:
        for key, sql in variants(l):
            db = sqlite3.connect(':memory:', isolation_level=None)
            base.backup(db)
            res = []
            for st in split(sql):
                r = {'sql': st}
                try:
                    cur = db.execute(st)
                    if cur.description:
                        rows = [[norm(v) for v in row] for row in cur.fetchall()]
                        r.update(cols=[d[0] for d in cur.description], rows=rows[:ROWCAP], n=len(rows))
                    else:
                        r['changes'] = cur.rowcount if cur.rowcount >= 0 else 0
                except sqlite3.Error as e:
                    r['error'] = str(e)
                res.append(r)
            out[f"{l['id']}:{key}"] = res
            db.close()
    return out

def run_pg():
    import pgserver, psycopg
    B = os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin')
    d = tempfile.mkdtemp(prefix='pgsql'); data = os.path.join(d, 'data'); port = '54331'
    sh = lambda *a: subprocess.run(list(a), capture_output=True, text=True)
    sh(f'{B}/initdb', '-D', data, '-U', 'postgres', '--auth=trust')
    sh(f'{B}/pg_ctl', '-D', data, '-o', f'-p {port} -k {d}', '-l', d + '/log', '-w', 'start')
    url = f'host=127.0.0.1 port={port} user=postgres'
    try:
        with psycopg.connect(url + ' dbname=postgres', autocommit=True) as c:
            c.execute('CREATE DATABASE base')
            ver = c.execute('SHOW server_version').fetchone()[0]
        with psycopg.connect(url + ' dbname=base', autocommit=True) as c:
            c.execute(SCHEMA_PG)
            with c.cursor() as cur:
                for t, cols, rows in inserts():
                    cur.executemany(f'INSERT INTO {t} ({",".join(cols)}) VALUES ({",".join(["%s"] * len(cols))})', rows)
                for t in ('users', 'chats', 'messages'):
                    cur.execute(f"SELECT setval(pg_get_serial_sequence('{t}', 'id'), (SELECT MAX(id) FROM {t}))")
        out = {}
        for l in LESSONS:
            for key, sql in variants(l):
                with psycopg.connect(url + ' dbname=postgres', autocommit=True) as c:
                    c.execute('DROP DATABASE IF EXISTS lesson'); c.execute('CREATE DATABASE lesson TEMPLATE base')
                res = []
                with psycopg.connect(url + ' dbname=lesson', autocommit=True) as c:
                    for st in split(sql):
                        r = {'sql': st}
                        try:
                            with c.cursor() as cur:
                                # plain text protocol, like typing the statement into psql
                                cur.execute(st.encode(), prepare=False)
                                r['status'] = cur.statusmessage
                                if cur.description:
                                    rows = [[norm(v) for v in row] for row in cur.fetchall()]
                                    r.update(cols=[x.name for x in cur.description], rows=rows[:ROWCAP], n=len(rows))
                                else:
                                    r['changes'] = cur.rowcount if cur.rowcount >= 0 else 0
                        except psycopg.Error as e:
                            m = 'ERROR: ' + (e.diag.message_primary or str(e))
                            if e.diag.message_detail: m += '\nDETAIL: ' + e.diag.message_detail
                            r['error'] = m
                        res.append(r)
                out[f"{l['id']}:{key}"] = res
        return out, ver
    finally:
        sh(f'{B}/pg_ctl', '-D', data, '-m', 'fast', '-w', 'stop'); shutil.rmtree(d, ignore_errors=True)

def same(a, b):
    """Two statement results agree: both errors, or same columns, rows and change counts."""
    if ('error' in a) or ('error' in b): return ('error' in a) and ('error' in b)
    if 'cols' in a or 'cols' in b:
        if a.get('cols') != b.get('cols') or a.get('n') != b.get('n'): return False
        return all(len(x) == len(y) and all(eq(p, q) for p, q in zip(x, y)) for x, y in zip(a['rows'], b['rows']))
    return a.get('changes') == b.get('changes')

def eq(p, q):
    if isinstance(p, (int, float)) and isinstance(q, (int, float)) and not isinstance(p, bool): return abs(p - q) < 1e-9
    return p == q

def compare(runs, a, b):
    diffs = {}
    for k, v in runs.items():
        if a not in v or b not in v: continue
        x, y = v[a], v[b]
        bad = [i for i in range(max(len(x), len(y))) if i >= len(x) or i >= len(y) or not same(x[i], y[i])]
        if bad: diffs[k] = bad
    return diffs

if __name__ == '__main__':
    path = os.path.join(HERE, 'results.json')
    if '--check' not in sys.argv:
        sq = run_sqlite()
        pg, ver = run_pg()
        runs = {k: {'pg': pg[k], 'sqlite_py': sq[k]} for k in sq}
        old = json.load(open(path)) if os.path.exists(path) else {}
        for k, v in old.get('runs', {}).items():  # keep the sql.js run from run_sqljs.mjs
            if k in runs and 'sqlite' in v: runs[k]['sqlite'] = v['sqlite']
        meta = dict(old.get('meta', {}), date=datetime.date.today().isoformat(), postgres=ver, python_sqlite=sqlite3.sqlite_version,
                    machine='Apple M1 Pro laptop, macOS ' + platform.mac_ver()[0])
        json.dump({'meta': meta, 'runs': runs}, open(path, 'w'), indent=0, separators=(',', ':'))
        print('wrote', path, len(runs), 'variants; postgres', ver, 'sqlite (python)', sqlite3.sqlite_version)
    R = json.load(open(path))
    runs = R['runs']
    d_py = compare(runs, 'sqlite', 'sqlite_py')
    print('sql.js (page engine) vs Python sqlite3:', 'identical' if not d_py else d_py)
    d_pg = compare(runs, 'sqlite' if all('sqlite' in v for v in runs.values()) else 'sqlite_py', 'pg')
    print('SQLite vs PostgreSQL, variants that differ:')
    for k, v in d_pg.items(): print('  ', k, 'statements', v)
    R['meta']['differ'] = d_pg
    json.dump(R, open(path, 'w'), indent=0, separators=(',', ':'))

# ---- the facts the lesson text (parts/31_js_sql_d_text.js, 31_tab_sql.html) quotes ----
if __name__ == '__main__':
    def rows(k, eng='pg', i=0): return runs[k][eng][i].get('rows')
    def first_err(k, eng): return 'error' in runs[k][eng][0]
    A = []
    def ok(name, cond): A.append((name, bool(cond)))
    ok('data gaps: 5 no country, 6 users no chats, 37 untitled chats, 8 empty chats',
       sum(u[4] is None for u in D['users']) == 5 and len({u[0] for u in D['users']} - {c[1] for c in D['chats']}) == 6
       and sum(c[2] is None for c in D['chats']) == 37 and len({c[0] for c in D['chats']} - {m[1] for m in D['messages']}) == 8)
    ok('select 27/18/5', [runs[f'select:{i}']['pg'][0]['n'] for i in range(3)] == [27, 18, 5])
    ok('order desc first 1216 899', rows('order:0-0')[0] == [1216, 64, 899])
    ok('order asc 720 and 724 tie at 45', [r[0] for r in rows('order:1-0') if r[2] == 45] == [720, 724])
    ok('join inner 5, left 6 with Mo NULL, anti 1', runs['join:0']['pg'][0]['n'] == 5 and runs['join:1']['pg'][0]['n'] == 6
       and [4, 'Mo Garcia', None, None] in rows('join:1') and rows('join:2') == [[4, 'Mo Garcia', None, None]])
    g = {r[0]: r[1] for r in rows('group:0-0')}
    ok('group 432/317/202 = 951', g == {'mini': 432, 'standard': 317, 'reasoning': 202} and sum(g.values()) == 951)
    ok('cte 22/14/6', [runs[f'cte:{i}']['pg'][0]['n'] for i in range(3)] == [22, 14, 6])
    from collections import defaultdict
    cu = {c[0]: c[1] for c in D['chats']}; t = defaultdict(int)
    for m in D['messages']: t[cu[m[1]]] += m[4]
    ok('cte 44 users, average about 11,326', len(t) == 44 and round(sum(t.values()) / len(t)) == 11326)
    ok('window chat 1 latest 1311 assistant', rows('window:0')[0][:3] == [1, 1311, 'assistant'])
    ok('write id 201', rows('write:0') == [[201]] and rows('write:0', 'sqlite') == [[201]])
    ok('constraints: pg refuses all six', all(any('error' in r for r in runs[f'constraints:{i}']['pg']) for i in range(6)))
    ok('constraints: sqlite refuses 0-2, accepts 3 and 5, refuses 4', all(first_err(f'constraints:{i}', 'sqlite') for i in range(3))
       and not first_err('constraints:3', 'sqlite') and not first_err('constraints:5', 'sqlite') and 'error' in runs['constraints:4']['sqlite'][1])
    ok('txn 20: 10/40, rollback 30/20', rows('txn:0-0', i=2) == [[7, 10], [12, 40]] and rows('txn:0-2', i=4) == [[7, 30], [12, 20]])
    ok('txn 50 no txn: 30/70 both', rows('txn:1-0', i=2) == [[7, 30], [12, 70]] == rows('txn:1-0', 'sqlite', 2))
    ok('txn 50 commit: pg ROLLBACK 30/20, sqlite 30/70', runs['txn:1-1']['pg'][3].get('status') == 'ROLLBACK'
       and rows('txn:1-1', i=4) == [[7, 30], [12, 20]] and rows('txn:1-1', 'sqlite', 4) == [[7, 30], [12, 70]])
    ok('nulls 50/45, 0 and 5, NOT IN 0', rows('nulls:0') == [[50, 45]] and rows('nulls:1') == [[0]] and rows('nulls:1', i=1) == [[5]] and rows('nulls:2') == [[0]])
    ok('nulls sort: sqlite NULL first, pg not', rows('nulls:3', 'sqlite')[0][2] is None and rows('nulls:3')[0][2] is not None)
    ok('nulls chat 10 label NULL', [r for r in rows('nulls:5') if r[0] == 10][0][1] is None)
    ok('danger 26/18/6, UPDATE 50, DELETE refused vs 200', rows('danger:0-0', i=1) == [['free', 26], ['pro', 18], ['team', 6]]
       and runs['danger:1-0']['pg'][0].get('status') == 'UPDATE 50' and first_err('danger:2-0', 'pg') and runs['danger:2-0']['sqlite'][0].get('changes') == 200)
    for name, good in A: print('  ok ' if good else '  FAIL', name)
    print('facts asserted:', sum(g for _, g in A), 'of', len(A))

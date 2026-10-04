"""Run every Reading-tab example (../examples.py) on PostgreSQL 16 (pgserver) and on Python's SQLite, each from a fresh
copy of the chat data plus messages.parent_id, and store the results the page shows next to its live SQLite run.
Writes ../inputs/examples.json. Run from a scratch directory (see pgc.py)."""
import os, sys, json, sqlite3, datetime, decimal
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
from pgc import *
from examples import EX
CAP = 30

def split(sql, dollar=False):
    """Statements on ; outside quotes, -- comments and (for Postgres) $$ bodies; SQLite trigger bodies via complete_statement."""
    out, cur, i, q = [], '', 0, None
    while i < len(sql):
        ch = sql[i]
        if q:
            if sql.startswith(q, i): cur += q; i += len(q); q = None; continue
            cur += ch; i += 1; continue
        if dollar and sql.startswith('$$', i): q = '$$'; cur += '$$'; i += 2; continue
        if ch in "'\"": q = ch; cur += ch; i += 1; continue
        if sql.startswith('--', i):
            j = sql.find('\n', i); j = len(sql) if j < 0 else j; cur += sql[i:j]; i = j; continue
        cur += ch; i += 1
        if ch == ';' and (dollar or sqlite3.complete_statement(cur)):
            out.append(cur.strip()); cur = ''
    if cur.strip(): out.append(cur.strip())
    keep = lambda s: any(l.strip() and not l.strip().startswith('--') for l in s.split('\n'))
    return [s.rstrip(';').strip() for s in out if keep(s)]

def norm(v):
    if isinstance(v, decimal.Decimal): v = float(v)
    if isinstance(v, (datetime.datetime, datetime.date, datetime.time)): return str(v)
    if isinstance(v, (dict, list)): return json.dumps(v)
    return v

def sqlite_base():
    D = data(); db = sqlite3.connect(':memory:', isolation_level=None)
    db.executescript(open(os.path.join(ROOT_SQL, 'schema_sqlite.sql')).read())
    for t in ('users', 'chats', 'messages', 'credits'):
        cols = D['cols'][t]; db.executemany(f'INSERT INTO {t} ({",".join(cols)}) VALUES ({",".join("?" * len(cols))})', D[t])
    for s in PARENT_SQL.split(';'):
        if s.strip(): db.execute(s)
    return db

def run_sqlite(base, sql):
    db = sqlite3.connect(':memory:', isolation_level=None); base.backup(db); res = []
    for st in split(sql):
        r = {'sql': st}
        try:
            cur = db.execute(st)
            if cur.description:
                rows = [[norm(v) for v in row] for row in cur.fetchall()]
                r.update(cols=[d[0] for d in cur.description], rows=rows[:CAP], n=len(rows))
            else: r['changes'] = max(cur.rowcount, 0)
        except sqlite3.Error as e: r['error'] = str(e)
        res.append(r)
    db.close(); return res

def run_pg(sql):
    with conn('postgres') as c:
        c.execute('DROP DATABASE IF EXISTS ex WITH (FORCE)'); c.execute('DROP ROLE IF EXISTS app_user')
        c.execute('CREATE DATABASE ex TEMPLATE chat')
    res = []
    with conn('ex') as c:
        for st in split(sql, dollar=True):
            r = {'sql': st}
            try:
                with c.cursor() as cur:
                    cur.execute(st.encode(), prepare=False)
                    r['status'] = cur.statusmessage
                    if cur.description:
                        rows = [[norm(v) for v in row] for row in cur.fetchall()]
                        r.update(cols=[x.name for x in cur.description], rows=rows[:CAP], n=len(rows))
                    else: r['changes'] = max(cur.rowcount, 0)
            except psycopg.Error as e:
                m = 'ERROR: ' + (e.diag.message_primary or str(e))
                if e.diag.message_detail: m += '\nDETAIL: ' + e.diag.message_detail
                if e.diag.message_hint: m += '\nHINT: ' + e.diag.message_hint
                r['error'] = m
            res.append(r)
    return res

if __name__ == '__main__':
    start(); ver = load_base('chat'); base = sqlite_base()
    out = {'date': datetime.date.today().isoformat(), 'postgres': ver, 'python_sqlite': sqlite3.sqlite_version, 'runs': {}}
    for k, e in EX.items():
        r = {'pg': run_pg(e['pg'] or e['sql'])}
        if e['only'] != 'pg': r['sqlite_py'] = run_sqlite(base, e['sql'])
        out['runs'][k] = r
        errs = [x['error'].split('\n')[0] for x in r['pg'] if 'error' in x]; errs2 = [x['error'] for x in r.get('sqlite_py', []) if 'error' in x]
        print(k, 'pg errors:', errs, '| sqlite errors:', errs2, flush=True)
    save('examples.json', out)

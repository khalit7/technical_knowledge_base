"""Run every anomaly scenario at every isolation level on a real PostgreSQL and a real MySQL (InnoDB), with real concurrent sessions.
Run from a scratch directory (data directories are created there):
  TX_SCRATCH=$PWD uv run --no-project --python 3.12 --with pgserver --with 'psycopg[binary]' --with pymysql python <repo>/.../src/measure/run_matrix.py [pg|mysql]
MySQL comes from conda-forge in a scratch prefix (MYSQL_ENV, default $TX_SCRATCH/mysqlenv); see src/README.md.
Writes src/inputs/matrix_<server>.json: every step of every run (statement, result, error code, whether it blocked)."""
import os, sys, json, datetime, platform
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from txharness import *
from scenarios import S, RESET, LEVELS, ORDER

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'inputs')
which = sys.argv[1] if len(sys.argv) > 1 else 'pg'
if which == 'pg':
    srv = PG(pgserver_bin(), os.path.join(SCR, 'pg_matrix'), '55731')
    print(srv.start())
else:
    srv = MY(os.environ.get('MYSQL_ENV', os.path.join(SCR, 'mysqlenv')), os.path.join(SCR, 'my_matrix'), 33731)
    print(srv.start())
srv.ensure_db()
res = {'date': datetime.date.today().isoformat(), 'server': srv.kind, 'version': srv.version(),
       'machine': 'Apple M1 Pro laptop, macOS ' + platform.mac_ver()[0], 'block_wait_s': BLOCK_WAIT, 'settle_s': SETTLE, 'runs': {}}
if srv.kind == 'postgres':
    c = srv.connect(); res['deadlock_timeout'] = c.execute('SHOW deadlock_timeout').fetchone()[0]; c.close()
else:
    c = srv.connect(); cur = c.cursor(); cur.execute('SELECT @@transaction_isolation, @@innodb_lock_wait_timeout, @@innodb_deadlock_detect')
    res['defaults'] = list(cur.fetchone()); c.close()

def summarise(tr):
    errs, blocks = [], []
    for st in tr['steps']:
        if st.get('blocked'): blocks.append({'step': st['i'], 's': st['s'], 'wait': st.get('wait')})
        for f in st.get('finished', []):
            if f.get('error'): errs.append({'step': f['i'], 's': f['s'], 'code': f.get('code'), 'error': f['error'], 'detail': f.get('detail')})
    return errs, blocks

def one(key, level, fix=None):
    sc = S[key]
    steps = sc['steps'](level, fix) if fix else sc['steps'](level)
    tr = run_trace(srv, sc['names'], steps, RESET, sc['final'])
    occurred, why = sc['check'](tr['named'], tr['final'])
    errs, blocks = summarise(tr)
    name = key + '|' + level + ('|' + fix if fix else '')
    res['runs'][name] = {'scenario': key, 'level': level, 'fix': fix, 'occurred': bool(occurred), 'why': why,
                         'errors': errs, 'blocks': blocks, 'trace': tr['steps'], 'final': tr['final']}
    print(f"{name:45s} {'OCCURRED' if occurred else 'prevented':9s} {why} | errors {[e['code'] for e in errs]} blocks {len(blocks)}", flush=True)

for key in ORDER:
    for L in LEVELS:
        one(key, L)
    for fix in S[key].get('fixes', {}):
        one(key, 'read committed', fix)
        if srv.kind == 'mysql': one(key, 'repeatable read', fix)
res['scenarios'] = {k: {'title': S[k]['title'], 'story': S[k]['story'], 'fixes': S[k].get('fixes', {})} for k in ORDER}
os.makedirs(OUT, exist_ok=True)
json.dump(res, open(os.path.join(OUT, f'matrix_{which}.json'), 'w'), indent=1)
srv.stop()

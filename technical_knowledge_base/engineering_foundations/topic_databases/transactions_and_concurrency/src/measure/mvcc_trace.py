"""The lost update three ways, recorded with every row version on the heap page and each session's snapshot.
PostgreSQL 16.15 from conda-forge (it ships pageinspect; the pgserver wheel does not), in a scratch prefix PGX_ENV.
Run from a scratch directory:
  TX_SCRATCH=$PWD uv run --no-project --python 3.12 --with pgserver --with 'psycopg[binary]' python <repo>/.../src/measure/mvcc_trace.py
Writes src/inputs/mvcc_trace.json: per step, the statement, what it returned (including the snapshot it ran with:
pg_current_snapshot() is read in the same statement, so it is the statement's own snapshot), and every tuple on page 0
of credits (lp, xmin, xmax, ctid, decoded balance) with the commit status of xmin and xmax."""
import os, sys, json, struct, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from txharness import *

HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'inputs', 'mvcc_trace.json')
E = os.environ.get('PGX_ENV', os.path.join(SCR, 'pgenv'))
srv = PG(os.path.join(E, 'bin'), os.path.join(SCR, 'pgx_mvcc'), '55734')
print(srv.start()); srv.ensure_db()
RESET = ['CREATE EXTENSION IF NOT EXISTS pageinspect', 'DROP TABLE IF EXISTS credits',
         'CREATE TABLE credits (user_id int PRIMARY KEY, balance int NOT NULL CHECK (balance >= 0))',
         'INSERT INTO credits VALUES (7, 30)', 'VACUUM FREEZE credits']   # frozen: the starting version is visible to everyone

def probe(admin, i):
    rows = admin.execute("""SELECT lp, t_xmin::text, t_xmax::text, t_ctid::text, t_data, lp_flags,
        CASE WHEN t_xmin::text::bigint >= 3 THEN pg_xact_status(t_xmin::text::xid8) END,
        CASE WHEN t_xmax::text::bigint >= 3 THEN pg_xact_status(t_xmax::text::xid8) END, t_infomask
        FROM heap_page_items(get_raw_page('credits', 0)) ORDER BY lp""").fetchall()
    out = []
    for lp, xmin, xmax, ctid, data, flags, smin, smax, mask in rows:
        if data is None: out.append({'lp': lp, 'flags': flags, 'dead': True}); continue
        uid, bal = struct.unpack('<ii', bytes(data)[:8])
        out.append({'lp': lp, 'xmin': int(xmin), 'xmax': int(xmax), 'ctid': ctid, 'balance': bal,
                    'xmin_status': smin or 'frozen', 'xmax_status': smax if int(xmax) else None,
                    'xmax_is_lock_only': bool(mask & 0x0080)})   # HEAP_XMAX_LOCK_ONLY
    return out

SNAP = ", pg_current_snapshot()::text AS snap, pg_current_xact_id_if_assigned()::text AS xid"
READ = 'SELECT balance' + SNAP + ' FROM credits WHERE user_id = 7'
def upd(key, d):
    return lambda n: ('UPDATE credits SET balance = %d WHERE user_id = 7 RETURNING balance' % (n[key]['rows'][0][0] - d)) + SNAP
def seq(level, lock=False, retry=False):
    r = READ + (' FOR UPDATE' if lock else '')
    s = [dict(s='A', begin=level), dict(s='A', sql=r, key='a', note='A reads the balance'),
         dict(s='B', begin=level), dict(s='B', sql=r, key='b', note='B reads the balance'),
         dict(s='A', sql=upd('a', 10), key='au', note='A writes what it read minus 10'),
         dict(s='A', sql='COMMIT', key='ac'),
         dict(s='B', sql=upd('b', 5), key='bu', note='B writes what it read minus 5'),
         dict(s='B', sql='COMMIT', key='bc')]
    if retry:
        s += [dict(s='B', begin=level, note='retry: the whole transaction again'), dict(s='B', sql=r, key='b2'),
              dict(s='B', sql=upd('b2', 5), key='bu2'), dict(s='B', sql='COMMIT', key='bc2')]
    return s
res = {'date': datetime.date.today().isoformat(), 'version': srv.version(), 'runs': {}}
for name, steps in (('naive', seq('read committed')), ('for_update', seq('read committed', lock=True)),
                    ('serializable', seq('serializable', retry=True))):
    tr = run_trace(srv, ['A', 'B'], steps, RESET, {'balance': 'SELECT balance FROM credits WHERE user_id = 7'}, probe=probe)
    tr['start'] = None
    res['runs'][name] = tr
    print(name, tr['final'], [ (s['i'], [(f.get('rows'), f.get('code')) for f in s['finished']]) for s in tr['steps']])
json.dump(res, open(OUT, 'w'), indent=1)
srv.stop()

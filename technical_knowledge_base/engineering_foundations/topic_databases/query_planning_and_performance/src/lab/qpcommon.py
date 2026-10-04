"""Shared helpers for this page's measurements: the root's chat dataset (100k users, 1M chats, 10M messages)
in a local PostgreSQL 16.2, from the pgserver wheel's binaries copied to QPP_ROOT/pginstall with three contrib
extensions built against them (pg_stat_statements and auto_explain from the 16.2 source, pg_hint_plan REL16_1_6_1).
The data directory is an APFS clone of the root's (src/plan/gen.py output) at QPP_ROOT/pgdata; nothing here is in the repo.
Same approach as ../../src/plan/pgcommon.py, on its own port so the root's copy is never touched.
"""
import os, subprocess, json
ROOT = os.path.abspath(os.environ.get('QPP_ROOT', 'qpp'))
B = os.path.join(ROOT, 'pginstall', 'bin')
DATA = os.path.join(ROOT, 'pgdata', 'data'); PORT = '54361'

def sh(*a, **k):
    return subprocess.run(list(a), capture_output=True, text=True, **k)

def start(extra=''):
    o = f"-p {PORT} -k '' -h 127.0.0.1 -c shared_preload_libraries=pg_stat_statements,auto_explain,pg_hint_plan {extra}"
    r = sh(f'{B}/pg_ctl', '-D', DATA, '-o', o, '-l', ROOT + '/log', '-w', 'start')
    return r.stdout + r.stderr

def stop():
    return sh(f'{B}/pg_ctl', '-D', DATA, '-m', 'fast', '-w', 'stop').stdout

def psql(sql, db='chat', tuples=True, timeout=None):
    args = [f'{B}/psql', '-h', '127.0.0.1', '-p', PORT, '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-X', '-q']
    if tuples: args.append('-At')
    r = sh(*args, '-c', sql, db, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(r.stderr + '\nSQL: ' + sql[:400])
    return r.stdout.strip()

def explain(sql, db='chat', pre='', opts='ANALYZE, BUFFERS, SETTINGS'):
    """EXPLAIN (opts, FORMAT JSON) of sql; pre runs first in the same session."""
    return json.loads(psql(pre + f'EXPLAIN ({opts}, FORMAT JSON) ' + sql, db))[0]

def explain_text(sql, db='chat', pre='', opts='ANALYZE, BUFFERS'):
    return psql(pre + f'EXPLAIN ({opts}) ' + sql, db)

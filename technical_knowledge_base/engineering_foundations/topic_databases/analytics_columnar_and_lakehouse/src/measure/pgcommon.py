"""Shared helpers for this page's measurements: a local PostgreSQL 16 from the pgserver wheel (nothing installed system-wide).
Copied from the root's src/plan/pgcommon.py; the port comes from AN_PORT (default 54373) and the start refuses a port already in use,
because other pages' agents run their own servers on this machine. The data directory lives outside the repo (AN_DATA).
Run with: uv run --no-project --python 3.12 --with pgserver --with duckdb --with pyarrow python <script>
"""
import os, subprocess, json, socket
import pgserver
B = os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin')
ROOT = os.path.abspath(os.environ.get('AN_DATA', 'an_data'))
DATA = os.path.join(ROOT, 'pg'); PORT = os.environ.get('AN_PORT', '54373')

def sh(*a, **k):
    return subprocess.run(list(a), capture_output=True, text=True, **k)

def port_in_use(p):
    s = socket.socket(); s.settimeout(0.5)
    try:
        return s.connect_ex(('127.0.0.1', int(p))) == 0
    finally:
        s.close()

def running():
    return os.path.exists(os.path.join(DATA, 'postmaster.pid'))

def start(extra=''):
    if running():
        return 'already running (own data dir)'
    if port_in_use(PORT):
        raise SystemExit(f'port {PORT} is in use by another process: refusing to start; set AN_PORT to a free port')
    r = sh(f'{B}/pg_ctl', '-D', DATA, '-o', f"-p {PORT} -k '' -h 127.0.0.1 {extra}", '-l', ROOT + '/pg.log', '-w', 'start')
    return r.stdout + r.stderr

def stop():
    return sh(f'{B}/pg_ctl', '-D', DATA, '-m', 'fast', '-w', 'stop').stdout

def psql(sql, db='chat', tuples=True):
    args = [f'{B}/psql', '-h', '127.0.0.1', '-p', PORT, '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-X', '-q']
    if tuples: args.append('-At')
    r = sh(*args, '-c', sql, db)
    if r.returncode != 0:
        raise RuntimeError(r.stderr + '\nSQL: ' + sql[:400])
    return r.stdout.strip()

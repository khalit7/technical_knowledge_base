"""Shared helpers: a local PostgreSQL from the pgserver wheel (nothing installed system-wide).
The data directory lives outside the repo (env QP_DATA, default ./qp_pgdata next to where you run it); it is several GB.
Run every script with: uv run --no-project --python 3.12 --with pgserver --with duckdb python <script>
"""
import os, subprocess, json
import pgserver
B = os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin')
ROOT = os.path.abspath(os.environ.get('QP_DATA', 'qp_pgdata'))
DATA = os.path.join(ROOT, 'data'); PORT = '54341'; SOCK = ROOT

def sh(*a, **k):
    return subprocess.run(list(a), capture_output=True, text=True, **k)

def start(extra=''):
    r = sh(f'{B}/pg_ctl', '-D', DATA, '-o', f"-p {PORT} -k '' -h 127.0.0.1 {extra}", '-l', ROOT + '/log', '-w', 'start')
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

def explain(sql, db='chat', pre=''):
    """EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) of sql; pre is run first in the same session (SET ...)."""
    out = psql(pre + 'EXPLAIN (ANALYZE, BUFFERS, SETTINGS, FORMAT JSON) ' + sql, db)
    # psql prints the SET command tags only without -q; with -q only the JSON comes back
    return json.loads(out)[0]

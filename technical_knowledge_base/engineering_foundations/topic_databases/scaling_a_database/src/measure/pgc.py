"""Shared helpers for this page's measurements: local PostgreSQL servers from the pgserver wheel (nothing installed system-wide).
Every server's data directory lives outside the repo under SCL_DATA (default ./scl next to where you run it).
Ports are given per server; check_free() refuses a port another program already listens on.
Run scripts with: uv run --no-project --python 3.12 --with pgserver --with psycopg[binary] python <script>
"""
import os, subprocess, json, socket
import pgserver
B = os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin')
ROOT = os.path.abspath(os.environ.get('SCL_DATA', 'scl'))
HERE = os.path.dirname(os.path.abspath(__file__))
INPUTS = os.path.join(os.path.dirname(HERE), 'inputs')

def sh(*a, **k):
    return subprocess.run(list(a), capture_output=True, text=True, **k)

def in_use(port):
    s = socket.socket(); s.settimeout(0.3)
    try:
        return s.connect_ex(('127.0.0.1', int(port))) == 0
    finally:
        s.close()

class PG:
    def __init__(self, name, port):
        self.name, self.port = name, str(port)
        self.dir = os.path.join(ROOT, name); self.data = os.path.join(self.dir, 'data')
    def init(self, conf=''):
        os.makedirs(self.dir, exist_ok=True)
        if not os.path.exists(self.data):
            r = sh(f'{B}/initdb', '-D', self.data, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C')
            if r.returncode: raise RuntimeError(r.stderr)
            if conf:
                open(os.path.join(self.data, 'postgresql.conf'), 'a').write('\n' + conf + '\n')
    def running(self):
        return sh(f'{B}/pg_ctl', '-D', self.data, 'status').returncode == 0
    def start(self):
        if self.running(): return 'already running'
        if in_use(self.port): raise RuntimeError(f'port {self.port} is in use by another program; refusing')
        r = sh(f'{B}/pg_ctl', '-D', self.data, '-o', f"-p {self.port} -k '' -h 127.0.0.1", '-l', self.dir + '/log', '-w', 'start')
        return r.stdout + r.stderr
    def stop(self):
        return sh(f'{B}/pg_ctl', '-D', self.data, '-m', 'fast', '-w', 'stop').stdout
    def psql(self, sql, db='chat', tuples=True):
        args = [f'{B}/psql', '-h', '127.0.0.1', '-p', self.port, '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-X', '-q']
        if tuples: args.append('-At')
        r = sh(*args, '-c', sql, db)
        if r.returncode != 0: raise RuntimeError(r.stderr + '\nSQL: ' + sql[:400])
        return r.stdout.strip()
    def dsn(self, db='chat'):
        return f'host=127.0.0.1 port={self.port} user=postgres dbname={db}'

def save(name, obj):
    p = os.path.join(INPUTS, name); json.dump(obj, open(p, 'w'), indent=1); return p

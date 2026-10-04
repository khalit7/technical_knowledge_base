"""Shared helpers for the caching page's measurements.
Everything runs from a scratch directory (env CA_SCRATCH) outside the repo; nothing is installed system-wide.
  Redis 8.8.0 (conda-forge, micromamba): the binary installed for the NoSQL page, env CA_REDIS (path to redis-server)
  PostgreSQL 16.2 from the pgserver wheel, on an APFS clone of the root's 10M-message chat database (env CA_PG, a data dir)
Run each script with:
  CA_SCRATCH=$PWD uv run --no-project --python 3.12 --with redis --with numpy --with pgserver --with 'psycopg[binary]' python <script>
Other agents run local servers on this machine: every server here gets a port checked free first; ports in use are refused.
"""
import os, socket, json, time, datetime, subprocess, platform
S = os.path.abspath(os.environ.get('CA_SCRATCH', '.'))
HERE = os.path.dirname(os.path.abspath(__file__))
INPUTS = os.path.join(os.path.dirname(HERE), 'inputs')
REDIS = os.environ.get('CA_REDIS', os.path.join(os.path.dirname(S), 'nosql', 'env', 'bin', 'redis-server'))


def port_in_use(p):
    s = socket.socket(); s.settimeout(0.3)
    try:
        return s.connect_ex(('127.0.0.1', p)) == 0
    finally:
        s.close()


def free_port(start, span=200):
    """First port from start that nothing listens on and that we can bind; ports in use are refused."""
    for p in range(start, start + span):
        if port_in_use(p):
            print(f'port {p} in use: refused', flush=True); continue
        s = socket.socket()
        try:
            s.bind(('127.0.0.1', p)); s.close(); return p
        except OSError:
            s.close(); print(f'port {p} not bindable: refused', flush=True)
    raise RuntimeError('no free port')


def wait_port(p, timeout=60):
    t = time.time()
    while time.time() - t < timeout:
        if port_in_use(p): return True
        time.sleep(0.2)
    raise RuntimeError(f'server on {p} did not start')


def start_redis(start=46379, extra=()):
    """A throwaway Redis with no persistence; returns (process, port)."""
    p = free_port(start)
    d = os.path.join(S, f'redis_{p}'); os.makedirs(d, exist_ok=True)
    proc = subprocess.Popen([REDIS, '--port', str(p), '--bind', '127.0.0.1', '--save', '', '--appendonly', 'no',
                             '--dir', d, *extra], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    wait_port(p)
    return proc, p


def machine():
    return {'date': datetime.date.today().isoformat(), 'machine': 'Apple M1 Pro laptop (16 GB), macOS', 'python': platform.python_version()}


def save(name, obj):
    os.makedirs(INPUTS, exist_ok=True)
    with open(os.path.join(INPUTS, name), 'w') as f:
        json.dump(obj, f, indent=1)
    print('wrote', name, flush=True)

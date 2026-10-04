"""Shared helpers for the NoSQL in practice measurements.
Everything runs from a scratch directory (env NQ_SCRATCH) holding the servers installed there:
  env/      micromamba env: redis-server 8.8.0, mongodb 8.0.23, openjdk 17 (conda-forge)
  jdk25/    micromamba env: openjdk 25 (Neo4j needs 21 or 25)
  apache-cassandra-5.0.9/, ddb/ (DynamoDB Local 3.3.1), neo4j-community-2026.09.0/
Nothing is installed system-wide. Python clients come from uv:
  uv run --no-project --python 3.12 --with pgserver --with redis --with pymongo --with boto3 --with cassandra-driver \
     --with duckdb --with 'psycopg[binary]' --with neo4j --with kuzu python <script>
Other agents run local servers on this machine: every server here gets a port that is checked free first;
a port that is in use is refused and the next one tried.
"""
import os, socket, json, time, datetime, subprocess, platform
S = os.path.abspath(os.environ.get('NQ_SCRATCH', '.'))
HERE = os.path.dirname(os.path.abspath(__file__))
INPUTS = os.path.join(os.path.dirname(HERE), 'inputs')

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

def wait_port(p, timeout=180):
    t = time.time()
    while time.time() - t < timeout:
        if port_in_use(p): return True
        time.sleep(0.5)
    raise RuntimeError(f'server on {p} did not start')

def sh(*a, **k):
    return subprocess.run(list(a), capture_output=True, text=True, **k)

def machine():
    return {'date': datetime.date.today().isoformat(), 'machine': 'Apple M1 Pro laptop (16 GB), macOS', 'python': platform.python_version()}

def save(name, obj):
    os.makedirs(INPUTS, exist_ok=True)
    with open(os.path.join(INPUTS, name), 'w') as f:
        json.dump(obj, f, indent=1)
    print('wrote', name, flush=True)

def timeit(f, n):
    t = time.perf_counter()
    for _ in range(n): f()
    return time.perf_counter() - t

def pct(xs, q):
    xs = sorted(xs); return xs[min(len(xs) - 1, int(q * len(xs)))]

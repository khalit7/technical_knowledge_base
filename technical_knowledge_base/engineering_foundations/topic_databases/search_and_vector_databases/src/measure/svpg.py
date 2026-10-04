"""Shared helpers for the search and vector page's measurements.
PostgreSQL 18.6 built from source into a scratch folder (as the storage sibling did), plus pgvector 0.8.7 built with PGXS:
  curl -L -o pgvector-0.8.7.tar.gz https://github.com/pgvector/pgvector/archive/refs/tags/v0.8.7.tar.gz
  tar xzf pgvector-0.8.7.tar.gz && cd pgvector-0.8.7
  make PG_CONFIG=$SV_PG/bin/pg_config PG_SYSROOT=$(xcrun --show-sdk-path) && make ... install
Environment: SV_PG (the install prefix), SV_WORK (embeddings from embed.py and the data directory).
Client: psycopg 3 with the pgvector Python adapter (uv run --no-project --with 'psycopg[binary]' --with pgvector --with numpy).
"""
import os, subprocess, json, time, statistics
import numpy as np
import psycopg
from pgvector.psycopg import register_vector
PG = os.environ.get('SV_PG', '')
WORK = os.path.abspath(os.environ.get('SV_WORK', 'sv_work'))
DATA = WORK + '/pgdata'
PORT = 54791
# Server settings for every run (an M1 Pro laptop, 10 cores, 16 GB RAM). shared_buffers large enough to hold the
# table and every index, so latencies are in-memory latencies (said on the page).
CONF = """
shared_buffers = '4GB'
maintenance_work_mem = '2GB'
work_mem = '64MB'
max_parallel_maintenance_workers = 3
max_parallel_workers_per_gather = 2
max_wal_size = '8GB'
checkpoint_timeout = '30min'
jit = off
"""
def sh(*a):
    return subprocess.run(list(a), capture_output=True, text=True)
def init(fresh=False):
    if fresh and os.path.exists(DATA):
        stop(); sh('rm', '-rf', DATA)
    if not os.path.exists(DATA):
        r = sh(f'{PG}/bin/initdb', '-D', DATA, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C')
        if r.returncode: raise RuntimeError(r.stderr)
        open(DATA + '/postgresql.auto.conf', 'a').write(CONF)
def start():
    r = sh(f'{PG}/bin/pg_ctl', '-D', DATA, '-o', f"-p {PORT} -k '' -h 127.0.0.1", '-l', WORK + '/pg.log', '-w', 'start')
    return r.stdout + r.stderr
def stop():
    return sh(f'{PG}/bin/pg_ctl', '-D', DATA, '-m', 'fast', '-w', 'stop').stdout
def connect(db='sv'):
    c = psycopg.connect(host='127.0.0.1', port=PORT, user='postgres', dbname=db, autocommit=True)
    try: register_vector(c)
    except Exception: pass
    return c
def ensure_db():
    c = psycopg.connect(host='127.0.0.1', port=PORT, user='postgres', dbname='postgres', autocommit=True)
    if not c.execute("select 1 from pg_database where datname='sv'").fetchone():
        c.execute('create database sv')
    c.close()
    c = psycopg.connect(host='127.0.0.1', port=PORT, user='postgres', dbname='sv', autocommit=True)
    c.execute('create extension if not exists vector'); c.close()
def timeit(f, n_warm=0):
    t = time.perf_counter(); r = f(); return time.perf_counter() - t, r
def pct(xs, p):
    xs = sorted(xs); k = (len(xs) - 1) * p / 100; f = int(k); c = min(f + 1, len(xs) - 1)
    return xs[f] + (xs[c] - xs[f]) * (k - f)
def lat_summary(ms):
    return {'p50_ms': round(pct(ms, 50), 3), 'p95_ms': round(pct(ms, 95), 3), 'mean_ms': round(statistics.mean(ms), 3), 'n': len(ms)}
def size(c, rel):
    return c.execute('select pg_relation_size(%s::regclass)', (rel,)).fetchone()[0]
def save(obj, name):
    here = os.path.dirname(os.path.abspath(__file__))
    p = os.path.join(here, '..', 'inputs', name)
    json.dump(obj, open(p, 'w'), indent=1, default=str); print('wrote', p, flush=True)
def load_emb(name):
    E = np.load(f'{WORK}/{name}_docs.npy'); Q = np.load(f'{WORK}/{name}_queries.npy')
    meta = json.load(open(f'{WORK}/{name}_meta.json'))
    return E, Q, meta

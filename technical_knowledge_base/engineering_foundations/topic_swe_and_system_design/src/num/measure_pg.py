"""Local PostgreSQL measurements with pgbench (PostgreSQL binaries from the pgserver wheel, nothing installed system-wide).
Run: uv run --no-project --python 3.12 --with pgserver python measure_pg.py  (--no-project keeps the repo .venv untouched)   -> inputs/pg_local.json
Tests (scale 10 = 1M accounts rows, 15 s each, TCP loopback so a network stack is in the path):
  select-only, 1 client: latency of one indexed primary-key lookup (pgbench -S)
  select-only, 8 clients: throughput on this laptop
  tpcb-like, 1 client: one write transaction (3 updates, 1 select, 1 insert, commit) with wal_sync_method default and fsync_writethrough (forces the drive to flush)"""
import os, re, json, subprocess, tempfile, datetime, platform, shutil
import pgserver
B = os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin')
d = tempfile.mkdtemp(prefix='pgnum'); data = os.path.join(d, 'data'); port = '54329'
def sh(*a, **k): return subprocess.run(list(a), capture_output=True, text=True, **k)
sh(f'{B}/initdb', '-D', data, '-U', 'postgres', '--auth=trust')
def start(extra=''):
    sh(f'{B}/pg_ctl', '-D', data, '-o', f'-p {port} -k {d} {extra}', '-l', d + '/log', '-w', 'start')
def stop(): sh(f'{B}/pg_ctl', '-D', data, '-m', 'fast', '-w', 'stop')
def bench(*args):
    r = sh(f'{B}/pgbench', '-h', '127.0.0.1', '-p', port, '-U', 'postgres', *args, 'postgres')
    o = r.stdout + r.stderr
    tps = float(re.search(r'tps = ([\d.]+)', o).group(1)); lat = float(re.search(r'latency average = ([\d.]+) ms', o).group(1))
    return {'tps': round(tps), 'latency_ms': lat}
start(); sh(f'{B}/pgbench', '-h', '127.0.0.1', '-p', port, '-U', 'postgres', '-i', '-s', '10', 'postgres')
wsm = sh(f'{B}/psql', '-h', '127.0.0.1', '-p', port, '-U', 'postgres', '-Atc', 'show wal_sync_method', 'postgres').stdout.strip()
ver = sh(f'{B}/psql', '-h', '127.0.0.1', '-p', port, '-U', 'postgres', '-Atc', 'show server_version', 'postgres').stdout.strip()
out = {'date': datetime.date.today().isoformat(), 'postgres': ver, 'machine': 'Apple M1 Pro laptop (10 cores, 16 GB), internal SSD, macOS ' + platform.mac_ver()[0] + ', TCP loopback',
       'select_only_1client': bench('-S', '-c', '1', '-T', '15'),
       'select_only_8clients': bench('-S', '-c', '8', '-j', '8', '-T', '15'),
       'tpcb_1client_default': dict(bench('-c', '1', '-T', '15'), wal_sync_method=wsm)}
stop(); start('-c wal_sync_method=fsync_writethrough')
out['tpcb_1client_writethrough'] = dict(bench('-c', '1', '-T', '15'), wal_sync_method='fsync_writethrough')
stop(); shutil.rmtree(d, ignore_errors=True)
os.makedirs('inputs', exist_ok=True); json.dump(out, open('inputs/pg_local.json', 'w'), indent=1); print(json.dumps(out, indent=1))

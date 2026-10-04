"""Check the old page's claim "a single modern Postgres node handles low tens of thousands of transactions per second".
pgbench tpcb-like write transactions (3 updates, 1 select, 1 insert, commit) at 1, 8 and 32 clients, scale 50 (5M account rows),
with the default wal_sync_method and with fsync_writethrough (forces the drive to really flush; macOS only).
PostgreSQL binaries from the pgserver wheel; nothing installed system-wide.
Run from the scratchpad:  uv run --no-project --python 3.12 --with pgserver python <this file> <out.json>
Same harness as topic_swe_and_system_design/src/num/measure_pg.py."""
import os, re, sys, json, subprocess, tempfile, datetime, platform, shutil
import pgserver
B = os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin')
d = tempfile.mkdtemp(prefix='pgtps'); data = os.path.join(d, 'data'); port = '54331'
def sh(*a): return subprocess.run(list(a), capture_output=True, text=True)
sh(f'{B}/initdb', '-D', data, '-U', 'postgres', '--auth=trust')
def start(extra=''):
    sh(f'{B}/pg_ctl', '-D', data, '-o', f'-p {port} -k {d} -c max_connections=100 -c shared_buffers=1GB {extra}', '-l', d + '/log', '-w', 'start')
def stop(): sh(f'{B}/pg_ctl', '-D', data, '-m', 'fast', '-w', 'stop')
def bench(c):
    r = sh(f'{B}/pgbench', '-h', '127.0.0.1', '-p', port, '-U', 'postgres', '-c', str(c), '-j', str(min(c, 8)), '-T', '20', 'postgres')
    o = r.stdout + r.stderr
    return {'clients': c, 'tps': round(float(re.search(r'tps = ([\d.]+)', o).group(1))),
            'latency_ms': float(re.search(r'latency average = ([\d.]+) ms', o).group(1))}
start(); sh(f'{B}/pgbench', '-h', '127.0.0.1', '-p', port, '-U', 'postgres', '-i', '-s', '50', 'postgres')
ver = sh(f'{B}/psql', '-h', '127.0.0.1', '-p', port, '-U', 'postgres', '-Atc', 'show server_version', 'postgres').stdout.strip()
wsm = sh(f'{B}/psql', '-h', '127.0.0.1', '-p', port, '-U', 'postgres', '-Atc', 'show wal_sync_method', 'postgres').stdout.strip()
out = {'date': datetime.date.today().isoformat(), 'postgres': ver, 'scale': 50,
       'machine': 'Apple M1 Pro laptop (10 cores, 16 GB), internal SSD, macOS ' + platform.mac_ver()[0] + ', TCP loopback, client on the same machine',
       'default_sync': {'wal_sync_method': wsm, 'runs': [bench(c) for c in (1, 8, 32)]}}
stop(); start('-c wal_sync_method=fsync_writethrough')
out['writethrough'] = {'wal_sync_method': 'fsync_writethrough', 'runs': [bench(c) for c in (1, 8, 32)]}
stop(); shutil.rmtree(d, ignore_errors=True)
json.dump(out, open(sys.argv[1], 'w'), indent=1); print(json.dumps(out, indent=1))

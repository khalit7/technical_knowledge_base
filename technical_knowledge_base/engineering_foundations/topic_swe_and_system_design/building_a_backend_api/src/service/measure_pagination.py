"""Offset against keyset (cursor) pagination on a real local PostgreSQL (binaries from the pgserver wheel).
Run from this folder (about 2 minutes):
  uv run --no-project --python 3.12 --with pgserver python measure_pagination.py   -> ../inputs/pagination_pg.json
Table: 1,000,000 messages of one chat-like shape, index on (created_at, id). For each depth (rows skipped),
time one page of 20 rows both ways with EXPLAIN (ANALYZE, BUFFERS): server execution time, median of 7 runs, warm cache."""
import os, re, json, subprocess, tempfile, datetime, platform, shutil, statistics
import pgserver
B = os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin')
d = tempfile.mkdtemp(prefix='pgpage'); data = os.path.join(d, 'data'); port = '54331'
def sh(*a): return subprocess.run(list(a), capture_output=True, text=True)
def psql(q):
    r = sh(f'{B}/psql', '-h', '127.0.0.1', '-p', port, '-U', 'postgres', '-Atc', q, 'postgres')
    if r.returncode: raise SystemExit(r.stderr)
    return r.stdout
sh(f'{B}/initdb', '-D', data, '-U', 'postgres', '--auth=trust')
sh(f'{B}/pg_ctl', '-D', data, '-o', f'-p {port} -k {d}', '-l', d + '/log', '-w', 'start')
try:
    N = 1_000_000
    psql(f"""create table messages(id bigint primary key, created_at timestamptz not null, body text not null);
      insert into messages select g, timestamptz '2026-01-01' + (g * interval '1 second'), repeat('x', 200) from generate_series(1, {N}) g;
      create index on messages(created_at, id);""")
    psql('vacuum analyze messages')
    ver = psql('show server_version').strip()
    def run(q):
        ts, bufs = [], None
        for _ in range(7):
            o = psql('explain (analyze, buffers) ' + q)
            ts.append(float(re.search(r'Execution Time: ([\d.]+) ms', o).group(1)))
            m = re.search(r'Buffers: shared hit=(\d+)(?: read=(\d+))?', o); bufs = int(m.group(1)) + int(m.group(2) or 0)
        nodes = [l.strip().lstrip('-> ').split('  (')[0] for l in o.splitlines() if '(cost=' in l]
        return {'ms': round(statistics.median(ts), 3), 'buffers': bufs, 'plan': nodes}
    rows = []
    for depth in [0, 1_000, 10_000, 100_000, 500_000, 999_980]:
        # the cursor is the (created_at, id) of the last row of the previous page
        c = psql(f"select created_at, id from messages order by created_at, id offset {max(depth - 1, 0)} limit 1").strip().split('|')
        off = run(f"select id, created_at, body from messages order by created_at, id limit 20 offset {depth}")
        ks = run(f"select id, created_at, body from messages where (created_at, id) > ('{c[0]}', {c[1]}) order by created_at, id limit 20") if depth else run("select id, created_at, body from messages order by created_at, id limit 20")
        rows.append({'depth': depth, 'offset': off, 'keyset': ks}); print(rows[-1], flush=True)
    plan_off = psql("explain select id from messages order by created_at, id limit 20 offset 500000")
    out = {'date': datetime.date.today().isoformat(), 'postgres': ver, 'rows': N, 'page': 20,
           'machine': 'Apple M1 Pro laptop (10 cores, 16 GB), macOS ' + platform.mac_ver()[0] + ', warm cache, TCP loopback',
           'method': 'EXPLAIN (ANALYZE, BUFFERS) execution time, median of 7 runs', 'results': rows, 'plan_offset_500k': plan_off}
finally:
    sh(f'{B}/pg_ctl', '-D', data, '-m', 'fast', '-w', 'stop'); shutil.rmtree(d, ignore_errors=True)
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'inputs', 'pagination_pg.json'), 'w'), indent=1)
print(json.dumps(out, indent=1))

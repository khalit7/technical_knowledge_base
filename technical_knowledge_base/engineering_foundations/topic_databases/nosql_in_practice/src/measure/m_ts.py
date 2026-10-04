"""Time series on plain tools: PostgreSQL 16.2 (one table against native daily partitions, BRIN against B-tree, a rollup table)
and DuckDB 1.5.6 over Parquet. TimescaleDB is not packaged for this machine (no conda-forge osx-arm64 build), so its two core ideas,
time partitions (hypertable chunks) and rollups (continuous aggregates), are measured with the Postgres features they build on.
Data: one row per chat request for 30 days: 4 models, 8 servers, about 2 requests a second (5,184,000 rows), deterministic.
About 5 minutes. Writes inputs/ts.json.
"""
import os, sys, time, json, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
import pgserver, duckdb

res = machine()
B = os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin'); root = os.path.join(S, 'ts_pg'); D = root + '/data'
DAYS, PER_DAY = 30, 172_800

def main():
    port = free_port(56620); res['pg_port'] = port
    def psql(sql, db='ts'):
        r = sh(f'{B}/psql', '-h', '127.0.0.1', '-p', str(port), '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-X', '-q', '-At', '-c', sql, db)
        if r.returncode: raise RuntimeError(r.stderr + sql[:300])
        return r.stdout.strip()
    def timed(sql):
        a = psql('SELECT pg_current_wal_insert_lsn()'); t = time.time(); psql(sql); dt = time.time() - t
        b = psql('SELECT pg_current_wal_insert_lsn()')
        return {'s': round(dt, 2), 'wal_bytes': int(psql(f"SELECT pg_wal_lsn_diff('{b}', '{a}')"))}
    def ms(sql, n=7):
        for _ in range(2): psql('EXPLAIN ANALYZE ' + sql)
        xs = [json.loads(psql('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + sql))[0] for _ in range(n)]
        p = xs[-1]['Plan']
        return {'ms': round(pct([x['Execution Time'] for x in xs], .5), 2), 'buffers': p.get('Shared Hit Blocks', 0) + p.get('Shared Read Blocks', 0)}
    shutil.rmtree(root, ignore_errors=True); os.makedirs(root)
    sh(f'{B}/initdb', '-D', D, '-U', 'postgres', '--auth=trust', '-E', 'UTF8', '--locale=C')
    sh(f'{B}/pg_ctl', '-D', D, '-o', f"-p {port} -k '' -h 127.0.0.1 -c max_wal_size=8GB", '-l', root + '/log', '-w', 'start')
    try:
        psql('CREATE DATABASE ts', 'postgres')
        gen = f'''SELECT timestamptz '2025-09-01 00:00+00' + i * interval '500 milliseconds',
  'gpu-' || (i % 8), (ARRAY['mini','standard','large','reasoning'])[1 + (i * 7 % 4)],
  round((200 + 800 * random()^3)::numeric, 1), 20 + floor(1500 * random()^2)::int
FROM generate_series(0, {DAYS * PER_DAY - 1}) i'''
        cols = 'ts timestamptz NOT NULL, host text NOT NULL, model text NOT NULL, latency_ms numeric NOT NULL, tokens int NOT NULL'
        r = {}
        psql(f'CREATE TABLE plain({cols}); CREATE INDEX plain_ts ON plain(ts);')
        r['insert_plain'] = timed(f'SELECT setseed(0.5); INSERT INTO plain {gen}')
        parts = ' '.join(f"CREATE TABLE part_{d:02d} PARTITION OF part FOR VALUES FROM ('2025-09-01 00:00+00'::timestamptz + interval '{d} days') TO ('2025-09-01 00:00+00'::timestamptz + interval '{d + 1} days');" for d in range(DAYS))
        psql(f'CREATE TABLE part({cols}) PARTITION BY RANGE (ts); {parts} CREATE INDEX part_ts ON part(ts);')
        r['insert_part'] = timed(f'SELECT setseed(0.5); INSERT INTO part {gen}')
        psql('VACUUM ANALYZE')
        r['rows'] = int(psql('SELECT count(*) FROM plain'))
        r['size'] = {'plain_heap': int(psql("SELECT pg_relation_size('plain')")), 'btree_ts': int(psql("SELECT pg_relation_size('plain_ts')"))}
        psql('CREATE INDEX plain_brin ON plain USING brin(ts)'); r['size']['brin_ts'] = int(psql("SELECT pg_relation_size('plain_brin')"))
        psql('DROP INDEX plain_brin')
        last_hour = "ts >= '2025-09-30 23:00+00' AND ts < '2025-10-01 00:00+00'"
        q = lambda t: f"SELECT date_trunc('minute', ts) m, model, count(*), avg(latency_ms) FROM {t} WHERE {last_hour} GROUP BY 1, 2"
        r['last_hour'] = {'plain': ms(q('plain')), 'part': ms(q('part'))}
        r['last_hour_plan_part'] = psql('EXPLAIN (COSTS OFF) ' + q('part'))
        # 30-day chart: raw against a one-minute rollup (what a continuous aggregate maintains)
        chart = "SELECT date_trunc('hour', ts) h, model, sum(tokens) FROM plain GROUP BY 1, 2"
        r['chart_raw'] = ms(chart, 3)
        t = time.time(); psql("CREATE TABLE rollup_1m AS SELECT date_trunc('minute', ts) m, model, count(*) n, sum(tokens) tokens, sum(latency_ms) lat_sum, max(latency_ms) lat_max FROM plain GROUP BY 1, 2; ANALYZE rollup_1m")
        r['rollup_build_s'] = round(time.time() - t, 1); r['rollup_rows'] = int(psql('SELECT count(*) FROM rollup_1m'))
        r['size']['rollup'] = int(psql("SELECT pg_total_relation_size('rollup_1m')"))
        r['chart_rollup'] = ms("SELECT date_trunc('hour', m) h, model, sum(tokens) FROM rollup_1m GROUP BY 1, 2", 5)
        r['same_answer'] = psql(f"SELECT count(*) FROM (({chart}) EXCEPT (SELECT date_trunc('hour', m), model, sum(tokens) FROM rollup_1m GROUP BY 1, 2)) x") == '0'
        # retention: delete the oldest 7 days
        r['retention_delete'] = timed("DELETE FROM plain WHERE ts < '2025-09-08 00:00+00'")
        r['size_after_delete'] = int(psql("SELECT pg_relation_size('plain')"))
        r['retention_drop'] = timed(' '.join(f'DROP TABLE part_{d:02d};' for d in range(7)))
        r['part_rows_after'] = int(psql('SELECT count(*) FROM part')); r['plain_rows_after'] = int(psql('SELECT count(*) FROM plain'))
        r['vacuum_after_delete'] = timed('VACUUM plain')
        r['size_after_vacuum'] = int(psql("SELECT pg_relation_size('plain')"))
        # export the same rows to Parquet for DuckDB
        psql(f"COPY (SELECT * FROM part ORDER BY ts) TO '{root}/m.csv' WITH (FORMAT csv, HEADER)")
        res['pg'] = r; print(r, flush=True)
    finally:
        sh(f'{B}/pg_ctl', '-D', D, '-m', 'fast', '-w', 'stop')
    con = duckdb.connect()
    con.execute(f"COPY (SELECT * FROM read_csv_auto('{root}/m.csv') ORDER BY ts) TO '{root}/m.parquet' (FORMAT parquet, COMPRESSION zstd)")
    dk = {'version': duckdb.__version__, 'parquet_bytes': os.path.getsize(root + '/m.parquet'), 'rows': con.execute(f"SELECT count(*) FROM '{root}/m.parquet'").fetchone()[0]}
    def dms(sql, n=5):
        con.execute(sql).fetchall(); xs = []
        for _ in range(n):
            t = time.perf_counter(); con.execute(sql).fetchall(); xs.append((time.perf_counter() - t) * 1000)
        return round(pct(xs, .5), 1)
    dk['chart_ms'] = dms(f"SELECT time_bucket(INTERVAL 1 hour, ts) h, model, sum(tokens) FROM '{root}/m.parquet' GROUP BY 1, 2")
    dk['last_hour_ms'] = dms(f"SELECT time_bucket(INTERVAL 1 minute, ts) m, model, count(*), avg(latency_ms) FROM '{root}/m.parquet' WHERE ts >= TIMESTAMPTZ '2025-09-30 23:00:00+00' GROUP BY 1, 2")
    dk['pg_rows_same_window'] = res['pg']['part_rows_after']
    res['duckdb'] = dk; print(dk, flush=True)
    save('ts.json', res)

if __name__ == '__main__':
    main()

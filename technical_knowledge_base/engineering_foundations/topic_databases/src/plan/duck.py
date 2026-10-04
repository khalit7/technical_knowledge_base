"""Case 6, column-store side: the same 10M messages copied out of PostgreSQL into DuckDB (native table and a Parquet file),
then the same aggregate. Writes inputs/c6_duck.json.
Run after gen.py (server stopped):
  QP_DATA=/path/outside/repo uv run --no-project --python 3.12 --with pgserver --with duckdb python duck.py
"""
import os, sys, json, time, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pgcommon import *
import duckdb
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'inputs')
csv = os.path.join(ROOT, 'messages.csv'); ddb = os.path.join(ROOT, 'chat.duckdb'); pq = os.path.join(ROOT, 'messages.parquet')
Q = 'SELECT model, count(*), sum(tokens), round(avg(tokens), 1) FROM messages GROUP BY model ORDER BY model'
res = {'duckdb': duckdb.__version__}
if not os.path.exists(ddb):
    print(start())
    with open(csv, 'w') as f:
        subprocess.run([f'{B}/psql', '-h', '127.0.0.1', '-p', PORT, '-U', 'postgres', '-X', '-c',
                        "COPY (SELECT id, chat_id, role, model, tokens, content, to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD HH24:MI:SS') FROM messages ORDER BY id) TO STDOUT (FORMAT csv)", 'chat'], stdout=f, check=True)
    print(stop())
    con = duckdb.connect(ddb)
    t = time.time()
    con.execute(f"""CREATE TABLE messages AS SELECT * FROM read_csv('{csv}', header=false,
      columns={{'id':'BIGINT','chat_id':'BIGINT','role':'VARCHAR','model':'VARCHAR','tokens':'INTEGER','content':'VARCHAR','created_at':'TIMESTAMP'}})""")
    con.execute('CHECKPOINT'); res['load_seconds'] = round(time.time() - t, 1)
    con.execute(f"COPY messages TO '{pq}' (FORMAT parquet)")
    con.close(); os.remove(csv)
con = duckdb.connect(ddb, read_only=True)
res['rows'] = con.execute('SELECT count(*) FROM messages').fetchone()[0]
res['db_file_bytes'] = os.path.getsize(ddb); res['parquet_bytes'] = os.path.getsize(pq)
# Parquet stores each column chunk separately: the bytes this query needs are the model and tokens chunks
cols = con.execute(f"SELECT path_in_schema, sum(total_compressed_size), sum(total_uncompressed_size) FROM parquet_metadata('{pq}') GROUP BY 1 ORDER BY 2 DESC").fetchall()
res['parquet_columns'] = [{'column': c, 'compressed': int(a), 'uncompressed': int(b)} for c, a, b in cols]
res['result'] = [list(map(lambda v: float(v) if not isinstance(v, str) else v, r)) for r in con.execute(Q).fetchall()]
def bench(sql, threads):
    con.execute(f'SET threads = {threads}')
    con.execute(sql).fetchall()  # warm
    ts = []
    for _ in range(5):
        t = time.perf_counter(); con.execute(sql).fetchall(); ts.append(round((time.perf_counter() - t) * 1000, 2))
    return {'times_ms': ts, 'median_ms': sorted(ts)[2]}
res['native_threads10'] = bench(Q, 10); res['native_threads1'] = bench(Q, 1)
res['parquet_threads10'] = bench(Q.replace('FROM messages', f"FROM '{pq}'"), 10)
res['parquet_threads1'] = bench(Q.replace('FROM messages', f"FROM '{pq}'"), 1)
con.execute('SET threads = 10')
res['explain_analyze'] = con.execute('EXPLAIN ANALYZE ' + Q).fetchall()[0][1]
prof = os.path.join(ROOT, 'duck_profile.json')
con.execute("PRAGMA enable_profiling = 'json'"); con.execute(f"PRAGMA profiling_output = '{prof}'")
con.execute(Q).fetchall(); con.execute('PRAGMA disable_profiling')
res['profile'] = json.load(open(prof))
json.dump(res, open(os.path.join(OUT, 'c6_duck.json'), 'w'), indent=1)
print(json.dumps({k: v for k, v in res.items() if k != 'explain_analyze'}, indent=1)); print(res['explain_analyze'])

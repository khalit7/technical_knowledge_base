"""Two measurements on the default Parquet file (10M messages, as DuckDB writes it):
(1) Over HTTP, as on object storage: a local HTTP server that honours Range requests serves messages.parquet; DuckDB's httpfs
    extension runs three queries against the URL; every request is logged (range, bytes), so the page can show that a reader
    fetches the footer first and then only the column chunks of the row groups it needs.
(2) The small-files problem: the same rows as 1, 100, 1,000 and 10,000 files; bytes on disk, the same aggregate's median time,
    then the 10,000 files compacted back into one (what Iceberg rewrite_data_files or Delta OPTIMIZE do).
Writes inputs/remote_small.json. A few minutes.
  AN_DATA=/path/outside/repo uv run --no-project --python 3.12 --with duckdb==1.5.6 python remote_small.py
"""
import os, json, time, datetime, threading, shutil, glob, re
import duckdb
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'inputs')
ROOT = os.path.abspath(os.environ.get('AN_DATA', 'an_data')); DDB = os.path.join(ROOT, 'chat.duckdb'); PQ = os.path.join(ROOT, 'messages.parquet')
LOG = []
class H(SimpleHTTPRequestHandler):
    def __init__(s, *a, **k): super().__init__(*a, directory=ROOT, **k)
    def log_message(s, *a): pass
    def do_HEAD(s):
        p = os.path.join(ROOT, s.path.lstrip('/')); n = os.path.getsize(p)
        s.send_response(200); s.send_header('Content-Length', str(n)); s.send_header('Accept-Ranges', 'bytes'); s.end_headers()
        LOG.append({'method': 'HEAD', 'range': None, 'bytes': 0})
    def do_GET(s):
        p = os.path.join(ROOT, s.path.lstrip('/')); n = os.path.getsize(p); rg = s.headers.get('Range')
        a, b = 0, n - 1
        if rg:
            m = re.match(r'bytes=(\d*)-(\d*)', rg); a = int(m.group(1)) if m.group(1) else n - int(m.group(2)); b = int(m.group(2)) if m.group(1) and m.group(2) else n - 1
        with open(p, 'rb') as f:
            f.seek(a); data = f.read(b - a + 1)
        s.send_response(206 if rg else 200); s.send_header('Content-Length', str(len(data))); s.send_header('Accept-Ranges', 'bytes')
        if rg: s.send_header('Content-Range', f'bytes {a}-{b}/{n}')
        s.end_headers(); s.wfile.write(data)
        LOG.append({'method': 'GET', 'range': [a, b], 'bytes': len(data)})
res = {'duckdb': duckdb.__version__, 'date': datetime.date.today().isoformat(), 'file_bytes': os.path.getsize(PQ)}
srv = ThreadingHTTPServer(('127.0.0.1', 0), H); port = srv.server_address[1]
threading.Thread(target=srv.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{port}/messages.parquet'
con = duckdb.connect()
try:
    con.execute('INSTALL httpfs'); con.execute('LOAD httpfs'); res['httpfs'] = True
except Exception as e:
    res['httpfs'] = False; res['httpfs_error'] = str(e)[:300]
if res['httpfs']:
    con.execute('SET enable_http_metadata_cache = false')
    try: con.execute('SET enable_external_file_cache = false')
    except Exception: pass
    QS = {'case6': f"SELECT model, count(*), sum(tokens) FROM read_parquet('{url}') GROUP BY model ORDER BY model",
          'one_day': f"SELECT count(*), sum(tokens) FROM read_parquet('{url}') WHERE created_at >= TIMESTAMP '2026-03-01' AND created_at < TIMESTAMP '2026-03-02'",
          'one_row': f"SELECT * FROM read_parquet('{url}') WHERE id = 5000000"}
    res['http'] = {}
    for k, sql in QS.items():
        c2 = duckdb.connect(); c2.execute('LOAD httpfs'); c2.execute('SET enable_http_metadata_cache = false')
        try: c2.execute('SET enable_external_file_cache = false')
        except Exception: pass
        LOG.clear(); t = time.perf_counter(); rows = c2.execute(sql).fetchall(); dt = time.perf_counter() - t
        res['http'][k] = {'sql': sql.replace(url, 's3://bucket/messages.parquet'), 'ms': round(dt * 1000), 'requests': len(LOG), 'bytes': sum(x['bytes'] for x in LOG),
                          'log': LOG[:40], 'rows': [list(map(str, r)) for r in rows[:4]]}
        c2.close(); print(k, len(LOG), sum(x['bytes'] for x in LOG), flush=True)
srv.shutdown()
# small files
src = duckdb.connect(DDB, read_only=True); sf = {}
Q = "SELECT model, count(*), sum(tokens) FROM read_parquet('{g}') GROUP BY model ORDER BY model"
for nfiles in [1, 100, 1000, 10000]:
    d = os.path.join(ROOT, f'small_{nfiles}'); shutil.rmtree(d, ignore_errors=True); os.makedirs(d)
    t = time.time()
    if nfiles == 1:
        src.execute(f"COPY (SELECT * FROM messages ORDER BY id) TO '{d}/part.parquet' (FORMAT parquet)")
    else:
        per = 10_000_000 // nfiles
        src.execute(f"COPY (SELECT *, (id - 1) // {per} AS b FROM messages ORDER BY id) TO '{d}' (FORMAT parquet, PARTITION_BY (b), WRITE_PARTITION_COLUMNS false)")
    wsec = round(time.time() - t, 1)
    files = glob.glob(os.path.join(d, '**', '*.parquet'), recursive=True)
    g = os.path.join(d, '**', '*.parquet')
    c = duckdb.connect(); sql = Q.format(g=g); c.execute(sql).fetchall(); ts = []
    for _ in range(5):
        t0 = time.perf_counter(); c.execute(sql).fetchall(); ts.append(round((time.perf_counter() - t0) * 1000, 1))
    sf[nfiles] = {'files': len(files), 'bytes': sum(os.path.getsize(f) for f in files), 'write_s': wsec, 'ms': sorted(ts)[2], 'times_ms': ts}
    c.close(); print('small', nfiles, sf[nfiles], flush=True)
# compaction: 10,000 files rewritten as one
d = os.path.join(ROOT, 'small_10000'); t = time.time()
duckdb.connect().execute(f"COPY (SELECT * FROM read_parquet('{d}/**/*.parquet') ORDER BY id) TO '{ROOT}/compacted.parquet' (FORMAT parquet)")
res['compaction'] = {'from_files': sf[10000]['files'], 'seconds': round(time.time() - t, 1), 'bytes': os.path.getsize(f'{ROOT}/compacted.parquet')}
res['small_files'] = sf
for nfiles in [100, 1000, 10000]: shutil.rmtree(os.path.join(ROOT, f'small_{nfiles}'), ignore_errors=True)
json.dump(res, open(os.path.join(OUT, 'remote_small.json'), 'w'), indent=1)
print(json.dumps({k: v for k, v in res.items() if k != 'http'}, indent=1))

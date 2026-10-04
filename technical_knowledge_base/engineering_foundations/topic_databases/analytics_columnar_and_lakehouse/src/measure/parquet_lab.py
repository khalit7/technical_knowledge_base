"""Parquet lab measurements: the 10M chat messages written as Parquet under 4 sort orders x 3 row-group sizes x 3 compressions
(36 files, each written, measured and deleted), then 4 queries on each: file size, row groups, row groups the min/max
statistics let a reader skip (computed from the footer), bytes DuckDB actually read (counting filesystem) and the median
of 5 warm timings. Writes inputs/lab.json. About 10 minutes on an M1 Pro.
  AN_DATA=/path/outside/repo uv run --no-project --python 3.12 --with duckdb==1.5.6 --with pyarrow --with fsspec python parquet_lab.py
"""
import os, sys, json, time, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import duckdb, pyarrow.parquet as pq
from countfs import counted
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'inputs')
ROOT = os.path.abspath(os.environ.get('AN_DATA', 'an_data')); DDB = os.path.join(ROOT, 'chat.duckdb')
SORTS = {'time': 'id', 'model': 'model, id', 'chat': 'chat_id, id', 'random': 'hash(id)'}
RGS = [10_000, 100_000, 1_000_000]
COMPS = ['uncompressed', 'snappy', 'zstd']
DAY0, DAY1 = datetime.datetime(2026, 3, 1), datetime.datetime(2026, 3, 2)
CHAT = 424242
# name: (sql with {f}, filter columns and their range for pruning, columns read)
QUERIES = {
 'all':   ("SELECT model, count(*), sum(tokens) FROM read_parquet('{f}') GROUP BY model ORDER BY model", None, ['model', 'tokens']),
 'day':   ("SELECT count(*), sum(tokens) FROM read_parquet('{f}') WHERE created_at >= TIMESTAMP '2026-03-01' AND created_at < TIMESTAMP '2026-03-02'",
           ('created_at', DAY0, DAY1), ['created_at', 'tokens']),
 'chat':  (f"SELECT count(*), sum(tokens) FROM read_parquet('{{f}}') WHERE chat_id = {CHAT}", ('chat_id', CHAT, CHAT), ['chat_id', 'tokens']),
 'model': ("SELECT count(*), sum(tokens) FROM read_parquet('{f}') WHERE model = 'reasoning'", ('model', 'reasoning', 'reasoning'), ['model', 'tokens']),
}
def survives(st, lo, hi, half_open):
    if st is None or not st.has_min_max: return True
    mn, mx = st.min, st.max
    if isinstance(mn, bytes): mn, mx = mn.decode(), mx.decode()
    if half_open: return not (mx < lo or mn >= hi)
    return not (mx < lo or mn > hi)
def footer(path):
    md = pq.ParquetFile(path).metadata
    names = [md.schema.column(i).name for i in range(md.num_columns)]
    rgs = []
    for r in range(md.num_row_groups):
        g = md.row_group(r); cols = {}
        for c in range(g.num_columns):
            cc = g.column(c); cols[names[c]] = (cc.total_compressed_size, cc.statistics)
        rgs.append((g.num_rows, cols))
    return md, rgs
def bench(con, sql, n=5):
    con.execute(sql).fetchall(); ts = []
    for _ in range(n):
        t = time.perf_counter(); con.execute(sql).fetchall(); ts.append((time.perf_counter() - t) * 1000)
    return round(sorted(ts)[n // 2], 2), [round(x, 2) for x in ts]
src = duckdb.connect(DDB, read_only=True)
res = {'duckdb': duckdb.__version__, 'date': datetime.date.today().isoformat(), 'threads': src.execute("SELECT current_setting('threads')").fetchone()[0],
       'queries': {k: v[0].replace("read_parquet('{f}')", 'messages.parquet') for k, v in QUERIES.items()}, 'files': []}
answers = {}
t_all = time.time()
for sname, order in SORTS.items():
    for rg in RGS:
        for comp in COMPS:
            f = os.path.join(ROOT, f'lab_{sname}_{rg}_{comp}.parquet')
            t = time.time()
            src.execute(f"COPY (SELECT * FROM messages ORDER BY {order}) TO '{f}' (FORMAT parquet, COMPRESSION {comp}, ROW_GROUP_SIZE {rg})")
            wsec = round(time.time() - t, 1)
            md, rgs = footer(f)
            colbytes = {}
            for _, cols in rgs:
                for k, (b, _) in cols.items(): colbytes[k] = colbytes.get(k, 0) + b
            rec = {'sort': sname, 'rg': rg, 'comp': comp, 'bytes': os.path.getsize(f), 'write_s': wsec, 'row_groups': md.num_row_groups,
                   'rows_per_rg_max': max(n for n, _ in rgs), 'col_bytes': colbytes, 'q': {}}
            con = duckdb.connect()
            for qn, (sql, flt, need) in QUERIES.items():
                q = sql.format(f=f)
                keep = [i for i, (n, cols) in enumerate(rgs) if flt is None or survives(cols[flt[0]][1], flt[1], flt[2], qn == 'day')]
                need_bytes = sum(rgs[i][1][c][0] for i in keep for c in need)
                rows, rb, nreads = counted(duckdb, sql.format(f='cnt://' + f))
                med, ts = bench(con, q)
                key = qn; ans = [list(map(lambda v: v if isinstance(v, (str, int)) else float(v), r)) for r in rows]
                if key in answers: assert answers[key] == ans, (key, ans, answers[key])
                else: answers[key] = ans
                rec['q'][qn] = {'rg_kept': len(keep), 'need_bytes': need_bytes, 'read_bytes': rb, 'reads': nreads, 'ms': med, 'times_ms': ts}
            con.close(); os.remove(f)
            res['files'].append(rec)
            print(sname, rg, comp, rec['bytes'], md.num_row_groups, wsec, {k: (v['rg_kept'], v['read_bytes'], v['ms']) for k, v in rec['q'].items()}, flush=True)
            json.dump(res, open(os.path.join(OUT, 'lab.json'), 'w'), indent=1)
res['answers'] = answers; res['total_s'] = round(time.time() - t_all)
json.dump(res, open(os.path.join(OUT, 'lab.json'), 'w'), indent=1)
print('done', res['total_s'])

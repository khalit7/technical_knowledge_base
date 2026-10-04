"""Row-at-a-time against vectorised on one column of the chat data (sum of 10M token counts): a pure-Python loop, numpy, and
DuckDB on one thread; DuckDB's EXPLAIN ANALYZE of the per-model aggregate; and out-of-core: DuckDB sorting all 10M messages by
their text (about 1 GB of strings) under a 300 MB memory limit, against its default limit, with the peak size of the spill
directory sampled every 0.1 s. Each sort runs in a fresh process (DuckDB fixes the temp directory per database instance).
Writes inputs/vec_ooc.json. About 2 minutes.
  AN_DATA=/path/outside/repo uv run --no-project --python 3.12 --with duckdb==1.5.6 --with numpy python vec_ooc.py
"""
import os, sys, json, time, datetime, threading, shutil, subprocess
import duckdb, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'inputs')
ROOT = os.path.abspath(os.environ.get('AN_DATA', 'an_data')); DDB = os.path.join(ROOT, 'chat.duckdb')
OOC_SQL = 'SELECT count(*), max(content) FROM (SELECT chat_id, content FROM messages ORDER BY content, id LIMIT 9000000 OFFSET 1000000)'
if len(sys.argv) > 1:  # child: one out-of-core run
    lim = sys.argv[1]; tmp = os.path.join(ROOT, 'duck_tmp'); shutil.rmtree(tmp, ignore_errors=True); os.makedirs(tmp)
    cfg = {'temp_directory': tmp}
    if lim != 'default': cfg['memory_limit'] = lim
    c = duckdb.connect(DDB, read_only=True, config=cfg)
    peak = {'b': 0, 'run': True}
    def watch():
        while peak['run']:
            s = 0
            for dp, _, fs in os.walk(tmp):
                for f in fs:
                    try: s += os.path.getsize(os.path.join(dp, f))
                    except OSError: pass
            peak['b'] = max(peak['b'], s); time.sleep(0.1)
    th = threading.Thread(target=watch); th.start()
    t = time.perf_counter(); n = c.execute(OOC_SQL).fetchone(); dt = time.perf_counter() - t
    peak['run'] = False; th.join()
    print(json.dumps({'ms': round(dt * 1000), 'peak_temp_bytes': peak['b'], 'memory_limit': c.execute("SELECT current_setting('memory_limit')").fetchone()[0], 'rows': n[0]}))
    sys.exit(0)
def timeit(f, n):
    f(); ts = []
    for _ in range(n):
        t = time.perf_counter(); f(); ts.append(round((time.perf_counter() - t) * 1000, 1))
    return sorted(ts)[len(ts) // 2], ts
res = {'date': datetime.date.today().isoformat(), 'duckdb': duckdb.__version__, 'numpy': np.__version__, 'python': sys.version.split()[0]}
con = duckdb.connect(DDB, read_only=True)
tok = con.execute('SELECT tokens FROM messages ORDER BY id').fetchnumpy()['tokens'].astype(np.int64); lst = tok.tolist()
def loop():
    s = 0
    for v in lst: s += v
    return s
assert loop() == int(tok.sum())
res['python_loop'] = timeit(loop, 3); res['numpy_sum'] = timeit(lambda: int(tok.sum()), 5)
con.execute('SET threads = 1'); res['duck_sum_1'] = timeit(lambda: con.execute('SELECT sum(tokens) FROM messages').fetchall(), 5)
con.execute('RESET threads'); res['duck_explain_per_model'] = con.execute('EXPLAIN ANALYZE SELECT model, count(*), sum(tokens) FROM messages GROUP BY model ORDER BY model').fetchall()[0][1]
con.close(); print({k: v for k, v in res.items() if 'explain' not in k}, flush=True)
res['out_of_core'] = {'sql': OOC_SQL, 'runs': {}}
for lim in ['300MB', 'default']:
    r = subprocess.run([sys.executable, __file__, lim], capture_output=True, text=True, env=os.environ)
    res['out_of_core']['runs'][lim] = json.loads(r.stdout.strip().splitlines()[-1]) if r.returncode == 0 else {'error': r.stderr[-500:]}
    print(lim, res['out_of_core']['runs'][lim], flush=True)
json.dump(res, open(os.path.join(OUT, 'vec_ooc.json'), 'w'), indent=1)

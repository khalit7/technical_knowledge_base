"""DuckDB against PostgreSQL against SQLite on the same chat data (100k users, 1M chats, 10M messages), five analytic queries
plus a one-column sum; each engine at its default parallelism and on one thread (DuckDB threads=1, Postgres
max_parallel_workers_per_gather=0, SQLite is always one thread). (The row-at-a-time loop and the out-of-core sort are in vec_ooc.py.) Warm caches; median of 3 timed runs
after one warm-up (SQLite and the Python loop: 2). Results checked equal across engines. Writes inputs/engines.json. About 12 minutes.
  AN_DATA=/path/outside/repo AN_PORT=54373 uv run --no-project --python 3.12 --with pgserver --with duckdb==1.5.6 --with pyarrow --with numpy python engines.py
"""
import os, sys, json, time, datetime, sqlite3, threading, shutil
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pgcommon import *
import duckdb, numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, '..', 'inputs')
DDB = os.path.join(ROOT, 'chat.duckdb'); SQ = os.path.join(ROOT, 'chat.sqlite')
Q = {
 'sum': {'title': 'Total tokens (one column, no grouping)',
   'duck': 'SELECT sum(tokens) FROM messages', 'pg': 'SELECT sum(tokens) FROM messages', 'sq': 'SELECT sum(tokens) FROM messages'},
 'per_model': {'title': 'Tokens per model (the root page\'s case 6)',
   'duck': 'SELECT model, count(*), sum(tokens) FROM messages GROUP BY model ORDER BY model',
   'pg': 'SELECT model, count(*), sum(tokens) FROM messages GROUP BY model ORDER BY model',
   'sq': 'SELECT model, count(*), sum(tokens) FROM messages GROUP BY model ORDER BY model'},
 'daily': {'title': 'Messages and tokens per day in March 2026',
   'duck': "SELECT CAST(created_at AS DATE) d, count(*), sum(tokens) FROM messages WHERE created_at >= '2026-03-01' AND created_at < '2026-04-01' GROUP BY d ORDER BY d",
   'pg': "SELECT (created_at AT TIME ZONE 'UTC')::date d, count(*), sum(tokens) FROM messages WHERE created_at >= '2026-03-01 00:00+00' AND created_at < '2026-04-01 00:00+00' GROUP BY d ORDER BY d",
   'sq': "SELECT substr(created_at, 1, 10) d, count(*), sum(tokens) FROM messages WHERE created_at >= '2026-03-01' AND created_at < '2026-04-01' GROUP BY d ORDER BY d"},
 'country_plan': {'title': 'Tokens by country and plan (join of all three tables)',
   'duck': 'SELECT u.country, u.plan, count(*), sum(m.tokens) FROM messages m JOIN chats c ON c.id = m.chat_id JOIN users u ON u.id = c.user_id GROUP BY 1, 2 ORDER BY 4 DESC, 1, 2',
   'pg': 'SELECT u.country, u.plan, count(*), sum(m.tokens) FROM messages m JOIN chats c ON c.id = m.chat_id JOIN users u ON u.id = c.user_id GROUP BY 1, 2 ORDER BY 4 DESC, 1, 2',
   'sq': 'SELECT u.country, u.plan, count(*), sum(m.tokens) FROM messages m JOIN chats c ON c.id = m.chat_id JOIN users u ON u.id = c.user_id GROUP BY 1, 2 ORDER BY 4 DESC, 1, 2'},
 'top_users': {'title': 'Top 10 users by tokens in the last 30 days of data',
   'duck': "SELECT c.user_id, sum(m.tokens) t FROM messages m JOIN chats c ON c.id = m.chat_id WHERE m.created_at >= '2026-07-15' GROUP BY 1 ORDER BY t DESC, 1 LIMIT 10",
   'pg': "SELECT c.user_id, sum(m.tokens) t FROM messages m JOIN chats c ON c.id = m.chat_id WHERE m.created_at >= '2026-07-15 00:00+00' GROUP BY 1 ORDER BY t DESC, 1 LIMIT 10",
   'sq': "SELECT c.user_id, sum(m.tokens) t FROM messages m JOIN chats c ON c.id = m.chat_id WHERE m.created_at >= '2026-07-15' GROUP BY 1 ORDER BY t DESC, 1 LIMIT 10"},
 'monthly_chats': {'title': 'Distinct active chats per model per month',
   'duck': "SELECT strftime(created_at, '%Y-%m') mo, model, count(DISTINCT chat_id) FROM messages GROUP BY 1, 2 ORDER BY 1, 2",
   'pg': "SELECT to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') mo, model, count(DISTINCT chat_id) FROM messages GROUP BY 1, 2 ORDER BY 1, 2",
   'sq': "SELECT substr(created_at, 1, 7) mo, model, count(DISTINCT chat_id) FROM messages GROUP BY 1, 2 ORDER BY 1, 2"},
}
def num(v):
    try: return round(float(v), 3)
    except (TypeError, ValueError): return str(v)
def norm(rows):
    return [[num(v) for v in r] for r in rows]
def timeit(f, n):
    f(); ts = []
    for _ in range(n):
        t = time.perf_counter(); f(); ts.append(round((time.perf_counter() - t) * 1000, 1))
    return sorted(ts)[len(ts) // 2], ts
res = {'date': datetime.date.today().isoformat(), 'duckdb': duckdb.__version__, 'sqlite': sqlite3.sqlite_version, 'queries': {k: {'title': q['title'], 'sql': q['duck']} for k, q in Q.items()}}
# The laptop is shared with other jobs, so the OS page cache cannot be trusted to keep the tables: each engine gets its own
# in-process cache big enough for the whole data set (Postgres shared_buffers 7 GB, warmed by two scans, SQLite cache_size 2.5 GB,
# DuckDB its default buffer pool), one engine at a time, so the timings compare execution, not the disk.
print(stop()); print(start('-c shared_buffers=7GB'))
res['postgres'] = psql('SELECT version()')
# pg_prewarm is not in the pgserver wheel; a sequential scan fills shared_buffers only when the table is under a quarter of it
# (larger scans use a small ring buffer), hence 7 GB for the 1.5 GB messages table (pages are only allocated as they are used)
for _ in range(2): res['pg_warm'] = psql('SELECT (SELECT count(*) FROM messages), (SELECT count(*) FROM chats), (SELECT count(*) FROM users)')
res['pg_buffers_used_mb'] = psql("SELECT pg_size_pretty(count(*) * 8192) FROM pg_buffercache") if False else None
def pgq(sql, par):
    pre = 'SET max_parallel_workers_per_gather = 0; ' if not par else ''
    return [l.split('|') for l in psql(pre + sql).splitlines()]
answers = {}
for k, q in Q.items():
    r = res['queries'][k]
    r['pg'] = timeit(lambda: pgq(q['pg'], True), 3); r['pg_1'] = timeit(lambda: pgq(q['pg'], False), 3)
    answers.setdefault(k, {})['pg'] = norm(pgq(q['pg'], True)); print(k, 'pg', r['pg'][0], r['pg_1'][0], flush=True)
res['pg_explain_per_model'] = psql('EXPLAIN (ANALYZE, BUFFERS, COSTS OFF) ' + Q['per_model']['pg'])
print(stop())
scon = sqlite3.connect(SQ); scon.execute('PRAGMA cache_size = -2500000')
for k, q in Q.items():
    r = res['queries'][k]; r['sq'] = timeit(lambda: scon.execute(q['sq']).fetchall(), 2)
    answers[k]['sq'] = norm(scon.execute(q['sq']).fetchall()); print(k, 'sq', r['sq'][0], flush=True)
scon.close()
dcon = duckdb.connect(DDB, read_only=True); dthreads = dcon.execute("SELECT current_setting('threads')").fetchone()[0]
res['duck_threads_default'] = dthreads
for k, q in Q.items():
    r = res['queries'][k]
    dcon.execute(f'SET threads = {dthreads}'); r['duck'] = timeit(lambda: dcon.execute(q['duck']).fetchall(), 3)
    dcon.execute('SET threads = 1'); r['duck_1'] = timeit(lambda: dcon.execute(q['duck']).fetchall(), 3)
    dcon.execute(f'SET threads = {dthreads}'); answers[k]['duck'] = norm(dcon.execute(q['duck']).fetchall())
    fix = lambda rows: [[str(x)[:10] if i == 0 and k == 'daily' else x for i, x in enumerate(row)] for row in rows]
    r['agree'] = fix(answers[k]['duck']) == fix(answers[k]['pg']) == answers[k]['sq']
    r['result_head'] = fix(answers[k]['duck'])[:5]; r['result_rows'] = len(answers[k]['duck'])
    print(k, 'duck', r['duck'][0], r['duck_1'][0], 'agree', r['agree'], flush=True)
    json.dump(res, open(os.path.join(OUT, 'engines.json'), 'w'), indent=1)
print('done')

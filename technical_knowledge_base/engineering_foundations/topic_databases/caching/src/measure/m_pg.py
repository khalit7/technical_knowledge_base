"""Postgres-side caching on the root's chat database (100k users, 1M chats, 10M messages; generator ../../src/plan/gen.py).
Runs PostgreSQL 16.2 (the pgserver wheel's build, copied with contrib pg_buffercache and pg_prewarm compiled against it)
on an APFS clone of the root's data directory, on a port checked free first. Measures:
  costs   what a cache miss costs: a primary-key lookup, a per-user usage aggregate, and a Redis GET (client round trips)
  mv      a materialised view of daily token usage: build, query against the raw aggregate, staleness,
          REFRESH against REFRESH CONCURRENTLY, and what a reader waits during each
  memo    the Memoize plan node (a cache inside one query): hits, misses, time with it on and off
  warm    after a restart: the same lookups with an empty shared_buffers, after pg_prewarm, and with autoprewarm
Env: CA_SCRATCH (scratch dir holding pg16/ and pgdata/). Writes inputs/pg.json.
Usage: python m_pg.py [costs] [mv] [memo] [warm]   (default: all)
"""
import os, sys, time, json, random, statistics, subprocess, threading
import psycopg, redis
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import S, save, machine, free_port, wait_port, start_redis, INPUTS

B = os.path.join(S, 'pg16', 'bin'); DATA = os.path.join(S, 'pgdata')
PORT = free_port(55710)
STEPS = sys.argv[1:] or ['costs', 'mv', 'memo', 'warm']
OUTF = os.path.join(INPUTS, 'pg.json')
out = json.load(open(OUTF)) if os.path.exists(OUTF) else {}
out.update(machine()); out['postgres'] = '16.2 (pgserver build), shared_buffers 128MB unless stated'


def sh(*a):
    return subprocess.run(list(a), capture_output=True, text=True)


def start(extra=''):
    r = sh(f'{B}/pg_ctl', '-D', DATA, '-o', f"-p {PORT} -k '' -h 127.0.0.1 {extra}", '-l', os.path.join(S, 'pg.log'), '-w', 'start')
    wait_port(PORT); return r.stdout[-200:]


def stop():
    sh(f'{B}/pg_ctl', '-D', DATA, '-m', 'fast', '-w', 'stop')


def conn():
    return psycopg.connect(host='127.0.0.1', port=PORT, user='postgres', dbname='chat', autocommit=True)


def med_ms(f, args):
    ts = []
    for a in args:
        t = time.perf_counter(); f(a); ts.append((time.perf_counter() - t) * 1000)
    return {'median_ms': round(statistics.median(ts), 4), 'p90_ms': round(sorted(ts)[int(.9 * len(ts))], 4), 'n': len(ts)}


def explain(c, sql, args=None):
    return c.execute('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ' + sql, args).fetchone()[0][0]


Q_PK = 'SELECT id, user_id, title, model FROM chats WHERE id = %s'
Q_USAGE = '''SELECT m.model, sum(m.tokens) AS tokens, count(*) AS n FROM chats c JOIN messages m ON m.chat_id = c.id
             WHERE c.user_id = %s GROUP BY m.model'''

print(start(), flush=True)
c = conn()
random.seed(5)

if 'costs' in STEPS:
    ids = [random.randint(1, 1_000_000) for _ in range(2000)]
    users = [random.randint(1, 100_000) for _ in range(300)]
    for i in ids[:500]: c.execute(Q_PK, (i,)).fetchall()            # warm
    for u in users[:50]: c.execute(Q_USAGE, (u,)).fetchall()
    pk = med_ms(lambda i: c.execute(Q_PK, (i,)).fetchall(), ids)
    us = med_ms(lambda u: c.execute(Q_USAGE, (u,)).fetchall(), users)
    heavy = med_ms(lambda u: c.execute(Q_USAGE, (u,)).fetchall(), [1, 2, 3, 4, 5] * 4)
    nch = c.execute('SELECT count(*) FROM chats WHERE user_id = 1').fetchone()[0]
    proc, rp = start_redis(46420)
    r = redis.Redis(port=rp); r.set('chat:1', json.dumps({'id': 1, 'title': 'Chat 1', 'model': 'standard'}))
    for _ in range(500): r.get('chat:1')
    rg = med_ms(lambda _: r.get('chat:1'), range(5000))
    proc.terminate()
    out['costs'] = {'pk_lookup': pk, 'usage_aggregate': us, 'usage_heaviest_users': heavy, 'chats_of_user_1': nch,
                    'redis_get': rg, 'note': 'client round trips over loopback, psycopg 3 / redis-py, warm caches; SQL in m_pg.py'}
    print('costs', json.dumps(out['costs']), flush=True); save('pg.json', out)

if 'mv' in STEPS:
    mv = {}
    c.execute('DROP MATERIALIZED VIEW IF EXISTS daily_usage')
    c.execute("DELETE FROM messages WHERE id > 10000000")
    t = time.perf_counter()
    c.execute('''CREATE MATERIALIZED VIEW daily_usage AS
      SELECT c.user_id, m.created_at::date AS day, m.model, sum(m.tokens) AS tokens, count(*) AS n
      FROM messages m JOIN chats c ON c.id = m.chat_id GROUP BY 1, 2, 3''')
    mv['create_s'] = round(time.perf_counter() - t, 2)
    t = time.perf_counter(); c.execute('CREATE UNIQUE INDEX daily_usage_key ON daily_usage(user_id, day, model)')
    mv['index_s'] = round(time.perf_counter() - t, 2)
    c.execute('ANALYZE daily_usage')
    mv['rows'] = c.execute('SELECT count(*) FROM daily_usage').fetchone()[0]
    mv['mb'] = round(c.execute("SELECT pg_total_relation_size('daily_usage')").fetchone()[0] / 2**20, 1)
    Q_RAW = '''SELECT m.created_at::date AS day, sum(m.tokens) FROM chats c JOIN messages m ON m.chat_id = c.id
               WHERE c.user_id = %s GROUP BY 1 ORDER BY 1'''
    Q_MV = 'SELECT day, sum(tokens) FROM daily_usage WHERE user_id = %s GROUP BY 1 ORDER BY 1'
    users = [random.randint(1, 100_000) for _ in range(200)]
    for u in users[:30]: c.execute(Q_RAW, (u,)); c.execute(Q_MV, (u,))
    mv['raw_query'] = med_ms(lambda u: c.execute(Q_RAW, (u,)).fetchall(), users)
    mv['mv_query'] = med_ms(lambda u: c.execute(Q_MV, (u,)).fetchall(), users)
    mv['raw_heavy'] = med_ms(lambda u: c.execute(Q_RAW, (u,)).fetchall(), [1, 2, 3] * 5)
    mv['mv_heavy'] = med_ms(lambda u: c.execute(Q_MV, (u,)).fetchall(), [1, 2, 3] * 5)
    # staleness: a new message for user 1's latest chat is invisible until a refresh
    chat = c.execute('SELECT max(id) FROM chats WHERE user_id = 1').fetchone()[0]
    before = c.execute("SELECT coalesce(sum(tokens),0) FROM daily_usage WHERE user_id = 1").fetchone()[0]
    c.execute("INSERT INTO messages VALUES (10000001, %s, 'assistant', 'large', 777, 'new', now())", (chat,))
    after_insert = c.execute("SELECT coalesce(sum(tokens),0) FROM daily_usage WHERE user_id = 1").fetchone()[0]
    raw_now = c.execute("SELECT sum(m.tokens) FROM chats c JOIN messages m ON m.chat_id=c.id WHERE c.user_id = 1").fetchone()[0]
    mv['stale'] = {'mv_before': int(before), 'mv_after_insert': int(after_insert), 'raw_after_insert': int(raw_now)}

    def refresh_with_reader(concurrently):
        """Run a refresh; 1 s in, a second session reads the view; record how long that read waits."""
        res = {}
        def do():
            c2 = conn(); t0 = time.perf_counter()
            c2.execute('REFRESH MATERIALIZED VIEW ' + ('CONCURRENTLY ' if concurrently else '') + 'daily_usage')
            res['refresh_s'] = round(time.perf_counter() - t0, 2); c2.close()
        th = threading.Thread(target=do); th.start(); time.sleep(1.0)
        c3 = conn(); t0 = time.perf_counter()
        c3.execute(Q_MV, (1,)).fetchall()
        res['reader_wait_ms'] = round((time.perf_counter() - t0) * 1000, 1); c3.close()
        th.join(); return res
    mv['refresh'] = refresh_with_reader(False)
    mv['mv_after_refresh'] = int(c.execute("SELECT sum(tokens) FROM daily_usage WHERE user_id = 1").fetchone()[0])
    c.execute("UPDATE messages SET tokens = 778 WHERE id = 10000001")
    mv['refresh_concurrently'] = refresh_with_reader(True)
    c.execute("DELETE FROM messages WHERE id = 10000001")
    print('mv', json.dumps(mv), flush=True)
    out['mv'] = mv; save('pg.json', out)

if 'memo' in STEPS:
    # the plan of the owners of the heaviest users' chats: 6,250 chats owned by 30 users, so the same user is looked up again and again
    q = 'SELECT u.plan, count(*) FROM chats c JOIN users u ON u.id = c.user_id WHERE c.user_id <= 30 GROUP BY 1'
    def find(n, typ):
        if n.get('Node Type') == typ: return n
        for k in n.get('Plans', []):
            f = find(k, typ)
            if f: return f
    def nodes(n):
        return [n['Node Type']] + [t for k in n.get('Plans', []) for t in nodes(k)]
    res = {'sql': q}
    c.execute('SET max_parallel_workers_per_gather = 0')
    for name, sets in (('planner_default', []), ('nested_loop_memoize', ['enable_hashjoin = off', 'enable_mergejoin = off']),
                       ('nested_loop_no_memoize', ['enable_hashjoin = off', 'enable_mergejoin = off', 'enable_memoize = off'])):
        c.execute('RESET enable_hashjoin'); c.execute('RESET enable_mergejoin'); c.execute('RESET enable_memoize')
        for st in sets: c.execute('SET ' + st)
        for _ in range(3): explain(c, q)
        ts = [explain(c, q)['Execution Time'] for _ in range(7)]
        e = explain(c, q); m = find(e['Plan'], 'Memoize')
        res[name] = {'ms_median': round(statistics.median(ts), 3), 'nodes': nodes(e['Plan']),
                     'memoize': {k: m.get(k) for k in ('Cache Hits', 'Cache Misses', 'Cache Evictions', 'Cache Overflows', 'Peak Memory Usage')} if m else None,
                     'settings': sets}
    c.execute('RESET ALL')
    out['memo'] = res; print('memo', json.dumps(res), flush=True); save('pg.json', out)

if 'warm' in STEPS:
    random.seed(9)
    ids = [random.randint(1, 1_000_000) for _ in range(20000)]
    def workload():
        cc = conn(); t0 = time.perf_counter()
        for i in ids: cc.execute(Q_PK, (i,)).fetchall()
        dt = time.perf_counter() - t0
        st = cc.execute("SELECT blks_hit, blks_read, blk_read_time FROM pg_stat_database WHERE datname = 'chat'").fetchone()
        cc.close(); return round(dt / len(ids) * 1000, 4), st
    def reset_stats():
        cc = conn(); cc.execute('SELECT pg_stat_reset()'); cc.close()
    w = {'lookups': len(ids), 'track_io_timing': True, 'note': 'track_io_timing shows how long the reads took: about 0.08 ms each, SSD speed, so these blocks were not in the OS page cache either (macOS gave no way to control that without root)'}
    c.close(); stop(); start('-c track_io_timing=on'); reset_stats()
    ms, st = workload(); w['after_restart'] = {'ms_per_lookup': ms, 'blks_hit': st[0], 'blks_read': st[1], 'read_ms': st[2]}
    reset_stats(); ms, st = workload(); w['second_pass'] = {'ms_per_lookup': ms, 'blks_hit': st[0], 'blks_read': st[1], 'read_ms': st[2]}
    stop(); start('-c track_io_timing=on'); cc = conn(); cc.execute('CREATE EXTENSION IF NOT EXISTS pg_prewarm')
    t0 = time.perf_counter()
    pages = cc.execute("SELECT pg_prewarm('chats') + pg_prewarm('chats_pkey')").fetchone()[0]
    w['prewarm'] = {'pages': pages, 'seconds': round(time.perf_counter() - t0, 2)}
    cc.close(); reset_stats(); ms, st = workload(); w['after_prewarm'] = {'ms_per_lookup': ms, 'blks_hit': st[0], 'blks_read': st[1], 'read_ms': st[2]}
    # autoprewarm: the background worker saves the list of cached blocks and reloads it after a restart
    stop(); start("-c track_io_timing=on -c shared_preload_libraries=pg_prewarm -c pg_prewarm.autoprewarm_interval=10s")
    workload(); time.sleep(12); stop()
    t0 = time.perf_counter(); start("-c track_io_timing=on -c shared_preload_libraries=pg_prewarm"); time.sleep(5)
    reset_stats(); ms, st = workload(); w['after_autoprewarm_restart'] = {'ms_per_lookup': ms, 'blks_hit': st[0], 'blks_read': st[1], 'read_ms': st[2]}
    w['autoprewarm_file_bytes'] = os.path.getsize(os.path.join(DATA, 'autoprewarm.blocks')) if os.path.exists(os.path.join(DATA, 'autoprewarm.blocks')) else None
    out['warm'] = w; print('warm', json.dumps(w), flush=True); save('pg.json', out)
    stop(); start()

stop()

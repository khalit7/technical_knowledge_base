"""Measure the Query plans tab's eight cases on the chat data made by gen.py (PostgreSQL 16 from the pgserver wheel).
Every plan is EXPLAIN (ANALYZE, BUFFERS, SETTINGS, FORMAT JSON), run 5 times; the run with the median execution time is kept,
with all 5 times. Writes inputs/<case>.json (one file per case, raw plans included) and inputs/env.json.
Run (server must not be running; this script starts and stops it):
  QP_DATA=/path/outside/repo uv run --no-project --python 3.12 --with pgserver --with duckdb python measure.py [case ...]
Order matters: case 7 'before' needs the tables never vacuumed, so a fresh gen.py run comes first when re-measuring everything.
"""
import os, sys, json, time, statistics, platform, datetime, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pgcommon import *
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, 'inputs')

def run(label, sql, pre='', reps=5, note=''):
    plans = []
    for _ in range(reps):
        plans.append(explain(sql, pre=pre))
    times = [p['Execution Time'] for p in plans]
    med = sorted(range(reps), key=lambda i: times[i])[reps // 2]
    p = plans[med]
    print(f'  {label}: {times[med]:.3f} ms  {p["Plan"]["Node Type"]}', flush=True)
    return {'label': label, 'sql': sql, 'pre': pre, 'note': note, 'times_ms': [round(t, 3) for t in times],
            'median_ms': round(times[med], 3), 'plan': p}

def save(name, obj):
    json.dump(obj, open(os.path.join(OUT, name + '.json'), 'w'), indent=None, separators=(',', ':'))

def counts(sql):
    return psql(sql)

C7_SQL = 'SELECT count(*) FROM messages WHERE chat_id BETWEEN 200000 AND 210000'

def env():
    vm = lambda: json.loads(psql("SELECT json_object_agg(relname, json_build_object('pages', relpages, 'all_visible', relallvisible)) FROM pg_class WHERE relname IN ('users','chats','messages')"))
    settings = dict(l.split('|') for l in psql("SELECT name, current_setting(name) FROM pg_settings WHERE name IN ('shared_buffers','work_mem','effective_cache_size','random_page_cost','seq_page_cost','max_parallel_workers_per_gather','jit','default_statistics_target','block_size','effective_io_concurrency','track_io_timing','server_version')").splitlines())
    settings['jit_available'] = psql('SELECT pg_jit_available()')
    mac = platform.mac_ver()[0]
    return {'date': datetime.date.today().isoformat(), 'postgres': psql('SELECT version()'), 'settings': settings,
            'machine': f'Apple M1 Pro laptop (10 CPU cores, 16 GB RAM), internal SSD, macOS {mac}', 'visibility': vm()}

def case7_before():
    # never vacuumed: the visibility map is empty, so an index-only scan must still visit the table for every row
    out = {'env_before': env(), 'before': run('Before VACUUM: visibility map empty', C7_SQL)}
    save('c7_before', out)

def case7_after():
    t = time.time(); psql('VACUUM (ANALYZE) messages'); dt = round(time.time() - t, 1)
    psql('VACUUM (ANALYZE) users'); psql('VACUUM (ANALYZE) chats')
    b = json.load(open(os.path.join(OUT, 'c7_before.json')))
    b['vacuum_seconds'] = dt; b['env_after'] = env()
    b['after'] = run('After VACUUM: visibility map set', C7_SQL)
    save('c7_before', b)

def timed(sql):
    t = time.time(); psql(sql); return round(time.time() - t, 2)

def case1():
    q = "SELECT id, email, plan FROM users WHERE email = 'user77777@example.com'"
    psql('DROP INDEX IF EXISTS users_email')
    out = {'before': run('No index on email', q)}
    out['index_seconds'] = timed('CREATE UNIQUE INDEX users_email ON users(email)')
    out['index_bytes'] = int(psql("SELECT pg_relation_size('users_email')"))
    out['after'] = run('After CREATE UNIQUE INDEX users_email', q)
    save('c1', out)

def case2():
    psql('DROP INDEX IF EXISTS messages_created')
    hour = "created_at >= '2026-03-01 12:00+00' AND created_at < '2026-03-01 13:00+00'"
    out = {'used': run('Index (chat_id, created_at), query gives chat_id and a time range',
                       "SELECT count(*), sum(tokens) FROM messages WHERE chat_id = 522720 AND created_at >= '2026-03-01 00:00+00' AND created_at < '2026-03-02 00:00+00'"),
           'before': run('Same index, query gives only the time range', f'SELECT count(*), sum(tokens) FROM messages WHERE {hour}')}
    out['index_seconds'] = timed('CREATE INDEX messages_created ON messages(created_at)')
    out['index_bytes'] = int(psql("SELECT pg_relation_size('messages_created')"))
    psql('ANALYZE messages')
    out['after'] = run('After CREATE INDEX messages_created ON messages(created_at)', f'SELECT count(*), sum(tokens) FROM messages WHERE {hour}')
    save('c2', out)

def case3():
    # needs messages_created from case2
    out = {'before': run('A function wraps the column', "SELECT count(*), sum(tokens) FROM messages WHERE created_at::date = '2026-03-01'"),
           'after': run('The same day as a range on the bare column', "SELECT count(*), sum(tokens) FROM messages WHERE created_at >= '2026-03-01 00:00+00' AND created_at < '2026-03-02 00:00+00'")}
    psql('DROP INDEX IF EXISTS users_lower_email')
    out['before2'] = run('lower() on an indexed column', "SELECT id, plan FROM users WHERE lower(email) = 'user77777@example.com'")
    psql('CREATE INDEX users_lower_email ON users (lower(email))'); psql('ANALYZE users')
    out['after2'] = run('After an expression index on lower(email)', "SELECT id, plan FROM users WHERE lower(email) = 'user77777@example.com'")
    psql('DROP INDEX users_lower_email')
    out['timezone'] = psql('SHOW TimeZone')
    save('c3', out)

def case4():
    small = 'SELECT c.id, c.title, count(*) FROM chats c JOIN messages m ON m.chat_id = c.id WHERE c.user_id = 4242 GROUP BY c.id, c.title'
    large = 'SELECT u.country, count(*) FROM chats c JOIN users u ON u.id = c.user_id GROUP BY u.country'
    srt = 'SELECT c.id, count(*) FROM chats c JOIN messages m ON m.chat_id = c.id GROUP BY c.id ORDER BY c.id LIMIT 1000'
    out = {'small': run("Planner's choice: one user's chats", small),
           'small_forced': run('Nested loop switched off', small, pre='SET enable_nestloop = off;'),
           'large': run("Planner's choice: every chat with its user", large),
           'large_forced': run('Hash join and merge join switched off', large, pre='SET enable_hashjoin = off; SET enable_mergejoin = off;'),
           'sorted': run("Planner's choice: first 1,000 chats in id order", srt),
           'sorted_forced': run('Merge join switched off', srt, pre='SET enable_mergejoin = off;'),
           'large_rpc': run("Planner's choice with random_page_cost = 1.1 (an SSD setting)", large, pre='SET random_page_cost = 1.1;')}
    save('c4', out)

def case5():
    q = "SELECT count(*), sum(m.tokens) FROM users u JOIN chats c ON c.user_id = u.id JOIN messages m ON m.chat_id = c.id WHERE u.country = 'US' AND u.city = 'Chicago' AND u.timezone = 'America/Chicago'"
    psql('DROP STATISTICS IF EXISTS users_geo'); psql('ANALYZE users')
    out = {'actual_users': int(psql("SELECT count(*) FROM users WHERE country = 'US' AND city = 'Chicago' AND timezone = 'America/Chicago'")),
           'single': {c: float(psql(f"SELECT count(*)::float / 100000 FROM users WHERE {c}")) for c in ["country = 'US'", "city = 'Chicago'", "timezone = 'America/Chicago'"]},
           'before': run('Default statistics: columns assumed independent', q)}
    psql('CREATE STATISTICS users_geo (dependencies, mcv) ON country, city, timezone FROM users'); psql('ANALYZE users')
    out['after'] = run('After CREATE STATISTICS users_geo (dependencies, mcv)', q)
    out['dependencies'] = psql("SELECT dependencies FROM pg_stats_ext WHERE statistics_name = 'users_geo'")
    save('c5', out)

def case6_pg():
    q = 'SELECT model, count(*), sum(tokens), round(avg(tokens), 1) FROM messages GROUP BY model ORDER BY model'
    out = {'parallel': run('PostgreSQL, default (2 parallel workers + leader)', q),
           'serial': run('PostgreSQL, one process', q, pre='SET max_parallel_workers_per_gather = 0;'),
           'table_bytes': int(psql("SELECT pg_relation_size('messages')")),
           'result': psql(q)}
    # wall-clock time without EXPLAIN's per-row instrumentation (includes starting psql and connecting, a few ms)
    w = []
    for _ in range(5):
        t = time.perf_counter(); psql(q); w.append(round((time.perf_counter() - t) * 1000, 1))
    out['wall'] = {'times_ms': w, 'median_ms': sorted(w)[2]}
    t = time.perf_counter(); psql('SELECT 1'); out['wall']['psql_select1_ms'] = round((time.perf_counter() - t) * 1000, 1)
    save('c6_pg', out)

def evict_os_cache(gb=20):
    """macOS 'purge' needs root, so push the database files out of the OS file cache by reading a file bigger than RAM."""
    f = os.path.join(ROOT, 'evict.bin')
    if not os.path.exists(f) or os.path.getsize(f) < gb << 30:
        sh('dd', 'if=/dev/urandom', f'of={f}', 'bs=8m', f'count={gb * 128}')
    t = time.time(); sh('dd', f'if={f}', 'of=/dev/null', 'bs=8m'); return round(time.time() - t, 1)

def case8():
    q1 = 'SELECT id, role, left(content, 40), created_at FROM messages WHERE chat_id = 555555 ORDER BY created_at DESC LIMIT 50'
    q2 = "SELECT count(*), sum(tokens) FROM messages WHERE created_at >= '2026-04-01 00:00+00' AND created_at < '2026-04-02 00:00+00'"
    out = {}
    for k, q in (('history', q1), ('day', q2)):
        print(stop()); out['evict_seconds_' + k] = evict_os_cache(); print(start())
        out[k + '_disk'] = run('Cold: Postgres restarted and the OS file cache flushed', q, reps=1)
        print(stop()); print(start())
        out[k + '_os'] = run('Postgres restarted, files still in the OS cache', q, reps=1)
        out[k + '_warm'] = run('Warm: the same query again', q)
    os.remove(os.path.join(ROOT, 'evict.bin'))
    save('c8', out)

def compact_users():
    """Only for the first measured database, where the timezone column was added by an UPDATE (dead row versions doubled the table):
    rewrite it compactly so it matches what gen.py now produces in one INSERT."""
    psql('VACUUM FULL users'); psql('VACUUM (ANALYZE) users')

def sizes():
    """Table and index sizes as measured (after all cases)."""
    out = json.loads(psql("""SELECT json_agg(json_build_object('name', relname, 'kind', relkind, 'rows', reltuples::bigint, 'pages', relpages,
      'bytes', pg_relation_size(oid)) ORDER BY relname) FROM pg_class WHERE relnamespace = 'public'::regnamespace AND relkind IN ('r','i')"""))
    out = {'relations': out, 'exact_rows': {t: int(psql(f'SELECT count(*) FROM {t}')) for t in ('users', 'chats', 'messages')}}
    save('sizes', out)

if __name__ == '__main__':
    names = sys.argv[1:]
    print(start())
    psql("ALTER SYSTEM SET track_io_timing = on", db='postgres'); psql('SELECT pg_reload_conf()', db='postgres')
    try:
        for n in names:
            print(n, flush=True); globals()[n]()
    finally:
        print(stop())

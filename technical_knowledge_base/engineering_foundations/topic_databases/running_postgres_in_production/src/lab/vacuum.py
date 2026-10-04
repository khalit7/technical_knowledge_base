"""Autovacuum observed on a churned table, then VACUUM against VACUUM FULL (PostgreSQL 16.2). About 6 minutes.

The table: chat_state, one row per chat (100,000 rows), updated every time a chat gets a message (unread count, last time):
the hottest kind of table in a chat product. pgbench updates random rows at a steady 1,500 updates per second.
Defaults except autovacuum_naptime = 5s (default 1min, shortened so a cycle fits on screen) and log_autovacuum_min_duration = 0.

A0 (40 s): HOT updates, pruned on the fly. A (80 s): churn with an index on the updated column, autovacuum on: dead tuples rise to the trigger (50 + 0.2 x live rows) and autovacuum clears them.
B (60 s): the same churn while one session holds a REPEATABLE READ snapshot open (a forgotten transaction): autovacuum runs
   but cannot remove anything; dead tuples and size climb. Then the session ends; a manual VACUUM VERBOSE.
C: messages (1M rows): delete half, then VACUUM (space reusable, file the same size) against VACUUM FULL (file rewritten,
   space returned, ACCESS EXCLUSIVE lock: a concurrent read waits; shown with lock_timeout).
Writes ../inputs/vacuum.json.
"""
import os, sys, time, subprocess, re, threading
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pgc import *
import psycopg

T = []
def rec(step, cmd, out, secs=None, **kw):
    T.append({'step': step, 'cmd': cmd, 'out': out, 'secs': secs, **kw}); print('==', step, secs, '\n', cmd, '\n', str(out)[:900], flush=True)

V = Cluster('vac', 55450)
V.initdb()
V.conf(autovacuum_naptime='5s', log_autovacuum_min_duration=0, log_line_prefix='%m [%p] ', timezone='UTC', log_timezone='UTC')
V.start()
load_chat(V, msgs=1_000_000)
V.psql("""CREATE TABLE chat_state(chat_id bigint PRIMARY KEY, unread int NOT NULL DEFAULT 0, last_message_at timestamptz, title text);
INSERT INTO chat_state SELECT id, 0, created_at, title FROM chats;""")
V.psql('VACUUM ANALYZE chat_state')
UPD = os.path.join(ROOT, 'upd.sql')
open(UPD, 'w').write("\\set c random(1, 100000)\nUPDATE chat_state SET unread = unread + 1, last_message_at = now() WHERE chat_id = :c;\n")
Q = """SELECT n_live_tup, n_dead_tup, autovacuum_count, pg_relation_size('chat_state'), n_tup_upd, n_tup_hot_upd
FROM pg_stat_user_tables WHERE relname = 'chat_state'"""

def churn(secs):
    return subprocess.Popen([V.b('pgbench'), '-h', '127.0.0.1', '-p', str(V.port), '-U', 'postgres', '-n', '-c', '4', '-j', '2', '-R', '1500',
                             '-T', str(secs), '-f', UPD, 'chat'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

def watch(secs, t_off=0, phase=''):
    rows, t0 = [], time.time()
    while time.time() - t0 < secs:
        r = V.one(Q).split('|')
        rows.append([round(time.time() - t0 + t_off, 1), int(r[0]), int(r[1]), int(r[2]), int(r[3]), int(r[4]), int(r[5]), phase])
        time.sleep(1)
    return rows

base_size = int(V.one("SELECT pg_relation_size('chat_state')"))
rec('start', Q + ';', V.table("SELECT n_live_tup, n_dead_tup, autovacuum_count, pg_size_pretty(pg_relation_size('chat_state')) AS size FROM pg_stat_user_tables WHERE relname = 'chat_state'"))
# A0 (40 s): no index on the updated columns, so updates are HOT (heap-only tuples: the new version goes on the same page and
# no index changes); the page is pruned on the fly when it fills, and dead tuples stay low without any VACUUM.
pb = churn(40); A0 = watch(40, 0, 'hot'); pb.communicate()
hot_end = V.one(Q)
# A (80 s): an index on last_message_at ("chats by recent activity") makes every update non-HOT: dead tuples pile up
# until autovacuum's trigger, 50 + 0.2 x live rows, and autovacuum clears them.
V.psql('CREATE INDEX chat_state_recent ON chat_state(last_message_at)')
pb = churn(80); A = watch(80, A0[-1][0] + 1, 'A'); pb.communicate()
A = A0 + A
avlog = [re.sub(r'^\S+ \S+ \S+ \[\d+\] ', '', l) for l in V.logtail(400) if 'automatic vacuum of table "chat.public.chat_state"' in l]
av_detail = []
lines = V.logtail(400)
for i, l in enumerate(lines):
    if 'automatic vacuum of table "chat.public.chat_state"' in l:
        av_detail = [re.sub(r'^\S+ \S+ \S+ \[\d+\] ', '', x) for x in lines[i:i + 4]]
rec('phase_a', 'pgbench -R 1500 -T 80 -f upd.sql  (with the index on last_message_at; pg_stat_user_tables every second)', '\n'.join(av_detail), 80, autovacuums=len(avlog), hot_end=hot_end)

# ---- B: a forgotten transaction holds back cleanup ----
old = psycopg.connect(f'host=127.0.0.1 port={V.port} user=postgres dbname=chat', autocommit=False)
old.execute('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ'); old.execute('SELECT count(*) FROM chat_state').fetchone()
pb = churn(60); Bp = watch(60, A[-1][0] + 1, 'B'); pb.communicate()
act = V.table("""SELECT pid, state, now() - xact_start AS xact_age, backend_xmin, left(query, 35) AS query
FROM pg_stat_activity WHERE backend_xmin IS NOT NULL AND pid <> pg_backend_pid() ORDER BY xact_start LIMIT 3""")
lines = V.logtail(300); blocked = []
for i, l in enumerate(lines):
    if 'automatic vacuum of table "chat.public.chat_state"' in l:
        blocked = [re.sub(r'^\S+ \S+ \S+ \[\d+\] ', '', x) for x in lines[i:i + 4]]
rec('phase_b_activity', "SELECT pid, state, now() - xact_start AS xact_age, backend_xmin, query FROM pg_stat_activity WHERE backend_xmin IS NOT NULL ORDER BY xact_start;", act)
rec('phase_b_autovac', 'server log: the last automatic vacuum of chat_state while the old snapshot was open', '\n'.join(blocked))
old.close()
t = time.time(); r = sh(V.b('psql'), '-h', '127.0.0.1', '-p', V.port, '-U', 'postgres', '-X', '-c', 'VACUUM (VERBOSE) chat_state', 'chat'); dt = round(time.time() - t, 2)
vv = [l.replace('INFO:  ', '') for l in r.stderr.splitlines() if l.strip()][:8]
rec('manual_vacuum', 'VACUUM (VERBOSE) chat_state;  -- after the old session ended', '\n'.join(vv), dt)
after = watch(6, Bp[-1][0] + 1, 'after')

# ---- C: VACUUM against VACUUM FULL on messages ----
def sz(): return int(V.one("SELECT pg_total_relation_size('messages')"))
V.psql("ALTER TABLE messages SET (autovacuum_enabled = false)")
s0 = sz()
t = time.time(); V.psql("DELETE FROM messages WHERE id % 2 = 0"); d_del = round(time.time() - t, 2)
s1 = sz()
t = time.time(); V.psql("VACUUM messages"); d_v = round(time.time() - t, 2); s2 = sz()
t = time.time(); V.psql("INSERT INTO messages(chat_id, role, model, tokens, content, created_at) SELECT 1 + (g % 100000), 'user', 'mini', 9, left(repeat(md5(g::text), 4), 80), now() FROM generate_series(1, 250000) g"); d_ins = round(time.time() - t, 2)
s3 = sz()
# VACUUM FULL with a concurrent reader that gives up after 200 ms
res = {}
def full():
    t = time.time(); V.psql("VACUUM FULL messages"); res['secs'] = round(time.time() - t, 2)
th = threading.Thread(target=full); th.start(); time.sleep(0.3)
blocked_read = V.psql("SET lock_timeout = '200ms'; SELECT count(*) FROM messages;", tuples=False, ok_fail=True)
locks = V.table("SELECT l.mode, l.granted, a.wait_event_type, left(a.query, 30) AS query FROM pg_locks l JOIN pg_stat_activity a USING (pid) WHERE l.relation = 'messages'::regclass ORDER BY l.granted DESC")
th.join(); s4 = sz()
sizes = [{'label': 'loaded (1M rows)', 'bytes': s0}, {'label': 'after DELETE of half', 'bytes': s1}, {'label': 'after VACUUM', 'bytes': s2},
         {'label': 'after 250k new rows', 'bytes': s3}, {'label': 'after VACUUM FULL', 'bytes': s4}]
rec('sizes', "SELECT pg_size_pretty(pg_total_relation_size('messages'));  -- at each step", '\n'.join(f"{x['label']:<24} {x['bytes']/2**20:7.1f} MB" for x in sizes), None,
    times={'delete': d_del, 'vacuum': d_v, 'insert': d_ins, 'vacuum_full': res.get('secs')})
rec('full_lock', "VACUUM FULL messages;  -- and meanwhile, in another session: SET lock_timeout = '200ms'; SELECT count(*) FROM messages;", (blocked_read or '').strip() + '\n\n' + locks, res.get('secs'))
V.stop()
dump('vacuum.json', {'machine': machine(), 'version': '16.2 (pgserver wheel)', 'settings': {'autovacuum_naptime': '5s', 'others': 'defaults'},
                     'base_size': base_size, 'series': A + Bp + after, 'cols': ['t', 'live', 'dead', 'autovacuum_count', 'bytes', 'n_tup_upd', 'n_tup_hot_upd', 'phase'],
                     'sizes': sizes, 'steps': T})

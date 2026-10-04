"""The lock queue, measured: one long transaction, one ALTER TABLE ... ADD COLUMN ... DEFAULT 0 (a metadata-only change
that still needs an ACCESS EXCLUSIVE lock), and seven ordinary point reads arriving every half second from 0.75 s, on the 2,000,000-row
messages_big table built by measure_alter.py (database bench). Three scenarios:
  long:     a transaction holds an ACCESS SHARE lock for 4 s; the ALTER waits for it; every later read queues behind the ALTER
  timeout:  the same, but the migration sets lock_timeout = '500ms' and retries after a 1 s pause
  quick:    no long transaction; the ALTER takes its lock at once
Each session records its start and end (seconds after the scenario's t0) and its outcome.
A monitor snapshots pg_stat_activity and the waiting pg_locks rows at t = 2.2 s.
Writes ../inputs/queue.json. Run from a scratch directory after measure_alter.py (see pgc.py)."""
import os, sys, time, threading, datetime, platform
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pgc import *

HOLD = 4.0; ALTER_AT = 0.5; READS = [0.75, 1.25, 1.75, 2.25, 2.75, 3.25, 3.75]; SNAP = 2.2

def scenario(kind):
    ev = []; lock = threading.Lock(); t0 = time.perf_counter() + 0.3
    now = lambda: time.perf_counter() - t0
    def rec(**k):
        with lock: ev.append(k)
    def wait_until(t):
        d = t - now()
        if d > 0: time.sleep(d)
    def long_txn():
        with conn('bench') as c:
            wait_until(0.0); s = now()
            c.execute('BEGIN'); c.execute('SELECT count(*) FROM messages_big WHERE id <= 100').fetchall()
            time.sleep(HOLD - now()); c.execute('COMMIT')
            rec(who='Long transaction', kind='txn', start=s, end=now(), outcome='committed', sql='BEGIN; SELECT count(*) FROM messages_big WHERE id <= 100; ... (4 s) ... COMMIT')
    def migration():
        with conn('bench') as c:
            if kind == 'timeout': c.execute("SET lock_timeout = '500ms'")
            wait_until(ALTER_AT); attempt = 0
            while True:
                attempt += 1; s = now()
                try:
                    c.execute('ALTER TABLE messages_big ADD COLUMN q_flag integer NOT NULL DEFAULT 0')
                    rec(who='Migration', kind='alter', start=s, end=now(), outcome='done', attempt=attempt, sql='ALTER TABLE messages_big ADD COLUMN q_flag integer NOT NULL DEFAULT 0'); break
                except psycopg.errors.LockNotAvailable:
                    rec(who='Migration', kind='alter', start=s, end=now(), outcome='lock_timeout', attempt=attempt, sql='ALTER TABLE ... (gave up after lock_timeout 500 ms)')
                    time.sleep(1.0)
    def reader(i, at):
        with conn('bench') as c:
            wait_until(at); s = now()
            c.execute('SELECT content FROM messages_big WHERE id = %s', (1000 + i,)).fetchall()
            rec(who=f'Read {i + 1}', kind='read', start=s, end=now(), outcome='done', sql=f'SELECT content FROM messages_big WHERE id = {1000 + i}')
    snap = {}
    def monitor():
        with conn('bench') as c:
            wait_until(SNAP)
            snap['activity'] = [list(r) for r in c.execute("""SELECT left(query, 70), state, wait_event_type, wait_event FROM pg_stat_activity
                WHERE datname = 'bench' AND pid <> pg_backend_pid() AND backend_type = 'client backend' ORDER BY backend_start""").fetchall()]
            snap['waiting_locks'] = [list(r) for r in c.execute("""SELECT l.mode, l.granted, left(a.query, 60) FROM pg_locks l JOIN pg_stat_activity a USING (pid)
                WHERE l.relation = 'messages_big'::regclass ORDER BY l.granted DESC, a.backend_start""").fetchall()]
    ths = [threading.Thread(target=migration)] + [threading.Thread(target=reader, args=(i, a)) for i, a in enumerate(READS)] + [threading.Thread(target=monitor)]
    if kind != 'quick': ths.insert(0, threading.Thread(target=long_txn))
    for t in ths: t.start()
    for t in ths: t.join()
    with conn('bench') as c:
        c.execute('ALTER TABLE messages_big DROP COLUMN IF EXISTS q_flag')
    for e in ev: e['start'] = round(e['start'], 4); e['end'] = round(e['end'], 4); e['wait'] = round(e['end'] - e['start'], 4)
    ev.sort(key=lambda e: (e['start'], e['who']))
    reads = [e for e in ev if e['kind'] == 'read']
    summary = {'max_read_wait': max(e['wait'] for e in reads), 'reads_over_100ms': sum(e['wait'] > 0.1 for e in reads),
               'alter_attempts': max(e.get('attempt', 0) for e in ev), 'alter_done_at': max(e['end'] for e in ev if e['kind'] == 'alter' and e['outcome'] == 'done')}
    print(kind, summary, flush=True)
    return {'events': ev, 'snapshot': snap, 'summary': summary}

if __name__ == '__main__':
    start()
    with conn('chat') as c: ver = c.execute('SHOW server_version').fetchone()[0]
    runs = {}
    for rep in range(3):
        for k in ('long', 'timeout', 'quick'):
            runs.setdefault(k, []).append(scenario(k)); time.sleep(0.5)
    # keep the median run (by max read wait) of each scenario for the page, all summaries for the record
    out = {'date': datetime.date.today().isoformat(), 'postgres': ver, 'machine': platform.machine() + ' ' + platform.platform(),
           'plan': {'hold': HOLD, 'alter_at': ALTER_AT, 'reads': READS, 'snapshot_at': SNAP}, 'scenarios': {}}
    for k, rs in runs.items():
        rs2 = sorted(rs, key=lambda r: r['summary']['max_read_wait'])
        out['scenarios'][k] = dict(rs2[len(rs2) // 2], all_summaries=[r['summary'] for r in rs])
    save('queue.json', out)

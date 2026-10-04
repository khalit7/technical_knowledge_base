"""A transaction ID wraparound emergency, staged on a throwaway cluster (PostgreSQL 16.2). About 1 minute.

Two billion real transactions would take weeks, so the counter is moved instead: pg_resetwal -x sets the next transaction ID
to just short of the point where Postgres stops assigning new ones (oldest unfrozen ID + 2^31 - 3,000,000). The commit-status
file for that range is created as pg_resetwal's documentation describes. What holds the database back is real and common:
a prepared transaction (two-phase commit) that somebody forgot, created before the jump, which no VACUUM can freeze past.

Then: the warnings, the refusal, the diagnosis queries, the fix (ROLLBACK PREPARED, then VACUUM), and the ages afterwards.
Writes ../inputs/wraparound.json.
"""
import os, sys, time, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pgc import *

T = []
def rec(step, cmd, out, secs=None, **kw):
    T.append({'step': step, 'cmd': cmd, 'out': out, 'secs': secs, **kw}); print('==', step, secs, '\n', cmd, '\n', str(out)[:900], flush=True)

W = Cluster('wrap', 55470)
W.initdb()
W.conf(max_prepared_transactions=5, log_line_prefix='%m [%p] ', timezone='UTC', log_timezone='UTC', autovacuum_naptime='2s')
W.start()
W.psql('CREATE DATABASE chat', db='postgres')
W.psql("CREATE TABLE credits(user_id bigint PRIMARY KEY, balance int); INSERT INTO credits SELECT g, 100 FROM generate_series(1, 10000) g;")
W.psql("BEGIN; UPDATE credits SET balance = balance - 1 WHERE user_id = 42; PREPARE TRANSACTION 'refund-42';")
rec('prepared', 'SELECT gid, prepared, transaction FROM pg_prepared_xacts;', W.table('SELECT gid, prepared, transaction FROM pg_prepared_xacts'))
W.psql('VACUUM (FREEZE)', db='chat'); W.psql('VACUUM (FREEZE)', db='postgres'); W.psql('VACUUM (FREEZE)', db='template1')
W.stop()
ctl = sh(W.b('pg_controldata'), W.data).stdout
oldest = int(re.search(r"Latest checkpoint's oldestXID:\s+(\d+)", ctl).group(1))
target = oldest + 2**31 - 3_000_000 - 300
seg = target // (32 * 32768)
open(os.path.join(W.data, 'pg_xact', '%04X' % seg), 'wb').write(b'\0' * (32 * 8192))
r = sh(W.b('pg_resetwal'), '-x', target, '-D', W.data)
rec('resetwal', f'pg_resetwal -x {target:,} -D data   (oldestXID in pg_controldata: {oldest})', (r.stdout + r.stderr).strip(), None, oldest=oldest, target=target)
W.start()
first = W.psql("INSERT INTO credits VALUES (10001, 100)", tuples=False, ok_fail=True)
rec('warning', 'INSERT INTO credits VALUES (10001, 100);', first.strip())
# use up the remaining IDs, one small write transaction at a time
n, err = 0, ''
for i in range(400):
    out = W.psql(f"INSERT INTO credits VALUES ({20000 + i}, 1)", tuples=False, ok_fail=True)
    if 'ERROR' in out:
        err = out.strip(); break
    n += 1
rec('refused', 'INSERT INTO credits VALUES (...);  -- one at a time until refused', f'{n} more inserts succeeded, then:\n{err}', None, more=n)
reads = W.table("SELECT count(*) FROM credits")
rec('reads_ok', 'SELECT count(*) FROM credits;  -- reads still work', reads)
ages = "SELECT datname, age(datfrozenxid) AS xid_age, round(100.0 * age(datfrozenxid) / 2147483648, 1) AS pct_of_limit FROM pg_database ORDER BY 2 DESC"
rec('ages', ages + ';', W.table(ages, db='postgres'))
hold = """SELECT 'prepared xact' AS what, gid AS name, age(transaction) AS xid_age FROM pg_prepared_xacts
UNION ALL SELECT 'session', pid::text, age(backend_xmin) FROM pg_stat_activity WHERE backend_xmin IS NOT NULL AND pid <> pg_backend_pid()
UNION ALL SELECT 'slot', slot_name, greatest(age(xmin), age(catalog_xmin)) FROM pg_replication_slots ORDER BY 3 DESC NULLS LAST"""
rec('holders', '-- what is holding the oldest transaction ID back?\n' + hold + ';', W.table(hold, db='postgres'))
logw = [re.sub(r'^\S+ \S+ \S+ \[\d+\] ', '', l) for l in W.logtail(200) if 'far in the past' in l or 'HINT' in l and 'prepared' in l]
rec('autovac_log', 'server log (autovacuum keeps trying)', '\n'.join(list(dict.fromkeys(logw))[:3]))
t = time.time()
W.psql("ROLLBACK PREPARED 'refund-42'", db='chat')   # it must be finished from the database it was prepared in
out = []
for db in ('chat', 'postgres', 'template1'):
    W.psql('VACUUM (FREEZE)', db=db)
dt = round(time.time() - t, 2)
for _ in range(60):     # template0 does not accept connections: autovacuum freezes it on its own
    if int(W.one('SELECT max(age(datfrozenxid)) FROM pg_database', db='postgres')) < 10_000_000: break
    time.sleep(1)
rec('fix', "ROLLBACK PREPARED 'refund-42';  -- in database chat; then VACUUM (FREEZE) in each database", W.table(ages, db='postgres'), dt)
ok = W.psql("INSERT INTO credits VALUES (99999, 1)", tuples=False, ok_fail=True)
rec('writes_back', 'INSERT INTO credits VALUES (99999, 1);', ok.strip() or 'INSERT 0 1')
W.stop()
dump('wraparound.json', {'machine': machine(), 'version': '16.2 (pgserver wheel)', 'steps': T})

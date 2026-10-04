"""Backups and point-in-time recovery, for real, on the chat data (PostgreSQL 16.2, pgserver wheel). About 3 minutes.

1. A primary with WAL archiving on (archive_command copies each finished 16 MB WAL segment to an archive folder).
2. Load the chat data (1M messages). Take "last night's" logical dump (pg_dump -Fc) and a physical base backup
   (pg_basebackup), then verify the base backup (pg_verifybackup).
3. "The day": six batches of new messages, a few seconds apart. Note the time. Then the bad statement:
   DELETE FROM messages with its WHERE clause lost. Then two more good writes that happen after the mistake.
4. Recovery A: restore last night's dump into a fresh database: everything since the dump is gone.
5. Recovery B: copy the base backup, ask for recovery_target_time = just before the DELETE, replay archived WAL,
   promote. Count rows. Find the DELETE's commit record in the WAL with pg_waldump (recovery_target_xid is the alternative).
Writes ../inputs/pitr.json (commands, real output, timings).
"""
import os, sys, time, shutil, glob, re, subprocess
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pgc import *

T = []          # transcript: what was run, what came back
def rec(step, cmd, out, secs=None, **kw):
    T.append({'step': step, 'cmd': cmd, 'out': out, 'secs': secs, **kw}); print('==', step, secs, '\n', cmd, '\n', str(out)[:600], flush=True)

P = Cluster('pitr_primary', 55432)
ARCH = os.path.join(ROOT, 'pitr_archive'); BASE = os.path.join(ROOT, 'pitr_base'); DUMP = os.path.join(ROOT, 'pitr_nightly.dump')
for d in (ARCH, BASE):
    shutil.rmtree(d, ignore_errors=True)
os.makedirs(ARCH)
P.initdb()
P.conf(wal_level='replica', archive_mode='on', archive_command=f'test ! -f {ARCH}/%f && cp %p {ARCH}/%f',
       archive_timeout=0, max_wal_size='1GB', log_line_prefix='%m [%p] ', log_timezone='UTC', timezone='UTC')
P.start()
secs = load_chat(P)
rec('load', 'load the chat data (10k users, 100k chats, 1M messages)', P.table("SELECT count(*) AS messages, pg_size_pretty(pg_database_size('chat')) AS db_size FROM messages"), secs)

# ---- last night's logical dump ----
t = time.time(); r = sh(P.b('pg_dump'), '-h', '127.0.0.1', '-p', P.port, '-U', 'postgres', '-Fc', '-f', DUMP, 'chat', check=True); dt = round(time.time() - t, 2)
rec('dump', 'pg_dump -Fc -f nightly.dump chat', f'{os.path.getsize(DUMP)/2**20:.1f} MB written', dt, bytes=os.path.getsize(DUMP))
dump_time = P.one("SELECT to_char(now(), 'HH24:MI:SS.MS')")

# ---- physical base backup ----
t = time.time(); r = sh(P.b('pg_basebackup'), '-h', '127.0.0.1', '-p', P.port, '-U', 'postgres', '-D', BASE, '-X', 'stream', '-c', 'fast', '-P', '-v'); dt = round(time.time() - t, 2)
bb_out = '\n'.join(l for l in (r.stderr.splitlines()) if l.strip() and '\r' not in l)[-1500:]
size = sum(os.path.getsize(f) for f in glob.glob(BASE + '/**', recursive=True) if os.path.isfile(f))
rec('basebackup', 'pg_basebackup -D base -X stream -c fast -P -v', bb_out, dt, bytes=size)
t = time.time(); r = sh(P.b('pg_verifybackup'), BASE); dt = round(time.time() - t, 2)
rec('verify', 'pg_verifybackup base', (r.stdout + r.stderr).strip(), dt)

# ---- the day ----
rows_day = []
for i in range(6):
    P.psql(f"""INSERT INTO messages(chat_id, role, model, tokens, content, created_at)
SELECT 1 + (g % 100000), 'user', 'mini', 42, 'written today, batch {i+1}', now() FROM generate_series(1, 2000) g""")
    rows_day.append(P.one("SELECT to_char(now(), 'HH24:MI:SS.MS') || ' ' || count(*) FROM messages"))
    time.sleep(1.5)
before_count = int(P.one('SELECT count(*) FROM messages'))
good_time = P.one("SELECT now()::text")                     # the moment we will recover to
time.sleep(1.2)
t = time.time(); xid = P.one("BEGIN; DELETE FROM messages; SELECT txid_current(); COMMIT;"); dt = round(time.time() - t, 2); out = ''
# (txid_current() inside the same transaction gives the DELETE's transaction id, to find it in the WAL below)
del_time = P.one("SELECT now()::text")
rec('bad_delete', 'DELETE FROM messages;   -- meant: DELETE FROM messages WHERE chat_id = 4242;', out or 'DELETE ' + str(before_count), dt, before=before_count, good_time=good_time, del_time=del_time, xid=xid)
time.sleep(1.0)
P.psql("INSERT INTO messages(chat_id, role, model, tokens, content, created_at) VALUES (7, 'user', 'mini', 5, 'written after the mistake', now()), (8, 'user', 'mini', 5, 'also after', now())")
after = P.table("SELECT count(*) AS messages_left FROM messages")
rec('after', 'SELECT count(*) FROM messages;', after)
P.psql("SELECT pg_switch_wal()")                            # close the current WAL segment so it is archived now
time.sleep(2)
arch_files = sorted(os.path.basename(f) for f in glob.glob(ARCH + '/*'))
rec('archive', 'ls archive/  (WAL segments copied by archive_command)', f'{len(arch_files)} files, {arch_files[0]} .. {arch_files[-1]}', None, files=len(arch_files))

# ---- find the DELETE in the WAL ----
segs = sorted(glob.glob(ARCH + '/0000000100000000000000*'))
commit_lines, ndel = [], 0
if True:   # one call over the whole range, so records that cross a segment boundary are decoded too
    r = subprocess.run([P.b('pg_waldump'), '-p', ARCH, os.path.basename(segs[0]), os.path.basename(segs[-1])], capture_output=True, text=True, env={**os.environ, 'TZ': 'UTC'})
    for l in r.stdout.splitlines():
        if re.search(r'tx:\s+' + xid + ',', l):
            if 'COMMIT' in l: commit_lines.append(re.sub(r'\s+', ' ', l))
            elif 'DELETE' in l: ndel += 1
rec('waldump', f'pg_waldump <archived segments> | grep "tx: {xid}"', f'{ndel:,} Heap DELETE records for transaction {xid}, then:\n' + '\n'.join(commit_lines), None, ndel=ndel)
P.stop()

# ---- Recovery A: last night's dump ----
R = Cluster('pitr_from_dump', 55434); R.initdb(); R.conf(timezone='UTC'); R.start()
R.psql('CREATE DATABASE chat', db='postgres')
t = time.time(); r = sh(R.b('pg_restore'), '-h', '127.0.0.1', '-p', R.port, '-U', 'postgres', '-d', 'chat', '-j', '4', DUMP); dt = round(time.time() - t, 2)
cA = int(R.one('SELECT count(*) FROM messages'))
rec('restore_dump', 'createdb chat && pg_restore -j 4 -d chat nightly.dump', R.table("SELECT count(*) AS messages FROM messages"), dt, count=cA)
R.stop()

# ---- Recovery B: base backup + WAL replay to a moment ----
Q = Cluster('pitr_recovered', 55435)
shutil.rmtree(Q.dir, ignore_errors=True); os.makedirs(Q.dir)
t0 = time.time()
shutil.copytree(BASE, Q.data)
os.chmod(Q.data, 0o700)
with open(os.path.join(Q.data, 'postgresql.conf'), 'a') as f:
    f.write(f"archive_mode = off\nrestore_command = 'cp {ARCH}/%f %p'\nrecovery_target_time = '{good_time}'\nrecovery_target_action = 'promote'\n")
open(os.path.join(Q.data, 'recovery.signal'), 'w').close()
conf_shown = f"restore_command = 'cp /archive/%f %p'\nrecovery_target_time = '{good_time}'\nrecovery_target_action = 'promote'\n# plus an empty file named recovery.signal in the data directory"
Q.start()
for _ in range(600):
    if Q.one("SELECT pg_is_in_recovery()", db='postgres') == 'f':
        break
    time.sleep(0.2)
dt = round(time.time() - t0, 2)
cB = int(Q.one('SELECT count(*) FROM messages'))
log = [re.sub(r'^\S+ \S+ \S+ \[\d+\] ', '', l) for l in Q.logtail(40)]
keep = [l for l in log if any(k in l for k in ('starting point-in-time', 'restored log file', 'recovery stopping', 'redo done', 'selected new timeline', 'archive recovery complete', 'ready to accept', 'pausing', 'consistent recovery state'))]
rec('restore_pitr', 'cp -r base data && (set restore_command, recovery_target_time) && pg_ctl start', conf_shown, dt, count=cB, log=keep)
rec('pitr_count', 'SELECT count(*) FROM messages;', Q.table("SELECT count(*) AS messages, count(*) FILTER (WHERE content LIKE 'written today%') AS written_today FROM messages"))
tl = Q.one("SELECT timeline_id FROM pg_control_checkpoint()", db='postgres')
Q.stop()

dump('pitr.json', {'machine': machine(), 'version': '16.2 (pgserver wheel)', 'dump_taken_at': dump_time, 'day': rows_day,
                   'before_delete': before_count, 'good_time': good_time, 'delete_time': del_time,
                   'count_dump': cA, 'count_pitr': cB, 'lost_dump': before_count - cA, 'lost_pitr': before_count - cB,
                   'timeline_after': tl, 'steps': T})

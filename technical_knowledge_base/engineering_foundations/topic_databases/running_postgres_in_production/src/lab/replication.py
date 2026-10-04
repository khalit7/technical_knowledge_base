"""Streaming replication between two local PostgreSQL 16.2 instances, measured. About 6 minutes.

1. Primary plus a physical replication slot; replica made with pg_basebackup -R -S (it writes primary_conninfo and standby.signal).
2. Lag under write load: pgbench inserting chat messages with 8 clients for 20 s; pg_stat_replication sampled every 250 ms.
3. Replay paused on the replica for 10 s under the same load (stands in for a stuck or slow replica): replay_lag grows,
   write_lag and flush_lag do not; then resumed and caught up.
4. Synchronous replication: the same load with synchronous_commit off / local / remote_write / on / remote_apply.
5. The synchronous standby goes away: a commit waits (wait_event SyncRep) until cancelled; the warning Postgres prints.
6. The replica stops; its slot keeps WAL: retained bytes and pg_wal size grow; max_slot_wal_keep_size caps it and the
   slot is lost; the replica cannot resume (its log line).
7. Rebuild the replica, promote it (failover), write to both old and new primary (split brain), then pg_rewind the old
   primary and attach it as a replica of the new one.
Writes ../inputs/replication.json.
"""
import os, sys, time, shutil, subprocess, re, threading, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pgc import *

T = []
def rec(step, cmd, out, secs=None, **kw):
    T.append({'step': step, 'cmd': cmd, 'out': out, 'secs': secs, **kw}); print('==', step, secs, '\n', cmd, '\n', str(out)[:700], flush=True)

P = Cluster('rep_primary', 55440); S = Cluster('rep_replica', 55441)
for c in (S, P):
    c.stop(quiet=True)
P.initdb()
P.conf(wal_level='replica', max_wal_senders=10, max_replication_slots=10, wal_log_hints='on', hot_standby='on',
       max_wal_size='512MB', log_line_prefix='%m [%p] ', timezone='UTC', log_timezone='UTC')
P.hba('host replication all 127.0.0.1/32 trust')
P.start()
load_chat(P, users=10_000, chats=100_000, msgs=300_000)
INS = os.path.join(ROOT, 'insert.sql')
open(INS, 'w').write("\\set c random(1, 100000)\nINSERT INTO messages(chat_id, role, model, tokens, content, created_at) VALUES (:c, 'user', 'mini', 42, repeat('x', 120), now());\n")

def make_replica():
    S.stop(quiet=True); shutil.rmtree(S.dir, ignore_errors=True); os.makedirs(S.dir)
    t = time.time()
    r = sh(P.b('pg_basebackup'), '-h', '127.0.0.1', '-p', P.port, '-U', 'postgres', '-D', S.data, '-R', '-S', 'replica1', '-X', 'stream', '-c', 'fast')
    if r.returncode: raise RuntimeError(r.stderr)
    ac = os.path.join(S.data, 'postgresql.auto.conf')     # name the standby, so synchronous_standby_names can refer to it
    txt = open(ac).read().replace("primary_conninfo = '", "primary_conninfo = 'application_name=replica1 ")
    open(ac, 'w').write(txt)
    S.start(); return round(time.time() - t, 2)

P.psql("SELECT pg_create_physical_replication_slot('replica1')", db='postgres')
secs = make_replica()
auto = '\n'.join(l for l in open(os.path.join(S.data, 'postgresql.auto.conf')).read().splitlines() if l.startswith(('primary_conninfo', 'primary_slot')))
auto = re.sub(r"passfile=\S+ ", '', auto)
rec('basebackup', 'pg_basebackup -D replica -R -S replica1 -X stream -c fast && pg_ctl -D replica start', auto.replace(str(P.port), '5432'), secs)
time.sleep(1)
rec('stat_rep', 'SELECT application_name, state, sync_state, sent_lsn, replay_lsn FROM pg_stat_replication;',
    P.table('SELECT application_name, state, sync_state, sent_lsn, replay_lsn FROM pg_stat_replication', db='postgres'))
rec('is_replica', 'SELECT pg_is_in_recovery();  -- on the replica', S.table('SELECT pg_is_in_recovery()', db='postgres'))

LAGQ = """SELECT coalesce(round(extract(epoch FROM write_lag)*1000, 2), 0), coalesce(round(extract(epoch FROM flush_lag)*1000, 2), 0),
 coalesce(round(extract(epoch FROM replay_lag)*1000, 2), 0), pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn)::bigint
 FROM pg_stat_replication"""

def pgbench(secs, clients=8, port=None, extra=()):
    return subprocess.Popen([P.b('pgbench'), '-h', '127.0.0.1', '-p', str(port or P.port), '-U', 'postgres', '-n', '-c', str(clients), '-j', '4',
                             '-T', str(secs), '-f', INS, *extra, 'chat'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

def tps_of(out):
    m = re.search(r'tps = ([\d.]+)', out); l = re.search(r'latency average = ([\d.]+) ms', out)
    return (float(m.group(1)) if m else None, float(l.group(1)) if l else None)

def sample(dur, events=None):
    rows, t0 = [], time.time()
    while time.time() - t0 < dur:
        t = round(time.time() - t0, 2)
        if events:
            for at, fn, name in events:
                if at is not None and t >= at and not getattr(fn, 'done', False):
                    fn(); fn.done = True
        v = P.one(LAGQ, db='postgres')
        if v:
            w, f, r, b = v.split('|'); rows.append([t, float(w), float(f), float(r), int(b)])
        time.sleep(0.25)
    return rows

# ---- 2. lag under load ----
pb = pgbench(20); lag = sample(21); out = pb.communicate()[0]
tps, lat = tps_of(out)
rl = [r[3] for r in lag[4:-4]] or [0]
rec('lag_load', 'pgbench -c 8 -T 20 -f insert.sql  (and sample pg_stat_replication every 250 ms)', f'tps = {tps}; replay_lag median {statistics.median(rl):.2f} ms, max {max(rl):.2f} ms', 20, tps=tps, lat=lat, series=lag)

# ---- 3. replay paused ----
def pause(): S.psql('SELECT pg_wal_replay_pause()', db='postgres')
def resume(): S.psql('SELECT pg_wal_replay_resume()', db='postgres')
PAUSED = {}
def grab(): PAUSED['t'] = P.table("SELECT application_name, write_lag, flush_lag, replay_lag, pg_size_pretty(pg_wal_lsn_diff(sent_lsn, replay_lsn)) AS behind FROM pg_stat_replication", db='postgres')
pb = pgbench(16); lagp = sample(22, events=[(3, pause, 'pause'), (12.5, grab, 'grab'), (13, resume, 'resume')]); out = pb.communicate()[0]
mx = max(lagp, key=lambda r: r[3])
rec('lag_pause', "SELECT pg_wal_replay_pause();  -- on the replica, 3 s into the load; pg_wal_replay_resume() at 13 s",
    f'replay_lag peaked at {mx[3]/1000:.1f} s with {mx[4]/2**20:.1f} MB not yet replayed; write_lag stayed {max(r[1] for r in lagp):.1f} ms at most',
    22, series=lagp, paused=[3, 13])
rec('stat_rep_lag', 'SELECT application_name, write_lag, flush_lag, replay_lag, pg_wal_lsn_diff(sent_lsn, replay_lsn) FROM pg_stat_replication;  -- 9.5 s into the pause', PAUSED.get('t'))

# ---- 4. synchronous commit levels ----
sync = []
for mode, names in [('off', ''), ('local', ''), ('on (no synchronous standby)', ''), ('remote_write', 'replica1'), ('on', 'replica1'), ('remote_apply', 'replica1')]:
    P.psql(f"ALTER SYSTEM SET synchronous_standby_names = '{names}'", db='postgres'); P.psql('SELECT pg_reload_conf()', db='postgres'); time.sleep(0.5)
    sc = mode.split(' ')[0]
    pb = subprocess.Popen([P.b('pgbench'), '-h', '127.0.0.1', '-p', str(P.port), '-U', 'postgres', '-n', '-c', '8', '-j', '4', '-T', '10', '-f', INS, 'chat'],
        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env={**os.environ, 'PGOPTIONS': f'-c synchronous_commit={sc}'})
    out = pb.communicate(timeout=60)[0]; tps, lat = tps_of(out)
    sync.append({'mode': mode, 'standby': names or '(none)', 'tps': tps, 'lat_ms': lat}); print(sync[-1], flush=True)
rec('sync', 'pgbench -c 8 -T 10 for each synchronous_commit level', '\n'.join(f"{s['mode']:<28} standby={s['standby']:<9} tps={s['tps']} latency={s['lat_ms']} ms" for s in sync), 60, rows=sync)

# ---- 5. the synchronous standby goes away ----
P.psql("ALTER SYSTEM SET synchronous_standby_names = 'replica1'", db='postgres'); P.psql('SELECT pg_reload_conf()', db='postgres')
S.stop()
hang = subprocess.Popen([P.b('psql'), '-h', '127.0.0.1', '-p', str(P.port), '-U', 'postgres', '-X', '-c',
                         "INSERT INTO messages(chat_id, role, model, tokens, content, created_at) VALUES (1, 'user', 'mini', 1, 'waiting for the standby', now())", 'chat'],
                        stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
time.sleep(4)
waiting = P.table("SELECT pid, state, wait_event_type, wait_event, now() - query_start AS waiting_for, left(query, 30) AS query FROM pg_stat_activity WHERE wait_event = 'SyncRep'", db='postgres')
P.psql("SELECT pg_cancel_backend(pid) FROM pg_stat_activity WHERE wait_event = 'SyncRep'", db='postgres')
o, e = hang.communicate(timeout=30)
visible = P.one("SELECT count(*) FROM messages WHERE content = 'waiting for the standby'")
rec('sync_down', 'INSERT ... ;  -- synchronous standby stopped; after 4 s: pg_stat_activity, then pg_cancel_backend(pid)', waiting + '\n\n' + (o + e).strip(), 4, visible_after_cancel=visible)
P.psql("ALTER SYSTEM SET synchronous_standby_names = ''", db='postgres'); P.psql('SELECT pg_reload_conf()', db='postgres')

# ---- 6. a stopped replica's slot keeps WAL ----
SLOTQ = "SELECT slot_name, active, wal_status, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained, pg_size_pretty(safe_wal_size) AS safe_wal_size FROM pg_replication_slots"
WALDIR = "SELECT pg_size_pretty(sum(size)) FROM pg_ls_waldir()"
ret = []
def snap(label):
    P.psql('CHECKPOINT', db='postgres')
    r = P.one("SELECT wal_status, pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)::bigint, (SELECT sum(size) FROM pg_ls_waldir())::bigint FROM pg_replication_slots", db='postgres')
    ws, rb, wd = r.split('|'); ret.append({'label': label, 'wal_status': ws, 'retained': int(rb) if rb else None, 'pg_wal': int(wd)}); print(ret[-1], flush=True)
snap('replica stopped')
for i in range(4):
    P.psql('UPDATE messages SET tokens = tokens + 1 WHERE id <= 200000')   # rewrites 200k rows: a few hundred MB of WAL
    snap(f'after update {i+1} (200k rows)')
rec('slot_grow', SLOTQ + ';', P.table(SLOTQ, db='postgres') + '\n\n' + 'pg_wal directory: ' + P.one(WALDIR, db='postgres'))
P.psql("ALTER SYSTEM SET max_slot_wal_keep_size = '256MB'", db='postgres'); P.psql('SELECT pg_reload_conf()', db='postgres')
for i in range(3):
    P.psql('UPDATE messages SET tokens = tokens + 1 WHERE id <= 200000')
    snap(f'max_slot_wal_keep_size = 256MB, update {i+1}')
rec('slot_lost', "ALTER SYSTEM SET max_slot_wal_keep_size = '256MB'; ... ; " + SLOTQ + ';', P.table(SLOTQ, db='postgres') + '\n\npg_wal directory: ' + P.one(WALDIR, db='postgres'))
S.start(wait=False); time.sleep(5)
bad = [re.sub(r'^\S+ \S+ \S+ \[\d+\] ', '', l) for l in S.logtail(30) if 'removed' in l or 'invalidated' in l or 'FATAL' in l or 'could not' in l]
rec('replica_cannot_resume', 'pg_ctl -D replica start  (then read its log)', '\n'.join(dict.fromkeys(bad[-4:])))
S.stop(quiet=True)

# ---- 7. failover, split brain, pg_rewind ----
P.psql("SELECT pg_drop_replication_slot('replica1')", db='postgres')
P.psql("ALTER SYSTEM RESET max_slot_wal_keep_size", db='postgres')
P.psql("ALTER SYSTEM SET wal_keep_size = '1GB'", db='postgres')   # pg_rewind needs the old primary's WAL back to the last common checkpoint
P.psql('SELECT pg_reload_conf()', db='postgres')
P.psql("SELECT pg_create_physical_replication_slot('replica1')", db='postgres')
secs = make_replica(); size = P.one("SELECT pg_size_pretty(pg_database_size('chat'))")
rec('rebuild', 'pg_basebackup again (the only way back for a replica that lost its WAL)', f'database {size}; full copy and start in {secs} s', secs)
time.sleep(1)
t = time.time(); r = sh(S.b('pg_ctl'), '-D', S.data, 'promote', '-w'); pdt = round(time.time() - t, 2)
rec('promote', 'pg_ctl -D replica promote', (r.stdout + r.stderr).strip(), pdt)
P.psql("INSERT INTO messages(chat_id, role, model, tokens, content, created_at) VALUES (1, 'user', 'mini', 1, 'written to the OLD primary', now())")
S.psql("INSERT INTO messages(chat_id, role, model, tokens, content, created_at) VALUES (1, 'user', 'mini', 1, 'written to the NEW primary', now())")
q = "SELECT id, content FROM messages WHERE content LIKE 'written to the%' ORDER BY id"
rec('split_brain', q + ';  -- on each side', 'old primary:\n' + P.table(q) + '\n\nnew primary:\n' + S.table(q))
P.stop()
t = time.time()
r = sh(P.b('pg_rewind'), '--target-pgdata', P.data, '--source-server', f'host=127.0.0.1 port={S.port} user=postgres dbname=postgres', '--progress', '--write-recovery-conf')
rdt = round(time.time() - t, 2)
rew = '\n'.join(l for l in (r.stdout + r.stderr).splitlines() if l.strip() and 'kB' not in l or 'Done' in l)
rec('rewind', 'pg_rewind --target-pgdata old_primary --source-server "host=new-primary ..." --write-recovery-conf', rew, rdt)
P.start(); time.sleep(2)
rec('rejoined', q + ';  -- on the old primary, now a replica', 'pg_is_in_recovery = ' + P.one('SELECT pg_is_in_recovery()', db='postgres') + '\n' + P.table(q))
P.stop(); S.stop()
dump('replication.json', {'machine': machine(), 'version': '16.2 (pgserver wheel)', 'steps': T, 'retention': ret, 'sync': sync})

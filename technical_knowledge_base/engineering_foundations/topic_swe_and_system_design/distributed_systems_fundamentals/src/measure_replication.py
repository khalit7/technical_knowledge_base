"""Real Postgres streaming replication on one laptop: how often does a read on the replica, sent right after a write
on the primary commits, miss that write? And what does each fix cost?
Binaries come from the pgserver wheel (nothing installed system-wide). Run from this folder, outside the repo venv:
  uv run --no-project --python 3.12 --with pgserver --with 'psycopg[binary]' python measure_replication.py  -> inputs/replication_local.json
Modes (same 2,000 single-row INSERTs each, one client, TCP loopback, a fresh table per mode):
  async          synchronous_standby_names empty: commit returns after the primary's own WAL flush
  sync_on        synchronous_standby_names = 'r1', synchronous_commit = on: commit waits until the replica has FLUSHED the WAL
  remote_apply   synchronous_commit = remote_apply: commit waits until the replica has REPLAYED it (made it visible)
  async_lsn_wait async, but the reader first waits until the replica's pg_last_wal_replay_lsn() reaches the writer's
                 commit position (read-your-writes done by the client)
For each write: write latency (INSERT + commit), then an immediate read on the replica: found or not; when not found,
poll every 50 microseconds until it is, and record the time until visible. Takes about a minute."""
import os, json, time, subprocess, tempfile, datetime, platform, shutil, statistics as st
import pgserver, psycopg

B = os.path.join(os.path.dirname(pgserver.__file__), 'pginstall', 'bin')
root = tempfile.mkdtemp(prefix='pgrep'); P1, P2 = '54401', '54402'
d1, d2 = os.path.join(root, 'primary'), os.path.join(root, 'replica')
N = 2000
def sh(*a): return subprocess.run(list(a), capture_output=True, text=True)
def ctl(data, port, act):
    r = sh(f'{B}/pg_ctl', '-D', data, '-o', f'-p {port} -k {root}', '-l', data + '.log', '-w', '-m', 'fast', act)
    if r.returncode: raise SystemExit(r.stdout + r.stderr + open(data + '.log').read()[-2000:])
sh(f'{B}/initdb', '-D', d1, '-U', 'postgres', '--auth=trust')
ctl(d1, P1, 'start')
r = sh(f'{B}/pg_basebackup', '-h', '127.0.0.1', '-p', P1, '-U', 'postgres', '-D', d2, '-R', '-X', 'stream')
if r.returncode: raise SystemExit(r.stderr)
with open(os.path.join(d2, 'postgresql.auto.conf'), 'a') as f:  # name the replica so the primary can wait for it
    f.write(f"\nprimary_conninfo = 'host=127.0.0.1 port={P1} user=postgres application_name=r1'\n")
ctl(d2, P2, 'start')
pri = psycopg.connect(f'host=127.0.0.1 port={P1} user=postgres dbname=postgres', autocommit=True)
rep = psycopg.connect(f'host=127.0.0.1 port={P2} user=postgres dbname=postgres', autocommit=True)
ver = pri.execute('show server_version').fetchone()[0]

def configure(sync_names, sync_commit):
    pri.execute(f"alter system set synchronous_standby_names = '{sync_names}'")
    pri.execute(f"alter system set synchronous_commit = '{sync_commit}'")
    pri.execute('select pg_reload_conf()'); time.sleep(1.0)
    return pri.execute('select sync_state from pg_stat_replication').fetchone()[0]

def q(xs, p): xs = sorted(xs); return xs[min(len(xs) - 1, int(p * len(xs)))]
def run(mode, lsn_wait=False):
    tbl = 't_' + mode
    pri.execute(f'create table {tbl}(id int primary key, v text)')
    time.sleep(0.5)
    while not rep.execute(f"select to_regclass('{tbl}') is not null").fetchone()[0]: time.sleep(0.01)
    wl, stale, vis, waits = [], 0, [], []
    for i in range(N):
        t0 = time.perf_counter()
        pri.execute(f'insert into {tbl} values (%s, %s)', (i, 'msg'))
        if lsn_wait: lsn = pri.execute('select pg_current_wal_insert_lsn()').fetchone()[0]
        t1 = time.perf_counter(); wl.append((t1 - t0) * 1e3)
        if lsn_wait:  # read-your-writes: wait for the replica to replay up to the writer's position
            while not rep.execute('select pg_last_wal_replay_lsn() >= %s::pg_lsn', (lsn,)).fetchone()[0]: pass
            waits.append((time.perf_counter() - t1) * 1e3)
        if rep.execute(f'select 1 from {tbl} where id = %s', (i,)).fetchone() is None:
            stale += 1
            while rep.execute(f'select 1 from {tbl} where id = %s', (i,)).fetchone() is None: time.sleep(0.00005)
            vis.append((time.perf_counter() - t1) * 1e3)
    out = {'writes': N, 'stale_reads': stale, 'stale_pct': round(100 * stale / N, 2),
           'write_ms_median': round(st.median(wl), 3), 'write_ms_p99': round(q(wl, .99), 3)}
    if vis: out.update(visible_after_ms_median=round(st.median(vis), 3), visible_after_ms_max=round(max(vis), 3))
    if waits: out.update(lsn_wait_ms_median=round(st.median(waits), 3), lsn_wait_ms_p99=round(q(waits, .99), 3))
    return out

res = {'date': datetime.date.today().isoformat(), 'postgres': ver,
       'machine': 'Apple M1 Pro laptop (10 cores, 16 GB), macOS ' + platform.mac_ver()[0] + '; primary and replica on the same machine, TCP loopback',
       'n_per_mode': N, 'modes': {}}
for mode, names, sc, lw in [('async', '', 'on', False), ('sync_on', 'r1', 'on', False),
                            ('remote_apply', 'r1', 'remote_apply', False), ('async_lsn_wait', '', 'on', True)]:
    state = configure(names, sc)
    res['modes'][mode] = dict(run(mode, lw), synchronous_standby_names=names, synchronous_commit=sc, replica_sync_state=state)
    print(mode, json.dumps(res['modes'][mode]), flush=True)
pri.close(); rep.close()
ctl(d2, P2, 'stop'); ctl(d1, P1, 'stop'); shutil.rmtree(root, ignore_errors=True)
os.makedirs('inputs', exist_ok=True)
json.dump(res, open('inputs/replication_local.json', 'w'), indent=1)
print(json.dumps(res, indent=1))

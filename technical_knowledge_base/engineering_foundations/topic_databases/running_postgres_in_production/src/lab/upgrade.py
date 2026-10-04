"""Major version upgrade 16 -> 17, two ways, on the chat data (1M messages). About 3 minutes.

Old: PostgreSQL 16.2 (pgserver wheel). New: PostgreSQL 17 from conda-forge (PG17_BIN), installed into a scratch folder.
A. pg_upgrade: --check, then copy mode, then (on a fresh new cluster) --link mode; the old server is down for the whole run.
B. Logical replication: a 17 subscriber copies the 16 publisher's tables while the old one keeps taking writes; then the
   cutover trap: sequences are not replicated, so the first insert on the new primary collides; fixed with setval.
Writes ../inputs/upgrade.json.
"""
import os, sys, time, shutil, subprocess, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pgc import *
assert B17, 'set PG17_BIN'

T = []
def rec(step, cmd, out, secs=None, **kw):
    T.append({'step': step, 'cmd': cmd, 'out': out, 'secs': secs, **kw}); print('==', step, secs, '\n', cmd, '\n', str(out)[:900], flush=True)

O = Cluster('up16', 55480); N = Cluster('up17', 55481, bindir=B17)
O.initdb(); O.conf(timezone='UTC', wal_level='logical'); O.start()
load_chat(O)
v_old = O.one('SHOW server_version'); size = O.one("SELECT pg_size_pretty(pg_database_size('chat'))")
O.stop()
WD = os.path.join(ROOT, 'upgrade_work'); shutil.rmtree(WD, ignore_errors=True); os.makedirs(WD)

def new17():
    N.initdb()
SOCK = os.path.expanduser('~/.rpg_sock')   # pg_upgrade's Unix socket path must stay under 103 bytes; removed at the end
os.makedirs(SOCK, exist_ok=True)
def upgrade(*mode):
    t = time.time()
    r = subprocess.run([N.b('pg_upgrade'), '-b', B16, '-B', B17, '-d', O.data, '-D', N.data, '-U', 'postgres', '-p', '55490', '-P', '55491',
                        '--socketdir', SOCK, *mode], capture_output=True, text=True, cwd=WD)
    if r.returncode != 0:
        raise RuntimeError(r.stdout[-2000:] + r.stderr)
    return r, round(time.time() - t, 2)

new17()
r, dt = upgrade('--check')
rec('check', 'pg_upgrade -b old/bin -B new/bin -d old/data -D new/data --check', '\n'.join(l for l in r.stdout.splitlines() if l.strip())[-1200:], dt)
r, dt = upgrade()
clean = lambda s: '\n'.join(l.rstrip() for l in s.replace('\r', '\n').splitlines() if l.strip())   # full output; the page shows a selection
rec('copy', 'pg_upgrade ... (copy mode: every data file copied)', clean(r.stdout), dt, version_old=v_old, size=size)
new17()
r, dt = upgrade('--link')
rec('link', 'pg_upgrade ... --link (hard links: no data copied; the old cluster must not be started again)', clean(r.stdout), dt)
N.conf(timezone='UTC'); N.start()
v_new = N.one('SHOW server_version', db='postgres')
st = N.table("SELECT relname, n_live_tup, last_analyze, last_autoanalyze FROM pg_stat_user_tables WHERE relname = 'messages'")
rec('stats_after', "SELECT relname, n_live_tup, last_analyze FROM pg_stat_user_tables;  -- on the new 17 server", st)
t = time.time(); sh(N.b('vacuumdb'), '-h', '127.0.0.1', '-p', N.port, '-U', 'postgres', '--all', '--analyze-in-stages'); dta = round(time.time() - t, 2)
rec('analyze', 'vacuumdb --all --analyze-in-stages', f'{dta} s', dta)
N.stop()

# ---- B. logical replication ----
O.initdb(); O.conf(timezone='UTC', wal_level='logical'); O.start(); load_chat(O)
N.initdb(); N.conf(timezone='UTC'); N.start()
schema = sh(O.b('pg_dump'), '-h', '127.0.0.1', '-p', O.port, '-U', 'postgres', '--schema-only', 'chat', check=True).stdout
N.psql('CREATE DATABASE chat', db='postgres')
r = subprocess.run([N.b('psql'), '-h', '127.0.0.1', '-p', str(N.port), '-U', 'postgres', '-X', '-q', 'chat'], input=schema, capture_output=True, text=True)
O.psql('CREATE PUBLICATION upgrade FOR ALL TABLES')
t = time.time()
N.psql(f"CREATE SUBSCRIPTION upgrade CONNECTION 'host=127.0.0.1 port={O.port} user=postgres dbname=chat' PUBLICATION upgrade")
for _ in range(600):
    if N.one("SELECT count(*) FROM pg_subscription_rel WHERE srsubstate <> 'r'") == '0': break
    time.sleep(0.25)
dsync = round(time.time() - t, 2)
rec('sync', "CREATE PUBLICATION upgrade FOR ALL TABLES;  -- on 16\nCREATE SUBSCRIPTION upgrade CONNECTION '...' PUBLICATION upgrade;  -- on 17, after copying the schema with pg_dump --schema-only",
    f'initial copy of every table finished in {dsync} s', dsync)
INS = os.path.join(ROOT, 'insert.sql')
open(INS, 'w').write("\\set c random(1, 100000)\nINSERT INTO messages(chat_id, role, model, tokens, content, created_at) VALUES (:c, 'user', 'mini', 42, repeat('x', 120), now());\n")
pb = subprocess.Popen([O.b('pgbench'), '-h', '127.0.0.1', '-p', str(O.port), '-U', 'postgres', '-n', '-c', '4', '-j', '2', '-T', '10', '-f', INS, 'chat'], stdout=subprocess.PIPE, text=True)
lags = []
for _ in range(36):
    v = O.one("SELECT coalesce(pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn), 0)::bigint FROM pg_replication_slots WHERE slot_name = 'upgrade'", db='chat')
    lags.append(int(v or 0)); time.sleep(0.3)
out = pb.communicate()[0]; tps = re.search(r'tps = ([\d.]+)', out).group(1)
time.sleep(2)
c_old, c_new = O.one('SELECT count(*) FROM messages'), N.one('SELECT count(*) FROM messages')
rec('stream', 'pgbench -c 4 -T 10 on the 16 publisher while the 17 subscriber follows', f'{float(tps):,.0f} inserts/s on 16; slot behind by at most {max(lags)/2**20:.1f} MB\nrows: 16 has {c_old}, 17 has {c_new}', 10, lag_bytes=lags)
seq = "SELECT last_value FROM messages_id_seq"
s_old, s_new = O.one(seq), N.one(seq)
N.psql('ALTER SUBSCRIPTION upgrade DISABLE')
boom = N.psql("INSERT INTO messages(chat_id, role, model, tokens, content, created_at) VALUES (1, 'user', 'mini', 1, 'first write on 17', now())", tuples=False, ok_fail=True)
rec('seq_trap', seq + ';  -- on each side, then the first INSERT on 17', f'16: last_value {s_old}\n17: last_value {s_new}\n\n' + boom.strip())
N.psql(f"SELECT setval('messages_id_seq', {s_old})")
ok = N.psql("INSERT INTO messages(chat_id, role, model, tokens, content, created_at) VALUES (1, 'user', 'mini', 1, 'first write on 17', now())", tuples=False, ok_fail=True)
rec('seq_fix', f"SELECT setval('messages_id_seq', {s_old});  -- copied from 16 at cutover; then the INSERT again", ok.strip() or 'INSERT 0 1')
N.psql('DROP SUBSCRIPTION upgrade')
O.stop(); N.stop()
shutil.rmtree(SOCK, ignore_errors=True)
dump('upgrade.json', {'machine': machine(), 'old': v_old, 'new': v_new, 'size': size, 'steps': T})

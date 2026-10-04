"""M2: what the write-ahead log costs. PostgreSQL 16.2 + pg_walinspect.
  a. one INSERT just after a CHECKPOINT and a second INSERT into the same pages: WAL records, full-page images (FPI), bytes,
     with full_page_writes on and off;
  b. 1,000 UPDATEs of random rows of the 1M-message table (each on a different page) after a CHECKPOINT: WAL bytes with
     full_page_writes on, off, and on with wal_compression = pglz; and the same 1,000 UPDATEs again (pages already imaged);
  c. commit cost: pgbench (simple-update-like custom script, 20 s per run) with wal_sync_method = fsync_writethrough (a real
     flush on macOS) and synchronous_commit on against off, at 1 and 32 clients.
Writes inputs/m2_wal.json. About 4 minutes.
"""
import sys, os, time, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sepg import *
pg = pg16('m2', 54771).init(fresh=True); print(pg.start())
pg.psql('CREATE DATABASE chat', 'postgres'); pg.psql('CREATE EXTENSION pg_walinspect')
R = {'pg_version': pg.psql('SHOW server_version'), 'date': time.strftime('%Y-%m-%d')}
pg.psql(messages_sql()); pg.psql('CREATE INDEX messages_chat_idx ON messages(chat_id)'); pg.psql('VACUUM ANALYZE messages')
lsn = lambda: pg.psql('SELECT pg_current_wal_lsn()')
def records(a, b):
    rows = pg.jsql(f"""SELECT resource_manager rm, record_type, record_length len, fpi_length fpi, block_ref FROM pg_get_wal_records_info('{a}', '{b}')""")
    for r in rows: r['block_ref'] = (r['block_ref'] or '')[:160]
    return rows
def setconf(**kw):
    for k, v in kw.items(): pg.psql(f"ALTER SYSTEM SET {k} = '{v}'", 'postgres')
    pg.psql('SELECT pg_reload_conf()', 'postgres'); time.sleep(0.3)

# a. one insert after a checkpoint, then a second one
R['one_insert'] = {}
for fpw in ['on', 'off']:
    setconf(full_page_writes=fpw)
    pg.psql('CHECKPOINT'); a = lsn()
    pg.psql("INSERT INTO messages VALUES (1000001, 42000, 'user', 'mini', 12, 'is a B-tree always 4 levels deep?', now())"); b = lsn()
    pg.psql("INSERT INTO messages VALUES (1000002, 42000, 'assistant', 'mini', 80, 'no: it depends on the number of keys and their size', now())"); c = lsn()
    R['one_insert'][fpw] = {'first': records(a, b), 'first_bytes': int(pg.psql(f"SELECT '{b}'::pg_lsn - '{a}'")),
                            'second': records(b, c), 'second_bytes': int(pg.psql(f"SELECT '{c}'::pg_lsn - '{b}'"))}
    pg.psql('DELETE FROM messages WHERE id > 1000000'); pg.psql('VACUUM messages')
# b. 1,000 random-row updates after a checkpoint
ids = pg.psql("SELECT string_agg(id::text, ',') FROM (SELECT id FROM messages ORDER BY hashtext(id::text) LIMIT 1000) s")
pages = int(pg.psql(f"SELECT count(DISTINCT (ctid::text::point)[0]) FROM messages WHERE id IN ({ids})"))
R['random_updates'] = {'rows': 1000, 'distinct_heap_pages': pages, 'runs': []}
for fpw, comp in [('on', 'off'), ('off', 'off'), ('on', 'pglz')]:
    setconf(full_page_writes=fpw, wal_compression=comp)
    pg.psql('CHECKPOINT'); a = lsn()
    pg.psql(f"UPDATE messages SET tokens = tokens + 1 WHERE id IN ({ids})"); b = lsn()
    pg.psql(f"UPDATE messages SET tokens = tokens + 1 WHERE id IN ({ids})"); c = lsn()
    st = pg.jsql(f"""SELECT "resource_manager/record_type" rm, count, record_size, fpi_size, combined_size FROM pg_get_wal_stats('{a}', '{b}') WHERE count > 0 ORDER BY combined_size DESC""")
    R['random_updates']['runs'].append({'full_page_writes': fpw, 'wal_compression': comp,
        'first_bytes': int(pg.psql(f"SELECT '{b}'::pg_lsn - '{a}'")), 'second_bytes': int(pg.psql(f"SELECT '{c}'::pg_lsn - '{b}'")), 'stats_first': st,
        'fpi_records_first': int(pg.psql(f"SELECT count(*) FILTER (WHERE fpi_length > 0) FROM pg_get_wal_records_info('{a}', '{b}')")),
        'records_first': int(pg.psql(f"SELECT count(*) FROM pg_get_wal_records_info('{a}', '{b}')")),
        'fpi_records_second': int(pg.psql(f"SELECT count(*) FILTER (WHERE fpi_length > 0) FROM pg_get_wal_records_info('{b}', '{c}')"))})
    print(R['random_updates']['runs'][-1]['first_bytes'], R['random_updates']['runs'][-1]['second_bytes'], flush=True)
setconf(full_page_writes='on', wal_compression='off')
R['hot_after'] = pg.jsql("SELECT n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname = 'messages'")
# c. commit cost with a real flush
B = pg.B
pg.psql('CREATE TABLE credits(user_id int PRIMARY KEY, balance int NOT NULL); INSERT INTO credits SELECT g, 1000 FROM generate_series(1, 10000) g')
open('m2_bench.sql', 'w').write("\\set u random(1, 10000)\nUPDATE credits SET balance = balance - 1 WHERE user_id = :u;\n")
setconf(wal_sync_method='fsync_writethrough')
R['commit'] = {'wal_sync_method': 'fsync_writethrough', 'seconds': 20, 'runs': []}
for sc in ['on', 'off']:
    setconf(synchronous_commit=sc)
    for cl in [1, 32]:
        r = sh(f'{B}/pgbench', '-h', '127.0.0.1', '-p', pg.port, '-U', 'postgres', '-n', '-f', 'm2_bench.sql', '-c', str(cl), '-j', str(min(cl, 8)), '-T', '20', 'chat')
        tps = float(re.search(r'tps = ([\d.]+)', r.stdout).group(1)); lat = float(re.search(r'latency average = ([\d.]+)', r.stdout).group(1))
        R['commit']['runs'].append({'synchronous_commit': sc, 'clients': cl, 'tps': round(tps), 'latency_ms': lat}); print(R['commit']['runs'][-1], flush=True)
R['settings'] = dict(l.split('|') for l in pg.psql("SELECT name, setting FROM pg_settings WHERE name IN ('wal_segment_size','checkpoint_timeout','max_wal_size','checkpoint_completion_target','wal_buffers','wal_writer_delay','commit_delay','full_page_writes','wal_level')").splitlines())
pg.stop()
save(R, 'm2_wal.json')

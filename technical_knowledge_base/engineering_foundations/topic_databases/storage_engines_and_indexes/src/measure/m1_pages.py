"""M1: what real pages look like. PostgreSQL 16.2 + pageinspect on the root's 1M-message table.
Writes inputs/m1_pages.json: a heap page header and its tuples, an UPDATE seen in the page (old version, new version, HOT),
the B-tree on chat_id (metapage, root, a leaf), TOAST of a long message, the free space map and visibility map,
what a sequential scan leaves in shared_buffers (ring buffer), and a crash recovery log.
Run: SE_PG16=... SE_DATA=... python3 m1_pages.py   (about 1 minute)
"""
import sys, os, time, signal, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from sepg import *
pg = pg16('m1', 54771).init(fresh=True); print(pg.start())
pg.psql('CREATE DATABASE chat', 'postgres')
pg.psql('CREATE EXTENSION pageinspect; CREATE EXTENSION pg_visibility; CREATE EXTENSION pgstattuple; CREATE EXTENSION pg_buffercache; CREATE EXTENSION pg_freespacemap')
R = {'pg_version': pg.psql('SHOW server_version'), 'date': time.strftime('%Y-%m-%d')}
t = time.time(); pg.psql(messages_sql()); pg.psql('VACUUM ANALYZE messages'); R['load_s'] = round(time.time() - t, 1)
pg.psql('CREATE INDEX messages_chat_idx ON messages(chat_id)')
R['files'] = pg.jsql("SELECT pg_relation_filepath('messages') AS heap, pg_relation_filepath('messages_chat_idx') AS idx, current_setting('block_size') AS block_size, current_setting('segment_size') AS segment_size")
R['sizes'] = pg.jsql("""SELECT pg_relation_size('messages') heap, pg_relation_size('messages','fsm') fsm, pg_relation_size('messages','vm') vm,
  pg_relation_size('messages_pkey') pkey, pg_relation_size('messages_chat_idx') chat_idx, (SELECT count(*) FROM messages) nrows""")
# heap page 0
R['page0_header'] = pg.jsql("SELECT * FROM page_header(get_raw_page('messages', 0))")
R['page0_items'] = pg.jsql("""SELECT lp, lp_off, lp_flags, lp_len, t_xmin::text, t_xmax::text, t_ctid::text, t_infomask2, t_infomask, t_hoff
  FROM heap_page_items(get_raw_page('messages', 0)) ORDER BY lp""")
R['page0_rows'] = pg.jsql("SELECT ctid::text AS tid, id, chat_id, role, model, tokens, left(content, 24) AS content_start, length(content) AS content_len, created_at::text FROM messages WHERE ctid >= '(0,0)' AND ctid < '(1,0)' ORDER BY messages.ctid")
R['tuples_per_page'] = pg.jsql("SELECT min(n), max(n), round(avg(n),1) avg FROM (SELECT (ctid::text::point)[0] p, count(*) n FROM messages GROUP BY 1) s")
R['pgstattuple'] = pg.jsql("SELECT * FROM pgstattuple('messages')")
# an UPDATE seen inside the page: page 1 has free space? first make room: fillfactor default 100, page full -> non-HOT likely
pg.psql("UPDATE messages SET tokens = tokens + 1 WHERE id = 60")
R['after_update_page'] = pg.jsql("""SELECT lp, lp_off, lp_flags, lp_len, t_xmin::text, t_xmax::text, t_ctid::text, t_infomask2 FROM heap_page_items(get_raw_page('messages', (SELECT 1)))
  WHERE lp <= 3 OR t_xmax::text <> '0' ORDER BY lp""")
R['update_new_ctid'] = pg.psql("SELECT ctid::text FROM messages WHERE id = 60")
R['update_old_page'] = pg.jsql("""SELECT lp, t_xmin::text, t_xmax::text, t_ctid::text, t_infomask2 FROM heap_page_items(get_raw_page('messages', 1)) WHERE t_xmax::text <> '0'""")
# HOT: a table with fillfactor 90 leaves room, the same update stays on the page
pg.psql("CREATE TABLE m_ff (LIKE messages) WITH (fillfactor = 90); INSERT INTO m_ff SELECT * FROM messages WHERE id <= 2000; CREATE INDEX ON m_ff(chat_id); ALTER TABLE m_ff ADD PRIMARY KEY (id)"); pg.psql("VACUUM ANALYZE m_ff")
pg.psql("UPDATE m_ff SET tokens = tokens + 1 WHERE id = 10")
R['hot_page'] = pg.jsql("""SELECT lp, lp_off, lp_len, t_xmin::text, t_xmax::text, t_ctid::text, t_infomask2,
  (t_infomask2 & 16384) > 0 AS hot_updated, (t_infomask2 & 32768) > 0 AS heap_only FROM heap_page_items(get_raw_page('m_ff', 0)) WHERE t_xmax::text <> '0' OR (t_infomask2 & 32768) > 0""")
R['hot_new_ctid'] = pg.psql("SELECT ctid::text FROM m_ff WHERE id = 10")
pg.psql("SELECT pg_stat_force_next_flush()")
R['hot_stats'] = pg.jsql("SELECT relname, n_tup_upd, n_tup_hot_upd FROM pg_stat_user_tables WHERE relname IN ('messages','m_ff') ORDER BY relname")
# B-tree on chat_id
R['bt_meta'] = pg.jsql("SELECT * FROM bt_metap('messages_chat_idx')")
root = R['bt_meta'][0]['root']
R['bt_root_stats'] = pg.jsql(f"SELECT * FROM bt_page_stats('messages_chat_idx', {root})")
R['bt_root_items'] = pg.jsql(f"SELECT itemoffset, ctid::text, itemlen, data FROM bt_page_items('messages_chat_idx', {root}) ORDER BY itemoffset LIMIT 6")
leaf = pg.psql("SELECT (ctid::text::point)[0]::int FROM bt_page_items('messages_chat_idx', %d) WHERE itemoffset = 3" % root) if R['bt_meta'][0]['level'] == 1 else None
R['bt_leaf_block'] = leaf
# find a leaf holding chat 42000: walk down from the root
def child_for(blk, key):
    items = pg.jsql(f"SELECT itemoffset, ctid::text, data FROM bt_page_items('messages_chat_idx', {blk}) ORDER BY itemoffset")
    best = None
    for it in items:
        d = it['data'].split()
        if not d: best = it; continue
        v = int.from_bytes(bytes(int(x, 16) for x in d[:8]), 'little')
        if v <= key or best is None: best = it if v < key or best is None else best
    return items, best
path = []; blk = root; lvl = R['bt_meta'][0]['level']
while True:
    st = pg.jsql(f"SELECT blkno, type, live_items, avg_item_size, free_size, btpo_prev, btpo_next, btpo_level FROM bt_page_stats('messages_chat_idx', {blk})")[0]
    path.append(st)
    if st['btpo_level'] == 0: break
    items = pg.jsql(f"SELECT itemoffset, ctid::text AS ctid, data FROM bt_page_items('messages_chat_idx', {blk}) ORDER BY itemoffset")
    nxt = None
    for it in items:
        d = it['data'].split()
        v = int.from_bytes(bytes(int(x, 16) for x in d[:8]), 'little') if d else -1
        if v < 42000: nxt = it   # B-tree descends into the last downlink whose separator is < key (keys equal may sit left)
    blk = int(nxt['ctid'].strip('()').split(',')[0])
R['bt_path_42000'] = path
R['bt_leaf_items_42000'] = pg.jsql(f"""SELECT itemoffset, ctid::text, itemlen, data, dead, htid::text, tids::text FROM bt_page_items('messages_chat_idx', {blk})
  WHERE data LIKE '10 a4 00 00 00 00 00 00%' OR itemoffset <= 2 ORDER BY itemoffset""")
R['bt_leaf_all'] = pg.jsql(f"SELECT itemoffset, itemlen, data, coalesce(array_length(tids, 1), 1) AS ntids, ctid::text AS tid FROM bt_page_items('messages_chat_idx', {blk}) ORDER BY itemoffset")
R['bt_internal_all'] = pg.jsql(f"SELECT itemoffset, itemlen, data, ctid::text AS tid FROM bt_page_items('messages_chat_idx', {path[1]['blkno']}) ORDER BY itemoffset")
R['chat_42000_ctids'] = pg.psql("SELECT string_agg(ctid::text, ' ' ORDER BY ctid) FROM messages WHERE chat_id = 42000")
R['pgstatindex'] = pg.jsql("SELECT * FROM pgstatindex('messages_chat_idx')") + pg.jsql("SELECT * FROM pgstatindex('messages_pkey')")
# TOAST: one long assistant answer
pg.psql("INSERT INTO messages VALUES (2000001, 1, 'assistant', 'large', 3000, (SELECT string_agg(md5(g::text), ' ') FROM generate_series(1, 400) g), now())")
pg.psql("INSERT INTO messages VALUES (2000002, 1, 'assistant', 'large', 3000, repeat('All work and no play. ', 600), now())")
R['toast'] = pg.jsql("""SELECT id, octet_length(content) raw_bytes, pg_column_size(content) stored_bytes, pg_column_compression(content) compression
  FROM messages WHERE id IN (2000001, 2000002, 1) ORDER BY id""")
R['toast_rel'] = pg.jsql("SELECT c.reltoastrelid::regclass::text AS toast_table, pg_relation_size(c.reltoastrelid) toast_bytes FROM pg_class c WHERE relname = 'messages'")
# FSM and VM
pg.psql('VACUUM messages')
R['vm_summary'] = pg.jsql("SELECT * FROM pg_visibility_map_summary('messages')")
pg.psql('DELETE FROM messages WHERE id BETWEEN 1 AND 30')
R['vm_after_delete'] = pg.jsql("SELECT blkno, all_visible, all_frozen FROM pg_visibility_map('messages') WHERE blkno < 3")
pg.psql('VACUUM messages')
R['fsm_after_vacuum'] = pg.jsql("SELECT blkno, avail FROM pg_freespace('messages') WHERE blkno < 3")
R['vm_after_vacuum'] = pg.jsql("SELECT blkno, all_visible, all_frozen FROM pg_visibility_map('messages') WHERE blkno < 3")
# buffer pool: restart (empty cache), then a sequential scan and count what it left in shared_buffers
print(pg.stop()); print(pg.start())
R['shared_buffers'] = pg.psql('SHOW shared_buffers')
def cached(rel):
    return int(pg.psql(f"SELECT count(*) FROM pg_buffercache WHERE relfilenode = pg_relation_filenode('{rel}') AND reldatabase = (SELECT oid FROM pg_database WHERE datname = current_database())"))
SEQ = 'SET max_parallel_workers_per_gather = 0; SET enable_indexonlyscan = off; SET enable_indexscan = off; SET enable_bitmapscan = off; '
R['ring'] = []
for i in range(2):  # a sequential scan of a table bigger than a quarter of shared_buffers uses a 256 kB ring of buffers
    j = pg.explain('SELECT count(*) FROM messages', pre=SEQ)
    R['ring'].append({'scan': i + 1, 'hit': j['Plan'].get('Shared Hit Blocks', 0), 'read': j['Plan'].get('Shared Read Blocks', 0), 'ms': j['Execution Time'], 'cached_after': cached('messages')})
pg.psql("SELECT * FROM messages WHERE chat_id BETWEEN 40000 AND 40100")
R['after_100_chats_cached_pages'] = {'messages': cached('messages'), 'messages_chat_idx': cached('messages_chat_idx')}
R['usage_counts'] = pg.jsql("SELECT usagecount, count(*) n FROM pg_buffercache WHERE usagecount IS NOT NULL GROUP BY 1 ORDER BY 1")
# crash recovery: write, kill -9 the postmaster before a checkpoint, restart, read the log
pg.psql('CHECKPOINT')
lsn0 = pg.psql('SELECT pg_current_wal_lsn()')
pg.psql("INSERT INTO messages SELECT i, 5, 'user', 'mini', 10, 'after the checkpoint', now() FROM generate_series(3000001, 3001000) i")
lsn1 = pg.psql('SELECT pg_current_wal_lsn()')
R['crash'] = {'checkpoint_lsn': lsn0, 'lsn_after_1000_inserts': lsn1, 'wal_bytes': int(pg.psql(f"SELECT '{lsn1}'::pg_lsn - '{lsn0}'::pg_lsn"))}
pid = int(open(pg.data + '/postmaster.pid').readline())
logpos = os.path.getsize(pg.root + '/log')
os.kill(pid, signal.SIGKILL); time.sleep(2)
for f in ['postmaster.pid']:
    try: os.remove(pg.data + '/' + f)
    except FileNotFoundError: pass
t = time.time(); print(pg.start()); R['crash']['restart_s'] = round(time.time() - t, 2)
log = open(pg.root + '/log').read()[logpos:]
R['crash']['log'] = [re.sub(r'^\S+ \S+ \S+ \[\d+\] ', '', l) for l in log.splitlines() if l.strip()][:20]
R['crash']['rows_back'] = int(pg.psql('SELECT count(*) FROM messages WHERE id > 3000000'))
pg.stop()
save(R, 'm1_pages.json')

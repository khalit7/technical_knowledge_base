# Second probe after measure_read.py (same data directory): index-only scans for the index path, and the chat lookup cold with and without the index. Output saved in inputs/probe_out.txt (first run after a restart, so pages come from the OS).
import os,subprocess,json,pgserver
B=os.path.join(os.path.dirname(pgserver.__file__),'pginstall','bin');ROOT=os.path.abspath('rd_pgdata');DATA=ROOT+'/data';PORT='54351'
sh=lambda *a: subprocess.run(list(a),capture_output=True,text=True)
print(sh(f'{B}/pg_ctl','-D',DATA,'-o',f"-p {PORT} -k '' -h 127.0.0.1",'-l',ROOT+'/log','-w','start').stdout[-60:])
def psql(q):
    r=sh(f'{B}/psql','-h','127.0.0.1','-p',PORT,'-U','postgres','-X','-q','-At','-c',q,'chat');return r.stdout.strip()+r.stderr.strip()
for q in ["SELECT id FROM messages WHERE id = 500000","SELECT chat_id FROM messages WHERE chat_id = 42000 LIMIT 1"]:
    psql("EXPLAIN (ANALYZE, BUFFERS) "+q)
    print(psql("EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF, SUMMARY OFF) "+q))
print(psql("SELECT pg_relation_size('messages_pkey'), pg_relation_size('messages_chat_idx')"))
print(psql("EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF) SELECT id, role, tokens FROM messages WHERE chat_id = 42000 ORDER BY id"))
print(psql("SET enable_indexscan=off; SET enable_bitmapscan=off; EXPLAIN (ANALYZE, BUFFERS, COSTS OFF, TIMING OFF) SELECT id, role, tokens FROM messages WHERE chat_id = 42000 ORDER BY id"))
sh(f'{B}/pg_ctl','-D',DATA,'-m','fast','-w','stop')

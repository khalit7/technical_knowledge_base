"""ALTER TABLE, measured: for each common schema change on a 2,000,000-row copy of the chat messages, record
the lock it takes (pg_locks, inside its own transaction), whether it rewrites the table (relfilenode changes),
how long it takes, and whether a plain SELECT and a plain INSERT from another session are blocked while it holds its lock.
Each change runs inside BEGIN ... ROLLBACK (so every change starts from the same table), except CREATE INDEX CONCURRENTLY,
which cannot run in a transaction block and is observed from a second session while it runs.
Writes ../inputs/alter.json. Run from a scratch directory (see pgc.py)."""
import os, sys, time, threading, statistics, datetime, platform
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from pgc import *

N_COPIES = 1000  # 2,000 messages x 1,000 = 2,000,000 rows
STRENGTH = ['AccessShareLock', 'RowShareLock', 'RowExclusiveLock', 'ShareUpdateExclusiveLock', 'ShareLock',
            'ShareRowExclusiveLock', 'ExclusiveLock', 'AccessExclusiveLock']

def setup_big():
    with conn('postgres') as c:
        c.execute('DROP DATABASE IF EXISTS bench WITH (FORCE)'); c.execute('CREATE DATABASE bench TEMPLATE chat')
    with conn('bench') as c:
        c.execute("""CREATE TABLE chats_big (id integer PRIMARY KEY, user_id integer NOT NULL, title text, model text NOT NULL)""")
        c.execute(f"""INSERT INTO chats_big SELECT c.id + 200 * g, c.user_id, c.title, c.model FROM chats c, generate_series(0, {N_COPIES - 1}) g""")
        c.execute("""CREATE TABLE messages_big (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, chat_id integer NOT NULL,
                     role text NOT NULL, content text NOT NULL, tokens integer NOT NULL, created_at timestamp NOT NULL)""")
        t = time.time()
        c.execute(f"""INSERT INTO messages_big (chat_id, role, content, tokens, created_at)
                      SELECT m.chat_id + 200 * g, m.role, m.content, m.tokens, m.created_at + g * interval '1 minute'
                      FROM generate_series(0, {N_COPIES - 1}) g, messages m ORDER BY g, m.id""")
        load_s = time.time() - t
        c.execute('CREATE INDEX messages_big_chat ON messages_big (chat_id)')
        c.execute('VACUUM ANALYZE messages_big'); c.execute('VACUUM ANALYZE chats_big')
        n = c.execute('SELECT count(*) FROM messages_big').fetchone()[0]
        size = c.execute("SELECT pg_size_pretty(pg_table_size('messages_big')), pg_table_size('messages_big'), pg_size_pretty(pg_indexes_size('messages_big'))").fetchone()
    return {'rows': n, 'table_size': size[0], 'table_bytes': size[1], 'index_size': size[2], 'load_seconds': round(load_s, 2)}

OPS = [
 dict(id='add_null', grp='Add a column', label='ADD COLUMN, nullable, no default', sql='ALTER TABLE messages_big ADD COLUMN note text'),
 dict(id='add_const', grp='Add a column', label='ADD COLUMN with a constant DEFAULT', sql='ALTER TABLE messages_big ADD COLUMN score integer NOT NULL DEFAULT 0'),
 dict(id='add_volatile', grp='Add a column', label='ADD COLUMN with a volatile DEFAULT', sql='ALTER TABLE messages_big ADD COLUMN seen_at timestamptz DEFAULT clock_timestamp()'),
 dict(id='add_generated', grp='Add a column', label='ADD COLUMN ... GENERATED ALWAYS AS (...) STORED', sql='ALTER TABLE messages_big ADD COLUMN content_len integer GENERATED ALWAYS AS (length(content)) STORED'),
 dict(id='drop_col', grp='Remove or rename', label='DROP COLUMN', sql='ALTER TABLE messages_big DROP COLUMN content'),
 dict(id='rename_col', grp='Remove or rename', label='RENAME COLUMN', sql='ALTER TABLE messages_big RENAME COLUMN content TO body'),
 dict(id='set_default', grp='Defaults and types', label='ALTER COLUMN SET DEFAULT', sql='ALTER TABLE messages_big ALTER COLUMN tokens SET DEFAULT 0'),
 dict(id='type_bigint', grp='Defaults and types', label='ALTER COLUMN TYPE integer to bigint', sql='ALTER TABLE messages_big ALTER COLUMN chat_id TYPE bigint'),
 dict(id='type_widen', grp='Defaults and types', label='ALTER COLUMN TYPE varchar(20) to varchar(200)', setup=['ALTER TABLE messages_big ADD COLUMN label varchar(20)'],
      cleanup=['ALTER TABLE messages_big DROP COLUMN label'], sql='ALTER TABLE messages_big ALTER COLUMN label TYPE varchar(200)'),
 dict(id='type_text', grp='Defaults and types', label='ALTER COLUMN TYPE text to varchar(200)', sql='ALTER TABLE messages_big ALTER COLUMN content TYPE varchar(200)'),
 dict(id='set_nn', grp='NOT NULL', label='SET NOT NULL (scans every row)', setup=['ALTER TABLE messages_big ADD COLUMN flag integer DEFAULT 0'],
      cleanup=['ALTER TABLE messages_big DROP COLUMN flag'], sql='ALTER TABLE messages_big ALTER COLUMN flag SET NOT NULL'),
 dict(id='set_nn_check', grp='NOT NULL', label='SET NOT NULL when a validated CHECK (flag IS NOT NULL) exists', setup=['ALTER TABLE messages_big ADD COLUMN flag integer DEFAULT 0',
      'ALTER TABLE messages_big ADD CONSTRAINT flag_nn CHECK (flag IS NOT NULL) NOT VALID', 'ALTER TABLE messages_big VALIDATE CONSTRAINT flag_nn'],
      cleanup=['ALTER TABLE messages_big DROP COLUMN flag'], sql='ALTER TABLE messages_big ALTER COLUMN flag SET NOT NULL'),
 dict(id='check', grp='Constraints', label='ADD CONSTRAINT CHECK', sql='ALTER TABLE messages_big ADD CONSTRAINT tokens_cap CHECK (tokens < 100000)'),
 dict(id='check_nv', grp='Constraints', label='ADD CONSTRAINT CHECK ... NOT VALID', sql='ALTER TABLE messages_big ADD CONSTRAINT tokens_cap CHECK (tokens < 100000) NOT VALID'),
 dict(id='check_validate', grp='Constraints', label='VALIDATE CONSTRAINT (the CHECK added NOT VALID)', setup=['ALTER TABLE messages_big ADD CONSTRAINT tokens_cap CHECK (tokens < 100000) NOT VALID'],
      cleanup=['ALTER TABLE messages_big DROP CONSTRAINT tokens_cap'], sql='ALTER TABLE messages_big VALIDATE CONSTRAINT tokens_cap'),
 dict(id='fk', grp='Constraints', label='ADD FOREIGN KEY', sql='ALTER TABLE messages_big ADD CONSTRAINT messages_big_chat_fk FOREIGN KEY (chat_id) REFERENCES chats_big (id)'),
 dict(id='fk_nv', grp='Constraints', label='ADD FOREIGN KEY ... NOT VALID', sql='ALTER TABLE messages_big ADD CONSTRAINT messages_big_chat_fk FOREIGN KEY (chat_id) REFERENCES chats_big (id) NOT VALID'),
 dict(id='fk_validate', grp='Constraints', label='VALIDATE CONSTRAINT (the foreign key added NOT VALID)', setup=['ALTER TABLE messages_big ADD CONSTRAINT messages_big_chat_fk FOREIGN KEY (chat_id) REFERENCES chats_big (id) NOT VALID'],
      cleanup=['ALTER TABLE messages_big DROP CONSTRAINT messages_big_chat_fk'], sql='ALTER TABLE messages_big VALIDATE CONSTRAINT messages_big_chat_fk'),
 dict(id='index', grp='Indexes', label='CREATE INDEX', sql='CREATE INDEX messages_big_created ON messages_big (created_at)'),
 dict(id='index_conc', grp='Indexes', label='CREATE INDEX CONCURRENTLY', sql='CREATE INDEX CONCURRENTLY messages_big_created ON messages_big (created_at)',
      txn=False, cleanup=['DROP INDEX messages_big_created']),
 dict(id='unique_conc', grp='Indexes', label='CREATE UNIQUE INDEX CONCURRENTLY, then ADD CONSTRAINT ... UNIQUE USING INDEX',
      setup=['CREATE UNIQUE INDEX CONCURRENTLY messages_big_uq ON messages_big (id, chat_id)'], cleanup=['DROP INDEX IF EXISTS messages_big_uq'],
      sql='ALTER TABLE messages_big ADD CONSTRAINT messages_big_uq UNIQUE USING INDEX messages_big_uq'),
]

def probe(kind):
    """Run a SELECT or an INSERT from a fresh session with lock_timeout 300 ms; True if it was blocked."""
    with conn('bench') as c:
        c.execute("SET lock_timeout = '300ms'")
        try:
            if kind == 'read':
                c.execute('SELECT id FROM messages_big WHERE id = 5').fetchall()
            else:
                c.execute('BEGIN')
                c.execute("INSERT INTO messages_big (chat_id, role, content, tokens, created_at) VALUES (1, 'user', 'probe', 1, now())")
                c.execute('ROLLBACK')
            return False
        except psycopg.errors.LockNotAvailable:
            return True

def locks_held(c, pid):
    rows = c.execute("""SELECT mode FROM pg_locks WHERE relation = 'messages_big'::regclass AND pid = %s AND granted""", (pid,)).fetchall()
    ms = sorted({r[0] for r in rows}, key=STRENGTH.index)
    return ms

def run_op(op, reps):
    out = dict(id=op['id'], grp=op['grp'], label=op['label'], sql=op['sql'], times=[])
    for rep in range(reps):
        with conn('bench') as c:
            for s in op.get('setup', []): c.execute(s)
            fn0 = c.execute("SELECT pg_relation_filenode('messages_big')").fetchone()[0]
        if op.get('txn', True):
            with conn('bench') as c:
                pid = c.execute('SELECT pg_backend_pid()').fetchone()[0]
                c.execute('BEGIN')
                t = time.perf_counter(); c.execute(op['sql']); dt = time.perf_counter() - t
                fn1 = c.execute("SELECT pg_relation_filenode('messages_big')").fetchone()[0]
                if rep == 0:
                    out['locks'] = locks_held(c, pid)
                    out['blocks_read'] = probe('read'); out['blocks_write'] = probe('write')
                c.execute('ROLLBACK')
        else:
            seen = set(); res = {}
            def work():
                with conn('bench') as c2:
                    res['pid'] = c2.execute('SELECT pg_backend_pid()').fetchone()[0]
                    t = time.perf_counter(); c2.execute(op['sql']); res['dt'] = time.perf_counter() - t
            th = threading.Thread(target=work); th.start()
            with conn('bench') as m:
                br = bw = None
                while th.is_alive():
                    if 'pid' in res:
                        for r in m.execute("SELECT mode FROM pg_locks WHERE relation = 'messages_big'::regclass AND pid = %s AND granted", (res['pid'],)).fetchall():
                            seen.add(r[0])
                        if rep == 0 and br is None and seen:
                            br = probe('read'); bw = probe('write')
                    time.sleep(0.01)
            th.join(); dt = res['dt']
            with conn('bench') as c:
                fn1 = c.execute("SELECT pg_relation_filenode('messages_big')").fetchone()[0]
            if rep == 0:
                out['locks'] = sorted(seen, key=STRENGTH.index); out['blocks_read'] = br; out['blocks_write'] = bw
        with conn('bench') as c:
            for s in op.get('cleanup', []): c.execute(s)
        out['times'].append(dt)
        out['rewrite'] = fn1 != fn0
    out['median_s'] = statistics.median(out['times'])
    out['strongest'] = out['locks'][-1] if out.get('locks') else None
    print(op['id'], out.get('locks'), 'rewrite', out['rewrite'], 'read', out.get('blocks_read'), 'write', out.get('blocks_write'), round(out['median_s'], 4), flush=True)
    return out

if __name__ == '__main__':
    start()
    ver = load_base('chat')
    big = setup_big(); print(big, flush=True)
    reps = int(os.environ.get('REPS', '3'))
    res = [run_op(o, reps) for o in OPS]
    with conn('bench') as c:
        settings = dict(c.execute("SELECT name, setting FROM pg_settings WHERE name IN ('shared_buffers','maintenance_work_mem','max_wal_size','work_mem')").fetchall())
    save('alter.json', {'date': datetime.date.today().isoformat(), 'postgres': ver, 'machine': platform.machine() + ' ' + platform.platform(),
                        'reps': reps, 'table': big, 'settings': settings, 'ops': res})

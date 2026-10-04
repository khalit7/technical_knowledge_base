"""Why serializable transactions gave up after 10 attempts with only 2 clients: log every error. 2 clients, 4 hot users, 4 s.
Run like bench.py (TX_SCRATCH=$PWD uv run --no-project ... python debug_retries.py); prints the error counts (kept in ../inputs/notes_bench.json)."""
import os, sys, time, random, json, collections, multiprocessing as mp
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from txharness import PG, pgserver_bin, SCR
import psycopg
from psycopg import errors
srv = PG(pgserver_bin(), os.path.join(SCR, 'pg_bench'), '55733')
print(srv.start()); srv.ensure_db()
c = srv.connect()
c.execute('DROP TABLE IF EXISTS credits'); c.execute('DROP TABLE IF EXISTS messages')
c.execute('CREATE TABLE credits (user_id int PRIMARY KEY, balance int NOT NULL CHECK (balance >= 0))')
c.execute('INSERT INTO credits SELECT i, 1000000000 FROM generate_series(1, 4) i')
c.execute('CREATE TABLE messages (id bigserial PRIMARY KEY, user_id int NOT NULL, day int NOT NULL)')
c.execute('CREATE INDEX ON messages (user_id)'); c.execute('VACUUM ANALYZE credits'); c.close()
def work(conn, uid):
    bal = conn.execute('SELECT balance FROM credits WHERE user_id = %s', (uid,)).fetchone()[0]
    conn.execute('INSERT INTO messages (user_id, day) VALUES (%s, 20261004)', (uid,))
    conn.execute('UPDATE credits SET balance = %s WHERE user_id = %s', (bal - 1, uid))
def client(seed, t_stop, q):
    rnd = random.Random(seed)
    conn = psycopg.connect(host='127.0.0.1', port=srv.port, user='postgres', dbname='txlab', autocommit=True)
    conn.isolation_level = psycopg.IsolationLevel.SERIALIZABLE
    seqs = []; cnt = collections.Counter()
    while time.time() < t_stop:
        uid = rnd.randint(1, 4); errs = []
        for att in range(10):
            try:
                with conn.transaction():
                    work(conn, uid)
                break
            except (errors.SerializationFailure, errors.DeadlockDetected) as e:
                errs.append((e.sqlstate, e.diag.message_primary, e.diag.message_detail))
                time.sleep(random.uniform(0, min(0.05, 0.001 * 2 ** (att + 1))))
        for e in errs: cnt[str(e)[:200]] += 1
        if len(errs) == 10: seqs.append(errs)
    conn.close(); q.put((seqs[:2], cnt.most_common(6)))
ctx = mp.get_context('fork'); q = ctx.Queue(); t_stop = time.time() + 4
ps = [ctx.Process(target=client, args=(i, t_stop, q)) for i in range(2)]; [p.start() for p in ps]
for _ in ps:
    seqs, cnt = q.get(); print(json.dumps(seqs, indent=0)[:1500]); print(cnt)
[p.join() for p in ps]; srv.stop()
